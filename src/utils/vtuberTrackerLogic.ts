import {
  Live2DParameterState,
  EmotionPresetId,
  AnimeVisemeKey,
  clampParameter,
  resolveClosestSlide48,
  resolveAnimeVisemeKey
} from './conceptLogic';

export interface HeadEulerAngles {
  angleX: number; // Yaw (-30 .. +30)
  angleY: number; // Pitch (-30 .. +30)
  angleZ: number; // Roll (-30 .. +30)
}

export interface MicSpectralFrame {
  rms: number; // 0.0 .. 1.0
  lowBandEnergy: number; // 250-550 Hz (U / O)
  midBandEnergy: number; // 600-1350 Hz (A)
  highBandEnergy: number; // 1600-2800 Hz (I / E)
  mouthOpenY: number;
  mouthForm: number;
  vowel: AnimeVisemeKey;
  slideIndex: number;
}

export interface VtuberTrackerConfig {
  mirrorCamera: boolean;
  headSensitivity: number; // 0.5 .. 2.0 (default 1.0)
  mouthSensitivity: number; // 0.5 .. 2.0 (default 1.05)
  browSensitivity: number; // 0.5 .. 2.0 (default 1.0)
  micNoiseGate: number; // 0.01 .. 0.35 (default 0.045)
  micBoost: number; // 0.5 .. 2.5 (default 1.35)
  /** If true, small webcam jaw noise is ignored and mouth opens primarily from voice or wide deliberate jaw open (> 0.28) */
  voiceGatedMouth: boolean;
  autoEmotionFromFace: boolean;
  manualEmotionOverride: EmotionPresetId | null;
  calibrationOffset: HeadEulerAngles;
}

export const DEFAULT_VTUBER_TRACKER_CONFIG: VtuberTrackerConfig = {
  mirrorCamera: true,
  headSensitivity: 1.0,
  mouthSensitivity: 1.05,
  browSensitivity: 1.0,
  micNoiseGate: 0.045,
  micBoost: 1.35,
  voiceGatedMouth: true,
  autoEmotionFromFace: true,
  manualEmotionOverride: null,
  calibrationOffset: { angleX: 0, angleY: 0, angleZ: 0 }
};

export interface VtuberComputedFrame {
  params: Live2DParameterState;
  /** Independent screen-left eye openness (0.0 closed .. 1.0 open) */
  eyeOpenL: number;
  /** Independent screen-right eye openness (0.0 closed .. 1.0 open) */
  eyeOpenR: number;
  /** Independent screen-left eyebrow (-1.0 down .. +1.0 up) */
  browLY: number;
  /** Independent screen-right eyebrow (-1.0 down .. +1.0 up) */
  browRY: number;
  detectedEmotion: EmotionPresetId;
  /** Confidence (0..1) of the currently detected facial emotion */
  emotionConfidence: number;
  activeSlideIndex: number;
  activeVowel: AnimeVisemeKey;
  isBlinkingClosed: boolean;
  rawEuler: HeadEulerAngles;
}

export type VtuberTrackerFrameState = VtuberComputedFrame;

export function createDefaultVtuberFrameState(): VtuberComputedFrame {
  return {
    params: {
      angleX: 0,
      angleY: 0,
      angleZ: 0,
      eyeOpen: 1.0,
      eyeOpenL: 1.0,
      eyeOpenR: 1.0,
      eyeSmile: 0.18,
      mouthOpenY: 0.0,
      mouthForm: 0.4,
      browY: 0,
      browLY: 0,
      browRY: 0,
      breath: 0.5,
      shoulderY: 0,
      gazeX: 0,
      gazeY: 0,
      cheekBlush: 0.12,
      handGesture: 'none'
    },
    eyeOpenL: 1.0,
    eyeOpenR: 1.0,
    browLY: 0,
    browRY: 0,
    detectedEmotion: 'neutral',
    emotionConfidence: 1.0,
    activeSlideIndex: 0,
    activeVowel: 'SILENT',
    isBlinkingClosed: false,
    rawEuler: { angleX: 0, angleY: 0, angleZ: 0 }
  };
}

/**
 * Extracts Yaw (angleX), Pitch (angleY), and Roll (angleZ) in degrees from MediaPipe's 4x4 column-major matrix.
 * Includes soft-knee compression near extremes so head turns never snap harshly.
 */
export function extractHeadEulerFromMatrix(
  matrix: number[] | Float32Array,
  mirrorCamera = true
): HeadEulerAngles {
  if (!matrix || matrix.length < 16) {
    return { angleX: 0, angleY: 0, angleZ: 0 };
  }

  const m00 = matrix[0];
  const m01 = matrix[1];
  const m02 = matrix[2];
  const m10 = matrix[4];
  const m11 = matrix[5];
  const m12 = matrix[6];
  const m20 = matrix[8];
  const m21 = matrix[9];
  const m22 = matrix[10];

  const radToDeg = 180 / Math.PI;
  const pitch = Math.atan2(-m21, Math.hypot(m20, m22)) * radToDeg;
  const yaw = Math.atan2(m20, m22) * radToDeg;
  const roll = Math.atan2(m01, m11) * radToDeg;

  const safeYaw = Number.isFinite(yaw) ? yaw : Math.atan2(-m12, m02) * 0;
  const safePitch = Number.isFinite(pitch) ? pitch : 0;
  const safeRoll = Number.isFinite(roll) ? roll : Math.atan2(m10, m00) * radToDeg;

  const mirrorSign = mirrorCamera ? -1 : 1;

  // Soft-knee hyperbolic tangent compression so extreme webcam turns glide smoothly without hitting a hard wall
  const softAngle = (deg: number, limit: number) =>
    Number((Math.tanh(deg / limit) * limit).toFixed(2));

  return {
    angleX: clampParameter(softAngle(safeYaw * mirrorSign, 26), -30, 30),
    angleY: clampParameter(softAngle(safePitch, 22), -30, 30),
    angleZ: clampParameter(softAngle(safeRoll * mirrorSign * 0.85, 22), -30, 30)
  };
}

/**
 * Analyzes Web Audio API frequency bins (0..255) into formant energies and 48-slide mouth coordinates.
 * Uses a strict noise gate so background room hum never opens the mouth.
 */
export function analyzeFrequencySpectrumToMouth(
  freqBins: Uint8Array,
  sampleRate = 48000,
  noiseGate = 0.045,
  micBoost = 1.35
): MicSpectralFrame {
  if (!freqBins || freqBins.length === 0) {
    return {
      rms: 0,
      lowBandEnergy: 0,
      midBandEnergy: 0,
      highBandEnergy: 0,
      mouthOpenY: 0.0,
      mouthForm: 0.4,
      vowel: 'SILENT',
      slideIndex: 0
    };
  }

  const binCount = freqBins.length;
  const nyquist = sampleRate / 2;
  const hzPerBin = nyquist / binCount;

  let lowSum = 0;
  let lowN = 0;
  let midSum = 0;
  let midN = 0;
  let highSum = 0;
  let highN = 0;
  let totalSq = 0;
  let speechBins = 0;

  // Focus strictly on human vocal fundamental + F1/F2 formants (180 Hz .. 3100 Hz)
  for (let i = 1; i < binCount; i++) {
    const hz = i * hzPerBin;
    if (hz < 160) continue;
    if (hz > 3100) break;
    const norm = freqBins[i] / 255;
    totalSq += norm * norm;
    speechBins += 1;

    if (hz >= 220 && hz <= 560) {
      lowSum += norm;
      lowN += 1;
    } else if (hz > 560 && hz <= 1400) {
      midSum += norm;
      midN += 1;
    } else if (hz > 1400 && hz <= 2900) {
      highSum += norm;
      highN += 1;
    }
  }

  const rawRms = speechBins > 0 ? Math.sqrt(totalSq / speechBins) : 0;
  const lowBandEnergy = lowN > 0 ? lowSum / lowN : 0;
  const midBandEnergy = midN > 0 ? midSum / midN : 0;
  const highBandEnergy = highN > 0 ? highSum / highN : 0;

  // Strict noise gate: below threshold, mouthOpenY is strictly 0.0 (completely closed)
  if (rawRms <= noiseGate) {
    return {
      rms: 0,
      lowBandEnergy: Number(lowBandEnergy.toFixed(3)),
      midBandEnergy: Number(midBandEnergy.toFixed(3)),
      highBandEnergy: Number(highBandEnergy.toFixed(3)),
      mouthOpenY: 0.0,
      mouthForm: 0.4,
      vowel: 'SILENT',
      slideIndex: 0
    };
  }

  const activeLevel = clampParameter(
    ((rawRms - noiseGate) / Math.max(0.16, 0.68 - noiseGate)) * micBoost,
    0,
    1
  );

  // Smooth quadratic ramp near threshold so faint breaths don't pop the mouth wide open
  const shapedLevel = activeLevel < 0.25 ? (activeLevel * activeLevel) / 0.25 : activeLevel;
  const mouthOpenY = Number(clampParameter(shapedLevel * 0.88, 0.0, 0.92).toFixed(3));

  if (mouthOpenY < 0.04) {
    return {
      rms: 0,
      lowBandEnergy: Number(lowBandEnergy.toFixed(3)),
      midBandEnergy: Number(midBandEnergy.toFixed(3)),
      highBandEnergy: Number(highBandEnergy.toFixed(3)),
      mouthOpenY: 0.0,
      mouthForm: 0.4,
      vowel: 'SILENT',
      slideIndex: 0
    };
  }

  const formantTotal = Math.max(0.001, lowBandEnergy + midBandEnergy + highBandEnergy);
  const lowShare = lowBandEnergy / formantTotal;
  const midShare = midBandEnergy / formantTotal;
  const highShare = highBandEnergy / formantTotal;

  let mouthForm = 0.4;
  if (highShare > 0.36) {
    mouthForm = clampParameter(0.55 + (highShare - 0.36) * 1.4, 0.4, 0.95);
  } else if (lowShare > 0.52 && midShare < 0.34) {
    mouthForm = clampParameter(-0.15 - (lowShare - 0.5) * 1.5, -0.7, 0.1);
  } else {
    mouthForm = clampParameter(0.45 + (midShare - 0.3) * 0.6, 0.25, 0.68);
  }

  const cleanForm = Number(mouthForm.toFixed(3));
  const slideIndex = resolveClosestSlide48(mouthOpenY, cleanForm);
  const vowel = resolveAnimeVisemeKey(mouthOpenY, cleanForm);

  return {
    rms: Number(activeLevel.toFixed(3)),
    lowBandEnergy: Number(lowBandEnergy.toFixed(3)),
    midBandEnergy: Number(midBandEnergy.toFixed(3)),
    highBandEnergy: Number(highBandEnergy.toFixed(3)),
    mouthOpenY,
    mouthForm: cleanForm,
    vowel,
    slideIndex
  };
}

/**
 * Maps MediaPipe 52 ARKit face blendshapes + 3D Head Euler angles + optional Mic spectral data
 * into a complete 2.5D Alisa rig frame with:
 * - Independent Left & Right eye blinking/winking (eyeOpenL, eyeOpenR)
 * - Strict jaw deadzone so the mouth never opens randomly when silent
 * - All 9 emotions mapped accurately
 */
export function mapBlendshapesToRigState(
  blendshapes: Record<string, number>,
  rawEuler: HeadEulerAngles,
  micFrame?: MicSpectralFrame | null,
  config: VtuberTrackerConfig = DEFAULT_VTUBER_TRACKER_CONFIG,
  nowMs = 0
): VtuberComputedFrame {
  const get = (key: string) => clampParameter(Number(blendshapes[key] ?? 0), 0, 1);

  // 1. Calibrated Head Angles (AngleX, AngleY, AngleZ) with deadzone for micro-tremors
  const cal = config.calibrationOffset ?? { angleX: 0, angleY: 0, angleZ: 0 };
  const applyAngleDeadzone = (val: number, dz = 0.45) =>
    Math.abs(val) < dz ? 0 : val - Math.sign(val) * dz;

  const angleX = clampParameter(
    Number((applyAngleDeadzone(rawEuler.angleX - cal.angleX) * config.headSensitivity).toFixed(2)),
    -30,
    30
  );
  const angleY = clampParameter(
    Number((applyAngleDeadzone(rawEuler.angleY - cal.angleY) * config.headSensitivity).toFixed(2)),
    -30,
    30
  );
  const angleZ = clampParameter(
    Number((applyAngleDeadzone(rawEuler.angleZ - cal.angleZ) * config.headSensitivity).toFixed(2)),
    -30,
    30
  );

  // 2. Independent Left & Right Eye Blink / Wink
  // Note: MediaPipe 'eyeBlinkLeft' is the subject's anatomical left eye (which appears on the RIGHT in unmirrored camera, or LEFT in mirrored selfie view)
  const rawBlinkSubjLeft = get('eyeBlinkLeft');
  const rawBlinkSubjRight = get('eyeBlinkRight');
  const wideL = get('eyeWideLeft');
  const wideR = get('eyeWideRight');
  const squintL = get('eyeSquintLeft');
  const squintR = get('eyeSquintRight');

  // Map to screen-left (Alisa's right eye on canvas u~0.395) and screen-right (Alisa's left eye on canvas u~0.605)
  const blinkScreenLeft = config.mirrorCamera ? rawBlinkSubjRight : rawBlinkSubjLeft;
  const blinkScreenRight = config.mirrorCamera ? rawBlinkSubjLeft : rawBlinkSubjRight;
  const wideScreenLeft = config.mirrorCamera ? wideR : wideL;
  const wideScreenRight = config.mirrorCamera ? wideL : wideR;
  const squintScreenLeft = config.mirrorCamera ? squintR : squintL;
  const squintScreenRight = config.mirrorCamera ? squintL : squintR;

  // Natural human single-eye winks on webcam involve both eyeBlink (~0.34..0.55) and eyeSquint (~0.25..0.55).
  // When one eye is noticeably more closed than the other (|diff| > 0.14), amplify the closing eye so single-eye winking is effortless!
  const rawCloseL = blinkScreenLeft + squintScreenLeft * 0.18;
  const rawCloseR = blinkScreenRight + squintScreenRight * 0.18;
  const closeDiff = rawCloseL - rawCloseR;

  const boostedBlinkL =
    closeDiff > 0.14 ? Math.min(1.0, blinkScreenLeft * 1.38 + squintScreenLeft * 0.24) : blinkScreenLeft;
  const boostedBlinkR =
    closeDiff < -0.14 ? Math.min(1.0, blinkScreenRight * 1.38 + squintScreenRight * 0.24) : blinkScreenRight;

  const computeEyeOpen = (blinkVal: number, wideVal: number) => {
    const deadzonedBlink = blinkVal < 0.10 ? 0 : (blinkVal - 0.10) / 0.52;
    return clampParameter(Number((1.0 - deadzonedBlink + wideVal * 0.16).toFixed(2)), 0, 1.05);
  };

  const eyeOpenL = computeEyeOpen(boostedBlinkL, wideScreenLeft);
  const eyeOpenR = computeEyeOpen(boostedBlinkR, wideScreenRight);
  const eyeOpen = Number(((eyeOpenL + eyeOpenR) * 0.5).toFixed(2));
  const isBlinkingClosed = eyeOpenL < 0.35 && eyeOpenR < 0.35;

  // Gaze X & Y from MediaPipe eyeLook blendshapes (with deadzone for stability)
  const lookRight = (get('eyeLookOutRight') + get('eyeLookInLeft')) * 0.5;
  const lookLeft = (get('eyeLookOutLeft') + get('eyeLookInRight')) * 0.5;
  const lookUp = (get('eyeLookUpLeft') + get('eyeLookUpRight')) * 0.5;
  const lookDown = (get('eyeLookDownLeft') + get('eyeLookDownRight')) * 0.5;

  const mirrorSign = config.mirrorCamera ? -1 : 1;
  const rawGazeX = (lookRight - lookLeft) * mirrorSign * 1.65;
  const rawGazeY = (lookUp - lookDown) * 1.55;
  const gazeX = clampParameter(Number((Math.abs(rawGazeX) < 0.04 ? 0 : rawGazeX).toFixed(2)), -1, 1);
  const gazeY = clampParameter(Number((Math.abs(rawGazeY) < 0.04 ? 0 : rawGazeY).toFixed(2)), -1, 1);

  // 3. Independent Left & Right Eyebrows (browLY, browRY, browY in -1..+1)
  const browInnerUp = get('browInnerUp');
  const rawOuterUpSubjL = get('browOuterUpLeft');
  const rawOuterUpSubjR = get('browOuterUpRight');
  const rawDownSubjL = get('browDownLeft');
  const rawDownSubjR = get('browDownRight');

  const outerUpScreenL = config.mirrorCamera ? rawOuterUpSubjR : rawOuterUpSubjL;
  const outerUpScreenR = config.mirrorCamera ? rawOuterUpSubjL : rawOuterUpSubjR;
  const downScreenL = config.mirrorCamera ? rawDownSubjR : rawDownSubjL;
  const downScreenR = config.mirrorCamera ? rawDownSubjL : rawDownSubjR;

  const browOuterUp = (outerUpScreenL + outerUpScreenR) * 0.5;
  const browDown = (downScreenL + downScreenR) * 0.5;

  const computeSingleBrow = (outerUpVal: number, downVal: number) => {
    const lift = browInnerUp * 0.72 + outerUpVal * 0.88;
    const furrow = downVal * 1.65;
    const delta = (lift - furrow) * config.browSensitivity * 1.35;
    const dz = Math.abs(delta) < 0.03 ? 0 : delta;
    return clampParameter(Number(Math.tanh(dz * 1.15).toFixed(2)), -1, 1);
  };

  const browLY = computeSingleBrow(outerUpScreenL, downScreenL);
  const browRY = computeSingleBrow(outerUpScreenR, downScreenR);
  const browY = clampParameter(Number(((browLY + browRY) * 0.5).toFixed(2)), -1, 1);
  const browLift = browInnerUp * 0.62 + browOuterUp * 0.72;

  // 4. Mouth Open & Mouth Form — STRICT SILENCE & JAW DEADZONE (Never opens when user is silent!)
  const jawOpen = get('jawOpen');
  const mouthClose = get('mouthClose');
  const smileL = get('mouthSmileLeft');
  const smileR = get('mouthSmileRight');
  const smileAvg = (smileL + smileR) * 0.5;
  const pucker = get('mouthPucker');
  const funnel = get('mouthFunnel');
  const frown = (get('mouthFrownLeft') + get('mouthFrownRight')) * 0.5;
  const mouthShrugLower = get('mouthShrugLower');
  const mouthPress = (get('mouthPressLeft') + get('mouthPressRight')) * 0.5;
  const noseSneer = (get('noseSneerLeft') + get('noseSneerRight')) * 0.5;

  // Crucial fix: MediaPipe jawOpen has 0.05..0.17 resting noise when mouth is shut.
  // Subtract 0.18 deadzone and NEVER add funnel to mouthOpen!
  const effectiveJaw = Math.max(0, jawOpen - mouthClose * 0.65 - 0.18) / 0.58;
  const camMouthOpen = clampParameter(effectiveJaw * config.mouthSensitivity, 0.0, 0.96);

  const camMouthForm = clampParameter(
    0.35 + smileAvg * 1.05 - (pucker * 0.95 + funnel * 0.65) - (frown * 0.85 + mouthShrugLower * 0.45),
    -1,
    1
  );

  const hasMicVoice = Boolean(micFrame && micFrame.rms > 0.02 && micFrame.mouthOpenY > 0.04);
  let mouthOpenY = 0.0;
  let mouthForm = Number(camMouthForm.toFixed(3));

  if (hasMicVoice && micFrame) {
    // Voice is active: combine voice amplitude with camera jaw opening
    mouthOpenY = Number(Math.max(camMouthOpen * 0.88, micFrame.mouthOpenY).toFixed(3));
    mouthForm = Number((camMouthForm * 0.62 + micFrame.mouthForm * 0.38).toFixed(3));
  } else if (config.voiceGatedMouth) {
    // When silent in voiceGatedMouth mode, ignore resting noise (< 0.18) and smoothly open when user opens jaw deliberately
    mouthOpenY = camMouthOpen > 0.18 ? Number(((camMouthOpen - 0.08) * 0.95).toFixed(3)) : 0.0;
  } else {
    mouthOpenY = camMouthOpen < 0.04 ? 0.0 : Number(camMouthOpen.toFixed(3));
  }

  // 5. Eye Smile & Cheek Blush
  const eyeSmile = clampParameter(
    Number((0.16 + smileAvg * 0.68 + ((squintL + squintR) * 0.5) * 0.35).toFixed(2)),
    0,
    1
  );
  const cheekBlush = clampParameter(Number((0.12 + smileAvg * 0.60).toFixed(2)), 0, 1);

  // 6. All 9 Emotions Mapped from Real Human Facial Mimicry (or Manual Override)
  let detectedEmotion: EmotionPresetId = 'neutral';
  let emotionConfidence = 0.75;

  if (config.manualEmotionOverride) {
    detectedEmotion = config.manualEmotionOverride;
    emotionConfidence = 1.0;
  } else if (config.autoEmotionFromFace) {
    const eyeDiff = Math.abs(eyeOpenL - eyeOpenR);
    const isOneEyeWinking =
      eyeDiff > 0.28 && Math.min(eyeOpenL, eyeOpenR) < 0.48 && Math.max(eyeOpenL, eyeOpenR) > 0.58;
    const browAsymmetry = Math.max(
      Math.abs(rawOuterUpSubjL - rawOuterUpSubjR),
      Math.abs(browLY - browRY) * 0.65
    );

    if (isOneEyeWinking) {
      detectedEmotion = 'wink';
      emotionConfidence = clampParameter(0.65 + eyeDiff * 0.5, 0.5, 1.0);
    } else if (smileAvg > 0.38 && (mouthOpenY > 0.24 || jawOpen > 0.28)) {
      detectedEmotion = 'laugh';
      emotionConfidence = clampParameter(smileAvg + mouthOpenY * 0.5, 0.5, 1.0);
    } else if (
      (smileAvg > 0.20 && smileAvg <= 0.52 && (Math.abs(angleZ) > 5.0 || gazeY < -0.14)) ||
      (mouthPress > 0.28 && smileAvg > 0.16)
    ) {
      // Shy smile + head tilt or downward gaze or lip press -> Embarrassed / Blush
      detectedEmotion = 'embarrassed';
      emotionConfidence = 0.82;
    } else if (smileAvg > 0.30) {
      detectedEmotion = 'joy';
      emotionConfidence = clampParameter(0.55 + smileAvg * 0.8, 0.5, 1.0);
    } else if ((browDown > 0.18 || noseSneer > 0.24 || browY < -0.26) && smileAvg < 0.22) {
      detectedEmotion = 'angry';
      emotionConfidence = clampParameter(0.6 + browDown * 1.1, 0.5, 1.0);
    } else if (
      (browLift > 0.28 && (wideL + wideR > 0.18 || jawOpen > 0.25 || mouthOpenY > 0.26)) ||
      (jawOpen > 0.36 && browLift > 0.18 && smileAvg < 0.24)
    ) {
      detectedEmotion = 'surprise';
      emotionConfidence = clampParameter(0.65 + browLift * 0.7, 0.5, 1.0);
    } else if (
      frown > 0.20 ||
      (mouthShrugLower > 0.28 && smileAvg < 0.18) ||
      (browInnerUp > 0.28 && smileAvg < 0.18 && browOuterUp < 0.22)
    ) {
      detectedEmotion = 'sad';
      emotionConfidence = clampParameter(0.62 + Math.max(frown, browInnerUp) * 0.8, 0.5, 1.0);
    } else if (
      browAsymmetry > 0.18 ||
      (Math.abs(gazeX) > 0.24 && gazeY > 0.12 && smileAvg < 0.22) ||
      (pucker > 0.28 && smileAvg < 0.22)
    ) {
      detectedEmotion = 'thinking';
      emotionConfidence = clampParameter(0.62 + Math.max(browAsymmetry, pucker) * 0.8, 0.5, 1.0);
    } else {
      detectedEmotion = 'neutral';
      emotionConfidence = 0.75;
    }
  }

  // Organic breathing wave on shoulders
  const breathWave = Number((Math.sin(nowMs * 0.0018) * 0.12).toFixed(2));

  const activeSlideIndex = mouthOpenY > 0.03 ? resolveClosestSlide48(mouthOpenY, mouthForm) : 0;
  const activeVowel = mouthOpenY > 0.03 ? resolveAnimeVisemeKey(mouthOpenY, mouthForm) : 'SILENT';

  return {
    params: {
      angleX,
      angleY,
      angleZ,
      eyeOpen,
      eyeOpenL,
      eyeOpenR,
      eyeSmile,
      gazeX,
      gazeY,
      browY,
      browLY,
      browRY,
      mouthOpenY,
      mouthForm,
      cheekBlush,
      breath: Number(((breathWave + 0.12) / 0.24).toFixed(2)),
      shoulderY: breathWave,
      handGesture: 'none'
    },
    eyeOpenL,
    eyeOpenR,
    browLY,
    browRY,
    detectedEmotion,
    emotionConfidence: Number(emotionConfidence.toFixed(2)),
    activeSlideIndex,
    activeVowel,
    isBlinkingClosed,
    rawEuler
  };
}

/**
 * Leaky-integrator emotion confidence accumulator across all 9 emotions.
 * Responds quickly (~180ms) to deliberate facial mimicry while preventing single-frame webcam flicker.
 */
export function stepEmotionConfidenceAccumulator(
  scores: Record<EmotionPresetId, number>,
  currentActive: EmotionPresetId,
  detected: EmotionPresetId,
  confidence: number,
  dtMs: number
): EmotionPresetId {
  const dtSec = Math.max(0.005, Math.min(0.1, dtMs / 1000));
  const decay = Math.exp(-dtSec * 5.2);
  const boost = dtSec * (4.4 + confidence * 2.4);

  const allEmotions: EmotionPresetId[] = [
    'neutral',
    'joy',
    'laugh',
    'wink',
    'embarrassed',
    'thinking',
    'surprise',
    'sad',
    'angry'
  ];

  let bestEmotion: EmotionPresetId = currentActive;
  let bestScore = -1;

  for (let i = 0; i < allEmotions.length; i++) {
    const em = allEmotions[i];
    let val = (scores[em] ?? (em === 'neutral' ? 0.5 : 0)) * decay;
    if (em === detected) {
      // Fast response for winks and surprises
      const fastMultiplier = em === 'wink' || em === 'surprise' ? 1.45 : 1.0;
      val += boost * fastMultiplier;
    }
    scores[em] = Math.min(1.0, val);
    if (scores[em] > bestScore) {
      bestScore = scores[em];
      bestEmotion = em;
    }
  }

  const currentScore = scores[currentActive] ?? 0;
  // Switch as soon as the new emotion exceeds the active emotion by a small margin (0.14) and crosses 0.42
  if (bestEmotion !== currentActive && bestScore >= 0.42 && bestScore - currentScore >= 0.14) {
    return bestEmotion;
  }
  return currentActive;
}

/**
 * Velocity-clamped One-Euro adaptive damper for 60 FPS Live2D parameters.
 * Eliminates micro-jitter at rest while keeping deliberate movements smooth and never jerky.
 */
export function dampParameterAdaptive(
  current: number,
  target: number,
  baseAlpha: number,
  deadzone: number,
  maxStepPerFrame: number
): number {
  const diff = target - current;
  if (Math.abs(diff) <= deadzone) {
    return current + diff * (baseAlpha * 0.25);
  }
  // Adaptive gain: small movements use lower alpha (anti-jitter), larger movements use baseAlpha
  const adaptiveScale = Math.min(1.0, Math.abs(diff) / (deadzone * 6));
  const effectiveAlpha = baseAlpha * (0.35 + 0.65 * adaptiveScale);
  const rawStep = diff * effectiveAlpha;
  const clampedStep = Math.max(-maxStepPerFrame, Math.min(maxStepPerFrame, rawStep));
  return current + clampedStep;
}

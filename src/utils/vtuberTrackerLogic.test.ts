import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractHeadEulerFromMatrix,
  analyzeFrequencySpectrumToMouth,
  mapBlendshapesToRigState,
  dampParameterAdaptive,
  DEFAULT_VTUBER_TRACKER_CONFIG
} from './vtuberTrackerLogic';

test('extractHeadEulerFromMatrix returns 0° for identity matrix and clamps rotations accurately', () => {
  const identity = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ];
  const euler = extractHeadEulerFromMatrix(identity, true);
  assert.equal(Math.abs(euler.angleX), 0);
  assert.equal(Math.abs(euler.angleY), 0);
  assert.equal(Math.abs(euler.angleZ), 0);
});

test('analyzeFrequencySpectrumToMouth detects silence below noiseGate and maps vowel formants above gate', () => {
  const silentBins = new Uint8Array(256).fill(2);
  const silentResult = analyzeFrequencySpectrumToMouth(silentBins, 48000, 0.06, 1.25);
  assert.equal(silentResult.vowel, 'SILENT');
  assert.equal(silentResult.mouthOpenY, 0);
  assert.equal(silentResult.slideIndex, 0);

  // Simulate bright high-frequency formant ('I' / 'E')
  const brightBins = new Uint8Array(256).fill(15);
  for (let i = 16; i <= 30; i++) {
    brightBins[i] = 210; // ~1500-2800 Hz at 48kHz / 512 FFT
  }
  const brightResult = analyzeFrequencySpectrumToMouth(brightBins, 48000, 0.05, 1.25);
  assert.ok(brightResult.mouthOpenY > 0.2);
  assert.ok(brightResult.mouthForm > 0.45);
  assert.ok(brightResult.slideIndex > 0);
});

test('mapBlendshapesToRigState keeps mouth strictly closed (0.0) when silent despite webcam jaw/funnel noise', () => {
  const zeroEuler = { angleX: 0, angleY: 0, angleZ: 0 };
  const noisyRestFrame = mapBlendshapesToRigState(
    {
      jawOpen: 0.15,
      mouthFunnel: 0.14,
      mouthClose: 0.02
    },
    zeroEuler
  );
  assert.equal(noisyRestFrame.params.mouthOpenY, 0);
  assert.equal(noisyRestFrame.activeVowel, 'SILENT');
  assert.equal(noisyRestFrame.activeSlideIndex, 0);
});

test('mapBlendshapesToRigState tracks independent left and right eye winking (eyeOpenL vs eyeOpenR)', () => {
  const zeroEuler = { angleX: 0, angleY: 0, angleZ: 0 };

  // Close anatomical right eye (screen-left in mirrored mode)
  const leftWink = mapBlendshapesToRigState(
    {
      eyeBlinkRight: 0.85,
      eyeBlinkLeft: 0.02
    },
    zeroEuler
  );
  assert.ok(leftWink.eyeOpenL < 0.2, `Expected eyeOpenL < 0.2, got ${leftWink.eyeOpenL}`);
  assert.ok(leftWink.eyeOpenR > 0.9, `Expected eyeOpenR > 0.9, got ${leftWink.eyeOpenR}`);
  assert.equal(leftWink.isBlinkingClosed, false);

  // Close anatomical left eye (screen-right in mirrored mode)
  const rightWink = mapBlendshapesToRigState(
    {
      eyeBlinkLeft: 0.85,
      eyeBlinkRight: 0.02
    },
    zeroEuler
  );
  assert.ok(rightWink.eyeOpenR < 0.2, `Expected eyeOpenR < 0.2, got ${rightWink.eyeOpenR}`);
  assert.ok(rightWink.eyeOpenL > 0.9, `Expected eyeOpenL > 0.9, got ${rightWink.eyeOpenL}`);
});

test('mapBlendshapesToRigState maps all 9 emotions accurately without buttons', () => {
  const zeroEuler = { angleX: 0, angleY: 0, angleZ: 0 };

  // 1. Joy
  const joyFrame = mapBlendshapesToRigState(
    { mouthSmileLeft: 0.72, mouthSmileRight: 0.72, jawOpen: 0.12 },
    zeroEuler
  );
  assert.equal(joyFrame.detectedEmotion, 'joy');

  // 2. Laugh (big smile + open jaw)
  const laughFrame = mapBlendshapesToRigState(
    { mouthSmileLeft: 0.75, mouthSmileRight: 0.75, jawOpen: 0.55 },
    zeroEuler
  );
  assert.equal(laughFrame.detectedEmotion, 'laugh');

  // 3. Wink (one eye closed + smile)
  const winkFrame = mapBlendshapesToRigState(
    { eyeBlinkLeft: 0.85, eyeBlinkRight: 0.05, mouthSmileLeft: 0.4, mouthSmileRight: 0.4 },
    zeroEuler
  );
  assert.equal(winkFrame.detectedEmotion, 'wink');

  // 4. Embarrassed (shy smile + head tilt)
  const embarrassedFrame = mapBlendshapesToRigState(
    { mouthSmileLeft: 0.36, mouthSmileRight: 0.36 },
    { angleX: 0, angleY: 0, angleZ: 9 }
  );
  assert.equal(embarrassedFrame.detectedEmotion, 'embarrassed');

  // 5. Angry
  const angryFrame = mapBlendshapesToRigState(
    { browDownLeft: 0.7, browDownRight: 0.7, mouthPucker: 0.4 },
    zeroEuler
  );
  assert.equal(angryFrame.detectedEmotion, 'angry');

  // 6. Surprise
  const surpriseFrame = mapBlendshapesToRigState(
    {
      browInnerUp: 0.8,
      browOuterUpLeft: 0.8,
      browOuterUpRight: 0.8,
      eyeWideLeft: 0.6,
      eyeWideRight: 0.6,
      jawOpen: 0.65
    },
    zeroEuler
  );
  assert.equal(surpriseFrame.detectedEmotion, 'surprise');

  // 7. Sad
  const sadFrame = mapBlendshapesToRigState(
    { mouthFrownLeft: 0.5, mouthFrownRight: 0.5, browInnerUp: 0.5 },
    zeroEuler
  );
  assert.equal(sadFrame.detectedEmotion, 'sad');

  // 8. Thinking
  const thinkingFrame = mapBlendshapesToRigState(
    { browOuterUpLeft: 0.55, browOuterUpRight: 0.05 },
    zeroEuler
  );
  assert.equal(thinkingFrame.detectedEmotion, 'thinking');
});

test('mapBlendshapesToRigState applies zero-calibration offset and dampParameterAdaptive clamps velocity', () => {
  const rawTilted = { angleX: 12, angleY: -8, angleZ: 9 };
  const calibratedConfig = {
    ...DEFAULT_VTUBER_TRACKER_CONFIG,
    calibrationOffset: { angleX: 12, angleY: -8, angleZ: 9 }
  };
  const frame = mapBlendshapesToRigState({}, rawTilted, null, calibratedConfig);
  assert.equal(frame.params.angleX, 0);
  assert.equal(frame.params.angleY, 0);
  assert.equal(frame.params.angleZ, 0);

  // Large sudden jump of 25 degrees should be clamped by maxStepPerFrame (1.8 deg)
  const damped = dampParameterAdaptive(0, 25, 0.3, 0.5, 1.8);
  assert.ok(damped <= 1.8001 && damped > 0);
});

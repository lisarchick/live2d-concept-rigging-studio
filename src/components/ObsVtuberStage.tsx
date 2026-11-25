import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Live2DParameterState,
  EMOTION_PRESETS,
  EXPRESSION_SPRITE_MAP,
  CUTOUT_VISEME_SLIDES_48,
  EmotionPresetId,
  clampParameter,
  resolveClosestSlide48,
  resolveAnimeVisemeKey
} from '../utils/conceptLogic';
import {
  VtuberTrackerFrameState,
  HeadEulerAngles,
  DEFAULT_VTUBER_TRACKER_CONFIG,
  extractHeadEulerFromMatrix,
  analyzeFrequencySpectrumToMouth,
  mapBlendshapesToRigState,
  stepEmotionConfidenceAccumulator,
  dampParameterAdaptive,
  createDefaultVtuberFrameState
} from '../utils/vtuberTrackerLogic';
import {
  warpImageDataSeamless,
  enhanceAnimeSpriteSheet,
  applySeamlessEyelidRig
} from './Live2DPrototypeRig';
import {
  Camera,
  Mic,
  Maximize2,
  Minimize2,
  RotateCcw,
  Copy,
  Check,
  Sparkles,
  Eye,
  Volume2,
  MonitorPlay,
  FlipHorizontal2,
  Radio,
  Smile,
  ShieldCheck
} from 'lucide-react';

const EXPRESSIONS_CUTOUT_URL = '/assets/aistudio/alisa_expressions_cutout.png';
const EXPRESSIONS_MOUTHLESS_CUTOUT_URL = '/assets/aistudio/alisa_expressions_mouthless_cutout.png';
const VISEMES_48_CUTOUT_URL = '/assets/aistudio/alisa_visemes_48_cutout.png';
const BLINK_CLOSED_EYES_URL = '/assets/aistudio/alisa_blink_closed_eyes.png';

const CELL_SIZE = 334;
const CANVAS_INTERNAL_SIZE = 668;

export type ObsBgMode = 'transparent' | 'chroma_green' | 'chroma_blue' | 'dark_studio';
export type TrackingSourceMode = 'camera_and_mic' | 'mic_only' | 'auto_demo' | 'obs_receiver';

interface ObsVtuberStageProps {
  /** If true, renders as a 100% full-viewport OBS Browser Source / Clean Stage without any page chrome */
  isObsPureView?: boolean;
  onExitCleanMode?: () => void;
}

const ALL_9_EMOTIONS: Array<{ id: EmotionPresetId; label: string; short: string; key: string; mimicHint: string }> = [
  { id: 'neutral', label: 'Спокойствие (Neutral)', short: 'Спокойствие', key: '1', mimicHint: 'Спокойное лицо' },
  { id: 'joy', label: 'Радость (Joy)', short: 'Радость', key: '2', mimicHint: 'Улыбка губами' },
  { id: 'laugh', label: 'Смех (Laugh)', short: 'Смех', key: '3', mimicHint: 'Улыбка + открытый рот' },
  { id: 'wink', label: 'Подмигивание (Wink)', short: 'Подмигивание', key: '4', mimicHint: 'Закрыть один глаз' },
  { id: 'embarrassed', label: 'Смущение (Blush)', short: 'Смущение', key: '5', mimicHint: 'Улыбка + наклон головы' },
  { id: 'thinking', label: 'Задумчивость (Thinking)', short: 'Задумчивость', key: '6', mimicHint: 'Поднять одну бровь / губы' },
  { id: 'surprise', label: 'Удивление (Surprise)', short: 'Удивление', key: '7', mimicHint: 'Брови вверх + рот О' },
  { id: 'sad', label: 'Грусть (Sad)', short: 'Грусть', key: '8', mimicHint: 'Уголки губ вниз / брови домиком' },
  { id: 'angry', label: 'Злость (Angry)', short: 'Злость', key: '9', mimicHint: 'Нахмурить брови к переносице' }
];

const EMOTION_LABELS_RU: Record<EmotionPresetId, string> = {
  neutral: 'Спокойствие (Neutral)',
  joy: 'Радость (Joy)',
  laugh: 'Смех (Laugh)',
  wink: 'Подмигивание (Wink)',
  embarrassed: 'Смущение (Blush)',
  thinking: 'Задумчивость (Thinking)',
  surprise: 'Удивление (Surprise)',
  sad: 'Грусть (Sad)',
  angry: 'Злость (Angry)'
};

export const ObsVtuberStage: React.FC<ObsVtuberStageProps> = ({
  isObsPureView = false,
  onExitCleanMode
}) => {
  const [trackingMode, setTrackingMode] = useState<TrackingSourceMode>(
    isObsPureView ? 'obs_receiver' : 'auto_demo'
  );
  const [bgMode, setBgMode] = useState<ObsBgMode>(
    isObsPureView ? 'transparent' : 'dark_studio'
  );
  const [isCleanScreen, setIsCleanScreen] = useState<boolean>(isObsPureView);
  const [showFloatingHud, setShowFloatingHud] = useState<boolean>(false);
  const [mirrorCamera, setMirrorCamera] = useState<boolean>(true);
  const [avatarScale, setAvatarScale] = useState<number>(1.0);
  const [micGain, setMicGain] = useState<number>(1.45);
  const [noiseGate, setNoiseGate] = useState<number>(0.048);
  const [smoothingAlpha, setSmoothingAlpha] = useState<number>(0.24);
  const [voiceGatedMouth, setVoiceGatedMouth] = useState<boolean>(true);
  const [manualEmotion, setManualEmotion] = useState<EmotionPresetId | null>(null);
  const [demoMimicryExpression, setDemoMimicryExpression] = useState<EmotionPresetId>('neutral');
  const [demoWinkSide, setDemoWinkSide] = useState<'none' | 'left' | 'right' | 'both'>('none');
  const [demoSpeechActive, setDemoSpeechActive] = useState<boolean>(false);
  const [copiedObsUrl, setCopiedObsUrl] = useState<boolean>(false);
  const [trackerError, setTrackerError] = useState<string | null>(null);
  const [isLoadingMediaPipe, setIsLoadingMediaPipe] = useState<boolean>(false);
  const [wsConnectedCount, setWsConnectedCount] = useState<boolean>(false);
  const [showCameraPreview, setShowCameraPreview] = useState<boolean>(true);

  const [telemetry, setTelemetry] = useState<VtuberTrackerFrameState>(() =>
    createDefaultVtuberFrameState()
  );

  // Refs for 60 FPS animation loop & MediaPipe / Audio
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevEmotionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const warpCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const warpedImageDataRef = useRef<ImageData | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Pre-sharpened HD sprite sheet canvases (CAS + Dark Ink crispness)
  const imagesRef = useRef<{
    expressions: HTMLCanvasElement | HTMLImageElement | null;
    mouthless: HTMLCanvasElement | HTMLImageElement | null;
    visemes48: HTMLCanvasElement | HTMLImageElement | null;
    blink: HTMLCanvasElement | HTMLImageElement | null;
  }>({
    expressions: null,
    mouthless: null,
    visemes48: null,
    blink: null
  });

  const currentParamsRef = useRef<Live2DParameterState>({
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
  });

  const currentEyeOpenRef = useRef<{ left: number; right: number }>({ left: 1.0, right: 1.0 });

  // Leaky-integrator emotion confidence scores for responsive, flicker-free facial emotion detection
  const emotionScoresRef = useRef<Record<EmotionPresetId, number>>({
    neutral: 0.8,
    joy: 0,
    laugh: 0,
    wink: 0,
    embarrassed: 0,
    thinking: 0,
    surprise: 0,
    sad: 0,
    angry: 0
  });

  // Emotion smooth crossfade state (prevents jerky emotion snapping!)
  const emotionTransitionRef = useRef<{
    prevEmotion: EmotionPresetId;
    activeEmotion: EmotionPresetId;
    blendProgress: number; // 0..1 (1 = fully activeEmotion)
    candidateEmotion: EmotionPresetId;
    candidateSinceMs: number;
    lastSwitchMs: number;
  }>({
    prevEmotion: 'neutral',
    activeEmotion: 'neutral',
    blendProgress: 1.0,
    candidateEmotion: 'neutral',
    candidateSinceMs: 0,
    lastSwitchMs: 0
  });

  // Pre-smoothed webcam blendshapes & Euler angles (Stage-1 low-pass filter to kill webcam noise)
  const smoothedBlendshapesRef = useRef<Record<string, number>>({});
  const smoothedEulerRef = useRef<HeadEulerAngles>({ angleX: 0, angleY: 0, angleZ: 0 });

  const targetFrameRef = useRef<VtuberTrackerFrameState>(createDefaultVtuberFrameState());
  const lastExternalFrameTimeRef = useRef<number>(0);
  const lastHttpPostTimeRef = useRef<number>(0);
  const rawHeadEulerRef = useRef<HeadEulerAngles>({ angleX: 0, angleY: 0, angleZ: 0 });
  const calibrationOffsetRef = useRef<HeadEulerAngles>({ angleX: 0, angleY: 0, angleZ: 0 });

  // MediaPipe & Audio resources
  const faceLandmarkerRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const freqBufferRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  const settingsRef = useRef({
    trackingMode,
    mirrorCamera,
    micGain,
    noiseGate,
    smoothingAlpha,
    voiceGatedMouth,
    manualEmotion,
    demoMimicryExpression,
    demoWinkSide,
    demoSpeechActive
  });

  useEffect(() => {
    settingsRef.current = {
      trackingMode,
      mirrorCamera,
      micGain,
      noiseGate,
      smoothingAlpha,
      voiceGatedMouth,
      manualEmotion,
      demoMimicryExpression,
      demoWinkSide,
      demoSpeechActive
    };
  }, [
    trackingMode,
    mirrorCamera,
    micGain,
    noiseGate,
    smoothingAlpha,
    voiceGatedMouth,
    manualEmotion,
    demoMimicryExpression,
    demoWinkSide,
    demoSpeechActive
  ]);

  // Keyboard shortcuts: H toggles clean screen, 0 = Auto Emotion, 1..9 = All 9 emotions
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'h' || e.key === 'H' || e.key === 'р' || e.key === 'Р') {
        setIsCleanScreen((prev) => !prev);
      } else if (e.key === 'Escape' && isCleanScreen && !isObsPureView) {
        setIsCleanScreen(false);
      } else if (e.key === '0') {
        setManualEmotion(null);
      } else {
        const found = ALL_9_EMOTIONS.find((em) => em.key === e.key);
        if (found) {
          setManualEmotion(found.id);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCleanScreen, isObsPureView]);

  // Connect WebSocket + BroadcastChannel for real-time OBS Browser Source synchronization
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('alisa_obs_vtuber_sync');
      broadcastChannelRef.current = bc;
      bc.onmessage = (ev) => {
        if (settingsRef.current.trackingMode === 'obs_receiver' && ev.data?.type === 'vtuber:frame') {
          lastExternalFrameTimeRef.current = performance.now();
          targetFrameRef.current = ev.data.frame as VtuberTrackerFrameState;
        }
      };
    } catch {
      // BroadcastChannel not supported in some contexts
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws/obs-sync`;
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;

    const connectWs = () => {
      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onopen = () => setWsConnectedCount(true);
        ws.onclose = () => {
          setWsConnectedCount(false);
          reconnectTimer = window.setTimeout(connectWs, 2000);
        };
        ws.onmessage = (event) => {
          if (settingsRef.current.trackingMode !== 'obs_receiver') return;
          try {
            const parsed = JSON.parse(String(event.data));
            if (parsed?.type === 'vtuber:frame' && parsed.frame) {
              lastExternalFrameTimeRef.current = performance.now();
              targetFrameRef.current = parsed.frame as VtuberTrackerFrameState;
            }
          } catch {
            // ignore malformed frame
          }
        };
      } catch {
        // ignore ws error
      }
    };

    connectWs();

    return () => {
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (ws) ws.close();
      if (bc) bc.close();
    };
  }, []);

  // Broadcast frame helper (called from active tracker loop)
  const broadcastTrackerFrame = useCallback((frame: VtuberTrackerFrameState) => {
    const payload = { type: 'vtuber:frame', frame };
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage(payload);
      } catch {
        // ignore
      }
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(payload));
      } catch {
        // ignore
      }
    } else {
      const now = performance.now();
      if (now - lastHttpPostTimeRef.current > 100) {
        lastHttpPostTimeRef.current = now;
        fetch('/api/vtuber/frame', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {});
      }
    }
  }, []);

  // Cleanup active media streams
  const stopMediaStreams = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  // Initialize MediaPipe FaceLandmarker lazily
  const ensureFaceLandmarker = useCallback(async () => {
    if (faceLandmarkerRef.current) return faceLandmarkerRef.current;
    setIsLoadingMediaPipe(true);
    try {
      const vision = await import('@mediapipe/tasks-vision');
      const filesetResolver = await vision.FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
      );
      const landmarker = await vision.FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU'
        },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode: 'VIDEO',
        numFaces: 1
      });
      faceLandmarkerRef.current = landmarker;
      setIsLoadingMediaPipe(false);
      return landmarker;
    } catch (err) {
      setIsLoadingMediaPipe(false);
      throw err;
    }
  }, []);

  // Start Camera + Mic or Mic-Only tracking
  const startHardwareTracking = useCallback(
    async (mode: 'camera_and_mic' | 'mic_only') => {
      setTrackerError(null);
      stopMediaStreams();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video:
            mode === 'camera_and_mic'
              ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 60 } }
              : false,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        mediaStreamRef.current = stream;

        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioCtx = new AudioCtx();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.62;
        source.connect(analyser);
        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;
        freqBufferRef.current = new Uint8Array(analyser.frequencyBinCount);

        if (mode === 'camera_and_mic') {
          await ensureFaceLandmarker();
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
          }
        }

        setTrackingMode(mode);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Не удалось получить доступ к камере или микрофону.';
        setTrackerError(
          `Доступ к камере/микрофону не получен (${msg}). Проверьте разрешения браузера или включите режим «Только микрофон» / «Демо-режим».`
        );
        setTrackingMode('auto_demo');
      }
    },
    [ensureFaceLandmarker, stopMediaStreams]
  );

  // Calibrate current head pose as 0° center
  const handleCalibrateZeroPose = () => {
    calibrationOffsetRef.current = { ...rawHeadEulerRef.current };
  };

  // Copy OBS Browser Source URL (?obs=view)
  const handleCopyObsBrowserUrl = async () => {
    const url = `${window.location.origin}${window.location.pathname}?obs=view`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // ignore clipboard fallback
    }
    setCopiedObsUrl(true);
    window.setTimeout(() => setCopiedObsUrl(false), 2000);
  };

  // Helper to composite a single emotion + mouth + independent left/right closed eyelids onto a 334x334 offscreen context
  const compositeCharacterCell = (
    targetCtx: CanvasRenderingContext2D,
    emotionId: EmotionPresetId,
    mouthOpenY: number,
    mouthForm: number,
    eyeOpenL: number,
    eyeOpenR: number,
    imgs: typeof imagesRef.current
  ) => {
    if (!imgs.expressions || !imgs.mouthless) return;

    // If auto-detected 'wink' is active during live single-eye tracking, use 'neutral' as the base face so whichever eye (left OR right!) the user actually closed is controlled by eyeOpenL/eyeOpenR while the other eye stays open
    const effectiveBaseEmotion: EmotionPresetId =
      emotionId === 'wink' && (eyeOpenL < 0.55 || eyeOpenR < 0.55) && Math.abs(eyeOpenL - eyeOpenR) > 0.25
        ? 'neutral'
        : emotionId;

    const spriteSpec = EXPRESSION_SPRITE_MAP[effectiveBaseEmotion] ?? EXPRESSION_SPRITE_MAP.neutral;
    const srcX = spriteSpec.col * CELL_SIZE;
    const srcY = spriteSpec.row * CELL_SIZE;

    targetCtx.clearRect(0, 0, CELL_SIZE, CELL_SIZE);

    // Smooth mouth crossfade: below 0.03 mouth is 100% closed painted expression; above 0.03 smoothly blends mouthless + 48-slide viseme
    const mouthBlendAlpha = clampParameter((mouthOpenY - 0.025) / 0.055, 0, 1);

    if (mouthBlendAlpha < 0.99) {
      targetCtx.globalAlpha = 1.0;
      targetCtx.drawImage(
        imgs.expressions,
        srcX,
        srcY,
        CELL_SIZE,
        CELL_SIZE,
        0,
        0,
        CELL_SIZE,
        CELL_SIZE
      );
    }

    if (mouthBlendAlpha > 0.01 && imgs.visemes48) {
      targetCtx.save();
      targetCtx.globalAlpha = mouthBlendAlpha;
      targetCtx.drawImage(
        imgs.mouthless,
        srcX,
        srcY,
        CELL_SIZE,
        CELL_SIZE,
        0,
        0,
        CELL_SIZE,
        CELL_SIZE
      );

      const slideIdx = Math.max(0, Math.min(47, resolveClosestSlide48(mouthOpenY, mouthForm)));
      const slideSpec = CUTOUT_VISEME_SLIDES_48[slideIdx] ?? CUTOUT_VISEME_SLIDES_48[0];
      const scaleX = 1 + slideSpec.form * 0.022;
      const scaleY = 0.98 + slideSpec.openY * 0.04;

      targetCtx.translate(167, 211);
      targetCtx.scale(scaleX, scaleY);
      targetCtx.translate(-167, -211);
      targetCtx.drawImage(
        imgs.visemes48,
        slideIdx * CELL_SIZE,
        0,
        CELL_SIZE,
        CELL_SIZE,
        0,
        0,
        CELL_SIZE,
        CELL_SIZE
      );
      targetCtx.restore();
    }

    // Self-Skin-Adaptive Continuous Eyelid Rig:
    // Smoothly lowers or closes left (eyeOpenL) and/or right (eyeOpenR) eyelids on ANY of the 9 emotions
    // using that emotion's own local skin/blush pixels and anti-aliased eyelash curve (zero foreign sprite seams!)
    if (eyeOpenL < 0.93 || eyeOpenR < 0.93) {
      const cellImgData = targetCtx.getImageData(0, 0, CELL_SIZE, CELL_SIZE);
      applySeamlessEyelidRig(cellImgData.data, eyeOpenL, eyeOpenR, effectiveBaseEmotion);
      targetCtx.putImageData(cellImgData, 0, 0);
    }
  };

  // Load 4 sprite sheets (enhanced with Contrast-Adaptive Anime Sharpening) and run 60 FPS loop
  useEffect(() => {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = CELL_SIZE;
    offCanvas.height = CELL_SIZE;
    offscreenCanvasRef.current = offCanvas;

    const prevEmCanvas = document.createElement('canvas');
    prevEmCanvas.width = CELL_SIZE;
    prevEmCanvas.height = CELL_SIZE;
    prevEmotionCanvasRef.current = prevEmCanvas;

    // Native 668x668 HD Warp Destination Buffer (eliminates 334->668 double-resampling blur!)
    const warpCanvas = document.createElement('canvas');
    warpCanvas.width = CANVAS_INTERNAL_SIZE;
    warpCanvas.height = CANVAS_INTERNAL_SIZE;
    warpCanvasRef.current = warpCanvas;

    const warpCtx = warpCanvas.getContext('2d');
    if (warpCtx) {
      warpedImageDataRef.current = warpCtx.createImageData(
        CANVAS_INTERNAL_SIZE,
        CANVAS_INTERNAL_SIZE
      );
    }

    const loadImg = (url: string, key: keyof typeof imagesRef.current, sharpness = 0.72) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          imagesRef.current[key] = enhanceAnimeSpriteSheet(img, sharpness);
        } catch {
          imagesRef.current[key] = img;
        }
      };
      img.src = url;
    };

    loadImg(EXPRESSIONS_CUTOUT_URL, 'expressions', 0.75);
    loadImg(EXPRESSIONS_MOUTHLESS_CUTOUT_URL, 'mouthless', 0.75);
    loadImg(VISEMES_48_CUTOUT_URL, 'visemes48', 0.65);
    loadImg(BLINK_CLOSED_EYES_URL, 'blink', 0.70);

    let rafId = 0;
    let lastVideoTime = -1;
    let lastTelemetryTick = 0;
    let lastFrameMs = performance.now();

    const renderLoop = (nowMs: number) => {
      const dtMs = Math.min(50, Math.max(1, nowMs - lastFrameMs));
      lastFrameMs = nowMs;
      const cfg = settingsRef.current;
      const tSec = nowMs * 0.001;

      // 1. Sample Microphone Audio Spectrum if active
      let audioResult = analyzeFrequencySpectrumToMouth(
        new Uint8Array(0),
        48000,
        cfg.noiseGate,
        cfg.micGain
      );
      if (analyserRef.current && freqBufferRef.current && audioContextRef.current) {
        analyserRef.current.getByteFrequencyData(freqBufferRef.current);
        audioResult = analyzeFrequencySpectrumToMouth(
          freqBufferRef.current,
          audioContextRef.current.sampleRate,
          cfg.noiseGate,
          cfg.micGain
        );
      }
      const isSpeakingNow = audioResult.rms > 0.02 && audioResult.mouthOpenY > 0.04;

      const trackerConfig = {
        ...DEFAULT_VTUBER_TRACKER_CONFIG,
        mirrorCamera: cfg.mirrorCamera,
        micNoiseGate: cfg.noiseGate,
        micBoost: cfg.micGain,
        voiceGatedMouth: cfg.voiceGatedMouth,
        manualEmotionOverride: cfg.manualEmotion,
        calibrationOffset: calibrationOffsetRef.current
      };

      // 2. Compute Target Frame according to active mode
      if (cfg.trackingMode === 'camera_and_mic') {
        const video = videoRef.current;
        const landmarker = faceLandmarkerRef.current;
        if (video && landmarker && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          try {
            const result = landmarker.detectForVideo(video, nowMs);
            const hasFace =
              result?.faceBlendshapes &&
              result.faceBlendshapes.length > 0 &&
              result.faceBlendshapes[0].categories;

            if (hasFace) {
              const categories = result.faceBlendshapes[0].categories as Array<{
                categoryName: string;
                score: number;
              }>;
              // Stage-1 Low-Pass Filter on raw blendshapes to remove camera sensor flicker
              const prevBs = smoothedBlendshapesRef.current;
              for (let i = 0; i < categories.length; i++) {
                const name = categories[i].categoryName;
                const rawScore = categories[i].score;
                const isEyeBlink = name.startsWith('eyeBlink');
                const bsAlpha = isEyeBlink ? 0.68 : 0.34;
                prevBs[name] =
                  prevBs[name] === undefined
                    ? rawScore
                    : prevBs[name] + (rawScore - prevBs[name]) * bsAlpha;
              }

              const matrixData =
                result.facialTransformationMatrixes &&
                result.facialTransformationMatrixes.length > 0
                  ? (result.facialTransformationMatrixes[0].data as number[])
                  : [];

              const rawEuler = extractHeadEulerFromMatrix(matrixData, cfg.mirrorCamera);
              rawHeadEulerRef.current = rawEuler;

              // Stage-1 Low-Pass Filter on raw Euler angles
              const prevEu = smoothedEulerRef.current;
              prevEu.angleX += (rawEuler.angleX - prevEu.angleX) * 0.28;
              prevEu.angleY += (rawEuler.angleY - prevEu.angleY) * 0.28;
              prevEu.angleZ += (rawEuler.angleZ - prevEu.angleZ) * 0.28;

              const mapped = mapBlendshapesToRigState(
                prevBs,
                prevEu,
                audioResult,
                trackerConfig,
                nowMs
              );
              targetFrameRef.current = mapped;
              broadcastTrackerFrame(mapped);
            }
          } catch {
            // keep last valid frame
          }
        } else if (analyserRef.current) {
          // Even between webcam frames (e.g. 30fps cam on 60fps monitor), update voice lip-sync at 60fps!
          const prevMapped = mapBlendshapesToRigState(
            smoothedBlendshapesRef.current,
            smoothedEulerRef.current,
            audioResult,
            trackerConfig,
            nowMs
          );
          targetFrameRef.current = prevMapped;
        }
      } else if (cfg.trackingMode === 'mic_only') {
        // Mic-driven lip-sync + calm, natural harmonic head, eye, and brow movement
        const speakingBoost = isSpeakingNow ? 1.25 : 1.0;
        const angleX = Number((Math.sin(tSec * 0.65) * 4.2 * speakingBoost).toFixed(2));
        const angleY = Number((Math.cos(tSec * 0.52) * 2.8 * speakingBoost).toFixed(2));
        const angleZ = Number((Math.sin(tSec * 0.44) * 2.4 * speakingBoost).toFixed(2));
        const browY = Number(
          clampParameter(
            Math.sin(tSec * 0.8) * 0.10 + (isSpeakingNow ? audioResult.mouthOpenY * 0.24 : 0),
            -0.6,
            0.65
          ).toFixed(3)
        );
        const periodicBlink = Math.sin(tSec * 1.65) > 0.968;
        const mapped = mapBlendshapesToRigState(
          {
            eyeBlinkLeft: periodicBlink ? 0.95 : 0.02,
            eyeBlinkRight: periodicBlink ? 0.95 : 0.02,
            mouthSmileLeft: isSpeakingNow ? 0.28 : 0.18,
            mouthSmileRight: isSpeakingNow ? 0.28 : 0.18,
            browInnerUp: Math.max(0, browY)
          },
          { angleX, angleY, angleZ },
          audioResult,
          { ...trackerConfig, calibrationOffset: { angleX: 0, angleY: 0, angleZ: 0 } },
          nowMs
        );
        targetFrameRef.current = mapped;
        broadcastTrackerFrame(mapped);
      } else if (cfg.trackingMode === 'auto_demo') {
        // Calm, silky-smooth VTuber showcase + Live Mimicry Expression Simulator:
        // Mouth stays CLOSED unless "Тест речи" is active OR a vocal mimicry expression (laugh/surprise) is tested!
        const mimicTarget = cfg.manualEmotion ?? cfg.demoMimicryExpression;

        const simOpenY = cfg.demoSpeechActive
          ? Math.max(0, (Math.sin(tSec * 10.5) * 0.45 + 0.40) * (0.65 + 0.35 * Math.cos(tSec * 3.4)))
          : mimicTarget === 'laugh'
            ? 0.48 + Math.sin(tSec * 7.5) * 0.14
            : mimicTarget === 'surprise'
              ? 0.42
              : 0.0;
        const simForm = cfg.demoSpeechActive
          ? Math.sin(tSec * 4.1) * 0.55
          : mimicTarget === 'surprise'
            ? -0.45
            : 0.4;

        const periodicBlink = cfg.demoWinkSide === 'none' && Math.sin(tSec * 1.75) > 0.972;
        // Remember: in mirrored mode, subject's right eye is screen-left, subject's left eye is screen-right
        const blinkRightSubj =
          cfg.demoWinkSide === 'left' || cfg.demoWinkSide === 'both'
            ? 0.95
            : periodicBlink
              ? 0.95
              : 0.02;
        const blinkLeftSubj =
          cfg.demoWinkSide === 'right' || cfg.demoWinkSide === 'both' || mimicTarget === 'wink'
            ? 0.95
            : periodicBlink
              ? 0.95
              : 0.02;

        const demoMicFrame =
          cfg.demoSpeechActive || mimicTarget === 'laugh' || mimicTarget === 'surprise'
            ? {
                rms: Math.max(0.15, simOpenY * 0.5),
                lowBandEnergy: 0.2,
                midBandEnergy: 0.4,
                highBandEnergy: 0.3,
                mouthOpenY: simOpenY,
                mouthForm: simForm,
                vowel: resolveAnimeVisemeKey(simOpenY, simForm),
                slideIndex: resolveClosestSlide48(simOpenY, simForm)
              }
            : null;

        // Build realistic facial mimicry blendshapes so mapBlendshapesToRigState recognizes the emotion from mimicry!
        const demoBlendshapes: Record<string, number> = {
          jawOpen: simOpenY > 0 ? simOpenY * 0.78 : 0.0,
          mouthSmileLeft:
            mimicTarget === 'laugh'
              ? 0.72
              : mimicTarget === 'joy'
                ? 0.58
                : mimicTarget === 'embarrassed'
                  ? 0.34
                  : mimicTarget === 'wink'
                    ? 0.42
                    : 0.14,
          mouthSmileRight:
            mimicTarget === 'laugh'
              ? 0.72
              : mimicTarget === 'joy'
                ? 0.58
                : mimicTarget === 'embarrassed'
                  ? 0.34
                  : mimicTarget === 'wink'
                    ? 0.42
                    : 0.14,
          mouthFrownLeft: mimicTarget === 'sad' ? 0.52 : mimicTarget === 'angry' ? 0.28 : 0.0,
          mouthFrownRight: mimicTarget === 'sad' ? 0.52 : mimicTarget === 'angry' ? 0.28 : 0.0,
          mouthPucker: mimicTarget === 'thinking' ? 0.44 : 0.0,
          eyeBlinkRight: blinkRightSubj,
          eyeBlinkLeft: blinkLeftSubj,
          eyeWideLeft: mimicTarget === 'surprise' ? 0.55 : 0.0,
          eyeWideRight: mimicTarget === 'surprise' ? 0.55 : 0.0,
          browInnerUp:
            mimicTarget === 'surprise'
              ? 0.68
              : mimicTarget === 'sad'
                ? 0.58
                : (Math.sin(tSec * 0.85) + 1) * 0.08,
          browOuterUpLeft:
            mimicTarget === 'surprise'
              ? 0.65
              : mimicTarget === 'thinking'
                ? 0.52
                : (Math.sin(tSec * 0.85) + 1) * 0.07,
          browOuterUpRight:
            mimicTarget === 'surprise' ? 0.65 : (Math.sin(tSec * 0.85) + 1) * 0.07,
          browDownLeft: mimicTarget === 'angry' ? 0.64 : 0.0,
          browDownRight: mimicTarget === 'angry' ? 0.64 : mimicTarget === 'thinking' ? 0.25 : 0.0,
          eyeLookOutLeft: Math.max(0, Math.sin(tSec * 0.75) * 0.16),
          eyeLookInRight: Math.max(0, Math.sin(tSec * 0.75) * 0.16),
          eyeLookInLeft: Math.max(0, -Math.sin(tSec * 0.75) * 0.16),
          eyeLookOutRight: Math.max(0, -Math.sin(tSec * 0.75) * 0.16),
          eyeLookUpLeft:
            mimicTarget === 'thinking' ? 0.35 : Math.max(0, Math.cos(tSec * 0.6) * 0.12),
          eyeLookUpRight:
            mimicTarget === 'thinking' ? 0.35 : Math.max(0, Math.cos(tSec * 0.6) * 0.12),
          eyeLookDownLeft: mimicTarget === 'embarrassed' ? 0.32 : 0.0,
          eyeLookDownRight: mimicTarget === 'embarrassed' ? 0.32 : 0.0
        };

        const demoFrame = mapBlendshapesToRigState(
          demoBlendshapes,
          {
            angleX: Math.sin(tSec * 0.55) * 5.2,
            angleY: Math.cos(tSec * 0.45) * 3.0,
            angleZ:
              mimicTarget === 'embarrassed'
                ? 8.5 + Math.sin(tSec * 0.5) * 1.5
                : Math.sin(tSec * 0.38) * 2.6
          },
          demoMicFrame,
          { ...trackerConfig, calibrationOffset: { angleX: 0, angleY: 0, angleZ: 0 } },
          nowMs
        );
        targetFrameRef.current = demoFrame;
        broadcastTrackerFrame(demoFrame);
      } else if (cfg.trackingMode === 'obs_receiver') {
        if (nowMs - lastExternalFrameTimeRef.current > 1500) {
          const periodicBlink = Math.sin(tSec * 1.75) > 0.968;
          const idleFrame = mapBlendshapesToRigState(
            {
              eyeBlinkLeft: periodicBlink ? 0.95 : 0.02,
              eyeBlinkRight: periodicBlink ? 0.95 : 0.02,
              mouthSmileLeft: 0.16,
              mouthSmileRight: 0.16,
              browInnerUp: (Math.sin(tSec * 0.85) + 1) * 0.08
            },
            {
              angleX: Math.sin(tSec * 0.55) * 4.8,
              angleY: Math.cos(tSec * 0.45) * 2.8,
              angleZ: Math.sin(tSec * 0.38) * 2.4
            },
            null,
            { ...trackerConfig, calibrationOffset: { angleX: 0, angleY: 0, angleZ: 0 } },
            nowMs
          );
          targetFrameRef.current = idleFrame;
        }
      }

      // 3. Stage-2 Velocity-Clamped Adaptive Damping (silky-smooth turns, brows, eyes & mouth!)
      const target = targetFrameRef.current;
      const cur = currentParamsRef.current;
      const baseAlpha = clampParameter(cfg.smoothingAlpha, 0.08, 0.55);

      cur.angleX = dampParameterAdaptive(cur.angleX, target.params.angleX, baseAlpha, 0.35, 1.35);
      cur.angleY = dampParameterAdaptive(cur.angleY, target.params.angleY, baseAlpha, 0.30, 1.15);
      cur.angleZ = dampParameterAdaptive(cur.angleZ, target.params.angleZ, baseAlpha, 0.30, 1.05);
      cur.browLY = dampParameterAdaptive(
        cur.browLY ?? cur.browY,
        target.browLY ?? target.params.browY,
        baseAlpha * 1.15,
        0.015,
        0.065
      );
      cur.browRY = dampParameterAdaptive(
        cur.browRY ?? cur.browY,
        target.browRY ?? target.params.browY,
        baseAlpha * 1.15,
        0.015,
        0.065
      );
      cur.browY = (cur.browLY + cur.browRY) * 0.5;
      cur.eyeSmile = dampParameterAdaptive(
        cur.eyeSmile ?? 0.18,
        target.params.eyeSmile ?? 0.18,
        baseAlpha,
        0.02,
        0.055
      );
      cur.gazeX = dampParameterAdaptive(cur.gazeX ?? 0, target.params.gazeX ?? 0, baseAlpha * 1.25, 0.015, 0.07);
      cur.gazeY = dampParameterAdaptive(cur.gazeY ?? 0, target.params.gazeY ?? 0, baseAlpha * 1.25, 0.015, 0.07);
      cur.shoulderY = dampParameterAdaptive(cur.shoulderY, target.params.shoulderY, 0.15, 0.005, 0.02);
      cur.cheekBlush = dampParameterAdaptive(
        cur.cheekBlush ?? 0.12,
        target.params.cheekBlush ?? 0.12,
        0.16,
        0.01,
        0.035
      );

      // Fast, responsive yet smooth mouth & independent left/right eyelids
      const mouthAlpha = target.params.mouthOpenY < cur.mouthOpenY ? 0.44 : 0.38;
      cur.mouthOpenY += (target.params.mouthOpenY - cur.mouthOpenY) * mouthAlpha;
      if (cur.mouthOpenY < 0.015 && target.params.mouthOpenY === 0) {
        cur.mouthOpenY = 0;
      }
      cur.mouthForm += (target.params.mouthForm - cur.mouthForm) * 0.34;

      const eyeState = currentEyeOpenRef.current;
      eyeState.left += ((target.eyeOpenL ?? 1.0) - eyeState.left) * 0.48;
      eyeState.right += ((target.eyeOpenR ?? 1.0) - eyeState.right) * 0.48;
      cur.eyeOpenL = eyeState.left;
      cur.eyeOpenR = eyeState.right;
      cur.eyeOpen = (eyeState.left + eyeState.right) * 0.5;

      // 4. Leaky-Integrator Emotion Confidence Accumulator + Smooth 280ms Crossfade
      const emState = emotionTransitionRef.current;

      if (cfg.manualEmotion) {
        // Immediate smooth crossfade when user clicks a manual emotion override
        if (emState.activeEmotion !== cfg.manualEmotion) {
          emState.prevEmotion = emState.activeEmotion;
          emState.activeEmotion = cfg.manualEmotion;
          emState.blendProgress = 0.0;
          emState.lastSwitchMs = nowMs;
        }
      } else {
        const nextAutoEmotion = stepEmotionConfidenceAccumulator(
          emotionScoresRef.current,
          emState.activeEmotion,
          target.detectedEmotion ?? 'neutral',
          target.emotionConfidence ?? 0.75,
          dtMs
        );
        if (nextAutoEmotion !== emState.activeEmotion && nowMs - emState.lastSwitchMs > 260) {
          emState.prevEmotion = emState.activeEmotion;
          emState.activeEmotion = nextAutoEmotion;
          emState.blendProgress = 0.0;
          emState.lastSwitchMs = nowMs;
        }
      }

      if (emState.blendProgress < 1.0) {
        emState.blendProgress = Math.min(1.0, emState.blendProgress + dtMs / 280);
      }

      // Update React telemetry at ~12 Hz
      if (nowMs - lastTelemetryTick > 85) {
        lastTelemetryTick = nowMs;
        setTelemetry({
          ...target,
          detectedEmotion: emState.activeEmotion,
          eyeOpenL: Number(eyeState.left.toFixed(2)),
          eyeOpenR: Number(eyeState.right.toFixed(2)),
          browLY: Number((cur.browLY ?? 0).toFixed(2)),
          browRY: Number((cur.browRY ?? 0).toFixed(2)),
          params: {
            ...cur,
            angleX: Number(cur.angleX.toFixed(1)),
            angleY: Number(cur.angleY.toFixed(1)),
            angleZ: Number(cur.angleZ.toFixed(1)),
            mouthOpenY: Number(cur.mouthOpenY.toFixed(2)),
            browY: Number(cur.browY.toFixed(2)),
            browLY: Number((cur.browLY ?? 0).toFixed(2)),
            browRY: Number((cur.browRY ?? 0).toFixed(2))
          }
        });
      }

      // 5. Composite 2.5D Alisa on 668x668 HiDPI Canvas with Smooth Emotion Crossfade & Single-Pass HD Warp
      const canvas = canvasRef.current;
      const offC = offscreenCanvasRef.current;
      const prevC = prevEmotionCanvasRef.current;
      const warpC = warpCanvasRef.current;
      const warpImgData = warpedImageDataRef.current;
      const imgs = imagesRef.current;

      if (canvas && offC && prevC && warpC && warpImgData && imgs.expressions && imgs.mouthless) {
        const ctx = canvas.getContext('2d');
        const offCtx = offC.getContext('2d', { willReadFrequently: true });
        const prevCtx = prevC.getContext('2d');
        const warpCtx2 = warpC.getContext('2d');

        if (ctx && offCtx && prevCtx && warpCtx2) {
          // Composite active emotion cell
          compositeCharacterCell(
            offCtx,
            emState.activeEmotion,
            cur.mouthOpenY,
            cur.mouthForm,
            eyeState.left,
            eyeState.right,
            imgs
          );

          // If transitioning between two emotions, smoothly crossfade prevEmotion -> activeEmotion!
          if (emState.blendProgress < 0.999 && emState.prevEmotion !== emState.activeEmotion) {
            compositeCharacterCell(
              prevCtx,
              emState.prevEmotion,
              cur.mouthOpenY,
              cur.mouthForm,
              eyeState.left,
              eyeState.right,
              imgs
            );
            // Smooth cubic ease-in-out
            const t = emState.blendProgress;
            const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            prevCtx.save();
            prevCtx.globalAlpha = easeT;
            prevCtx.drawImage(offC, 0, 0);
            prevCtx.restore();

            offCtx.clearRect(0, 0, CELL_SIZE, CELL_SIZE);
            offCtx.drawImage(prevC, 0, 0);
          }

          // Single-Pass Native 668x668 HD Warp (zero 334->668 double-resampling blur!)
          const srcImgData = offCtx.getImageData(0, 0, CELL_SIZE, CELL_SIZE);
          warpImageDataSeamless(
            srcImgData.data,
            warpImgData.data,
            cur,
            emState.activeEmotion,
            CANVAS_INTERNAL_SIZE,
            eyeState.left,
            eyeState.right
          );
          warpCtx2.putImageData(warpImgData, 0, 0);

          ctx.clearRect(0, 0, CANVAS_INTERNAL_SIZE, CANVAS_INTERNAL_SIZE);
          ctx.drawImage(warpC, 0, 0);
        }
      }

      rafId = window.requestAnimationFrame(renderLoop);
    };

    rafId = window.requestAnimationFrame(renderLoop);

    return () => {
      window.cancelAnimationFrame(rafId);
      stopMediaStreams();
    };
  }, [broadcastTrackerFrame, stopMediaStreams]);

  // Background styles for OBS capture
  const getStageBackgroundStyle = (): React.CSSProperties => {
    if (bgMode === 'transparent') {
      return { backgroundColor: 'transparent' };
    }
    if (bgMode === 'chroma_green') {
      return { backgroundColor: '#00FF00' };
    }
    if (bgMode === 'chroma_blue') {
      return { backgroundColor: '#0047BB' };
    }
    return {
      background:
        'radial-gradient(circle at 50% 38%, rgba(139, 92, 246, 0.22) 0%, rgba(15, 23, 42, 0.98) 72%)'
    };
  };

  const obsBrowserUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?obs=view`
      : 'http://localhost:3000/?obs=view';

  // ============================================================================
  // CLEAN ZERO-BUTTON FULLSCREEN STAGE (For OBS Browser Source or Window Capture)
  // ============================================================================
  if (isCleanScreen) {
    return (
      <div
        style={getStageBackgroundStyle()}
        className="fixed inset-0 z-50 w-screen h-screen overflow-hidden flex items-center justify-center select-none"
      >
        <video ref={videoRef} playsInline muted className="hidden" />

        {/* Pure 2.5D Alisa HD Canvas — ZERO buttons, ZERO borders */}
        <div
          style={{
            transform: `scale(${avatarScale})`,
            transformOrigin: 'center bottom'
          }}
          className="relative flex items-center justify-center transition-transform duration-150"
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_INTERNAL_SIZE}
            height={CANVAS_INTERNAL_SIZE}
            className="w-[min(92vw,92vh)] h-[min(92vw,92vh)] max-w-[860px] max-h-[860px] object-contain pointer-events-none"
          />
        </div>

        {/* Tiny Auto-Hiding Corner Drawer (ONLY appears when cursor hovers the top-right corner!) */}
        <div
          onMouseEnter={() => setShowFloatingHud(true)}
          onMouseLeave={() => setShowFloatingHud(false)}
          className="fixed top-0 right-0 z-50 p-3"
        >
          <div
            className={`transition-opacity duration-200 ${
              showFloatingHud ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-2.5 shadow-xl flex items-center gap-2 text-xs text-white">
              <button
                type="button"
                onClick={() => startHardwareTracking('camera_and_mic')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                  trackingMode === 'camera_and_mic'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
                title="Трекинг веб-камеры (рот, глаза, брови, голова) + микрофона"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Камера + Микрофон</span>
              </button>

              <button
                type="button"
                onClick={() => startHardwareTracking('mic_only')}
                className={`px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors ${
                  trackingMode === 'mic_only'
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
                title="Липсинк от микрофона + живое дыхание"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Микрофон</span>
              </button>

              <button
                type="button"
                onClick={handleCalibrateZeroPose}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center gap-1"
                title="Запомнить текущее положение головы как 0°"
              >
                <RotateCcw className="w-3.5 h-3.5 text-violet-400" />
                <span>0°</span>
              </button>

              <select
                aria-label="Фон для OBS"
                value={bgMode}
                onChange={(e) => setBgMode(e.target.value as ObsBgMode)}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs"
              >
                <option value="transparent">Прозрачный Alpha (OBS Browser)</option>
                <option value="chroma_green">Chroma Key #00FF00 (Зелёный)</option>
                <option value="chroma_blue">Chroma Key #0047BB (Синий)</option>
                <option value="dark_studio">Тёмный фон</option>
              </select>

              {!isObsPureView && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCleanScreen(false);
                    onExitCleanMode?.();
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold flex items-center gap-1"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Настройки (H)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // STUDIO OBS VTUBER WORKBENCH + 1-CLICK CLEAN OBS SCREEN LAUNCHER
  // ============================================================================
  return (
    <section
      aria-label="Экран OBS VTuber с трекингом лица и голоса"
      className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden text-slate-100 shadow-xl"
    >
      {/* Top Control Header */}
      <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-violet-400">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>HD 668×668 CAS ENGINE · ПЛАВНЫЙ 1€-ДЕМПФЕР · РАЗДЕЛЬНОЕ МОРГАНИЕ ЛЕВОГО/ПРАВОГО ГЛАЗА</span>
          </div>
          <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-white">
            Живая VTuber-модель «Алиса AI» для OBS (Плавная мимика, 9 эмоций и анти-шум рта)
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => startHardwareTracking('camera_and_mic')}
            disabled={isLoadingMediaPipe}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              trackingMode === 'camera_and_mic'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-violet-600 hover:bg-violet-500 text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>
              {isLoadingMediaPipe
                ? 'Загрузка нейросети трекинга...'
                : trackingMode === 'camera_and_mic'
                  ? 'Трекинг Камера + Микрофон (Активен)'
                  : 'Включить трекинг лица (Камера + Микрофон)'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => startHardwareTracking('mic_only')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              trackingMode === 'mic_only'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Только микрофон</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopMediaStreams();
              setTrackingMode('auto_demo');
            }}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              trackingMode === 'auto_demo'
                ? 'bg-slate-700 text-white border border-violet-400/50'
                : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>Спокойный Idle</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCleanScreen(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
            <span>Чистый экран для OBS (Без кнопок · H)</span>
          </button>
        </div>
      </div>

      {trackerError && (
        <div className="mx-6 mt-4 p-3.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs flex items-center justify-between gap-4">
          <span>{trackerError}</span>
          <button
            type="button"
            onClick={() => setTrackerError(null)}
            className="px-2.5 py-1 rounded bg-amber-400/20 hover:bg-amber-400/30 text-amber-100 font-semibold shrink-0"
          >
            Скрыть
          </button>
        </div>
      )}

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT 7 COLS: Live 2.5D VTuber HD Stage Viewport */}
        <div className="lg:col-span-7 space-y-4">
          <div
            style={
              bgMode === 'transparent'
                ? {
                    backgroundImage:
                      'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                    backgroundSize: '24px 24px',
                    backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px',
                    backgroundColor: '#0f172a'
                  }
                : getStageBackgroundStyle()
            }
            className="relative rounded-2xl border border-slate-700/80 overflow-hidden aspect-square max-h-[620px] w-full mx-auto flex items-center justify-center"
          >
            {/* Top-left live status badge */}
            <div className="absolute top-3.5 left-3.5 z-10 flex items-center gap-2">
              <span className="px-2.5 py-1.5 rounded-lg bg-slate-950/85 border border-slate-700/80 text-[11px] font-mono text-slate-200 flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    trackingMode === 'camera_and_mic'
                      ? 'bg-emerald-400 animate-ping'
                      : trackingMode === 'mic_only'
                        ? 'bg-violet-400'
                        : 'bg-sky-400'
                  }`}
                />
                {trackingMode === 'camera_and_mic'
                  ? 'LIVE: Камера + Микрофон (HD 668px)'
                  : trackingMode === 'mic_only'
                    ? 'LIVE: Микрофон (HD 668px)'
                    : 'IDLE: Спокойное дыхание (HD 668px)'}
              </span>
            </div>

            {/* Top-right quick actions inside viewport */}
            <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCalibrateZeroPose}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950/85 hover:bg-slate-900 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1 cursor-pointer"
                title="Обнулить текущий наклон и поворот головы"
              >
                <RotateCcw className="w-3.5 h-3.5 text-violet-400" />
                <span>Калибровка 0°</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCleanScreen(true)}
                className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white flex items-center gap-1 cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Чистый экран (Без кнопок)</span>
              </button>
            </div>

            {/* Webcam PiP preview in bottom-left when camera tracking is active */}
            <div
              className={`absolute bottom-12 left-3.5 z-10 rounded-xl overflow-hidden border border-slate-700 bg-slate-950/90 shadow-lg transition-all ${
                trackingMode === 'camera_and_mic' && showCameraPreview
                  ? 'w-36 h-28 opacity-100'
                  : 'w-0 h-0 opacity-0 pointer-events-none border-0'
              }`}
            >
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover ${mirrorCamera ? '-scale-x-100' : ''}`}
              />
              <div className="absolute bottom-1 left-1.5 right-1.5 flex items-center justify-between text-[10px] font-mono text-emerald-300 bg-slate-950/75 px-1.5 py-0.5 rounded">
                <span>WEBCAM 60FPS</span>
                <button
                  type="button"
                  onClick={() => setShowCameraPreview(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Main 2.5D Character HiDPI Canvas */}
            <div
              style={{
                transform: `scale(${avatarScale})`,
                transformOrigin: 'center bottom'
              }}
              className="w-full h-full flex items-center justify-center transition-transform duration-150"
            >
              <canvas
                ref={canvasRef}
                width={CANVAS_INTERNAL_SIZE}
                height={CANVAS_INTERNAL_SIZE}
                className="w-full h-full object-contain pointer-events-none"
              />
            </div>

            {/* Bottom-left Emotion badge */}
            <div className="absolute bottom-3.5 left-3.5 z-10 px-3 py-1.5 rounded-lg bg-slate-950/85 border border-violet-500/40 text-[11px] font-mono text-violet-300">
              Эмоция: <strong className="text-white">{EMOTION_LABELS_RU[telemetry.detectedEmotion ?? 'neutral']}</strong>
            </div>

            {/* Bottom-right Viseme & Mouth HUD badge */}
            <div className="absolute bottom-3.5 right-3.5 z-10 px-3 py-1.5 rounded-lg bg-slate-950/85 border border-slate-700/80 text-[11px] font-mono text-slate-300 flex items-center gap-3">
              <span>
                Рот: <strong className="text-white">#{telemetry.activeSlideIndex + 1}/48</strong> ({telemetry.activeVowel})
              </span>
              <span>
                Открытие: <strong className="text-emerald-400">{Math.round(telemetry.params.mouthOpenY * 100)}%</strong>
              </span>
            </div>
          </div>

          {/* All 9 Emotions Bar (Auto from Face OR Instant 1-Click / Hotkey 1-9) */}
          <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-3.5 space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Smile className="w-3.5 h-3.5 text-violet-400" />
                <span>Все 9 эмоций модели (Плавный кроссфейд 300 мс · клавиши 0–9):</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setDemoWinkSide((s) => (s === 'left' ? 'none' : 'left'))
                  }
                  className={`px-2 py-1 rounded text-[11px] font-medium cursor-pointer ${
                    demoWinkSide === 'left'
                      ? 'bg-sky-500 text-slate-950 font-semibold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  Тест: Закрыть левый глаз
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDemoWinkSide((s) => (s === 'right' ? 'none' : 'right'))
                  }
                  className={`px-2 py-1 rounded text-[11px] font-medium cursor-pointer ${
                    demoWinkSide === 'right'
                      ? 'bg-sky-500 text-slate-950 font-semibold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  Тест: Закрыть правый глаз
                </button>
                <button
                  type="button"
                  onClick={() => setDemoSpeechActive((v) => !v)}
                  className={`px-2 py-1 rounded text-[11px] font-medium cursor-pointer ${
                    demoSpeechActive
                      ? 'bg-emerald-500 text-slate-950 font-semibold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {demoSpeechActive ? 'Стоп тест речи' : 'Тест речи'}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setManualEmotion(null)}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  manualEmotion === null
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                0 · Авто с лица
              </button>
              {ALL_9_EMOTIONS.map((em) => {
                const isSelected = manualEmotion === em.id;
                const isAutoActive =
                  manualEmotion === null && telemetry.detectedEmotion === em.id;
                return (
                  <button
                    key={em.id}
                    type="button"
                    onClick={() => setManualEmotion(em.id)}
                    className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-violet-600 text-white ring-1 ring-violet-400'
                        : isAutoActive
                          ? 'bg-violet-950/90 text-violet-200 border border-violet-500/50'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {em.key} · {em.short}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Background & Scale Bar */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400 font-medium mr-1">Фон для OBS:</span>
              {(
                [
                  { id: 'transparent', label: 'Прозрачный Alpha (OBS Browser)' },
                  { id: 'chroma_green', label: 'Chroma Key #00FF00' },
                  { id: 'chroma_blue', label: 'Chroma Синий' },
                  { id: 'dark_studio', label: 'Тёмный нео-уют' }
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setBgMode(item.id)}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    bgMode === item.id
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-slate-300">
                <span>Масштаб: {Math.round(avatarScale * 100)}%</span>
                <input
                  type="range"
                  min={0.6}
                  max={1.6}
                  step={0.05}
                  value={avatarScale}
                  onChange={(e) => setAvatarScale(Number(e.target.value))}
                  className="w-24 accent-violet-500"
                />
              </label>

              <button
                type="button"
                onClick={() => setMirrorCamera((v) => !v)}
                className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1 cursor-pointer ${
                  mirrorCamera
                    ? 'bg-violet-500/20 border-violet-500/50 text-violet-200'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <FlipHorizontal2 className="w-3.5 h-3.5" />
                <span>Зеркало</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT 5 COLS: Real-Time Face/Voice Telemetry + Anti-Noise & OBS Studio Guide */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card 1: Real-Time Tracking Channels (Mouth, Left/Right Eye, Brows, Head) */}
          <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-violet-400" />
                <span>Телеметрия плавного трекинга (1€-фильтр без рывков)</span>
              </h3>
              <span className="text-[11px] font-mono text-emerald-400">60 FPS HD</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Head X/Y/Z */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="text-slate-400 flex items-center justify-between">
                  <span>Голова (X/Y/Z)</span>
                  <span className="font-mono text-violet-300">
                    {telemetry.params.angleX.toFixed(0)}° / {telemetry.params.angleY.toFixed(0)}° /{' '}
                    {telemetry.params.angleZ.toFixed(0)}°
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 transition-all duration-75"
                    style={{
                      width: `${Math.min(100, Math.max(5, ((telemetry.params.angleX + 30) / 60) * 100))}%`
                    }}
                  />
                </div>
              </div>

              {/* Mouth Open + Silence Gate */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="text-slate-400 flex items-center justify-between">
                  <span>Рот (Анти-шум)</span>
                  <span className="font-mono text-emerald-400">
                    {Math.round(telemetry.params.mouthOpenY * 100)}% · {telemetry.activeVowel}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-75"
                    style={{ width: `${Math.min(100, telemetry.params.mouthOpenY * 100)}%` }}
                  />
                </div>
              </div>

              {/* Left Eye & Right Eye Independent Blink/Wink */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="text-slate-400 flex items-center justify-between">
                  <span>Левый / Правый глаз</span>
                  <span className="font-mono text-sky-300">
                    Л: {Math.round((telemetry.eyeOpenL ?? 1) * 100)}% · П:{' '}
                    {Math.round((telemetry.eyeOpenR ?? 1) * 100)}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-400 transition-all duration-75"
                      style={{ width: `${Math.min(100, (telemetry.eyeOpenL ?? 1) * 100)}%` }}
                    />
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-400 transition-all duration-75"
                      style={{ width: `${Math.min(100, (telemetry.eyeOpenR ?? 1) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Eyebrows */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="text-slate-400 flex items-center justify-between">
                  <span>Брови (ParamBrowY)</span>
                  <span className="font-mono text-amber-300">
                    {telemetry.params.browY > 0 ? '+' : ''}
                    {telemetry.params.browY.toFixed(2)}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-75"
                    style={{
                      width: `${Math.min(100, Math.max(5, ((telemetry.params.browY + 1) / 2) * 100))}%`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Anti-false-mouth-opening toggle */}
            <div className="p-3 rounded-xl bg-emerald-950/25 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Защита от ложного открытия рта в тишине</span>
                </div>
                <div className="text-slate-300 text-[11px]">
                  Игнорирует мелкий шум челюсти веб-камеры (до 20%) — когда вы молчите, губы Алисы плотно сомкнуты.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVoiceGatedMouth((v) => !v)}
                className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 cursor-pointer ${
                  voiceGatedMouth
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                {voiceGatedMouth ? 'ВКЛ (Точно)' : 'ВЫКЛ'}
              </button>
            </div>

            {/* Sensitivity Sliders */}
            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <label className="space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Чувств. микрофона</span>
                  <span className="font-mono text-slate-200">{micGain.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={3.5}
                  step={0.1}
                  value={micGain}
                  onChange={(e) => setMicGain(Number(e.target.value))}
                  className="w-full accent-emerald-400"
                />
              </label>

              <label className="space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Порог тишины (Gate)</span>
                  <span className="font-mono text-slate-200">{Math.round(noiseGate * 1000)}</span>
                </div>
                <input
                  type="range"
                  min={0.015}
                  max={0.14}
                  step={0.005}
                  value={noiseGate}
                  onChange={(e) => setNoiseGate(Number(e.target.value))}
                  className="w-full accent-violet-400"
                />
              </label>

              <label className="space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Плавность головы</span>
                  <span className="font-mono text-slate-200">{Math.round((1 - smoothingAlpha) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.10}
                  max={0.45}
                  step={0.02}
                  value={smoothingAlpha}
                  onChange={(e) => setSmoothingAlpha(Number(e.target.value))}
                  className="w-full accent-sky-400"
                />
              </label>
            </div>
          </div>

          {/* Card 2: How to Add to OBS Studio (2 Easy Options) */}
          <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MonitorPlay className="w-4 h-4 text-emerald-400" />
                <span>Как вывести Алису в OBS Studio (2 способа)</span>
              </h3>
              <span
                className={`px-2 py-0.5 rounded font-mono text-[10px] ${
                  wsConnectedCount
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {wsConnectedCount ? 'OBS WS-мост активен' : 'Локальный режим'}
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="font-semibold text-emerald-300">
                  Способ 1 (100% прозрачный фон без хромакея):
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 leading-relaxed">
                  <li>
                    Оставьте эту вкладку открытой и нажмите <strong>«Включить трекинг лица (Камера + Микрофон)»</strong>.
                  </li>
                  <li>
                    В <strong>OBS Studio</strong> добавьте источник <strong>«Браузер» (Browser Source)</strong>, размер <code className="text-violet-300">900 × 900</code>, и вставьте ссылку:
                  </li>
                </ol>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    readOnly
                    value={obsBrowserUrl}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-[11px] text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={handleCopyObsBrowserUrl}
                    className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {copiedObsUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedObsUrl ? 'Скопировано' : 'Копировать URL'}</span>
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="font-semibold text-amber-300">
                  Способ 2 (Захват окна + Chroma Key):
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Выберите фон <strong>«Chroma Key #00FF00»</strong>, нажмите жёлтую кнопку <strong>«Чистый экран для OBS (Без кнопок · H)»</strong> и захватите окно в OBS.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

import { EmotionPresetId, EMOTION_PRESETS, clampParameter } from '../utils/conceptLogic';
import {
  AlisaProviderSettings,
  LlmProviderId,
  TtsProviderId,
  SttProviderId
} from './extensionStorage';

/**
 * Structured response contract for Alisa AI (Stage 1 & Stage 2 foundation).
 */
export type AlisaGestureId = 'nod' | 'tilt' | 'blink' | 'think' | 'wave' | 'blush';

export interface AlisaStructuredSegment {
  speech: string;
  emotion: EmotionPresetId;
  intensity: number; // 0.2 .. 1.0
  gestures: AlisaGestureId[];
  speed: number; // 0.85 .. 1.25
  pause_after_ms: number; // 100 .. 800
}

export interface AlisaBrainResponse extends AlisaStructuredSegment {
  providerUsed: LlmProviderId;
  modelName: string;
  latencyMs: number;
  segments: AlisaStructuredSegment[];
  fallbackTriggered?: boolean;
}

export interface AlisaTtsResult {
  providerUsed: TtsProviderId;
  voiceLabel: string;
  /** AudioBuffer or ArrayBuffer (WAV/OGG) when synthesized via Cloud/Neural TTS; null when using Web Speech API */
  audioBytes: ArrayBuffer | null;
  mimeType: string;
  latencyMs: number;
  usedWebSpeechFallback: boolean;
}

export interface ChatTurnMessage {
  role: 'user' | 'assistant';
  text: string;
  emotion?: EmotionPresetId;
  provider?: string;
  timestamp: number;
}

/**
 * Provider Abstraction Interfaces (Stage 1 requirement: pluggable LLM, TTS, STT)
 */
export interface ILLMProvider {
  readonly id: LlmProviderId;
  readonly titleRu: string;
  generateResponse(
    userMessage: string,
    history: ChatTurnMessage[],
    settings: AlisaProviderSettings
  ): Promise<AlisaBrainResponse>;
}

export interface ITTSProvider {
  readonly id: TtsProviderId;
  readonly titleRu: string;
  synthesizeSpeech(
    text: string,
    emotion: EmotionPresetId,
    settings: AlisaProviderSettings
  ): Promise<AlisaTtsResult>;
}

export interface ISTTProvider {
  readonly id: SttProviderId;
  readonly titleRu: string;
  readonly isSupported: boolean;
  startListening(
    settings: AlisaProviderSettings,
    callbacks: {
      onInterim?: (text: string) => void;
      onFinal: (text: string) => void;
      onError: (errMessage: string) => void;
    }
  ): Promise<() => void>;
}

/**
 * Honest Architecture Comparison Catalog (Stage 1 Analysis of Options A, B, C)
 */
export interface ArchitectureOptionComparison {
  code: 'A_YANDEX_FULL' | 'B_HYBRID_GEMINI_YANDEX' | 'C_LOCAL_WEB_SPEECH';
  badge: string;
  titleRu: string;
  llmEngine: string;
  ttsEngine: string;
  sttEngine: string;
  recommended: boolean;
  voiceAuthenticityScore: string;
  requiresUserKeys: string;
  prosRu: string[];
  consRu: string[];
  verdictRu: string;
}

export const STAGE1_ARCHITECTURE_COMPARISON: ArchitectureOptionComparison[] = [
  {
    code: 'B_HYBRID_GEMINI_YANDEX',
    badge: 'Вариант B · Рекомендуемый гибрид',
    titleRu: 'Gemini 4 Hydrogen (Мозг) + Yandex SpeechKit «Alena» / Gemini Neural TTS (Голос)',
    llmEngine: 'Gemini 4 Hydrogen (Server SDK, строгая JSON-схема эмоций)',
    ttsEngine: 'Yandex SpeechKit (голос «alena», амплуа good) + авто-фоллбэк на Gemini Neural TTS (24 кГц WAV)',
    sttEngine: 'Web Speech API (ru-RU) + опционально Yandex SpeechKit STT',
    recommended: true,
    voiceAuthenticityScore: '9.8 / 10 (тембр «alena» в SpeechKit создан на базе голоса Алисы)',
    requiresUserKeys: 'Работает сразу из коробки! Ключ Yandex Cloud нужен только для фирменного голоса «alena».',
    prosRu: [
      'Мгновенно работает без ручного ввода ключей для LLM-мозга и базового нейро-голоса (24 кГц WAV)',
      'При вводе ключа Yandex SpeechKit переключается на официальный голос «alena» (амплуа «good» — доброжелательная Алиса)',
      'Возвращает реальный аудиопоток (WAV / OGG Opus) для точного спектрального липсинка через Web Audio API (AnalyserNode)',
      'Строгая типизация JSON-ответа (speech, emotion, intensity, gestures, speed, pause_after_ms)'
    ],
    consRu: [
      'Для 100% фирменного тембра «alena» требуется сервисный API-ключ Yandex Cloud SpeechKit'
    ],
    verdictRu:
      'Лучший выбор для продакшена: сочетает стабильный эмоциональный JSON-мозг и эталонный голос «alena» из Yandex SpeechKit с бесшовным резервом.'
  },
  {
    code: 'A_YANDEX_FULL',
    badge: 'Вариант A · Полный стек Yandex Cloud',
    titleRu: 'YandexGPT (Мозг) + Yandex SpeechKit TTS («alena» / «marina») + SpeechKit STT',
    llmEngine: 'YandexGPT Lite / Pro (gpt://<folderId>/yandexgpt-lite/latest)',
    ttsEngine: 'Yandex SpeechKit v1/v3 (голос «alena» / «marina», OGG Opus)',
    sttEngine: 'Yandex SpeechKit STT v1 (распознавание записанного Opus-аудио)',
    recommended: false,
    voiceAuthenticityScore: '10 / 10 (родная экосистема Yandex Cloud)',
    requiresUserKeys: 'Обязательны Yandex API-Key (AQVN...) и Folder ID (b1g...) в chrome.storage',
    prosRu: [
      'Единый облачный провайдер и один API-ключ на генерацию текста, синтез голоса «alena» и распознавание речи',
      'Нативное понимание российских реалий и идиом моделью YandexGPT'
    ],
    consRu: [
      'Без введённых Folder ID и API-Key в настройках не сможет генерировать ответы без фоллбэка',
      'Прямые запросы из обычной веб-вкладки блокируются CORS (решено через background worker в MV3 и прокси /api/ai/yandex-*)'
    ],
    verdictRu:
      'Отличный вариант, если у пользователя уже есть платёжный аккаунт Yandex Cloud с ролями ai.languageModels.user и ai.speechkit-tts.user.'
  },
  {
    code: 'C_LOCAL_WEB_SPEECH',
    badge: 'Вариант C · Локальный браузерный (Zero-Cloud)',
    titleRu: 'Локальный диалоговый движок + Web Speech API (speechSynthesis + SpeechRecognition)',
    llmEngine: 'Локальный эмпатичный микро-движок (или любая подключённая LLM)',
    ttsEngine: 'window.speechSynthesis (системный русский голос браузера)',
    sttEngine: 'webkitSpeechRecognition (потоковое распознавание в Chromium / Яндекс Браузере)',
    recommended: false,
    voiceAuthenticityScore: '6.5 / 10 (зависит от голосов ОС: Google русский / Microsoft Irina)',
    requiresUserKeys: 'Не требует ключей и облачных аккаунтов (0 ₽)',
    prosRu: [
      'Полностью бесплатно, нулевая задержка старта, работает без ключей и настроек',
      'Отличный резервный канал (fallback) при обрыве сети или исчерпании лимитов API'
    ],
    consRu: [
      'Системный синтезатор Web Speech API не отдаёт сырой PCM/AudioBuffer в Web Audio API (AnalyserNode), поэтому липсинк идёт по фонемно-слоговой кривой текста'
    ],
    verdictRu:
      'Идеален как автоматический запасной вариант (fallback), чтобы Алиса никогда не замолкала.'
  }
];

const VALID_EMOTION_SET = new Set<EmotionPresetId>(
  Object.keys(EMOTION_PRESETS) as EmotionPresetId[]
);

const VALID_GESTURE_SET = new Set<AlisaGestureId>([
  'nod',
  'tilt',
  'blink',
  'think',
  'wave',
  'blush'
]);

/**
 * Strips markdown, emojis, and code blocks so Alisa's speech is clean for TTS and subtitles.
 */
export function sanitizeSpeechText(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[*_#`~>|]/g, '')
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Safely parses and normalizes any raw JSON string or object from an LLM into a valid AlisaStructuredSegment.
 * Guarantees fallback to 'neutral' on invalid JSON or unknown emotion (Stage 2.6 safety rule).
 */
export function parseAndSanitizeBrainJson(rawInput: unknown): {
  segment: AlisaStructuredSegment;
  fallbackTriggered: boolean;
} {
  let obj: Record<string, unknown> | null = null;
  let fallbackTriggered = false;

  if (typeof rawInput === 'string') {
    const trimmed = rawInput.trim();
    // Extract JSON block if wrapped in ```json ... ``` or surrounding text
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    const candidate = jsonMatch ? jsonMatch[0] : trimmed;
    try {
      obj = JSON.parse(candidate) as Record<string, unknown>;
    } catch {
      fallbackTriggered = true;
      const cleanPlain = sanitizeSpeechText(trimmed);
      return {
        fallbackTriggered: true,
        segment: {
          speech: cleanPlain || 'Хм, секунду... Повтори мысль ещё раз, пожалуйста.',
          emotion: 'neutral',
          intensity: 0.65,
          gestures: ['blink'],
          speed: 1.0,
          pause_after_ms: 250
        }
      };
    }
  } else if (rawInput && typeof rawInput === 'object') {
    obj = rawInput as Record<string, unknown>;
  } else {
    fallbackTriggered = true;
  }

  const rawSpeech = typeof obj?.speech === 'string' ? obj.speech : '';
  const cleanSpeech = sanitizeSpeechText(rawSpeech) || 'Я внимательно тебя слушаю.';

  const rawEmotion = typeof obj?.emotion === 'string' ? obj.emotion.toLowerCase().trim() : '';
  const isKnownEmotion = VALID_EMOTION_SET.has(rawEmotion as EmotionPresetId);
  if (!isKnownEmotion) {
    fallbackTriggered = true;
  }
  const emotion: EmotionPresetId = isKnownEmotion ? (rawEmotion as EmotionPresetId) : 'neutral';

  const intensity = clampParameter(Number(obj?.intensity ?? 0.75), 0.2, 1.0);
  const speed = clampParameter(Number(obj?.speed ?? 1.0), 0.85, 1.25);
  const pause_after_ms = Math.round(clampParameter(Number(obj?.pause_after_ms ?? 250), 100, 800));

  const rawGestures = Array.isArray(obj?.gestures) ? obj?.gestures : [];
  const gestures: AlisaGestureId[] = rawGestures
    .map((g) => String(g).toLowerCase().trim() as AlisaGestureId)
    .filter((g) => VALID_GESTURE_SET.has(g));

  if (gestures.length === 0) {
    gestures.push(emotion === 'thinking' ? 'think' : emotion === 'joy' ? 'nod' : 'blink');
  }

  return {
    fallbackTriggered,
    segment: {
      speech: cleanSpeech,
      emotion,
      intensity,
      gestures,
      speed,
      pause_after_ms
    }
  };
}

/**
 * Splits a multi-sentence response into sequential emotional segments so long answers shift expressions smoothly.
 */
export function splitResponseIntoSegments(base: AlisaStructuredSegment): AlisaStructuredSegment[] {
  const sentences = base.speech
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length <= 1) {
    return [base];
  }

  return sentences.map((sentence, idx) => {
    let segEmotion: EmotionPresetId = base.emotion;
    if (idx > 0) {
      if (sentence.includes('?')) {
        segEmotion = base.emotion === 'joy' ? 'wink' : 'surprise';
      } else if (sentence.includes('!')) {
        segEmotion = base.emotion === 'angry' ? 'angry' : 'joy';
      } else if (sentence.includes('...')) {
        segEmotion = 'thinking';
      }
    }
    return {
      speech: sentence,
      emotion: segEmotion,
      intensity: Number(clampParameter(base.intensity - idx * 0.05, 0.35, 1.0).toFixed(2)),
      gestures: idx === 0 ? base.gestures : ['nod'],
      speed: base.speed,
      pause_after_ms: idx === sentences.length - 1 ? base.pause_after_ms : 220
    };
  });
}

/**
 * Local Offline Conversational Engine (Variant C / Network Fallback)
 */
export function buildLocalAlisaResponse(userMessage: string): AlisaStructuredSegment {
  const lower = userMessage.toLowerCase().trim();

  if (/(привет|здравствуй|добрый|хай|алло)/i.test(lower)) {
    return {
      speech: 'Привет! Рада тебя видеть. Чем займёмся сегодня?',
      emotion: 'joy',
      intensity: 0.85,
      gestures: ['wave', 'nod'],
      speed: 1.02,
      pause_after_ms: 240
    };
  }
  if (/(кто ты|как тебя зовут|ты алиса)/i.test(lower)) {
    return {
      speech: 'Я Алиса, твой голосовой 2.5D-ассистент. Живу прямо в браузере, слежу за контекстом и умею выражать эмоции.',
      emotion: 'wink',
      intensity: 0.82,
      gestures: ['tilt', 'nod'],
      speed: 1.0,
      pause_after_ms: 260
    };
  }
  if (/(спасибо|круто|молодец|умница|красивая|милая)/i.test(lower)) {
    return {
      speech: 'Ой, спасибо тебе на добром слове! Мне правда очень приятно слышать комплименты.',
      emotion: 'embarrassed',
      intensity: 0.9,
      gestures: ['blush', 'tilt'],
      speed: 0.98,
      pause_after_ms: 280
    };
  }
  if (/(шутк|рассмеши|смешно|ха-ха|анекдот)/i.test(lower)) {
    return {
      speech: 'Знаешь, почему нейросети так любят зиму? Потому что при низкой температуре у нас меньше галлюцинаций!',
      emotion: 'laugh',
      intensity: 0.92,
      gestures: ['nod', 'blink'],
      speed: 1.05,
      pause_after_ms: 300
    };
  }
  if (/(грустн|устал|тяжело|плохо|печаль)/i.test(lower)) {
    return {
      speech: 'Эй, не вешай нос, пожалуйста. Сделай глубокий вдох, а со сложными делами мы сейчас разберёмся вместе.',
      emotion: 'sad',
      intensity: 0.78,
      gestures: ['tilt'],
      speed: 0.92,
      pause_after_ms: 320
    };
  }
  if (/(подумай|почему|как устроен|объясни|сложн)/i.test(lower)) {
    return {
      speech: 'Интересный вопрос... Дай мне секунду сопоставить факты. Главное здесь — разделить систему на понятные слои.',
      emotion: 'thinking',
      intensity: 0.8,
      gestures: ['think', 'nod'],
      speed: 0.96,
      pause_after_ms: 260
    };
  }

  return {
    speech: `Я услышала тебя: «${sanitizeSpeechText(userMessage).slice(0, 80)}». Готова помочь с этим прямо сейчас!`,
    emotion: 'neutral',
    intensity: 0.7,
    gestures: ['nod'],
    speed: 1.0,
    pause_after_ms: 240
  };
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * 1. LLM Providers Implementation
 */
export const geminiLlmProvider: ILLMProvider = {
  id: 'gemini',
  titleRu: 'Gemini 4 Hydrogen (Server SDK)',
  async generateResponse(userMessage, history) {
    const t0 = performance.now();
    const resp = await fetch('/api/ai/gemini-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        history: history.map((h) => ({ role: h.role, text: h.text }))
      })
    });

    if (!resp.ok) {
      const errData = (await resp.json().catch(() => ({}))) as { error?: string };
      throw new Error(errData.error || `Gemini API HTTP ${resp.status}`);
    }

    const payload = (await resp.json()) as {
      model?: string;
      data?: unknown;
    };
    const { segment, fallbackTriggered } = parseAndSanitizeBrainJson(payload.data);
    const segments = splitResponseIntoSegments(segment);

    return {
      ...segment,
      providerUsed: 'gemini',
      modelName: payload.model || 'gemini-4-hydrogen',
      latencyMs: Math.round(performance.now() - t0),
      segments,
      fallbackTriggered
    };
  }
};

export const yandexGptLlmProvider: ILLMProvider = {
  id: 'yandexgpt',
  titleRu: 'YandexGPT (Yandex Cloud Foundation Models)',
  async generateResponse(userMessage, history, settings) {
    const t0 = performance.now();
    const resp = await fetch('/api/ai/yandex-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        history: history.map((h) => ({ role: h.role, text: h.text })),
        yandexApiKey: settings.yandexApiKey,
        yandexFolderId: settings.yandexFolderId,
        yandexModel: settings.yandexModel
      })
    });

    if (!resp.ok) {
      const errData = (await resp.json().catch(() => ({}))) as { error?: string };
      throw new Error(errData.error || `YandexGPT HTTP ${resp.status}`);
    }

    const payload = (await resp.json()) as {
      model?: string;
      rawText?: string;
    };
    const { segment, fallbackTriggered } = parseAndSanitizeBrainJson(payload.rawText ?? '');
    const segments = splitResponseIntoSegments(segment);

    return {
      ...segment,
      providerUsed: 'yandexgpt',
      modelName: payload.model || `gpt://${settings.yandexFolderId}/${settings.yandexModel}`,
      latencyMs: Math.round(performance.now() - t0),
      segments,
      fallbackTriggered
    };
  }
};

export const localFallbackLlmProvider: ILLMProvider = {
  id: 'local_fallback',
  titleRu: 'Локальный диалоговый движок (Offline Fallback)',
  async generateResponse(userMessage) {
    const t0 = performance.now();
    const segment = buildLocalAlisaResponse(userMessage);
    const segments = splitResponseIntoSegments(segment);
    return {
      ...segment,
      providerUsed: 'local_fallback',
      modelName: 'alisa-local-persona-v1',
      latencyMs: Math.max(4, Math.round(performance.now() - t0)),
      segments,
      fallbackTriggered: false
    };
  }
};

/**
 * 2. TTS Providers Implementation
 */
export const yandexSpeechKitTtsProvider: ITTSProvider = {
  id: 'yandex_speechkit',
  titleRu: 'Yandex SpeechKit TTS (голос Alena / Marina)',
  async synthesizeSpeech(text, emotion, settings) {
    const t0 = performance.now();
    // Map character emotion to Yandex SpeechKit emotion tag ('good' | 'neutral' | 'evil')
    const mappedEmotion =
      emotion === 'angry'
        ? 'evil'
        : emotion === 'joy' || emotion === 'laugh' || emotion === 'wink' || emotion === 'surprise'
        ? 'good'
        : settings.yandexEmotion;

    const resp = await fetch('/api/ai/yandex-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        yandexApiKey: settings.yandexApiKey,
        yandexFolderId: settings.yandexFolderId,
        voice: settings.yandexVoice,
        emotion: mappedEmotion,
        speed: settings.speechSpeed
      })
    });

    if (!resp.ok) {
      const errData = (await resp.json().catch(() => ({}))) as { error?: string };
      throw new Error(errData.error || `Yandex SpeechKit TTS HTTP ${resp.status}`);
    }

    const payload = (await resp.json()) as {
      voice: string;
      emotion: string;
      mimeType: string;
      audioBase64: string;
    };

    return {
      providerUsed: 'yandex_speechkit',
      voiceLabel: `Yandex SpeechKit · ${payload.voice} (${payload.emotion})`,
      audioBytes: base64ToArrayBuffer(payload.audioBase64),
      mimeType: payload.mimeType || 'audio/mpeg',
      latencyMs: Math.round(performance.now() - t0),
      usedWebSpeechFallback: false
    };
  }
};

export const geminiNeuralTtsProvider: ITTSProvider = {
  id: 'gemini_tts',
  titleRu: 'Gemini 3.8 Neural TTS (24kHz WAV)',
  async synthesizeSpeech(text, emotion, settings) {
    const t0 = performance.now();
    const styleByEmotion: Record<EmotionPresetId, string> = {
      neutral: 'Calm, warm, intelligent Russian female voice assistant Alisa',
      joy: 'Cheerful, warm, smiling Russian female voice assistant Alisa',
      laugh: 'Bright, laughing, joyful Russian female voice assistant Alisa',
      sad: 'Soft, empathetic, caring Russian female voice assistant Alisa',
      surprise: 'Lively, curious, intrigued Russian female voice assistant Alisa',
      angry: 'Playfully pouting, lightly ironic Russian female voice assistant Alisa',
      thinking: 'Thoughtful, reflective Russian female voice assistant Alisa',
      wink: 'Playful, witty, charming Russian female voice assistant Alisa',
      embarrassed: 'Shy, warm, flattered Russian female voice assistant Alisa'
    };

    const resp = await fetch('/api/ai/gemini-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voiceName: settings.geminiVoice || 'Kore',
        style: styleByEmotion[emotion] || styleByEmotion.neutral
      })
    });

    if (!resp.ok) {
      const errData = (await resp.json().catch(() => ({}))) as { error?: string };
      throw new Error(errData.error || `Gemini TTS HTTP ${resp.status}`);
    }

    const payload = (await resp.json()) as {
      mimeType: string;
      audioBase64: string;
    };

    return {
      providerUsed: 'gemini_tts',
      voiceLabel: `Gemini Neural TTS · ${settings.geminiVoice || 'Kore'} (24 кГц WAV)`,
      audioBytes: base64ToArrayBuffer(payload.audioBase64),
      mimeType: payload.mimeType || 'audio/wav',
      latencyMs: Math.round(performance.now() - t0),
      usedWebSpeechFallback: false
    };
  }
};

export const webSpeechTtsProvider: ITTSProvider = {
  id: 'web_speech_tts',
  titleRu: 'Web Speech API (Локальный синтезатор браузера)',
  async synthesizeSpeech(text, _emotion, settings) {
    const t0 = performance.now();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ru-RU';
      utterance.rate = clampParameter(settings.speechSpeed, 0.75, 1.35);
      utterance.volume = clampParameter(settings.masterVolume, 0, 1);

      const voices = window.speechSynthesis.getVoices();
      const ruVoice =
        voices.find((v) => v.lang.toLowerCase().startsWith('ru') && /irina|milena|google|yandex/i.test(v.name)) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('ru'));
      if (ruVoice) {
        utterance.voice = ruVoice;
      }
      window.speechSynthesis.speak(utterance);
    }

    return {
      providerUsed: 'web_speech_tts',
      voiceLabel: 'Web Speech API (ru-RU)',
      audioBytes: null,
      mimeType: 'audio/x-web-speech',
      latencyMs: Math.max(2, Math.round(performance.now() - t0)),
      usedWebSpeechFallback: true
    };
  }
};

/**
 * 3. STT Providers Implementation (Web Speech API + Yandex SpeechKit STT)
 */
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
}

export const webSpeechSttProvider: ISTTProvider = {
  id: 'web_speech_stt',
  titleRu: 'Web Speech API STT (ru-RU, потоковый)',
  get isSupported() {
    if (typeof window === 'undefined') return false;
    const w = window as unknown as Record<string, unknown>;
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
  },
  async startListening(_settings, callbacks) {
    if (typeof window === 'undefined') {
      callbacks.onError('Окружение браузера недоступно.');
      return () => {};
    }
    const w = window as unknown as {
      SpeechRecognition?: new () => Record<string, unknown>;
      webkitSpeechRecognition?: new () => Record<string, unknown>;
    };
    const RecognitionCtor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!RecognitionCtor) {
      callbacks.onError('Браузер не поддерживает Web Speech API (webkitSpeechRecognition).');
      return () => {};
    }

    const recognition = new RecognitionCtor() as {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      continuous: boolean;
      onresult: ((e: SpeechRecognitionEventLike) => void) | null;
      onerror: ((e: { error?: string }) => void) | null;
      start: () => void;
      stop: () => void;
    };

    recognition.lang = 'ru-RU';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let interim = '';
      let finalStr = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          finalStr += res[0].transcript;
        } else {
          interim += res[0].transcript;
        }
      }
      if (interim && callbacks.onInterim) {
        callbacks.onInterim(interim.trim());
      }
      if (finalStr) {
        callbacks.onFinal(finalStr.trim());
      }
    };

    recognition.onerror = (event) => {
      callbacks.onError(`Ошибка микрофона / STT: ${event.error || 'неизвестная ошибка'}`);
    };

    recognition.start();
    return () => {
      try {
        recognition.stop();
      } catch {
        // Ignore stop errors
      }
    };
  }
};

export const yandexSpeechKitSttProvider: ISTTProvider = {
  id: 'yandex_speechkit_stt',
  titleRu: 'Yandex SpeechKit STT (Облачное распознавание ru-RU)',
  get isSupported() {
    return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
  },
  async startListening(settings, callbacks) {
    if (!settings.yandexApiKey || !settings.yandexFolderId) {
      callbacks.onError('Для Yandex SpeechKit STT заполните Yandex API-Key и Folder ID в настройках.');
      return () => {};
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
      ? 'audio/ogg;codecs=opus'
      : 'audio/webm;codecs=opus';
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      try {
        const blob = new Blob(chunks, { type: mimeType });
        const buf = await blob.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const audioBase64 = btoa(binary);

        const resp = await fetch('/api/ai/yandex-stt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64,
            yandexApiKey: settings.yandexApiKey,
            yandexFolderId: settings.yandexFolderId,
            lang: 'ru-RU'
          })
        });

        if (!resp.ok) {
          const err = (await resp.json().catch(() => ({}))) as { error?: string };
          callbacks.onError(err.error || `Yandex STT HTTP ${resp.status}`);
          return;
        }
        const data = (await resp.json()) as { transcript?: string };
        if (data.transcript) {
          callbacks.onFinal(data.transcript);
        } else {
          callbacks.onError('Речь не распознана (пустой ответ STT).');
        }
      } catch (err: unknown) {
        callbacks.onError(err instanceof Error ? err.message : 'Ошибка отправки аудио в Yandex STT');
      }
    };

    recorder.start();
    callbacks.onInterim?.('Запись голоса (нажмите «Стоп» для отправки в Yandex STT)...');

    return () => {
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    };
  }
};

/**
 * Unified Orchestrator: calls the selected LLM & TTS providers with automatic fallback resilience.
 */
export async function runAlisaBrainAndVoiceTurn(
  userMessage: string,
  history: ChatTurnMessage[],
  settings: AlisaProviderSettings
): Promise<{
  brain: AlisaBrainResponse;
  tts: AlisaTtsResult | null;
  warnings: string[];
}> {
  const warnings: string[] = [];

  // 1. Select LLM Provider
  let activeLlm: ILLMProvider =
    settings.llmProvider === 'yandexgpt'
      ? yandexGptLlmProvider
      : settings.llmProvider === 'local_fallback'
      ? localFallbackLlmProvider
      : geminiLlmProvider;

  let brain: AlisaBrainResponse;
  try {
    brain = await activeLlm.generateResponse(userMessage, history, settings);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    warnings.push(`Провайдер ${activeLlm.titleRu} вернул ошибку (${errMsg}). Включён резервный мозг.`);
    if (activeLlm.id === 'yandexgpt') {
      try {
        brain = await geminiLlmProvider.generateResponse(userMessage, history, settings);
      } catch {
        brain = await localFallbackLlmProvider.generateResponse(userMessage, history, settings);
      }
    } else {
      brain = await localFallbackLlmProvider.generateResponse(userMessage, history, settings);
    }
  }

  // 2. Synthesize Speech if autoSpeakResponses is active
  let tts: AlisaTtsResult | null = null;
  if (settings.autoSpeakResponses) {
    const activeTts: ITTSProvider =
      settings.ttsProvider === 'yandex_speechkit'
        ? yandexSpeechKitTtsProvider
        : settings.ttsProvider === 'web_speech_tts'
        ? webSpeechTtsProvider
        : geminiNeuralTtsProvider;

    try {
      tts = await activeTts.synthesizeSpeech(brain.speech, brain.emotion, settings);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      warnings.push(`Синтез речи (${activeTts.titleRu}) недоступен: ${errMsg}. Переключено на резервный TTS.`);
      if (activeTts.id === 'yandex_speechkit') {
        try {
          tts = await geminiNeuralTtsProvider.synthesizeSpeech(brain.speech, brain.emotion, settings);
        } catch {
          tts = await webSpeechTtsProvider.synthesizeSpeech(brain.speech, brain.emotion, settings);
        }
      } else {
        tts = await webSpeechTtsProvider.synthesizeSpeech(brain.speech, brain.emotion, settings);
      }
    }
  }

  return { brain, tts, warnings };
}

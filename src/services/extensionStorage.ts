/**
 * Unified Chrome Extension Storage Layer (Manifest V3 `chrome.storage.local` + Web Preview Fallback).
 * Never stores secrets in source code; persists user settings and Yandex Cloud credentials in browser storage.
 */

export type LlmProviderId = 'gemini' | 'yandexgpt' | 'local_fallback';
export type TtsProviderId = 'yandex_speechkit' | 'gemini_tts' | 'web_speech_tts';
export type SttProviderId = 'web_speech_stt' | 'yandex_speechkit_stt';

export type YandexVoiceId = 'alena' | 'marina' | 'jane' | 'omazh' | 'zahar';
export type YandexEmotionTag = 'good' | 'neutral' | 'evil';

export interface AlisaProviderSettings {
  // Active Architecture Preset ('A_YANDEX_FULL' | 'B_HYBRID_GEMINI_YANDEX' | 'C_LOCAL_WEB_SPEECH' | 'CUSTOM')
  architecturePreset: 'A_YANDEX_FULL' | 'B_HYBRID_GEMINI_YANDEX' | 'C_LOCAL_WEB_SPEECH' | 'CUSTOM';
  llmProvider: LlmProviderId;
  ttsProvider: TtsProviderId;
  sttProvider: SttProviderId;

  // Yandex Cloud credentials (stored strictly in chrome.storage.local, never in code)
  yandexApiKey: string;
  yandexFolderId: string;
  yandexModel: 'yandexgpt-lite/latest' | 'yandexgpt/latest';
  yandexVoice: YandexVoiceId;
  yandexEmotion: YandexEmotionTag;

  // Gemini TTS voice option (server-side key is managed automatically by AI Studio)
  geminiVoice: 'Kore' | 'Zephyr' | 'Puck' | 'Charon' | 'Fenrir';

  // Audio & speech parameters
  speechSpeed: number; // 0.75 .. 1.35
  masterVolume: number; // 0.0 .. 1.0
  autoSpeakResponses: boolean;
}

export const DEFAULT_PROVIDER_SETTINGS: AlisaProviderSettings = {
  architecturePreset: 'B_HYBRID_GEMINI_YANDEX',
  llmProvider: 'gemini',
  ttsProvider: 'gemini_tts',
  sttProvider: 'web_speech_stt',
  yandexApiKey: '',
  yandexFolderId: '',
  yandexModel: 'yandexgpt-lite/latest',
  yandexVoice: 'alena',
  yandexEmotion: 'good',
  geminiVoice: 'Kore',
  speechSpeed: 1.0,
  masterVolume: 0.9,
  autoSpeakResponses: true
};

const STORAGE_KEY = 'alisa_ai_mv3_provider_settings_v1';

interface ChromeStorageAreaLike {
  get(keys: string | string[], callback: (items: Record<string, unknown>) => void): void;
  set(items: Record<string, unknown>, callback?: () => void): void;
  remove(keys: string | string[], callback?: () => void): void;
}

function getChromeStorageLocal(): ChromeStorageAreaLike | null {
  const g = globalThis as unknown as {
    chrome?: {
      storage?: {
        local?: ChromeStorageAreaLike;
      };
    };
  };
  if (g.chrome && g.chrome.storage && g.chrome.storage.local) {
    return g.chrome.storage.local;
  }
  return null;
}

export function isChromeExtensionStorageAvailable(): boolean {
  return getChromeStorageLocal() !== null;
}

const listeners = new Set<(settings: AlisaProviderSettings) => void>();

export async function loadProviderSettings(): Promise<AlisaProviderSettings> {
  const chromeLocal = getChromeStorageLocal();
  if (chromeLocal) {
    return new Promise((resolve) => {
      chromeLocal.get([STORAGE_KEY], (items) => {
        const stored = items?.[STORAGE_KEY];
        if (stored && typeof stored === 'object') {
          resolve({ ...DEFAULT_PROVIDER_SETTINGS, ...(stored as Partial<AlisaProviderSettings>) });
        } else {
          resolve({ ...DEFAULT_PROVIDER_SETTINGS });
        }
      });
    });
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AlisaProviderSettings>;
        return { ...DEFAULT_PROVIDER_SETTINGS, ...parsed };
      }
    }
  } catch {
    // Ignore storage read errors in restricted environments
  }

  return { ...DEFAULT_PROVIDER_SETTINGS };
}

export async function saveProviderSettings(
  partial: Partial<AlisaProviderSettings>
): Promise<AlisaProviderSettings> {
  const current = await loadProviderSettings();
  const next: AlisaProviderSettings = {
    ...current,
    ...partial,
    speechSpeed: Math.max(0.75, Math.min(1.35, Number(partial.speechSpeed ?? current.speechSpeed) || 1.0)),
    masterVolume: Math.max(0, Math.min(1, Number(partial.masterVolume ?? current.masterVolume) ?? 0.9))
  };

  const chromeLocal = getChromeStorageLocal();
  if (chromeLocal) {
    await new Promise<void>((resolve) => {
      chromeLocal.set({ [STORAGE_KEY]: next }, () => resolve());
    });
  } else {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
    } catch {
      // Ignore storage write errors
    }
  }

  listeners.forEach((cb) => cb(next));
  return next;
}

export async function clearStoredCredentials(): Promise<AlisaProviderSettings> {
  return saveProviderSettings({
    yandexApiKey: '',
    yandexFolderId: ''
  });
}

export function subscribeProviderSettings(
  callback: (settings: AlisaProviderSettings) => void
): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

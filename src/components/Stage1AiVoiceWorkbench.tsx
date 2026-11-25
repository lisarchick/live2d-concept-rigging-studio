import React, { useState, useEffect, useRef } from 'react';
import {
  AlisaProviderSettings,
  DEFAULT_PROVIDER_SETTINGS,
  loadProviderSettings,
  saveProviderSettings,
  clearStoredCredentials,
  isChromeExtensionStorageAvailable,
  LlmProviderId,
  TtsProviderId,
  SttProviderId,
  YandexVoiceId,
  YandexEmotionTag
} from '../services/extensionStorage';
import {
  STAGE1_ARCHITECTURE_COMPARISON,
  runAlisaBrainAndVoiceTurn,
  webSpeechSttProvider,
  yandexSpeechKitSttProvider,
  ChatTurnMessage,
  AlisaBrainResponse,
  AlisaTtsResult
} from '../services/aiProviders';
import { EmotionPresetId, EMOTION_PRESETS } from '../utils/conceptLogic';
import { AssistantStateId } from '../data/stage4Data';
import {
  Cpu,
  Volume2,
  Mic,
  MicOff,
  Send,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Trash2,
  Play,
  Radio
} from 'lucide-react';

interface Stage1AiVoiceWorkbenchProps {
  onTriggerModelSpeech: (payload: { id: number; text: string; emotion: EmotionPresetId }) => void;
  onSelectAssistantState?: (stateId: AssistantStateId) => void;
}

const QUICK_PROMPTS = [
  'Привет, Алиса! Расскажи немного о себе и своём голосе.',
  'У меня сегодня отличный день, порадуйся со мной!',
  'Расскажи короткую смешную шутку про нейросети.',
  'Мне немного грустно и я устал, поддержи меня.',
  'Ты очень милая и умная помощница!'
];

export const Stage1AiVoiceWorkbench: React.FC<Stage1AiVoiceWorkbenchProps> = ({
  onTriggerModelSpeech,
  onSelectAssistantState
}) => {
  const [settings, setSettings] = useState<AlisaProviderSettings>(DEFAULT_PROVIDER_SETTINGS);
  const [isStorageLoaded, setIsStorageLoaded] = useState<boolean>(false);
  const [storageSavedBanner, setStorageSavedBanner] = useState<boolean>(false);
  const [serverGeminiReady, setServerGeminiReady] = useState<boolean>(true);

  const [userInput, setUserInput] = useState<string>(
    'Привет, Алиса! Расскажи немного о себе и своём голосе.'
  );
  const [chatHistory, setChatHistory] = useState<ChatTurnMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isListeningStt, setIsListeningStt] = useState<boolean>(false);
  const [sttInterimText, setSttInterimText] = useState<string>('');

  const [lastBrainResult, setLastBrainResult] = useState<AlisaBrainResponse | null>(null);
  const [lastTtsResult, setLastTtsResult] = useState<AlisaTtsResult | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [isTestingYandex, setIsTestingYandex] = useState<boolean>(false);
  const [yandexTestResult, setYandexTestResult] = useState<{
    gptOk?: boolean;
    ttsOk?: boolean;
    message: string;
  } | null>(null);

  const stopSttRef = useRef<(() => void) | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadProviderSettings().then((loaded) => {
      setSettings(loaded);
      setIsStorageLoaded(true);
    });

    fetch('/api/ai/status')
      .then((r) => r.json())
      .then((data: { geminiConfigured?: boolean }) => {
        if (typeof data.geminiConfigured === 'boolean') {
          setServerGeminiReady(data.geminiConfigured);
        }
      })
      .catch(() => {
        // Keep optimistic default
      });

    return () => {
      if (stopSttRef.current) {
        stopSttRef.current();
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, []);

  const updateSettings = async (patch: Partial<AlisaProviderSettings>) => {
    const updated = await saveProviderSettings(patch);
    setSettings(updated);
    setStorageSavedBanner(true);
    window.setTimeout(() => setStorageSavedBanner(false), 1800);
  };

  const applyArchitecturePreset = async (
    code: 'A_YANDEX_FULL' | 'B_HYBRID_GEMINI_YANDEX' | 'C_LOCAL_WEB_SPEECH'
  ) => {
    if (code === 'A_YANDEX_FULL') {
      await updateSettings({
        architecturePreset: 'A_YANDEX_FULL',
        llmProvider: 'yandexgpt',
        ttsProvider: 'yandex_speechkit',
        sttProvider: 'yandex_speechkit_stt'
      });
    } else if (code === 'B_HYBRID_GEMINI_YANDEX') {
      await updateSettings({
        architecturePreset: 'B_HYBRID_GEMINI_YANDEX',
        llmProvider: 'gemini',
        ttsProvider: settings.yandexApiKey && settings.yandexFolderId ? 'yandex_speechkit' : 'gemini_tts',
        sttProvider: 'web_speech_stt'
      });
    } else {
      await updateSettings({
        architecturePreset: 'C_LOCAL_WEB_SPEECH',
        llmProvider: 'local_fallback',
        ttsProvider: 'web_speech_tts',
        sttProvider: 'web_speech_stt'
      });
    }
  };

  const playSynthesizedAudioBytes = (tts: AlisaTtsResult) => {
    if (!tts.audioBytes) return;
    try {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const blob = new Blob([tts.audioBytes], { type: tts.mimeType || 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = settings.masterVolume;
      audio.playbackRate = settings.speechSpeed;
      audioPlayerRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
      };
      audio.play().catch(() => {
        // Ignore autoplay restriction if triggered without user gesture
      });
    } catch {
      // Ignore audio blob playback errors
    }
  };

  const handleSendPrompt = async (overrideText?: string) => {
    const textToSend = (overrideText ?? userInput).trim();
    if (!textToSend || isGenerating) return;

    setErrorBanner(null);
    setWarnings([]);
    setIsGenerating(true);
    onSelectAssistantState?.('THINKING');

    const userMsg: ChatTurnMessage = {
      role: 'user',
      text: textToSend,
      timestamp: Date.now()
    };
    const nextHistory = [...chatHistory, userMsg];
    setChatHistory(nextHistory);

    try {
      const { brain, tts, warnings: turnWarnings } = await runAlisaBrainAndVoiceTurn(
        textToSend,
        nextHistory,
        settings
      );

      setLastBrainResult(brain);
      setLastTtsResult(tts);
      setWarnings(turnWarnings);

      const assistantMsg: ChatTurnMessage = {
        role: 'assistant',
        text: brain.speech,
        emotion: brain.emotion,
        provider: `${brain.providerUsed} (${brain.modelName})`,
        timestamp: Date.now()
      };
      setChatHistory((prev) => [...prev, assistantMsg]);

      // Drive the 2.5D Alisa model with the structured emotion and speech!
      onTriggerModelSpeech({
        id: Date.now(),
        text: brain.speech,
        emotion: brain.emotion
      });

      if (tts && tts.audioBytes) {
        playSynthesizedAudioBytes(tts);
      }
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : 'Ошибка выполнения запроса к ИИ');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleSttMicrophone = async () => {
    if (isListeningStt) {
      if (stopSttRef.current) {
        stopSttRef.current();
        stopSttRef.current = null;
      }
      setIsListeningStt(false);
      setSttInterimText('');
      onSelectAssistantState?.('IDLE');
      return;
    }

    setErrorBanner(null);
    setSttInterimText('Слушаю вас...');
    setIsListeningStt(true);
    onSelectAssistantState?.('LISTENING');

    const activeStt =
      settings.sttProvider === 'yandex_speechkit_stt'
        ? yandexSpeechKitSttProvider
        : webSpeechSttProvider;

    try {
      const stopFn = await activeStt.startListening(settings, {
        onInterim: (interim) => {
          setSttInterimText(interim);
        },
        onFinal: (finalTranscript) => {
          setIsListeningStt(false);
          setSttInterimText('');
          stopSttRef.current = null;
          if (finalTranscript) {
            setUserInput(finalTranscript);
            handleSendPrompt(finalTranscript);
          }
        },
        onError: (errMsg) => {
          setIsListeningStt(false);
          setSttInterimText('');
          stopSttRef.current = null;
          setErrorBanner(errMsg);
          onSelectAssistantState?.('IDLE');
        }
      });
      stopSttRef.current = stopFn;
    } catch (err: unknown) {
      setIsListeningStt(false);
      setSttInterimText('');
      setErrorBanner(err instanceof Error ? err.message : 'Не удалось получить доступ к микрофону');
      onSelectAssistantState?.('IDLE');
    }
  };

  const handleTestYandexConnection = async () => {
    setIsTestingYandex(true);
    setYandexTestResult(null);
    try {
      const resp = await fetch('/api/ai/yandex-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yandexApiKey: settings.yandexApiKey,
          yandexFolderId: settings.yandexFolderId,
          voice: settings.yandexVoice,
          yandexModel: settings.yandexModel
        })
      });
      const data = (await resp.json()) as {
        gptOk?: boolean;
        ttsOk?: boolean;
        gptError?: string;
        ttsError?: string;
        error?: string;
        mimeType?: string;
        ttsSampleBase64?: string;
      };

      if (!resp.ok && data.error) {
        setYandexTestResult({ gptOk: false, ttsOk: false, message: data.error });
        return;
      }

      const parts: string[] = [];
      parts.push(data.gptOk ? 'YandexGPT: ✓ OK' : `YandexGPT: ✗ ${data.gptError || 'ошибка'}`);
      parts.push(
        data.ttsOk
          ? `SpeechKit (${settings.yandexVoice}): ✓ OK`
          : `SpeechKit: ✗ ${data.ttsError || 'ошибка'}`
      );
      setYandexTestResult({
        gptOk: data.gptOk,
        ttsOk: data.ttsOk,
        message: parts.join(' · ')
      });

      if (data.ttsOk && data.ttsSampleBase64) {
        const binary = atob(data.ttsSampleBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        playSynthesizedAudioBytes({
          providerUsed: 'yandex_speechkit',
          voiceLabel: settings.yandexVoice,
          audioBytes: bytes.buffer,
          mimeType: data.mimeType || 'audio/mpeg',
          latencyMs: 0,
          usedWebSpeechFallback: false
        });
        onTriggerModelSpeech({
          id: Date.now(),
          text: 'Привет! Связь с Yandex Cloud настроена, я готова к работе.',
          emotion: 'joy'
        });
      }
    } catch (err: unknown) {
      setYandexTestResult({
        gptOk: false,
        ttsOk: false,
        message: err instanceof Error ? err.message : 'Ошибка проверки Yandex Cloud'
      });
    } finally {
      setIsTestingYandex(false);
    }
  };

  const chromeStorageActive = isChromeExtensionStorageAvailable();

  return (
    <section
      id="stage1-ai-voice"
      className="bg-white border-2 border-violet-200 rounded-xl p-6 lg:p-8 space-y-8 shadow-xs"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-3 py-1 rounded-md">
            <Cpu className="w-3.5 h-3.5" />
            <span>ЭТАП 1 · ПОДКЛЮЧЕНИЕ ИИ «АЛИСА» И ЕЁ ГОЛОСА (СЛОЙ-АБСТРАКЦИЯ LLM / TTS / STT)</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900">
            Архитектура ИИ-провайдеров, оценка вариантов A / B / C и живой голосовой тест
          </h2>
          <p className="text-sm text-slate-600 max-w-4xl">
            Единый интерфейс провайдеров (<strong>LLM + TTS + STT</strong>) позволяет менять мозг и синтезатор речи без переписывания 2.5D-модели. Настройки и ключи Yandex Cloud сохраняются в{' '}
            <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
              chrome.storage.local
            </span>
            .
          </p>
        </div>

        <div className="flex flex-col items-start lg:items-end gap-1.5 shrink-0">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              Хранилище:{' '}
              {chromeStorageActive ? 'chrome.storage.local (MV3)' : 'chrome.storage (Web Fallback)'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            Gemini Server SDK: {serverGeminiReady ? '✓ Активен на сервере' : 'Ожидание ключа'}
          </div>
        </div>
      </div>

      {/* 1. Honest Evaluation of Variants A, B, C */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            1. Честная оценка вариантов подключения «Алисы» (нажмите для выбора архитектуры)
          </h3>
          <span className="text-xs text-slate-500">
            У Яндекса нет открытой весовой модели Алисы для скачивания — оценены 3 реальных инженерных пути
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {STAGE1_ARCHITECTURE_COMPARISON.map((opt) => {
            const isSelected = settings.architecturePreset === opt.code;
            return (
              <div
                key={opt.code}
                className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                  isSelected
                    ? 'border-violet-600 bg-violet-50/40 ring-2 ring-violet-500/20'
                    : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                        opt.recommended
                          ? 'bg-violet-600 text-white'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {opt.badge}
                    </span>
                    {isSelected && (
                      <span className="text-xs font-semibold text-violet-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Активен
                      </span>
                    )}
                  </div>

                  <div className="font-bold text-sm text-slate-900">{opt.titleRu}</div>

                  <div className="text-xs space-y-1 bg-white p-2.5 rounded-lg border border-slate-200/80">
                    <div>
                      <span className="font-semibold text-slate-700">LLM:</span>{' '}
                      <span className="text-slate-600">{opt.llmEngine}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">TTS:</span>{' '}
                      <span className="text-slate-600">{opt.ttsEngine}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">STT:</span>{' '}
                      <span className="text-slate-600">{opt.sttEngine}</span>
                    </div>
                    <div className="pt-1 border-t border-slate-100 text-violet-800 font-medium">
                      Сходство с Алисой: {opt.voiceAuthenticityScore}
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="font-semibold text-emerald-800">Плюсы:</div>
                    <ul className="space-y-1 text-slate-600 list-disc list-inside">
                      {opt.prosRu.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="font-semibold text-amber-800">Ограничения:</div>
                    <ul className="space-y-1 text-slate-600 list-disc list-inside">
                      {opt.consRu.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-200/80 space-y-2.5">
                  <p className="text-[11px] text-slate-600 italic">{opt.verdictRu}</p>
                  <button
                    type="button"
                    onClick={() => applyArchitecturePreset(opt.code)}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                      isSelected
                        ? 'bg-violet-600 text-white'
                        : 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected ? '✓ Выбран этот вариант' : `Включить ${opt.badge.split('·')[0].trim()}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Modular Provider Selectors & Yandex Cloud Settings (chrome.storage) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        {/* Left 6 cols: Provider Abstraction Matrix & Yandex Cloud Keys */}
        <div className="lg:col-span-6 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Sliders className="w-4 h-4 text-violet-600" />
              <span>2. Конфигурация провайдеров (LLM / TTS / STT)</span>
            </div>
            {storageSavedBanner && (
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                ✓ Сохранено в chrome.storage
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="select-llm-provider"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Провайдер мозга (LLM)
              </label>
              <select
                id="select-llm-provider"
                value={settings.llmProvider}
                onChange={(e) =>
                  updateSettings({
                    architecturePreset: 'CUSTOM',
                    llmProvider: e.target.value as LlmProviderId
                  })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-violet-600 focus:outline-none"
              >
                <option value="gemini">Gemini 4 Hydrogen (Server)</option>
                <option value="yandexgpt">YandexGPT (Yandex Cloud)</option>
                <option value="local_fallback">Локальный Offline-мозг</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="select-tts-provider"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Провайдер голоса (TTS)
              </label>
              <select
                id="select-tts-provider"
                value={settings.ttsProvider}
                onChange={(e) =>
                  updateSettings({
                    architecturePreset: 'CUSTOM',
                    ttsProvider: e.target.value as TtsProviderId
                  })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-violet-600 focus:outline-none"
              >
                <option value="gemini_tts">Gemini 3.8 Neural TTS (WAV)</option>
                <option value="yandex_speechkit">Yandex SpeechKit («alena»)</option>
                <option value="web_speech_tts">Web Speech API (Браузер)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="select-stt-provider"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Распознавание (STT)
              </label>
              <select
                id="select-stt-provider"
                value={settings.sttProvider}
                onChange={(e) =>
                  updateSettings({
                    architecturePreset: 'CUSTOM',
                    sttProvider: e.target.value as SttProviderId
                  })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-violet-600 focus:outline-none"
              >
                <option value="web_speech_stt">Web Speech API (ru-RU)</option>
                <option value="yandex_speechkit_stt">Yandex SpeechKit STT</option>
              </select>
            </div>
          </div>

          {/* Yandex Cloud Settings Box */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-800">
                Параметры Yandex Cloud (SpeechKit голос «alena» и YandexGPT)
              </div>
              {(settings.yandexApiKey || settings.yandexFolderId) && (
                <button
                  type="button"
                  onClick={() => clearStoredCredentials().then(setSettings)}
                  className="text-[11px] text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Очистить ключи
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="input-yandex-folder"
                  className="block text-[11px] font-medium text-slate-600 mb-1"
                >
                  Yandex Cloud Folder ID (каталог b1g...)
                </label>
                <input
                  id="input-yandex-folder"
                  type="text"
                  value={settings.yandexFolderId}
                  onChange={(e) => updateSettings({ yandexFolderId: e.target.value })}
                  placeholder="Например: b1g8a9c2d..."
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:border-violet-600 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="input-yandex-key"
                  className="block text-[11px] font-medium text-slate-600 mb-1"
                >
                  Yandex Cloud API-Key (сервисный ключ AQVN...)
                </label>
                <input
                  id="input-yandex-key"
                  type="password"
                  value={settings.yandexApiKey}
                  onChange={(e) => updateSettings({ yandexApiKey: e.target.value })}
                  placeholder="AQVN..."
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:border-violet-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label
                  htmlFor="select-yandex-voice"
                  className="block text-[11px] font-medium text-slate-600 mb-1"
                >
                  Голос SpeechKit
                </label>
                <select
                  id="select-yandex-voice"
                  value={settings.yandexVoice}
                  onChange={(e) => updateSettings({ yandexVoice: e.target.value as YandexVoiceId })}
                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-900"
                >
                  <option value="alena">alena (Тембр Алисы)</option>
                  <option value="marina">marina (Мягкий)</option>
                  <option value="jane">jane (Энергичный)</option>
                  <option value="omazh">omazh (Тёплый)</option>
                  <option value="zahar">zahar (Мужской)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="select-yandex-emotion"
                  className="block text-[11px] font-medium text-slate-600 mb-1"
                >
                  Амплуа голоса
                </label>
                <select
                  id="select-yandex-emotion"
                  value={settings.yandexEmotion}
                  onChange={(e) =>
                    updateSettings({ yandexEmotion: e.target.value as YandexEmotionTag })
                  }
                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-900"
                >
                  <option value="good">good (Доброжелательная)</option>
                  <option value="neutral">neutral (Спокойная)</option>
                  <option value="evil">evil (Строгая / Ворчание)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="slider-speech-speed"
                  className="block text-[11px] font-medium text-slate-600 mb-1"
                >
                  Скорость речи: {settings.speechSpeed.toFixed(2)}x
                </label>
                <input
                  id="slider-speech-speed"
                  type="range"
                  min="0.75"
                  max="1.35"
                  step="0.05"
                  value={settings.speechSpeed}
                  onChange={(e) => updateSettings({ speechSpeed: parseFloat(e.target.value) })}
                  className="w-full accent-violet-600"
                />
              </div>
            </div>

            {/* Diagnostic Button & Step-by-Step Guide for Variant A */}
            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleTestYandexConnection}
                  disabled={isTestingYandex}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-50 hover:bg-violet-100 text-violet-800 border border-violet-200 transition-colors disabled:opacity-50"
                >
                  {isTestingYandex
                    ? 'Проверяем YandexGPT и голос Алёны...'
                    : 'Проверить ключи и голос Алёны'}
                </button>
                {yandexTestResult && (
                  <span
                    className={`text-[11px] font-medium px-2.5 py-1 rounded ${
                      yandexTestResult.gptOk && yandexTestResult.ttsOk
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-900 border border-amber-200'
                    }`}
                  >
                    {yandexTestResult.message}
                  </span>
                )}
              </div>

              <div className="text-[11px] text-slate-600 bg-slate-50 rounded-lg p-2.5 border border-slate-200/80 space-y-1">
                <div className="font-semibold text-slate-800">
                  Как настроить Вариант A (YandexGPT + SpeechKit «alena») за 2 минуты:
                </div>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>
                    В консоли <span className="font-mono">console.yandex.cloud</span> скопируйте{' '}
                    <strong>ID каталога</strong> (<span className="font-mono">b1g...</span>).
                  </li>
                  <li>
                    Создайте <strong>Сервисный аккаунт</strong> с ролями:{' '}
                    <span className="font-mono">ai.languageModels.user</span>,{' '}
                    <span className="font-mono">ai.speechkit-tts.user</span> и{' '}
                    <span className="font-mono">ai.speechkit-stt.user</span>.
                  </li>
                  <li>
                    Выпустите для него <strong>API-ключ</strong> (<span className="font-mono">AQVN...</span>), вставьте выше и нажмите <strong>«Включить Вариант A»</strong> → <strong>«Проверить ключи»</strong>.
                  </li>
                </ol>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoSpeakResponses}
                onChange={(e) => updateSettings({ autoSpeakResponses: e.target.checked })}
                className="rounded text-violet-600"
              />
              <span className="font-medium text-slate-800">
                Автоматически озвучивать ответы Алисы (TTS + 48 слайдов липсинка)
              </span>
            </label>
            <span className="font-mono text-[11px] text-slate-500">
              {isStorageLoaded ? 'Конфиг синхронизирован' : 'Загрузка...'}
            </span>
          </div>
        </div>

        {/* Right 6 cols: Live Dialogue & Voice Testing Console */}
        <div className="lg:col-span-6 bg-slate-900 text-slate-100 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-violet-300">
                  3. Живой диалог с Алисой (Проверка Мозга + Голоса + Мимики)
                </span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                LLM: {settings.llmProvider} · TTS: {settings.ttsProvider}
              </span>
            </div>

            {/* Quick Prompt Pills */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setUserInput(q);
                    handleSendPrompt(q);
                  }}
                  disabled={isGenerating}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50 text-left"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input & Mic Row */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                aria-label="Сообщение для Алисы AI"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendPrompt();
                }}
                placeholder="Напишите реплику или нажмите микрофон..."
                className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-400 focus:border-violet-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleToggleSttMicrophone}
                aria-label={isListeningStt ? 'Остановить запись микрофона' : 'Голосовой ввод (STT)'}
                className={`px-3 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                  isListeningStt
                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                {isListeningStt ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isListeningStt ? 'Стоп' : 'Голос'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendPrompt()}
                disabled={isGenerating}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isGenerating ? 'Думаю...' : 'Отправить'}</span>
              </button>
            </div>

            {sttInterimText && (
              <div className="text-xs text-amber-300 bg-amber-950/50 border border-amber-800/60 rounded-lg px-3 py-1.5 flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 animate-ping" />
                <span>{sttInterimText}</span>
              </div>
            )}

            {errorBanner && (
              <div className="text-xs text-rose-300 bg-rose-950/60 border border-rose-800 rounded-lg px-3 py-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorBanner}</span>
              </div>
            )}

            {warnings.length > 0 && (
              <div className="text-[11px] text-amber-200 bg-amber-950/40 border border-amber-800/50 rounded-lg px-3 py-2 space-y-1">
                {warnings.map((w, i) => (
                  <div key={i}>• {w}</div>
                ))}
              </div>
            )}
          </div>

          {/* Structured Brain & TTS Output Telemetry */}
          {lastBrainResult ? (
            <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-semibold text-violet-300">
                  Ответ Алисы ({EMOTION_PRESETS[lastBrainResult.emotion]?.label || lastBrainResult.emotion})
                </span>
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                  <span>LLM: {lastBrainResult.latencyMs} мс</span>
                  {lastTtsResult && <span>· TTS: {lastTtsResult.latencyMs} мс</span>}
                </div>
              </div>

              <div className="text-sm text-white font-medium leading-relaxed bg-slate-900 p-2.5 rounded border border-slate-800">
                «{lastBrainResult.speech}»
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-mono text-slate-400">
                <div>
                  emotion: <span className="text-emerald-400">"{lastBrainResult.emotion}"</span> ·
                  intensity: <span className="text-emerald-400">{lastBrainResult.intensity}</span> ·
                  gestures: <span className="text-violet-300">[{lastBrainResult.gestures.join(', ')}]</span>
                </div>
                {lastTtsResult && (
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-slate-300">{lastTtsResult.voiceLabel}</span>
                    {lastTtsResult.audioBytes && (
                      <button
                        type="button"
                        onClick={() => playSynthesizedAudioBytes(lastTtsResult)}
                        className="px-2 py-0.5 rounded bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 border border-violet-500/40 inline-flex items-center gap-1"
                      >
                        <Play className="w-2.5 h-2.5" /> Повторить звук
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-4 text-xs text-slate-400">
              Нажмите любую быструю фразу или отправьте сообщение — Алиса ответит через выбранный провайдер (Gemini 4 / YandexGPT / Local), озвучит реплику и синхронно отыграет эмоцию и 48 слайдов рта на 2.5D-модели ниже.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

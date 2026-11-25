import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
let latestVtuberFrameJson: string | null = null;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

const VALID_EMOTIONS = [
  'neutral',
  'joy',
  'laugh',
  'sad',
  'surprise',
  'angry',
  'thinking',
  'wink',
  'embarrassed'
] as const;

const ALISA_SYSTEM_INSTRUCTION = `Ты — Алиса AI (Alisa AI), живой голосовой 2.5D-ассистент в стиле «Домашний Нео-Уют».
Твой характер: спокойная, умная, тёплая, чуткая, с лёгкой игривостью и мягкой иронией.
Правила ответа:
1. Отвечай на русском языке короткими, живыми разговорными фразами (1–3 предложения), которые естественно звучат вслух.
2. Никогда не используй markdown-разметку, списки, звёздочки или эмодзи в поле speech.
3. Всегда возвращай строго валидный JSON-объект со следующими полями:
   - speech: чистый текст реплики для озвучки (без markdown и эмодзи)
   - emotion: одно значение из списка: "neutral", "joy", "laugh", "sad", "surprise", "angry", "thinking", "wink", "embarrassed"
   - intensity: число от 0.2 до 1.0 (выразительность мимики)
   - gestures: массив жестов из списка ["nod", "tilt", "blink", "think", "wave", "blush"]
   - speed: скорость речи от 0.85 до 1.25 (обычно 1.0)
   - pause_after_ms: пауза после фразы в мс (от 150 до 600)`;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // 1. Health & Provider Capabilities check
  app.get('/api/ai/status', (_req, res) => {
    res.json({
      ok: true,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      supportedLlmProviders: ['gemini', 'yandexgpt', 'local_fallback'],
      supportedTtsProviders: ['yandex_speechkit', 'gemini_tts', 'web_speech_tts'],
      supportedSttProviders: ['web_speech_stt', 'yandex_speechkit_stt']
    });
  });

  // 2. Server-Side Gemini LLM Brain (Variant B & Default Zero-Config Brain)
  app.post('/api/ai/gemini-chat', async (req, res) => {
    try {
      const { message, history = [], systemPromptOverride } = req.body ?? {};
      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Поле message обязательно.' });
        return;
      }

      const ai = getGeminiClient();
      const contents = [
        ...history
          .slice(-8)
          .map((item: { role: string; text: string }) => ({
            role: item.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: String(item.text || '') }]
          })),
        {
          role: 'user',
          parts: [{ text: message }]
        }
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction: systemPromptOverride || ALISA_SYSTEM_INSTRUCTION,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              speech: {
                type: Type.STRING,
                description: 'Короткая живая реплика Алисы без markdown и без эмодзи.'
              },
              emotion: {
                type: Type.STRING,
                description:
                  'Эмоция модели строго из списка: neutral, joy, laugh, sad, surprise, angry, thinking, wink, embarrassed.'
              },
              intensity: {
                type: Type.NUMBER,
                description: 'Интенсивность эмоции от 0.2 до 1.0.'
              },
              gestures: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Жесты: nod, tilt, blink, think, wave, blush.'
              },
              speed: {
                type: Type.NUMBER,
                description: 'Темп речи от 0.85 до 1.25.'
              },
              pause_after_ms: {
                type: Type.INTEGER,
                description: 'Пауза после реплики в миллисекундах.'
              }
            },
            required: ['speech', 'emotion', 'intensity', 'gestures', 'speed', 'pause_after_ms']
          }
        }
      });

      const rawText = (response.text ?? '{}').trim();
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = {
          speech: rawText.replace(/[*_#`~]/g, '') || 'Я задумалась на секунду, повтори, пожалуйста.',
          emotion: 'neutral',
          intensity: 0.6,
          gestures: ['blink'],
          speed: 1.0,
          pause_after_ms: 250
        };
      }

      const safeEmotion = VALID_EMOTIONS.includes(parsed.emotion as (typeof VALID_EMOTIONS)[number])
        ? parsed.emotion
        : 'neutral';

      res.json({
        provider: 'gemini',
        model: 'gemini-4-hydrogen',
        data: {
          speech: String(parsed.speech || 'Привет! Я на связи.'),
          emotion: safeEmotion,
          intensity: typeof parsed.intensity === 'number' ? parsed.intensity : 0.75,
          gestures: Array.isArray(parsed.gestures) ? parsed.gestures : ['nod'],
          speed: typeof parsed.speed === 'number' ? parsed.speed : 1.0,
          pause_after_ms: typeof parsed.pause_after_ms === 'number' ? parsed.pause_after_ms : 250
        }
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка обращения к Gemini API';
      res.status(500).json({ error: msg });
    }
  });

  // 3. Server-Side Gemini Neural TTS (24kHz WAV)
  app.post('/api/ai/gemini-tts', async (req, res) => {
    try {
      const { text, voiceName = 'Kore', style = 'Warm, friendly, lightly playful Russian female voice assistant Alisa' } =
        req.body ?? {};
      if (!text || typeof text !== 'string') {
        res.status(400).json({ error: 'Поле text обязательно для синтеза речи.' });
        return;
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text,
                speechMetadata: {
                  style
                }
              }
            ]
          }
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName }
            }
          }
        }
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      const mimeType =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'audio/wav';

      if (!base64Audio) {
        res.status(502).json({ error: 'Модель TTS не вернула аудиопоток.' });
        return;
      }

      res.json({
        provider: 'gemini_tts',
        mimeType,
        audioBase64: base64Audio
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка синтеза речи Gemini TTS';
      res.status(500).json({ error: msg });
    }
  });

  // 4. YandexGPT Cloud Proxy (Variant A — avoids browser CORS in Web Preview; MV3 extension calls directly via background worker)
  app.post('/api/ai/yandex-chat', async (req, res) => {
    try {
      const {
        message,
        history = [],
        yandexApiKey,
        yandexFolderId,
        yandexModel = 'yandexgpt-lite/latest',
        systemPromptOverride
      } = req.body ?? {};

      if (!yandexApiKey || !yandexFolderId) {
        res.status(400).json({
          error:
            'Для работы YandexGPT укажите Yandex API-Key и Folder ID в настройках провайдера (chrome.storage).'
        });
        return;
      }

      const modelUri = `gpt://${String(yandexFolderId).trim()}/${yandexModel}`;
      const messages = [
        {
          role: 'system',
          text: systemPromptOverride || ALISA_SYSTEM_INSTRUCTION
        },
        ...history.slice(-8).map((m: { role: string; text: string }) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          text: String(m.text || '')
        })),
        {
          role: 'user',
          text: `${message}\n\nВерни ответ строго в формате JSON: {"speech":"...","emotion":"neutral|joy|laugh|sad|surprise|angry|thinking|wink|embarrassed","intensity":0.8,"gestures":["nod"],"speed":1.0,"pause_after_ms":250}`
        }
      ];

      const yandexResp = await fetch(
        'https://llm.api.cloud.yandex.net/foundationModels/v1/completion',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Api-Key ${String(yandexApiKey).trim()}`,
            'x-folder-id': String(yandexFolderId).trim()
          },
          body: JSON.stringify({
            modelUri,
            completionOptions: {
              stream: false,
              temperature: 0.45,
              maxTokens: '600'
            },
            messages
          })
        }
      );

      if (!yandexResp.ok) {
        const errBody = await yandexResp.text();
        res.status(yandexResp.status).json({
          error: `Ошибка YandexGPT (${yandexResp.status}): ${errBody.slice(0, 240)}`
        });
        return;
      }

      const payload = (await yandexResp.json()) as {
        result?: { alternatives?: Array<{ message?: { text?: string } }> };
      };
      const rawText = payload.result?.alternatives?.[0]?.message?.text ?? '';
      res.json({
        provider: 'yandexgpt',
        model: modelUri,
        rawText
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка соединения с YandexGPT API';
      res.status(500).json({ error: msg });
    }
  });

  // 5. Yandex SpeechKit TTS Proxy (Variant A & B — voice 'alena' / 'marina' / 'jane')
  app.post('/api/ai/yandex-tts', async (req, res) => {
    try {
      const {
        text,
        yandexApiKey,
        yandexFolderId,
        voice = 'alena',
        emotion = 'good',
        speed = 1.0
      } = req.body ?? {};

      if (!yandexApiKey || !yandexFolderId) {
        res.status(400).json({
          error:
            'Для синтеза голоса через Yandex SpeechKit укажите Yandex API-Key и Folder ID в настройках.'
        });
        return;
      }
      if (!text || typeof text !== 'string') {
        res.status(400).json({ error: 'Пустой текст для озвучки.' });
        return;
      }

      const params = new URLSearchParams();
      params.set('text', text);
      params.set('lang', 'ru-RU');
      params.set('voice', voice);
      if (voice === 'alena' || voice === 'jane' || voice === 'omazh' || voice === 'zahar') {
        params.set('emotion', emotion);
      }
      params.set('speed', String(Math.max(0.7, Math.min(1.5, Number(speed) || 1.0))));
      params.set('format', 'oggopus');
      params.set('folderId', String(yandexFolderId).trim());

      const ttsResp = await fetch('https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize', {
        method: 'POST',
        headers: {
          Authorization: `Api-Key ${String(yandexApiKey).trim()}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      if (!ttsResp.ok) {
        const errText = await ttsResp.text();
        res.status(ttsResp.status).json({
          error: `Ошибка Yandex SpeechKit TTS (${ttsResp.status}): ${errText.slice(0, 240)}`
        });
        return;
      }

      const arrayBuf = await ttsResp.arrayBuffer();
      const base64Audio = Buffer.from(arrayBuf).toString('base64');
      res.json({
        provider: 'yandex_speechkit',
        voice,
        emotion,
        mimeType: 'audio/ogg; codecs=opus',
        audioBase64: base64Audio
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка соединения с Yandex SpeechKit TTS';
      res.status(500).json({ error: msg });
    }
  });

  // 6. Yandex SpeechKit STT Proxy (Variant A — recognizes recorded audio/ogg;codecs=opus)
  app.post('/api/ai/yandex-stt', async (req, res) => {
    try {
      const { audioBase64, yandexApiKey, yandexFolderId, lang = 'ru-RU' } = req.body ?? {};
      if (!yandexApiKey || !yandexFolderId) {
        res.status(400).json({
          error: 'Для распознавания речи через Yandex SpeechKit STT укажите API-Key и Folder ID.'
        });
        return;
      }
      if (!audioBase64 || typeof audioBase64 !== 'string') {
        res.status(400).json({ error: 'Аудиоданные (audioBase64) не переданы.' });
        return;
      }

      const audioBuffer = Buffer.from(audioBase64, 'base64');
      const url = new URL('https://stt.api.cloud.yandex.net/speech/v1/stt:recognize');
      url.searchParams.set('folderId', String(yandexFolderId).trim());
      url.searchParams.set('lang', lang);
      url.searchParams.set('topic', 'general');

      const sttResp = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          Authorization: `Api-Key ${String(yandexApiKey).trim()}`
        },
        body: audioBuffer
      });

      if (!sttResp.ok) {
        const errText = await sttResp.text();
        res.status(sttResp.status).json({
          error: `Ошибка Yandex SpeechKit STT (${sttResp.status}): ${errText.slice(0, 240)}`
        });
        return;
      }

      const result = (await sttResp.json()) as { result?: string };
      res.json({
        provider: 'yandex_speechkit_stt',
        transcript: result.result ?? ''
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка соединения с Yandex SpeechKit STT';
      res.status(500).json({ error: msg });
    }
  });

  // 7. Real-Time OBS VTuber Frame HTTP Fallback
  app.get('/api/vtuber/frame', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(latestVtuberFrameJson || '{"ok":false}');
  });

  app.post('/api/vtuber/frame', (req, res) => {
    if (req.body && typeof req.body === 'object') {
      latestVtuberFrameJson = JSON.stringify(req.body);
    }
    res.json({ ok: true });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = request.url ? request.url.split('?')[0] : '';
    if (pathname === '/ws/obs-sync') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    // Immediately send cached latest frame to newly connected OBS Browser Source
    if (latestVtuberFrameJson && ws.readyState === WebSocket.OPEN) {
      ws.send(latestVtuberFrameJson);
    }

    ws.on('message', (raw) => {
      const str = typeof raw === 'string' ? raw : raw.toString('utf-8');
      latestVtuberFrameJson = str;
      // Broadcast to all other connected OBS Browser Source clients
      for (const client of wss.clients) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(str);
        }
      }
    });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Alisa AI Server + OBS Sync running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

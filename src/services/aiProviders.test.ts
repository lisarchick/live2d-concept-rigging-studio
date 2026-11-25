import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeSpeechText,
  parseAndSanitizeBrainJson,
  splitResponseIntoSegments,
  buildLocalAlisaResponse,
  STAGE1_ARCHITECTURE_COMPARISON
} from './aiProviders';
import {
  DEFAULT_PROVIDER_SETTINGS,
  loadProviderSettings,
  saveProviderSettings,
  clearStoredCredentials
} from './extensionStorage';

test('Stage 1 architecture comparison covers Variants A, B, and C with honest evaluation', () => {
  assert.equal(STAGE1_ARCHITECTURE_COMPARISON.length, 3);
  const codes = STAGE1_ARCHITECTURE_COMPARISON.map((item) => item.code);
  assert.ok(codes.includes('A_YANDEX_FULL'));
  assert.ok(codes.includes('B_HYBRID_GEMINI_YANDEX'));
  assert.ok(codes.includes('C_LOCAL_WEB_SPEECH'));

  const recommended = STAGE1_ARCHITECTURE_COMPARISON.find((item) => item.recommended);
  assert.equal(recommended?.code, 'B_HYBRID_GEMINI_YANDEX');
});

test('sanitizeSpeechText strips markdown, code blocks, and emojis cleanly', () => {
  const dirty = 'Привет! **Я Алиса** 😊 `код` ```json\n{"a":1}\n``` _рада_ видеть!';
  const clean = sanitizeSpeechText(dirty);
  assert.equal(clean, 'Привет! Я Алиса код рада видеть!');
});

test('parseAndSanitizeBrainJson validates known emotions and safely falls back to neutral on unknown emotion or broken JSON', () => {
  const validRaw = JSON.stringify({
    speech: 'Привет! Отличная идея!',
    emotion: 'joy',
    intensity: 0.9,
    gestures: ['nod', 'wave'],
    speed: 1.05,
    pause_after_ms: 240
  });
  const parsedValid = parseAndSanitizeBrainJson(validRaw);
  assert.equal(parsedValid.fallbackTriggered, false);
  assert.equal(parsedValid.segment.emotion, 'joy');
  assert.equal(parsedValid.segment.speech, 'Привет! Отличная идея!');
  assert.deepEqual(parsedValid.segment.gestures, ['nod', 'wave']);

  // Unknown emotion fallback
  const unknownEmotionRaw = JSON.stringify({
    speech: 'Хм, странная эмоция',
    emotion: 'hyper_cyber_rage_999',
    intensity: 1.5
  });
  const parsedUnknown = parseAndSanitizeBrainJson(unknownEmotionRaw);
  assert.equal(parsedUnknown.fallbackTriggered, true);
  assert.equal(parsedUnknown.segment.emotion, 'neutral');
  assert.equal(parsedUnknown.segment.intensity, 1.0);

  // Broken non-JSON fallback
  const brokenJson = 'Это просто текст без JSON **с разметкой** 🚀';
  const parsedBroken = parseAndSanitizeBrainJson(brokenJson);
  assert.equal(parsedBroken.fallbackTriggered, true);
  assert.equal(parsedBroken.segment.emotion, 'neutral');
  assert.equal(parsedBroken.segment.speech, 'Это просто текст без JSON с разметкой');
});

test('splitResponseIntoSegments splits multi-sentence answers into smooth emotional segments', () => {
  const base = {
    speech: 'Привет! Как прошёл твой день? Давай подумаем над задачей...',
    emotion: 'joy' as const,
    intensity: 0.85,
    gestures: ['wave' as const],
    speed: 1.0,
    pause_after_ms: 300
  };
  const segments = splitResponseIntoSegments(base);
  assert.equal(segments.length, 3);
  assert.equal(segments[0].emotion, 'joy');
  assert.equal(segments[1].emotion, 'wink'); // question sentence after joy
  assert.equal(segments[2].emotion, 'thinking'); // ellipsis sentence
});

test('buildLocalAlisaResponse returns contextual Russian responses with valid emotions', () => {
  const greet = buildLocalAlisaResponse('Привет, Алиса!');
  assert.equal(greet.emotion, 'joy');

  const compliment = buildLocalAlisaResponse('Ты очень милая и умница');
  assert.equal(compliment.emotion, 'embarrassed');

  const joke = buildLocalAlisaResponse('Расскажи смешную шутку');
  assert.equal(joke.emotion, 'laugh');
});

test('extensionStorage loads, updates, clamps values, and clears credentials cleanly', async () => {
  const initial = await loadProviderSettings();
  assert.equal(initial.yandexVoice, DEFAULT_PROVIDER_SETTINGS.yandexVoice);

  const updated = await saveProviderSettings({
    yandexApiKey: 'AQVN_TEST_KEY',
    yandexFolderId: 'b1g_test_folder',
    speechSpeed: 2.5 // should clamp to 1.35
  });
  assert.equal(updated.yandexApiKey, 'AQVN_TEST_KEY');
  assert.equal(updated.yandexFolderId, 'b1g_test_folder');
  assert.equal(updated.speechSpeed, 1.35);

  const cleared = await clearStoredCredentials();
  assert.equal(cleared.yandexApiKey, '');
  assert.equal(cleared.yandexFolderId, '');
});

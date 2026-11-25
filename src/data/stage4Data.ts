import { EmotionPresetId } from '../utils/conceptLogic';

export interface BlinkPhaseSpec {
  id: string;
  phaseName: string;
  durationMs: string;
  eyeOpenRange: string;
  easingCurve: string;
  coupledParameters: string;
  notesRu: string;
}

export interface IdleHarmonyLayerSpec {
  id: string;
  channelName: string;
  targetParams: string[];
  periodSec: number;
  amplitude: string;
  waveform: string;
  phaseOffsetDeg: number;
  descriptionRu: string;
}

export interface LipSyncRuleSpec {
  visemeKey: 'SILENT' | 'A' | 'I' | 'U' | 'E' | 'O';
  visemeLabel: string;
  ruPhonemes: string;
  rmsRange: string;
  formantHz: string;
  mouthOpenY: number;
  mouthForm: number;
  coarticulationMs: number;
  notesRu: string;
}

export interface CubismExpressionPresetSpec {
  id: string;
  fileName: string;
  titleRu: string;
  category: 'BASE' | 'POSITIVE' | 'EMPATHY' | 'ASSISTANT';
  baseSpriteEmotion: EmotionPresetId;
  fadeInSec: number;
  fadeOutSec: number;
  blendMode: 'Additive' | 'Overwrite';
  parameterValues: Record<string, number>;
  triggerContextRu: string;
}

export type AssistantStateId =
  | 'IDLE'
  | 'LISTENING'
  | 'THINKING'
  | 'SPEAKING'
  | 'REACTING'
  | 'ERROR_OOPS'
  | 'SLEEP_AFK';

export interface AssistantStateSpec {
  id: AssistantStateId;
  code: string;
  titleRu: string;
  motionFile: string;
  expressionId: string;
  baseSpriteEmotion: EmotionPresetId;
  priority: 'PriorityIdle (1)' | 'PriorityNormal (2)' | 'PriorityForce (3)';
  crossfadeMs: number;
  blinkIntervalSec: string;
  breathSpeedMultiplier: number;
  gazeBehaviorRu: string;
  bodyAndHandsBehaviorRu: string;
  defaultParams: {
    angleX: number;
    angleY: number;
    angleZ: number;
    shoulderY: number;
    handGesture: 'none' | 'think' | 'wave';
    autoTalk: boolean;
  };
}

export const STAGE4_BLINK_PHASES: BlinkPhaseSpec[] = [
  {
    id: 'blink_01_close',
    phaseName: '1. Быстрое смыкание (Closing Stroke)',
    durationMs: '55 мс',
    eyeOpenRange: '1.00 → 0.00',
    easingCurve: 'cubic-bezier(0.42, 0.0, 0.92, 0.85)',
    coupledParameters: 'ParamEyeLOpen, ParamEyeROpen, ParamBrowLY/RY (-0.06)',
    notesRu: 'Верхнее веко стремительно опускается вниз; ресницы плавно изгибаются в закрытую дугу, брови делают едва заметный микро-сдвиг вниз.'
  },
  {
    id: 'blink_02_hold',
    phaseName: '2. Сомкнутая пауза (Closed Hold)',
    durationMs: '25 мс',
    eyeOpenRange: '0.00 (фиксация)',
    easingCurve: 'linear (Hold)',
    coupledParameters: 'ParamEyeLOpen = 0, ParamEyeROpen = 0',
    notesRu: 'Короткая фаза полного смыкания даёт глазу зрителя считать моргание без ощущения «пропущенного кадра» при 60 FPS.'
  },
  {
    id: 'blink_03_open',
    phaseName: '3. Плавное раскрытие с пружиной блика (Opening & Highlight Jiggle)',
    durationMs: '110 мс',
    eyeOpenRange: '0.00 → 1.03 → 1.00',
    easingCurve: 'cubic-bezier(0.16, 0.88, 0.30, 1.00)',
    coupledParameters: 'ParamEyeLOpen/ROpen + Physics_Eye_Highlights_Jiggle',
    notesRu: 'Веко поднимается в 2 раза мягче, чем опускалось, с микро-овершутом 1.03, запуская дрожание звёздчатого блика в радужке.'
  },
  {
    id: 'blink_04_double',
    phaseName: '4. Стохастический двойной блинк (Double Blink 18%)',
    durationMs: '190 мс + пауза 90 мс + 170 мс',
    eyeOpenRange: '1.0 → 0.0 → 0.85 → 0.0 → 1.0',
    easingCurve: 'Poisson Interval (3.2–5.8 с)',
    coupledParameters: 'Срабатывает при смене взгляда (саккаде) или начале ответа',
    notesRu: 'Каждый ~5-й цикл моргания выполняется двойным взмахом ресниц с лёгкой асимметрией L/R в 8 мс — убирает эффект механической куклы.'
  }
];

export const STAGE4_IDLE_HARMONICS: IdleHarmonyLayerSpec[] = [
  {
    id: 'idle_breath',
    channelName: 'Грудное и плечевое дыхание (Breath & Shoulders)',
    targetParams: ['ParamBreath', 'ParamShoulder', 'ParamBodyAngleY'],
    periodSec: 3.8,
    amplitude: 'Breath: 0.0..1.0 · Shoulder: ±0.18 · BodyY: ±1.2°',
    waveform: 'Асимметричный синус (Вдох 44% / Выдох 56%)',
    phaseOffsetDeg: 0,
    descriptionRu: 'Мягкий подъём плеч в уютном кардигане и воротнике-стойке на вдохе и плавное расслабление на выдохе.'
  },
  {
    id: 'idle_head_sway',
    channelName: 'Невесомое покачивание головы (Head Micro-Sway)',
    targetParams: ['ParamAngleX', 'ParamAngleY', 'ParamAngleZ'],
    periodSec: 6.4,
    amplitude: 'AngleX: ±2.4° · AngleY: ±1.5° · AngleZ: ±2.1°',
    waveform: 'Двухчастотная волна Лиссажу (Perlin Noise 0.15 Гц + 0.09 Гц)',
    phaseOffsetDeg: 45,
    descriptionRu: 'Голова никогда не замирает в мёртвой точке: плавная восьмёрка создаёт ощущение живого собеседника и поддерживает постоянную работу маятников локонов.'
  },
  {
    id: 'idle_body_counter',
    channelName: 'Инерционный контр-баланс корпуса (Body Counter-Sway)',
    targetParams: ['ParamBodyAngleX', 'ParamBodyAngleZ'],
    periodSec: 8.2,
    amplitude: 'BodyX: ±1.4° · BodyZ: ±1.0°',
    waveform: 'Сглаженная косинусоида с отставанием фазы',
    phaseOffsetDeg: 65,
    descriptionRu: 'Корпус следует за наклоном головы с задержкой 350 мс, обеспечивая естественное распределение веса по плечам.'
  },
  {
    id: 'idle_saccades',
    channelName: 'Микро-саккады и зрительный контакт (Eye Saccades & Gaze Lock)',
    targetParams: ['ParamEyeBallX', 'ParamEyeBallY'],
    periodSec: 2.1,
    amplitude: 'EyeBallX: ±0.16 · EyeBallY: ±0.10 (прыжок за 35 мс)',
    waveform: 'Ballistic Step + Exponential Decay',
    phaseOffsetDeg: 0,
    descriptionRu: '78% времени взгляд сфокусирован прямо в камеру; каждые 1.5–2.8 с зрачки совершают микро-скачок на 3–5% и возвращаются к собеседнику.'
  },
  {
    id: 'idle_ahoge_pulse',
    channelName: 'Пружинящий отклик ахоге и боковых прядей (Hair Secondary Motion)',
    targetParams: ['ParamHairFront', 'ParamHairSide', 'ParamHairBack'],
    periodSec: 3.8,
    amplitude: 'Авто-привод от Physics3 (60 FPS)',
    waveform: 'Маятниковый отклик 2-го и 3-го порядка',
    phaseOffsetDeg: 90,
    descriptionRu: 'Даже в полном покое дыхание и микро-покачивание головы передают лёгкий живой импульс на ахоге и кончики лавандовых локонов у плеч.'
  }
];

export const STAGE4_LIPSYNC_RULES: LipSyncRuleSpec[] = [
  {
    visemeKey: 'SILENT',
    visemeLabel: 'М / Б / П (Сомкнутая полуулыбка)',
    ruPhonemes: 'М, Б, П, Пауза (Silence < -42 dBFS)',
    rmsRange: '0.00 – 0.08',
    formantHz: '— (Шумовой порог / смычка губ)',
    mouthOpenY: 0.02,
    mouthForm: 0.40,
    coarticulationMs: 40,
    notesRu: 'Базовая дружелюбная полуулыбка Алисы. При взрывных согласных М/Б/П губы принудительно смыкаются на 45 мс даже при высокой громкости потока.'
  },
  {
    visemeKey: 'A',
    visemeLabel: 'А / Я (Широкий открытый рот)',
    ruPhonemes: 'А, Я (ударные гласные открытого ряда)',
    rmsRange: '0.68 – 1.00',
    formantHz: 'F1: 700–950 Гц · F2: 1200–1450 Гц',
    mouthOpenY: 0.88,
    mouthForm: 0.60,
    coarticulationMs: 50,
    notesRu: 'Максимальное открытие рта с видимым верхним рядом зубов и языком. Используется на пиках интонации и ударных слогах.'
  },
  {
    visemeKey: 'E',
    visemeLabel: 'Э / Е (Средний открытый рот)',
    ruPhonemes: 'Э, Е, безударные А/О в беглой речи',
    rmsRange: '0.42 – 0.68',
    formantHz: 'F1: 480–650 Гц · F2: 1650–2050 Гц',
    mouthOpenY: 0.62,
    mouthForm: 0.75,
    coarticulationMs: 45,
    notesRu: 'Самая частая рабочая висема при спокойном объяснении ИИ-ассистента: естественная открытая улыбка средней высоты.'
  },
  {
    visemeKey: 'I',
    visemeLabel: 'И / Ы / С (Улыбка с зубками)',
    ruPhonemes: 'И, Ы, Й, а также переднеязычные С, З, Ц, Ч, Щ',
    rmsRange: '0.20 – 0.52',
    formantHz: 'F1: 250–380 Гц · F2: 2150–2700 Гц',
    mouthOpenY: 0.38,
    mouthForm: 0.95,
    coarticulationMs: 40,
    notesRu: 'Растянутые в улыбку уголки губ с небольшим вертикальным просветом и видимой полоской верхних зубов.'
  },
  {
    visemeKey: 'O',
    visemeLabel: 'О / Ё (Округлый овал)',
    ruPhonemes: 'О, Ё (ударные лабиализованные гласные)',
    rmsRange: '0.55 – 0.85',
    formantHz: 'F1: 420–580 Гц · F2: 750–1050 Гц',
    mouthOpenY: 0.78,
    mouthForm: -0.45,
    coarticulationMs: 55,
    notesRu: 'Уголки рта плавно собираются к центру (ParamMouthForm < 0), формируя мягкий вертикальный аниме-овал.'
  },
  {
    visemeKey: 'U',
    visemeLabel: 'У / Ю / Ш (Узкий округлый ротик)',
    ruPhonemes: 'У, Ю, а также лабиализованные Ш, Ж, В, Ф',
    rmsRange: '0.18 – 0.54',
    formantHz: 'F1: 260–380 Гц · F2: 600–850 Гц',
    mouthOpenY: 0.48,
    mouthForm: -0.65,
    coarticulationMs: 45,
    notesRu: 'Маленький аккуратный округлый ротик; плавно переходит в висему О при повышении громкости голоса.'
  }
];

export const STAGE4_EXPRESSION_PRESETS: CubismExpressionPresetSpec[] = [
  {
    id: 'exp_01_neutral',
    fileName: 'exp_01_neutral.exp3.json',
    titleRu: '01. Спокойное внимание (Neutral Base)',
    category: 'BASE',
    baseSpriteEmotion: 'neutral',
    fadeInSec: 0.25,
    fadeOutSec: 0.25,
    blendMode: 'Overwrite',
    parameterValues: {
      ParamEyeLOpen: 1.0,
      ParamEyeROpen: 1.0,
      ParamEyeLSmile: 0.15,
      ParamEyeRSmile: 0.15,
      ParamBrowLY: 0.0,
      ParamBrowRY: 0.0,
      ParamMouthOpenY: 0.05,
      ParamMouthForm: 0.4,
      ParamCheek: 0.15
    },
    triggerContextRu: 'Состояние по умолчанию (Idle / Ожидание диалога).'
  },
  {
    id: 'exp_02_joy',
    fileName: 'exp_02_joy.exp3.json',
    titleRu: '02. Тёплая радость (Warm Joy)',
    category: 'POSITIVE',
    baseSpriteEmotion: 'joy',
    fadeInSec: 0.22,
    fadeOutSec: 0.30,
    blendMode: 'Overwrite',
    parameterValues: {
      ParamEyeLOpen: 0.20,
      ParamEyeROpen: 0.20,
      ParamEyeLSmile: 0.90,
      ParamEyeRSmile: 0.90,
      ParamBrowLY: 0.35,
      ParamBrowRY: 0.35,
      ParamMouthOpenY: 0.45,
      ParamMouthForm: 0.90,
      ParamCheek: 0.55
    },
    triggerContextRu: 'Приветствие пользователя, успешное решение задачи, благодарность.'
  },
  {
    id: 'exp_03_laugh',
    fileName: 'exp_03_laugh.exp3.json',
    titleRu: '03. Искренний смех (Bright Laugh)',
    category: 'POSITIVE',
    baseSpriteEmotion: 'laugh',
    fadeInSec: 0.18,
    fadeOutSec: 0.35,
    blendMode: 'Overwrite',
    parameterValues: {
      ParamEyeLOpen: 0.05,
      ParamEyeROpen: 0.05,
      ParamEyeLSmile: 1.00,
      ParamEyeRSmile: 1.00,
      ParamBrowLY: 0.45,
      ParamBrowRY: 0.45,
      ParamMouthOpenY: 0.85,
      ParamMouthForm: 1.00,
      ParamCheek: 0.75
    },
    triggerContextRu: 'Реакция на шутку пользователя, весёлая история или пасхалка.'
  },
  {
    id: 'exp_04_sad',
    fileName: 'exp_04_sad.exp3.json',
    titleRu: '04. Грусть и сочувствие (Empathetic Sad)',
    category: 'EMPATHY',
    baseSpriteEmotion: 'sad',
    fadeInSec: 0.35,
    fadeOutSec: 0.40,
    blendMode: 'Overwrite',
    parameterValues: {
      ParamEyeLOpen: 0.72,
      ParamEyeROpen: 0.72,
      ParamEyeLSmile: 0.0,
      ParamEyeRSmile: 0.0,
      ParamBrowLY: -0.45,
      ParamBrowRY: -0.45,
      ParamBrowLAngle: 0.55,
      ParamBrowRAngle: 0.55,
      ParamMouthOpenY: 0.05,
      ParamMouthForm: -0.75,
      ParamCheek: 0.25
    },
    triggerContextRu: 'Сочувствие, поддержка пользователя в трудной ситуации, грустная тема.'
  },
  {
    id: 'exp_05_surprise',
    fileName: 'exp_05_surprise.exp3.json',
    titleRu: '05. Удивление / Эврика (Surprise & Insight)',
    category: 'POSITIVE',
    baseSpriteEmotion: 'surprise',
    fadeInSec: 0.14,
    fadeOutSec: 0.28,
    blendMode: 'Overwrite',
    parameterValues: {
      ParamEyeLOpen: 1.15,
      ParamEyeROpen: 1.15,
      ParamEyeLSmile: 0.0,
      ParamEyeRSmile: 0.0,
      ParamBrowLY: 0.85,
      ParamBrowRY: 0.85,
      ParamMouthOpenY: 0.65,
      ParamMouthForm: -0.35,
      ParamCheek: 0.30
    },
    triggerContextRu: 'Неожиданный факт, интересная находка в поиске, быстрое озарение.'
  },
  {
    id: 'exp_06_angry_pout',
    fileName: 'exp_06_angry_pout.exp3.json',
    titleRu: '06. Милое ворчание (Playful Pout)',
    category: 'EMPATHY',
    baseSpriteEmotion: 'angry',
    fadeInSec: 0.24,
    fadeOutSec: 0.30,
    blendMode: 'Overwrite',
    parameterValues: {
      ParamEyeLOpen: 0.80,
      ParamEyeROpen: 0.80,
      ParamBrowLY: -0.60,
      ParamBrowRY: -0.60,
      ParamBrowLAngle: -0.65,
      ParamBrowRAngle: -0.65,
      ParamMouthOpenY: 0.04,
      ParamMouthForm: -0.60,
      ParamCheek: 0.60
    },
    triggerContextRu: 'Шутливая обида на поддразнивание, мягкое несогласие без агрессии.'
  },
  {
    id: 'exp_07_thinking',
    fileName: 'exp_07_thinking.exp3.json',
    titleRu: '07. Задумчивость / Анализ (Deep Thinking)',
    category: 'ASSISTANT',
    baseSpriteEmotion: 'thinking',
    fadeInSec: 0.28,
    fadeOutSec: 0.25,
    blendMode: 'Overwrite',
    parameterValues: {
      ParamEyeLOpen: 0.92,
      ParamEyeROpen: 0.92,
      ParamEyeBallX: 0.35,
      ParamEyeBallY: 0.30,
      ParamBrowLY: -0.20,
      ParamBrowRY: 0.35,
      ParamMouthOpenY: 0.05,
      ParamMouthForm: -0.15,
      ParamArmR: 0.85
    },
    triggerContextRu: 'Генерация сложного ответа LLM, анализ кода или документов, поиск в базе знаний.'
  },
  {
    id: 'exp_08_wink',
    fileName: 'exp_08_wink.exp3.json',
    titleRu: '08. Игривый подмиг (Playful Wink)',
    category: 'POSITIVE',
    baseSpriteEmotion: 'wink',
    fadeInSec: 0.16,
    fadeOutSec: 0.25,
    blendMode: 'Overwrite',
    parameterValues: {
      ParamEyeLOpen: 0.98,
      ParamEyeROpen: 0.0,
      ParamEyeLSmile: 0.35,
      ParamEyeRSmile: 0.95,
      ParamBrowLY: 0.30,
      ParamBrowRY: -0.15,
      ParamMouthOpenY: 0.38,
      ParamMouthForm: 0.85,
      ParamArmL: 0.80
    },
    triggerContextRu: 'Лайфхак, секретная подсказка, дружеское подбадривание.'
  },
  {
    id: 'exp_09_embarrassed',
    fileName: 'exp_09_embarrassed.exp3.json',
    titleRu: '09. Смущение / Румянец (Shy Blush)',
    category: 'EMPATHY',
    baseSpriteEmotion: 'embarrassed',
    fadeInSec: 0.30,
    fadeOutSec: 0.45,
    blendMode: 'Overwrite',
    parameterValues: {
      ParamEyeLOpen: 0.78,
      ParamEyeROpen: 0.78,
      ParamEyeLSmile: 0.65,
      ParamEyeRSmile: 0.65,
      ParamBrowLY: -0.25,
      ParamBrowRY: -0.25,
      ParamMouthOpenY: 0.08,
      ParamMouthForm: 0.35,
      ParamCheek: 1.00
    },
    triggerContextRu: 'Реакция на комплимент от пользователя или похвалу.'
  },
  {
    id: 'exp_10_attentive_listen',
    fileName: 'exp_10_attentive_listen.exp3.json',
    titleRu: '10. Активное слушание (Attentive Listening)',
    category: 'ASSISTANT',
    baseSpriteEmotion: 'neutral',
    fadeInSec: 0.20,
    fadeOutSec: 0.20,
    blendMode: 'Additive',
    parameterValues: {
      ParamEyeLOpen: 1.06,
      ParamEyeROpen: 1.06,
      ParamEyeLSmile: 0.25,
      ParamEyeRSmile: 0.25,
      ParamBrowLY: 0.22,
      ParamBrowRY: 0.22,
      ParamAngleZ: 4.5,
      ParamMouthOpenY: 0.02,
      ParamMouthForm: 0.55
    },
    triggerContextRu: 'Включается автоматически, когда пользователь говорит в микрофон (VAD Active).'
  },
  {
    id: 'exp_11_confident_explain',
    fileName: 'exp_11_confident_explain.exp3.json',
    titleRu: '11. Уверенное объяснение (Confident Explain)',
    category: 'ASSISTANT',
    baseSpriteEmotion: 'neutral',
    fadeInSec: 0.22,
    fadeOutSec: 0.25,
    blendMode: 'Additive',
    parameterValues: {
      ParamEyeLOpen: 0.96,
      ParamEyeROpen: 0.96,
      ParamEyeLSmile: 0.30,
      ParamEyeRSmile: 0.30,
      ParamBrowLY: 0.28,
      ParamBrowRY: 0.28,
      ParamMouthOpenY: 0.58,
      ParamMouthForm: 0.75,
      ParamShoulder: 0.15
    },
    triggerContextRu: 'Структурированный ответ, пошаговая инструкция или чтение сводки.'
  },
  {
    id: 'exp_12_sleepy_standby',
    fileName: 'exp_12_sleepy_standby.exp3.json',
    titleRu: '12. Сонный режим ожидания (Sleepy AFK)',
    category: 'ASSISTANT',
    baseSpriteEmotion: 'sad',
    fadeInSec: 0.60,
    fadeOutSec: 0.30,
    blendMode: 'Overwrite',
    parameterValues: {
      ParamEyeLOpen: 0.32,
      ParamEyeROpen: 0.32,
      ParamEyeLSmile: 0.40,
      ParamEyeRSmile: 0.40,
      ParamBrowLY: -0.15,
      ParamBrowRY: -0.15,
      ParamAngleY: -6.0,
      ParamAngleZ: -4.0,
      ParamMouthOpenY: 0.18,
      ParamMouthForm: -0.35
    },
    triggerContextRu: 'Отсутствие активности пользователя более 5 минут (ночной или фоновый режим).'
  },
  {
    id: 'exp_13_apologetic_oops',
    fileName: 'exp_13_apologetic_oops.exp3.json',
    titleRu: '13. Мягкое извинение при сбое (Gentle Oops)',
    category: 'ASSISTANT',
    baseSpriteEmotion: 'embarrassed',
    fadeInSec: 0.20,
    fadeOutSec: 0.35,
    blendMode: 'Overwrite',
    parameterValues: {
      ParamEyeLOpen: 0.68,
      ParamEyeROpen: 0.68,
      ParamEyeLSmile: 0.55,
      ParamEyeRSmile: 0.55,
      ParamBrowLY: -0.40,
      ParamBrowRY: -0.40,
      ParamBrowLAngle: 0.60,
      ParamBrowRAngle: 0.60,
      ParamMouthOpenY: 0.35,
      ParamMouthForm: -0.40,
      ParamCheek: 0.85
    },
    triggerContextRu: 'Ошибка сети, таймаут API или просьба переформулировать запрос.'
  }
];

export const STAGE4_ASSISTANT_STATES: AssistantStateSpec[] = [
  {
    id: 'IDLE',
    code: 'STATE_01_IDLE',
    titleRu: 'Ожидание (Idle / Присутствие)',
    motionFile: 'motions/alisa_idle_loop.motion3.json',
    expressionId: 'exp_01_neutral',
    baseSpriteEmotion: 'neutral',
    priority: 'PriorityIdle (1)',
    crossfadeMs: 450,
    blinkIntervalSec: '3.5 – 5.8 с (стохастический)',
    breathSpeedMultiplier: 1.0,
    gazeBehaviorRu: 'Мягкий зрительный контакт с камерой + микро-саккады каждые 2.1 с.',
    bodyAndHandsBehaviorRu: 'Ровная посадка плеч, руки спокойно опущены, плавная волна дыхания.',
    defaultParams: {
      angleX: 0,
      angleY: 0,
      angleZ: 0,
      shoulderY: 0,
      handGesture: 'none',
      autoTalk: false
    }
  },
  {
    id: 'LISTENING',
    code: 'STATE_02_LISTENING',
    titleRu: 'Слушает пользователя (Listening / VAD)',
    motionFile: 'motions/alisa_listening_nods.motion3.json',
    expressionId: 'exp_10_attentive_listen',
    baseSpriteEmotion: 'neutral',
    priority: 'PriorityNormal (2)',
    crossfadeMs: 250,
    blinkIntervalSec: '4.2 – 6.5 с (внимательный взгляд)',
    breathSpeedMultiplier: 1.1,
    gazeBehaviorRu: '100% фиксация взгляда на собеседнике без увода зрачков в сторону.',
    bodyAndHandsBehaviorRu: 'Лёгкий заинтересованный наклон головы к плечу (AngleZ = +5°), подтверждающие микро-кивки (AngleY ±3°) на паузах речи пользователя.',
    defaultParams: {
      angleX: 2,
      angleY: 3,
      angleZ: 5,
      shoulderY: 0.15,
      handGesture: 'none',
      autoTalk: false
    }
  },
  {
    id: 'THINKING',
    code: 'STATE_03_THINKING',
    titleRu: 'Думает / Ищет ответ (Thinking / RAG)',
    motionFile: 'motions/alisa_thinking_pose.motion3.json',
    expressionId: 'exp_07_thinking',
    baseSpriteEmotion: 'thinking',
    priority: 'PriorityNormal (2)',
    crossfadeMs: 300,
    blinkIntervalSec: '2.0 – 3.2 с (учащённое моргание при поиске)',
    breathSpeedMultiplier: 0.9,
    gazeBehaviorRu: 'Взгляд уходит вверх и вправо (ParamEyeBallX = +0.35, Y = +0.30), ахоге слегка покачивается.',
    bodyAndHandsBehaviorRu: 'Правая рука плавно поднимается к подбородку (ARM_Hand_Think_R), голова чуть наклонена (-3° Z).',
    defaultParams: {
      angleX: -4,
      angleY: 5,
      angleZ: -3,
      shoulderY: 0.05,
      handGesture: 'none',
      autoTalk: false
    }
  },
  {
    id: 'SPEAKING',
    code: 'STATE_04_SPEAKING',
    titleRu: 'Говорит (Speaking / Липсинк)',
    motionFile: 'motions/alisa_speaking_gestures.motion3.json',
    expressionId: 'exp_11_confident_explain',
    baseSpriteEmotion: 'neutral',
    priority: 'PriorityNormal (2)',
    crossfadeMs: 220,
    blinkIntervalSec: '3.0 – 4.8 с (синхронно с акцентами)',
    breathSpeedMultiplier: 1.25,
    gazeBehaviorRu: 'Прямой зрительный контакт с редкими живыми акцентами бровями на ударных словах.',
    bodyAndHandsBehaviorRu: 'Активный 32-слайдовый липсинк поверх безротой базы кожи, живые микродвижения головы и плеч в такт речи.',
    defaultParams: {
      angleX: 0,
      angleY: 2,
      angleZ: 2,
      shoulderY: 0.12,
      handGesture: 'none',
      autoTalk: true
    }
  },
  {
    id: 'REACTING',
    code: 'STATE_05_REACTING',
    titleRu: 'Эмоциональная реакция (Reacting)',
    motionFile: 'motions/alisa_reaction_burst.motion3.json',
    expressionId: 'exp_02_joy',
    baseSpriteEmotion: 'wink',
    priority: 'PriorityForce (3)',
    crossfadeMs: 180,
    blinkIntervalSec: 'По ключу эмоции (Joy / Wink / Surprise)',
    breathSpeedMultiplier: 1.35,
    gazeBehaviorRu: 'Яркое сияние звёздчатых бликов (Physics_Eye_Highlights_Jiggle на максимуме).',
    bodyAndHandsBehaviorRu: 'Энергичная мимическая реакция, упругий импульс ахоге и боковых локонов.',
    defaultParams: {
      angleX: 4,
      angleY: 4,
      angleZ: 6,
      shoulderY: 0.18,
      handGesture: 'none',
      autoTalk: false
    }
  },
  {
    id: 'ERROR_OOPS',
    code: 'STATE_06_ERROR_OOPS',
    titleRu: 'Сбой / Извинение (Gentle Oops)',
    motionFile: 'motions/alisa_apologetic_bow.motion3.json',
    expressionId: 'exp_13_apologetic_oops',
    baseSpriteEmotion: 'embarrassed',
    priority: 'PriorityForce (3)',
    crossfadeMs: 240,
    blinkIntervalSec: '2.4 с (смущённое двойное моргание)',
    breathSpeedMultiplier: 1.15,
    gazeBehaviorRu: 'Смущённый взгляд чуть вниз с мягким румянцем (ParamCheek = 0.85).',
    bodyAndHandsBehaviorRu: 'Мягкий извиняющийся наклон головы вперёд (AngleY = -6°) и приподнятые плечи (Shoulder = +0.30).',
    defaultParams: {
      angleX: -2,
      angleY: -6,
      angleZ: -4,
      shoulderY: 0.3,
      handGesture: 'none',
      autoTalk: false
    }
  },
  {
    id: 'SLEEP_AFK',
    code: 'STATE_07_SLEEP_AFK',
    titleRu: 'Спящий режим (Sleep / AFK > 5 мин)',
    motionFile: 'motions/alisa_sleep_breathing.motion3.json',
    expressionId: 'exp_12_sleepy_standby',
    baseSpriteEmotion: 'sad',
    priority: 'PriorityIdle (1)',
    crossfadeMs: 800,
    blinkIntervalSec: 'Полуприкрытые веки (EyeOpen = 0.32)',
    breathSpeedMultiplier: 0.65,
    gazeBehaviorRu: 'Веки расслабленно прикрыты, зрачки неподвижны.',
    bodyAndHandsBehaviorRu: 'Замедленное глубокое дыхание (цикл 5.8 с), голова плавно склоняется к плечу.',
    defaultParams: {
      angleX: -3,
      angleY: -8,
      angleZ: -6,
      shoulderY: -0.2,
      handGesture: 'none',
      autoTalk: false
    }
  }
];

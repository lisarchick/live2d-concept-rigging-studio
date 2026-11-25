export interface TurnaroundAngleSpec {
  id: 'front' | 'three_quarter' | 'profile';
  title: string;
  angleRange: string;
  description: string;
  riggingNotes: string[];
}

export interface Stage2ExpressionSpec {
  id: string;
  code: string;
  nameRu: string;
  nameEn: string;
  triggerContext: string;
  browState: string;
  eyeState: string;
  mouthState: string;
  cheekBlush: string;
  parameters: {
    eyeOpen: number;
    eyeSmile: number;
    browY: number;
    mouthOpenY: number;
    mouthForm: number;
    angleZ: number;
    blushOpacity: number;
  };
}

export interface MaterialReferenceSpec {
  zone: string;
  materialType: string;
  baseHex: string;
  celShadowHex: string;
  softGradientHex: string;
  highlightHex: string;
  lineartHex: string;
  blendModeNote: string;
}

export interface VisemeFormSpec {
  phoneme: string;
  ruVowels: string;
  mouthOpenY: number;
  mouthForm: number;
  anatomicalNotes: string;
  visibleLayers: string[];
}

export const STAGE2_IMAGES = {
  turnaroundBust: '/assets/aistudio/alisa_turnaround_cutout.png',
  expressionsSheet: '/assets/aistudio/alisa_expressions_cutout.png',
  closeupEyesMouth: '/src/assets/images/alisa_stage2_closeup_eyes_mouth_1794670723197.jpg',
  materialsHands: '/src/assets/images/alisa_stage2_materials_hands_1794670725048.jpg'
};

export const TURNAROUND_SPECS: TurnaroundAngleSpec[] = [
  {
    id: 'front',
    title: 'Вид спереди (0° — Базовый PSD-исходник)',
    angleRange: 'ParamAngleX = 0°, ParamBodyAngleX = 0°',
    description:
      'Строго симметричный портрет по грудь с полным разворотом плеч (Bust-Up). Нимб полностью убран. Макушка увенчана живым упругим ахоге. Волнистые пряди мягко обрамляют шею и ложатся на ключицы и плечи.',
    riggingNotes: [
      'Исходный холст PSD рисуется именно в этом ракурсе (размер 4096×4096 px, запас по краям 15% под наклоны и физику волос)',
      'Левое и правое плечо, лацканы кардигана и боковые пряди рисуются симметрично для клонирования и отражения Warp-деформеров в Cubism'
    ]
  },
  {
    id: 'three_quarter',
    title: 'Вид 3/4 (±30° — Предел деформации Live2D)',
    angleRange: 'ParamAngleX = ±30°, ParamBodyAngleX = ±10°',
    description:
      'Контрольный референс для крайних точек поворота головы и плечевого пояса. Ближняя щека скругляется, переносица смещается к дальнему глазу, дальний глаз перспективно сжимается по ширине на ~18%.',
    riggingNotes: [
      'Дальняя боковая прядь уходит за контур щеки (перекрытие контролируется порядком отрисовки Draw Order или маской лица)',
      'Дальнее плечо чуть приподнимается и сжимается по горизонтали, а светящийся фиолетовый кант на ближнем лацкане кардигана раскрывается шире'
    ]
  },
  {
    id: 'profile',
    title: 'Профиль (90° — Анатомический референс глубины)',
    angleRange: 'Справочник объёма (не рендерится напрямую в 2.5D, задаёт карту глубин)',
    description:
      'Показывает реальный вынос лба, переносицы, губ и подбородка, посадку уха, объём затылочной массы волос и толщину воротника водолазки относительно шеи.',
    riggingNotes: [
      'Используется риггером для расчёта амплитуды смещения слоёв (Z-depth parallax): кончик носа и центральная прядь чёлки имеют максимальный вынос вперёд',
      'Показывает, как волнистые локоны разделяются на 3 эшелона глубины: передний (у скулы), средний (у уха) и задний (за плечом)'
    ]
  }
];

export const STAGE2_EXPRESSIONS: Stage2ExpressionSpec[] = [
  {
    id: 'neutral',
    code: 'exp_01_neutral.exp3.json',
    nameRu: 'Спокойное внимание (Neutral)',
    nameEn: 'Neutral / Default Warmth',
    triggerContext: 'Базовое состояние ожидания и спокойного диалога',
    browState: 'Расслабленные, плавная дуга (0.0)',
    eyeState: 'Открыты на 100%, мягкий дружелюбный изгиб нижнего века (+0.15)',
    mouthState: 'Закрытая мягкая полуулыбка, уголки губ чуть приподняты (+0.4)',
    cheekBlush: 'Базовый естественный тон (15%)',
    parameters: { eyeOpen: 1.0, eyeSmile: 0.15, browY: 0, mouthOpenY: 0.05, mouthForm: 0.4, angleZ: 0, blushOpacity: 0.15 }
  },
  {
    id: 'joy',
    code: 'exp_02_joy.exp3.json',
    nameRu: 'Тёплая радость (Joy)',
    nameEn: 'Joy / Happy Smile',
    triggerContext: 'Приветствие, похвала, успешное выполнение задачи',
    browState: 'Приподняты, мягкий домик радости (+0.35)',
    eyeState: 'Улыбка глазами — нижнее веко выгнуто дугой вверх (EyeSmile = 0.85)',
    mouthState: 'Открытая светлая улыбка, виден верхний ряд зубов (OpenY = 0.55, Form = +0.9)',
    cheekBlush: 'Тёплый румянец на скулах (45%)',
    parameters: { eyeOpen: 0.85, eyeSmile: 0.85, browY: 0.35, mouthOpenY: 0.55, mouthForm: 0.9, angleZ: 4, blushOpacity: 0.45 }
  },
  {
    id: 'laugh',
    code: 'exp_03_laugh.exp3.json',
    nameRu: 'Искренний смех (Laugh)',
    nameEn: 'Laugh / Beaming',
    triggerContext: 'Шутка, весёлый отклик, игривое настроение',
    browState: 'Высокие, расслабленные (+0.45)',
    eyeState: 'Счастливые закрытые дуги (EyeOpen = 0.05, EyeSmile = 1.0)',
    mouthState: 'Широко открытый смеющийся рот (OpenY = 0.85, Form = +1.0)',
    cheekBlush: 'Яркий румянец радости (60%)',
    parameters: { eyeOpen: 0.08, eyeSmile: 1.0, browY: 0.45, mouthOpenY: 0.85, mouthForm: 1.0, angleZ: 7, blushOpacity: 0.6 }
  },
  {
    id: 'sad',
    code: 'exp_04_sad.exp3.json',
    nameRu: 'Сочувствие / Грусть (Sad)',
    nameEn: 'Sad / Empathetic',
    triggerContext: 'Сочувствие пользователю, сообщение об ошибке или плохой новости',
    browState: 'Внутренние уголки приподняты и сведены «домиком» (-0.45, Angle = +0.6)',
    eyeState: 'Чуть прикрыты (0.75), дрожащий влажный блик в нижней части радужки',
    mouthState: 'Уголки губ опущены вниз (OpenY = 0.05, Form = -0.7)',
    cheekBlush: 'Снижен (10%)',
    parameters: { eyeOpen: 0.72, eyeSmile: 0.0, browY: -0.45, mouthOpenY: 0.05, mouthForm: -0.75, angleZ: -6, blushOpacity: 0.1 }
  },
  {
    id: 'surprise',
    code: 'exp_05_surprise.exp3.json',
    nameRu: 'Удивление / Озарение (Surprise)',
    nameEn: 'Surprise / Eureka',
    triggerContext: 'Неожиданный вопрос, интересный факт, резкий звук',
    browState: 'Высоко подняты (+0.85)',
    eyeState: 'Широко распахнуты (EyeOpen = 1.15), радужка и зрачок чуть уменьшены (-12% scale)',
    mouthState: 'Округлое «О» (OpenY = 0.65, Form = -0.35)',
    cheekBlush: 'Базовый (20%)',
    parameters: { eyeOpen: 1.0, eyeSmile: 0.0, browY: 0.85, mouthOpenY: 0.65, mouthForm: -0.35, angleZ: 0, blushOpacity: 0.2 }
  },
  {
    id: 'angry',
    code: 'exp_06_angry.exp3.json',
    nameRu: 'Игривое ворчание / Строгость (Angry / Pout)',
    nameEn: 'Cute Pout / Stern',
    triggerContext: 'Когда пользователь дразнит Алису или просит невозможного (без агрессии!)',
    browState: 'Сведены к переносице и опущены (-0.55)',
    eyeState: 'Лёгкий прищур верхнего века (EyeOpen = 0.82)',
    mouthState: 'Сжатые губы или лёгкое надувание щёк (OpenY = 0.0, Form = -0.5)',
    cheekBlush: 'Лёгкий румянец на щеках (40%)',
    parameters: { eyeOpen: 0.8, eyeSmile: 0.1, browY: -0.6, mouthOpenY: 0.04, mouthForm: -0.6, angleZ: -4, blushOpacity: 0.4 }
  },
  {
    id: 'thinking',
    code: 'exp_07_thinking.exp3.json',
    nameRu: 'Размышление / Поиск ответа (Thinking)',
    nameEn: 'Thinking / Processing',
    triggerContext: 'Генерация ответа, поиск информации, расчёт',
    browState: 'Асимметрия: левая бровь чуть ниже (-0.15), правая приподнята (+0.35)',
    eyeState: 'Взгляд отведён вверх и вправо (EyeBallX = +0.6, EyeBallY = +0.5)',
    mouthState: 'Задумчивая маленькая линия со смещением уголка (OpenY = 0.05, Form = -0.15)',
    cheekBlush: 'Базовый (15%), рука в жесте у подбородка (опционально)',
    parameters: { eyeOpen: 0.92, eyeSmile: 0.0, browY: 0.25, mouthOpenY: 0.05, mouthForm: -0.15, angleZ: -9, blushOpacity: 0.15 }
  },
  {
    id: 'wink',
    code: 'exp_08_wink.exp3.json',
    nameRu: 'Игривый подмиг (Playful Wink)',
    nameEn: 'Wink / Playful',
    triggerContext: 'Лёгкая ирония, пасхалка, дружеская подсказка',
    browState: 'Асимметричная дуга (+0.25)',
    eyeState: 'Левый глаз открыт и сияет (1.0), правый глаз закрыт в улыбке (0.0)',
    mouthState: 'Лукавая асимметричная улыбка (OpenY = 0.35, Form = +0.85)',
    cheekBlush: 'Тёплый румянец (40%)',
    parameters: { eyeOpen: 0.95, eyeSmile: 0.8, browY: 0.25, mouthOpenY: 0.35, mouthForm: 0.85, angleZ: 10, blushOpacity: 0.4 }
  },
  {
    id: 'embarrassed',
    code: 'exp_09_embarrassed.exp3.json',
    nameRu: 'Смущение / Скромность (Embarrassed)',
    nameEn: 'Shy / Flustered',
    triggerContext: 'Реакция на комплимент голосу или внешности Алисы',
    browState: 'Приподняты и чуть сведены (+0.15)',
    eyeState: 'Взгляд чуть в сторону, мягкий прищур (EyeOpen = 0.8, EyeSmile = 0.6)',
    mouthState: 'Застенчивая волнистая улыбка (OpenY = 0.1, Form = +0.3)',
    cheekBlush: 'Максимальный лавандово-розовый румянец + диагональные штрихи (85%)',
    parameters: { eyeOpen: 0.78, eyeSmile: 0.65, browY: -0.2, mouthOpenY: 0.1, mouthForm: 0.35, angleZ: -5, blushOpacity: 0.85 }
  }
];

export const MATERIAL_REFERENCES: MaterialReferenceSpec[] = [
  {
    zone: '1. Волосы (Платина → Лаванда)',
    materialType: 'Шелковистые пряди с внутренним градиентом и двойным бликом',
    baseHex: '#F8F7FC',
    celShadowHex: '#DDD6FE',
    softGradientHex: '#C4B5FD',
    highlightHex: '#FFFFFF',
    lineartHex: '#4C3D75',
    blendModeNote: 'Блик-кольцо (Angel Ring) на отдельном слое в режиме Add/Screen (непрозрачность 65%)'
  },
  {
    zone: '2. Кожа (Лицо, шея, кисти рук)',
    materialType: 'Тёплый фарфор с мягким персиково-лавандовым подтоном в тенях',
    baseHex: '#FFF9F8',
    celShadowHex: '#F3E3E8',
    softGradientHex: '#FBCFE8',
    highlightHex: '#FFFFFF',
    lineartHex: '#5B3E54',
    blendModeNote: 'Падающая тень от чёлки и подбородка — отдельный слой Multiply (#D8B4FE, 45%)'
  },
  {
    zone: '3. Радужка глаз (Аметист-Ирис)',
    materialType: 'Многослойная кристаллическая линза (6 внутренних слоёв)',
    baseHex: '#7C3AED',
    celShadowHex: '#2E1065',
    softGradientHex: '#C4B5FD',
    highlightHex: '#FFFFFF',
    lineartHex: '#1E1B4B',
    blendModeNote: 'Верхняя половина радужки затемнена в Multiply, нижняя светится в Screen (#DDD6FE)'
  },
  {
    zone: '4. Водолазка (Плечи и шея)',
    materialType: 'Мягкий матовый трикотаж в мелкий вертикальный рубчик',
    baseHex: '#C4B5FD',
    celShadowHex: '#9F7AEA',
    softGradientHex: '#7C3AED',
    highlightHex: '#EDE9FE',
    lineartHex: '#4C1D95',
    blendModeNote: 'Вертикальные линии рубчика привязаны к сетке грудной клетки для объёма при дыхании'
  },
  {
    zone: '5. Кардиган (Плечевой пояс и лацканы)',
    materialType: 'Плотный гладкий молочно-белый неопрен-трикотаж с чётким швом',
    baseHex: '#F8F7FC',
    celShadowHex: '#E2E0F0',
    softGradientHex: '#C4B5FD',
    highlightHex: '#FFFFFF',
    lineartHex: '#473B6B',
    blendModeNote: 'Чёткая граница лацкана отделяет передний слой плеча от туловища'
  },
  {
    zone: '6. Светящийся ИИ-кант (Швы плеч и борта)',
    materialType: 'Оптоволоконный неоново-фиолетовый шнур (эквалайзер речи)',
    baseHex: '#A855F7',
    celShadowHex: '#6B21A8',
    softGradientHex: '#D8B4FE',
    highlightHex: '#F3E8FF',
    lineartHex: '#581C87',
    blendModeNote: 'Дублирующий слой свечения (Glow) в режиме Add, управляемый параметром громкости голоса'
  }
];

export const VISEME_CHART: VisemeFormSpec[] = [
  {
    phoneme: 'Closed (M / B / P)',
    ruVowels: 'М, Б, П и пауза (молчание)',
    mouthOpenY: 0.0,
    mouthForm: 0.4,
    anatomicalNotes: 'Губы сомкнуты в мягкую линию с приподнятыми уголками; внутренность рта скрыта маской губ.',
    visibleLayers: ['Mouth_UpperLip', 'Mouth_LowerLip']
  },
  {
    phoneme: 'Vowel A (А)',
    ruVowels: 'А, Я (ударные широкие)',
    mouthOpenY: 0.85,
    mouthForm: 0.6,
    anatomicalNotes: 'Широкое открытие по вертикали и горизонтали; чётко виден верхний ряд зубов, язык и тёмная глубина гортани.',
    visibleLayers: ['Mouth_Inner', 'Mouth_Tongue', 'Mouth_TeethUpper', 'Mouth_UpperLip', 'Mouth_LowerLip']
  },
  {
    phoneme: 'Vowel I (И)',
    ruVowels: 'И, Ы, Й (узкая улыбка)',
    mouthOpenY: 0.35,
    mouthForm: 0.95,
    anatomicalNotes: 'Уголки рта растянуты в стороны, небольшое раскрытие по высоте; видны верхние и чуть-чуть нижние зубы.',
    visibleLayers: ['Mouth_Inner', 'Mouth_TeethUpper', 'Mouth_TeethLower', 'Mouth_UpperLip', 'Mouth_LowerLip']
  },
  {
    phoneme: 'Vowel U (У)',
    ruVowels: 'У, Ю (узкий овал вперёд)',
    mouthOpenY: 0.45,
    mouthForm: -0.65,
    anatomicalNotes: 'Губы собраны трубочкой (ширина уменьшена на 35%), небольшое круглое отверстие, виден кончик языка.',
    visibleLayers: ['Mouth_Inner', 'Mouth_Tongue', 'Mouth_UpperLip', 'Mouth_LowerLip']
  },
  {
    phoneme: 'Vowel E (Э)',
    ruVowels: 'Э, Е (средний полуоткрытый)',
    mouthOpenY: 0.6,
    mouthForm: 0.75,
    anatomicalNotes: 'Среднее раскрытие в форме мягкой трапеции с улыбкой; самая частая промежуточная форма при быстрой речи.',
    visibleLayers: ['Mouth_Inner', 'Mouth_Tongue', 'Mouth_TeethUpper', 'Mouth_UpperLip', 'Mouth_LowerLip']
  },
  {
    phoneme: 'Vowel O (О)',
    ruVowels: 'О, Ё (высокий вертикальный овал)',
    mouthOpenY: 0.75,
    mouthForm: -0.4,
    anatomicalNotes: 'Уголки губ сдвинуты к центру, челюсть опущена вниз; форма правильного вертикального овала.',
    visibleLayers: ['Mouth_Inner', 'Mouth_Tongue', 'Mouth_TeethUpper', 'Mouth_UpperLip', 'Mouth_LowerLip']
  }
];

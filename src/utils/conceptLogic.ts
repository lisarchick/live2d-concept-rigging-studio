import { ALISA_CONCEPTS, ConceptSpec, RiggingComplexity } from '../data/conceptsData';
import { STAGE2_EXPRESSIONS, Stage2ExpressionSpec, VISEME_CHART, VisemeFormSpec } from '../data/stage2Data';

export interface Live2DParameterState {
  angleX: number; // -30 to +30
  angleY: number; // -30 to +30
  angleZ: number; // -30 to +30
  eyeOpen: number; // 0.0 to 1.0
  eyeSmile: number; // 0.0 to 1.0
  mouthOpenY: number; // 0.0 to 1.0
  mouthForm: number; // -1.0 to +1.0
  browY: number; // -1.0 to +1.0
  breath: number; // 0.0 to 1.0
  shoulderY: number; // -1.0 to +1.0 (gentle breathing chest/shoulder wave)
  handGesture: 'none' | 'think' | 'wave';
  gazeX?: number; // -1.0 to +1.0 (subtle living pupil/eye micro-saccade X)
  gazeY?: number; // -1.0 to +1.0 (subtle living pupil/eye micro-saccade Y)
  cheekBlush?: number; // 0.0 to 1.0 (dynamic warm cheek blush)
  browLY?: number; // -1.0 to +1.0 (independent screen-left eyebrow vertical shift)
  browRY?: number; // -1.0 to +1.0 (independent screen-right eyebrow vertical shift)
  eyeOpenL?: number; // 0.0 to 1.0 (independent screen-left eye openness)
  eyeOpenR?: number; // 0.0 to 1.0 (independent screen-right eye openness)
}

export type EmotionPresetId =
  | 'neutral'
  | 'joy'
  | 'laugh'
  | 'sad'
  | 'surprise'
  | 'angry'
  | 'thinking'
  | 'wink'
  | 'embarrassed';

export const EXPRESSION_SPRITE_MAP: Record<
  EmotionPresetId,
  { col: number; row: number; bgPosition: string }
> = {
  neutral: { col: 0, row: 0, bgPosition: '0% 0%' },
  joy: { col: 1, row: 0, bgPosition: '50% 0%' },
  laugh: { col: 2, row: 0, bgPosition: '100% 0%' },
  sad: { col: 0, row: 1, bgPosition: '0% 50%' },
  surprise: { col: 1, row: 1, bgPosition: '50% 50%' },
  angry: { col: 2, row: 1, bgPosition: '100% 50%' },
  thinking: { col: 0, row: 2, bgPosition: '0% 100%' },
  wink: { col: 1, row: 2, bgPosition: '50% 100%' },
  embarrassed: { col: 2, row: 2, bgPosition: '100% 100%' }
};

export type AnimeVisemeKey = 'SILENT' | 'A' | 'I' | 'U' | 'E' | 'O';

export const VISEME_SPRITE_MAP: Record<
  AnimeVisemeKey,
  { index: number; bgPosition: string; openY: number; form: number; label: string }
> = {
  SILENT: { index: 0, bgPosition: '0% 0%', openY: 0.02, form: 0.4, label: 'М / П (Закрыт)' },
  A: { index: 1, bgPosition: '20% 0%', openY: 0.88, form: 0.6, label: 'А (Широкий)' },
  I: { index: 2, bgPosition: '40% 0%', openY: 0.38, form: 0.95, label: 'И (Улыбка)' },
  U: { index: 3, bgPosition: '60% 0%', openY: 0.48, form: -0.65, label: 'У (Округлый)' },
  E: { index: 4, bgPosition: '80% 0%', openY: 0.62, form: 0.75, label: 'Э (Средний)' },
  O: { index: 5, bgPosition: '100% 0%', openY: 0.78, form: -0.45, label: 'О (Овал)' }
};

export function resolveAnimeVisemeKey(mouthOpenY: number, mouthForm: number): AnimeVisemeKey {
  if (mouthOpenY <= 0.12) return 'SILENT';
  if (mouthForm < -0.15) {
    return mouthOpenY >= 0.62 ? 'O' : 'U';
  }
  if (mouthOpenY >= 0.76) return 'A';
  if (mouthOpenY >= 0.5) return 'E';
  return 'I';
}

export const EMOTION_PRESETS: Record<
  EmotionPresetId,
  { label: string; description: string; params: Partial<Live2DParameterState> }
> = {
  neutral: {
    label: 'Neutral (Спокойствие)',
    description: 'Базовое дружелюбное состояние Алисы с мягкой полуулыбкой (без нимба, по плечи)',
    params: { angleX: 0, angleY: 0, angleZ: 0, shoulderY: 0, eyeOpen: 1.0, eyeSmile: 0.18, mouthOpenY: 0.04, mouthForm: 0.4, browY: 0, gazeX: 0, gazeY: 0, cheekBlush: 0.12, handGesture: 'none' }
  },
  joy: {
    label: 'Joy (Тёплая радость)',
    description: 'Улыбка глазами (ParamEyeSmile = 0.85), приподнятые щёки и открытая улыбка с чёткой нижней губой',
    params: { angleX: 0, angleY: 0, angleZ: 0, shoulderY: 0, eyeOpen: 0.25, eyeSmile: 0.85, mouthOpenY: 0.45, mouthForm: 0.9, browY: 0.18, gazeX: 0, gazeY: 0, cheekBlush: 0.45, handGesture: 'none' }
  },
  laugh: {
    label: 'Laugh (Искренний смех)',
    description: 'Счастливые закрытые дуги глаз, широкая открытая улыбка и тёплый румянец',
    params: { angleX: 0, angleY: 0, angleZ: 0, shoulderY: 0, eyeOpen: 0.12, eyeSmile: 0.95, mouthOpenY: 0.85, mouthForm: 1.0, browY: 0.24, gazeX: 0, gazeY: 0, cheekBlush: 0.65, handGesture: 'none' }
  },
  sad: {
    label: 'Sad (Сочувствие)',
    description: 'Брови «домиком», чуть прикрытые глаза с влажным бликом, уголки губ мягко опущены',
    params: { angleX: 0, angleY: 0, angleZ: 0, shoulderY: 0, eyeOpen: 0.78, eyeSmile: 0.0, mouthOpenY: 0.05, mouthForm: -0.75, browY: -0.28, gazeX: -0.1, gazeY: -0.2, cheekBlush: 0.15, handGesture: 'none' }
  },
  surprise: {
    label: 'Surprise (Живой интерес)',
    description: 'Тёплый заинтересованный взгляд с крупной радужкой, мягко приподнятые брови и аккуратное «О»',
    params: { angleX: 0, angleY: 0, angleZ: 0, shoulderY: 0, eyeOpen: 1.04, eyeSmile: 0.22, mouthOpenY: 0.58, mouthForm: -0.35, browY: 0.26, gazeX: 0, gazeY: 0.08, cheekBlush: 0.28, handGesture: 'none' }
  },
  angry: {
    label: 'Angry / Pout (Милое ворчание)',
    description: 'Сведённые к переносице брови, лёгкий прищур и мило надутые губы без агрессии',
    params: { angleX: 0, angleY: 0, angleZ: 0, shoulderY: 0, eyeOpen: 0.84, eyeSmile: 0.1, mouthOpenY: 0.04, mouthForm: -0.6, browY: -0.35, gazeX: 0, gazeY: 0, cheekBlush: 0.35, handGesture: 'none' }
  },
  thinking: {
    label: 'Thinking (Поиск ответа)',
    description: 'Задумчивый взгляд в сторону и мягкая естественная асимметрия бровей',
    params: { angleX: 0, angleY: 0, angleZ: 0, shoulderY: 0, eyeOpen: 0.92, eyeSmile: 0.12, mouthOpenY: 0.05, mouthForm: -0.15, browY: 0.12, gazeX: 0.35, gazeY: 0.25, cheekBlush: 0.1, handGesture: 'none' }
  },
  wink: {
    label: 'Wink (Игривый подмиг)',
    description: 'Левый глаз открыт и сияет, правый глаз закрыт в игривом подмиге, открытая улыбка',
    params: { angleX: 0, angleY: 0, angleZ: 0, shoulderY: 0, eyeOpen: 0.95, eyeSmile: 0.78, mouthOpenY: 0.35, mouthForm: 0.85, browY: 0.16, gazeX: 0.15, gazeY: 0, cheekBlush: 0.42, handGesture: 'none' }
  },
  embarrassed: {
    label: 'Embarrassed (Смущение)',
    description: 'Тёплый румянец на щеках, мягкие брови и скромная улыбка при комплименте',
    params: { angleX: 0, angleY: 0, angleZ: 0, shoulderY: 0, eyeOpen: 0.82, eyeSmile: 0.65, mouthOpenY: 0.1, mouthForm: 0.35, browY: -0.14, gazeX: -0.25, gazeY: -0.18, cheekBlush: 0.85, handGesture: 'none' }
  }
};

export function clampParameter(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function filterConceptsByComplexity(
  concepts: ConceptSpec[],
  complexityFilter: 'ALL' | RiggingComplexity
): ConceptSpec[] {
  if (complexityFilter === 'ALL') return concepts;
  return concepts.filter((c) => c.rigging.level === complexityFilter);
}

export function computeParallaxOffset(angleX: number, angleY: number, depthFactor: number): { dx: number; dy: number } {
  const clampedX = clampParameter(angleX, -30, 30);
  const clampedY = clampParameter(angleY, -30, 30);
  return {
    dx: Number(((clampedX / 30) * 18 * depthFactor).toFixed(2)),
    dy: Number(((-clampedY / 30) * 14 * depthFactor).toFixed(2))
  };
}

export function findExpressionById(id: string): Stage2ExpressionSpec {
  return STAGE2_EXPRESSIONS.find((exp) => exp.id === id) ?? STAGE2_EXPRESSIONS[0];
}

export function findClosestViseme(mouthOpenY: number, mouthForm: number): VisemeFormSpec {
  let best = VISEME_CHART[0];
  let bestDist = Infinity;
  for (const viseme of VISEME_CHART) {
    const dy = viseme.mouthOpenY - mouthOpenY;
    const df = (viseme.mouthForm - mouthForm) * 0.5;
    const dist = Math.hypot(dy, df);
    if (dist < bestDist) {
      bestDist = dist;
      best = viseme;
    }
  }
  return best;
}

export function generateStage1ConfirmationBrief(
  selectedConceptId: number,
  selectedCustomizations: string[],
  customNotes: string,
  allOptions: { id: string; label: string }[]
): string {
  const concept = ALISA_CONCEPTS.find((c) => c.id === selectedConceptId) ?? ALISA_CONCEPTS[0];
  const chosenLabels = allOptions
    .filter((opt) => selectedCustomizations.includes(opt.id))
    .map((opt) => `• ${opt.label}`);

  const lines = [
    `УТВЕРЖДЕНИЕ ЭТАПА 1 — ВЫБОР КОНЦЕПТА «АЛИСА AI»`,
    `Выбранный базовый макет: Концепт №${concept.id} — «${concept.title}» (${concept.code})`,
    `Сложность риггинга: ${concept.rigging.level} (~${concept.rigging.estimatedLayers} слоёв PSD, ${concept.rigging.deformerCount} деформеров)`,
    `Базовая палитра: ${concept.palette.map((p) => `${p.name} (${p.hex})`).join(', ')}`
  ];

  if (chosenLabels.length > 0) {
    lines.push(`\nМодификации и гибридные детали для Этапа 2:`);
    lines.push(...chosenLabels);
  }

  const trimmedNotes = customNotes.trim();
  if (trimmedNotes.length > 0) {
    lines.push(`\nДополнительные пожелания к доработке (Этап 2):`);
    lines.push(trimmedNotes);
  } else {
    lines.push(`\nДополнительные пожелания: Без нимба, формат по грудь вместе с плечами (Bust-Up).`);
  }

  return lines.join('\n');
}

export function generateStage2ApprovalSummary(
  approvedChecklist: string[],
  stage3Notes: string
): string {
  const lines = [
    `УТВЕРЖДЕНИЕ ЭТАПА 2 — ДОРАБОТАННЫЙ АРТ «АЛИСА AI» (CONCEPT-01 BUST-UP БЕЗ НИМБА)`,
    `Формат модели: Портрет по грудь с полным разворотом плеч (Bust-Up, текстурный атлас 4096×4096)`,
    `Утверждённые листы референсов (${approvedChecklist.length}/4):`,
    ...approvedChecklist.map((item) => `  ✓ ${item}`)
  ];

  if (stage3Notes.trim()) {
    lines.push(`\nПожелания перед нарезкой слоёв (Этап 3 — PSD и Деформеры):`);
    lines.push(stage3Notes.trim());
  } else {
    lines.push(`\nГотовность к Этапу 3: Арт утверждён, переходим к полной схеме слоёв PSD, параметрам Cubism, иерархии деформеров и физике.`);
  }

  return lines.join('\n');
}

export function filterPsdLayers<T extends { category: string; layerName: string; notesRu: string }>(
  layers: T[],
  categoryFilter: string,
  searchQuery: string
): T[] {
  const q = searchQuery.trim().toLowerCase();
  return layers.filter((layer) => {
    const matchesCat = categoryFilter === 'ALL' || layer.category === categoryFilter;
    if (!matchesCat) return false;
    if (!q) return true;
    return (
      layer.layerName.toLowerCase().includes(q) ||
      layer.notesRu.toLowerCase().includes(q)
    );
  });
}

export function buildCubismPhysicsJsonPreview(
  groups: Array<{
    id: string;
    groupName: string;
    inputParams: string[];
    outputParam: string;
    pendulumCount: number;
    mass: number;
    damping: number;
    sensitivity: number;
    fps: number;
  }>
): string {
  const payload = {
    Version: 3,
    Meta: {
      PhysicsSettingCount: groups.length,
      TotalInputCount: groups.reduce((sum, g) => sum + g.inputParams.length, 0),
      TotalOutputCount: groups.length,
      VertexCount: groups.reduce((sum, g) => sum + g.pendulumCount, 0),
      Fps: 60
    },
    PhysicsSettings: groups.map((g) => ({
      Id: g.id,
      Name: g.groupName,
      Input: g.inputParams.map((p) => ({
        Source: { Target: 'Parameter', Id: p },
        Weight: Number((100 / g.inputParams.length).toFixed(1)),
        Type: 'X',
        Reflect: false
      })),
      Output: [
        {
          Destination: { Target: 'Parameter', Id: g.outputParam },
          VertexIndex: g.pendulumCount - 1,
          Scale: g.sensitivity,
          Weight: 100
        }
      ],
      Normalization: {
        Position: { Minimum: -10, Default: 0, Maximum: 10 },
        Angle: { Minimum: -10, Default: 0, Maximum: 10 }
      },
      VerticesConfig: {
        Count: g.pendulumCount,
        Mass: g.mass,
        Damping: g.damping,
        ReactionTime: g.sensitivity
      }
    }))
  };
  return JSON.stringify(payload, null, 2);
}

export function generateStage3ApprovalSummary(notesForStage4: string): string {
  const lines = [
    `УТВЕРЖДЕНИЕ ЭТАПА 3 — ПОДГОТОВКА К РИГГИНГУ «АЛИСА AI» (BUST-UP БЕЗ НИМБА)`,
    `1. Схема слоёв PSD: 42 сгруппированных мастер-слоя (с симметричными L/R парами = ~76 рабочих арт-мешей), порядок отрисовки 900 → 150.`,
    `2. Параметры Live2D Cubism: 30 стандартных параметров (AngleX/Y/Z ±30°, EyeOpen/Smile/Ball, BrowL/R Y/X/Angle/Form, MouthOpenY/Form, Cheek, BodyAngle, Breath, Shoulder, ArmL/R, HairFront/Side/Back).`,
    `3. Иерархия деформеров: 13 узлов (Warp + Rotation) с центром вращения головы в основании затылка и коллизией боковых прядей с плечами.`,
    `4. Настройки Cubism Physics (60 FPS): 6 групп маятников (чёлка, ахоге, боковые локоны, задние волосы, лацканы кардигана, блики глаз).`
  ];
  if (notesForStage4.trim()) {
    lines.push(`\nКомментарии для Этапа 4 (Анимация и логика оживления):`);
    lines.push(notesForStage4.trim());
  } else {
    lines.push(`\nГотовность к Этапу 4: Переходим к логике моргания, дыханию/саккадам, липсинку, 13 эмоциям (.exp3.json) и состояниям ассистента.`);
  }
  return lines.join('\n');
}

export function computeBlinkEyeOpen(elapsedMs: number): number {
  if (elapsedMs < 0 || elapsedMs >= 190) return 1.0;
  if (elapsedMs <= 55) {
    const t = elapsedMs / 55;
    return Number(Math.max(0, 1.0 - t * t).toFixed(2));
  }
  if (elapsedMs <= 80) {
    return 0.0;
  }
  const t = (elapsedMs - 80) / 110;
  if (t < 0.8) {
    const k = t / 0.8;
    return Number((1.03 * (1 - Math.pow(1 - k, 2))).toFixed(2));
  }
  const settle = (t - 0.8) / 0.2;
  return Number((1.03 - 0.03 * settle).toFixed(2));
}

export function filterStage4Expressions<
  T extends { category: string; fileName: string; titleRu: string; triggerContextRu: string }
>(presets: T[], categoryFilter: string, searchQuery: string): T[] {
  const q = searchQuery.trim().toLowerCase();
  return presets.filter((item) => {
    const matchesCat = categoryFilter === 'ALL' || item.category === categoryFilter;
    if (!matchesCat) return false;
    if (!q) return true;
    return (
      item.fileName.toLowerCase().includes(q) ||
      item.titleRu.toLowerCase().includes(q) ||
      item.triggerContextRu.toLowerCase().includes(q)
    );
  });
}

export function buildCubismExp3JsonPreview(preset: {
  fileName: string;
  fadeInSec: number;
  fadeOutSec: number;
  blendMode: 'Additive' | 'Overwrite';
  parameterValues: Record<string, number>;
}): string {
  const payload = {
    Type: 'Live2D Expression',
    FadeInTime: preset.fadeInSec,
    FadeOutTime: preset.fadeOutSec,
    Parameters: Object.entries(preset.parameterValues).map(([paramId, value]) => ({
      Id: paramId,
      Value: value,
      Blend: preset.blendMode
    }))
  };
  return JSON.stringify(payload, null, 2);
}

export function generateStage4ApprovalSummary(notesForStage5: string): string {
  const lines = [
    `УТВЕРЖДЕНИЕ ЭТАПА 4 — АНИМАЦИЯ И ЛОГИКА ОЖИВЛЕНИЯ «АЛИСА AI» (BUST-UP БЕЗ НИМБА)`,
    `1. Логика моргания (Eye Blink): 3-фазный цикл 190 мс (55 мс смыкание → 25 мс пауза → 110 мс раскрытие с пружиной блика), стохастический интервал 3.2–5.8 с + 18% двойной блинк.`,
    `2. Фоновая Idle-анимация и Mesh-деформация: непрерывный 2D ArtMesh Warp Deformer (наклон головы вокруг шеи и мягкий изгиб родных бровей без разрывов слоёв).`,
    `3. Система липсинка: слоговая коартикуляция + 32 обрезанных аниме-слайда (6 базовых висем + 26 промежуточных морф-фаз) с пружинным сглаживанием 60 FPS без резких смен направления.`,
    `4. Палитра эмоций (.exp3.json): 13 готовых пресетов выражений с настройками FadeIn/FadeOut и режимами смешивания Overwrite / Additive.`,
    `5. Машина состояний ИИ-ассистента: 7 стейтов (IDLE, LISTENING, THINKING, SPEAKING, REACTING, ERROR_OOPS, SLEEP_AFK) с приоритетами Cubism MotionPriority.`
  ];
  if (notesForStage5.trim()) {
    lines.push(`\nПожелания для Этапа 5 (Финализация и интеграция с Cubism SDK):`);
    lines.push(notesForStage5.trim());
  } else {
    lines.push(`\nГотовность к Этапу 5: Переходим к чеклисту экспорта (.moc3, .model3.json, .physics3.json), ТЗ для продакшена и архитектуре интеграции Cubism SDK (Web / Unity / Desktop).`);
  }
  return lines.join('\n');
}

export interface CutoutVisemeSlideSpec {
  index: number;
  code: string;
  shortLabel: string;
  labelRu: string;
  category: 'base' | 'inbetween' | 'bridge';
  mappedViseme: AnimeVisemeKey;
  openY: number;
  form: number;
  bgPosition: string;
}

function pos32(idx: number): string {
  if (idx <= 0) return '0% 0%';
  if (idx >= 31) return '100% 0%';
  return `${((idx / 31) * 100).toFixed(4)}% 0%`;
}

function pos48(idx: number): string {
  if (idx <= 0) return '0% 0%';
  if (idx >= 47) return '100% 0%';
  return `${((idx / 47) * 100).toFixed(4)}% 0%`;
}

export const CUTOUT_VISEME_SLIDES_32: CutoutVisemeSlideSpec[] = [
  { index: 0, code: 'SLIDE_00_M_REST', shortLabel: '00 · М/П (0%)', labelRu: 'Сомкнутая полуулыбка (Покой / М / Б / П)', category: 'base', mappedViseme: 'SILENT', openY: 0.02, form: 0.40, bgPosition: pos32(0) },
  { index: 1, code: 'SLIDE_01_M_A_15', shortLabel: '01 · М→А 15%', labelRu: 'Плавное микро-раскрытие губ (15%)', category: 'inbetween', mappedViseme: 'SILENT', openY: 0.14, form: 0.44, bgPosition: pos32(1) },
  { index: 2, code: 'SLIDE_02_M_A_30', shortLabel: '02 · М→А 30%', labelRu: 'Мягкое раскрытие к гласной (30%)', category: 'inbetween', mappedViseme: 'E', openY: 0.28, form: 0.48, bgPosition: pos32(2) },
  { index: 3, code: 'SLIDE_03_M_A_45', shortLabel: '03 · М→А 45%', labelRu: 'Промежуточный полуоткрытый рот (45%)', category: 'inbetween', mappedViseme: 'E', openY: 0.42, form: 0.52, bgPosition: pos32(3) },
  { index: 4, code: 'SLIDE_04_M_A_60', shortLabel: '04 · М→А 60%', labelRu: 'Среднее раскрытие к «А» (60%)', category: 'inbetween', mappedViseme: 'E', openY: 0.56, form: 0.55, bgPosition: pos32(4) },
  { index: 5, code: 'SLIDE_05_M_A_75', shortLabel: '05 · М→А 75%', labelRu: 'Глубокий переход к «А» (75%)', category: 'inbetween', mappedViseme: 'A', openY: 0.70, form: 0.58, bgPosition: pos32(5) },
  { index: 6, code: 'SLIDE_06_M_A_90', shortLabel: '06 · М→А 90%', labelRu: 'Почти полное раскрытие «А» (90%)', category: 'inbetween', mappedViseme: 'A', openY: 0.82, form: 0.60, bgPosition: pos32(6) },
  { index: 7, code: 'SLIDE_07_A_FULL', shortLabel: '07 · А (100%)', labelRu: 'Базовая широкая гласная «А / Я» (100%)', category: 'base', mappedViseme: 'A', openY: 0.92, form: 0.62, bgPosition: pos32(7) },
  { index: 8, code: 'SLIDE_08_A_O_20', shortLabel: '08 · А→О 20%', labelRu: 'Начало округления «А → О» (20%)', category: 'inbetween', mappedViseme: 'A', openY: 0.89, form: 0.40, bgPosition: pos32(8) },
  { index: 9, code: 'SLIDE_09_A_O_40', shortLabel: '09 · А→О 40%', labelRu: 'Плавное округление «А → О» (40%)', category: 'inbetween', mappedViseme: 'O', openY: 0.86, form: 0.18, bgPosition: pos32(9) },
  { index: 10, code: 'SLIDE_10_A_O_60', shortLabel: '10 · А→О 60%', labelRu: 'Средний овал «А → О» (60%)', category: 'inbetween', mappedViseme: 'O', openY: 0.83, form: -0.05, bgPosition: pos32(10) },
  { index: 11, code: 'SLIDE_11_A_O_80', shortLabel: '11 · А→О 80%', labelRu: 'Почти округлое «О» (80%)', category: 'inbetween', mappedViseme: 'O', openY: 0.80, form: -0.26, bgPosition: pos32(11) },
  { index: 12, code: 'SLIDE_12_O_FULL', shortLabel: '12 · О (100%)', labelRu: 'Базовая округлая гласная «О / Ё» (100%)', category: 'base', mappedViseme: 'O', openY: 0.78, form: -0.45, bgPosition: pos32(12) },
  { index: 13, code: 'SLIDE_13_O_U_20', shortLabel: '13 · О→У 20%', labelRu: 'Начало сужения «О → У» (20%)', category: 'inbetween', mappedViseme: 'O', openY: 0.72, form: -0.50, bgPosition: pos32(13) },
  { index: 14, code: 'SLIDE_14_O_U_40', shortLabel: '14 · О→У 40%', labelRu: 'Плавное сужение «О → У» (40%)', category: 'inbetween', mappedViseme: 'U', openY: 0.65, form: -0.55, bgPosition: pos32(14) },
  { index: 15, code: 'SLIDE_15_O_U_60', shortLabel: '15 · О→У 60%', labelRu: 'Компактный овал «О → У» (60%)', category: 'inbetween', mappedViseme: 'U', openY: 0.58, form: -0.60, bgPosition: pos32(15) },
  { index: 16, code: 'SLIDE_16_O_U_80', shortLabel: '16 · О→У 80%', labelRu: 'Узкий переход к «У» (80%)', category: 'inbetween', mappedViseme: 'U', openY: 0.52, form: -0.65, bgPosition: pos32(16) },
  { index: 17, code: 'SLIDE_17_U_FULL', shortLabel: '17 · У (100%)', labelRu: 'Базовая узкая гласная «У / Ю» (100%)', category: 'base', mappedViseme: 'U', openY: 0.46, form: -0.70, bgPosition: pos32(17) },
  { index: 18, code: 'SLIDE_18_U_M_25', shortLabel: '18 · У→М 25%', labelRu: 'Начало выхода из «У» (25%)', category: 'inbetween', mappedViseme: 'U', openY: 0.36, form: -0.45, bgPosition: pos32(18) },
  { index: 19, code: 'SLIDE_19_U_M_50', shortLabel: '19 · У→М 50%', labelRu: 'Мягкое прикрытие из «У» (50%)', category: 'inbetween', mappedViseme: 'U', openY: 0.25, form: -0.15, bgPosition: pos32(19) },
  { index: 20, code: 'SLIDE_20_U_M_75', shortLabel: '20 · У→М 75%', labelRu: 'Почти сомкнутый выход из «У» (75%)', category: 'inbetween', mappedViseme: 'SILENT', openY: 0.12, form: 0.15, bgPosition: pos32(20) },
  { index: 21, code: 'SLIDE_21_M_I_25', shortLabel: '21 · М→И 25%', labelRu: 'Начало улыбки к «И» (25%)', category: 'inbetween', mappedViseme: 'I', openY: 0.12, form: 0.55, bgPosition: pos32(21) },
  { index: 22, code: 'SLIDE_22_M_I_50', shortLabel: '22 · М→И 50%', labelRu: 'Мягкая полуулыбка «М → И» (50%)', category: 'inbetween', mappedViseme: 'I', openY: 0.22, form: 0.70, bgPosition: pos32(22) },
  { index: 23, code: 'SLIDE_23_M_I_75', shortLabel: '23 · М→И 75%', labelRu: 'Почти раскрытая улыбка «И» (75%)', category: 'inbetween', mappedViseme: 'I', openY: 0.30, form: 0.84, bgPosition: pos32(23) },
  { index: 24, code: 'SLIDE_24_I_FULL', shortLabel: '24 · И (100%)', labelRu: 'Базовая улыбчивая гласная «И / Й» (100%)', category: 'base', mappedViseme: 'I', openY: 0.38, form: 0.95, bgPosition: pos32(24) },
  { index: 25, code: 'SLIDE_25_I_E_35', shortLabel: '25 · И→Э 35%', labelRu: 'Начало перехода «И → Э» (35%)', category: 'inbetween', mappedViseme: 'I', openY: 0.46, form: 0.88, bgPosition: pos32(25) },
  { index: 26, code: 'SLIDE_26_I_E_70', shortLabel: '26 · И→Э 70%', labelRu: 'Плавное расширение «И → Э» (70%)', category: 'inbetween', mappedViseme: 'E', openY: 0.55, form: 0.81, bgPosition: pos32(26) },
  { index: 27, code: 'SLIDE_27_E_FULL', shortLabel: '27 · Э (100%)', labelRu: 'Базовая средняя гласная «Э / Е / Ы» (100%)', category: 'base', mappedViseme: 'E', openY: 0.62, form: 0.75, bgPosition: pos32(27) },
  { index: 28, code: 'SLIDE_28_E_A_35', shortLabel: '28 · Э→А 35%', labelRu: 'Плавный подъём «Э → А» (35%)', category: 'inbetween', mappedViseme: 'E', openY: 0.72, form: 0.70, bgPosition: pos32(28) },
  { index: 29, code: 'SLIDE_29_E_A_70', shortLabel: '29 · Э→А 70%', labelRu: 'Широкий переход «Э → А» (70%)', category: 'inbetween', mappedViseme: 'A', openY: 0.82, form: 0.66, bgPosition: pos32(29) },
  { index: 30, code: 'SLIDE_30_I_O_50', shortLabel: '30 · И↔О 50%', labelRu: 'Плавный мост «И ↔ О» без скачка ширины', category: 'bridge', mappedViseme: 'E', openY: 0.56, form: 0.22, bgPosition: pos32(30) },
  { index: 31, code: 'SLIDE_31_E_O_50', shortLabel: '31 · Э↔О 50%', labelRu: 'Плавный мост «Э ↔ О» без скачка ширины', category: 'bridge', mappedViseme: 'O', openY: 0.70, form: 0.14, bgPosition: pos32(31) }
];

export const CUTOUT_VISEME_SLIDES_48: CutoutVisemeSlideSpec[] = [
  ...CUTOUT_VISEME_SLIDES_32.map((s) => ({ ...s, bgPosition: pos48(s.index) })),
  { index: 32, code: 'SLIDE_32_M_A_08', shortLabel: '32 · М→А 8%', labelRu: 'Сверхмягкое микро-касание губ (8%)', category: 'inbetween', mappedViseme: 'SILENT', openY: 0.08, form: 0.42, bgPosition: pos48(32) },
  { index: 33, code: 'SLIDE_33_M_A_22', shortLabel: '33 · М→А 22%', labelRu: 'Тонкая промежуточная фаза раскрытия (22%)', category: 'inbetween', mappedViseme: 'E', openY: 0.21, form: 0.46, bgPosition: pos48(33) },
  { index: 34, code: 'SLIDE_34_M_A_38', shortLabel: '34 · М→А 38%', labelRu: 'Плавная четверть раскрытия (38%)', category: 'inbetween', mappedViseme: 'E', openY: 0.35, form: 0.50, bgPosition: pos48(34) },
  { index: 35, code: 'SLIDE_35_M_A_52', shortLabel: '35 · М→А 52%', labelRu: 'Экватор раскрытия рта с нижней губой (52%)', category: 'inbetween', mappedViseme: 'E', openY: 0.49, form: 0.54, bgPosition: pos48(35) },
  { index: 36, code: 'SLIDE_36_M_A_68', shortLabel: '36 · М→А 68%', labelRu: 'Тёплое разговорное раскрытие (68%)', category: 'inbetween', mappedViseme: 'A', openY: 0.63, form: 0.57, bgPosition: pos48(36) },
  { index: 37, code: 'SLIDE_37_M_A_84', shortLabel: '37 · М→А 84%', labelRu: 'Выразительный пред-пик «А» (84%)', category: 'inbetween', mappedViseme: 'A', openY: 0.76, form: 0.59, bgPosition: pos48(37) },
  { index: 38, code: 'SLIDE_38_A_O_30', shortLabel: '38 · А→О 30%', labelRu: 'Мягкое скругление уголков «А → О» (30%)', category: 'inbetween', mappedViseme: 'O', openY: 0.87, form: 0.29, bgPosition: pos48(38) },
  { index: 39, code: 'SLIDE_39_A_O_70', shortLabel: '39 · А→О 70%', labelRu: 'Глубокое скругление «А → О» (70%)', category: 'inbetween', mappedViseme: 'O', openY: 0.81, form: -0.16, bgPosition: pos48(39) },
  { index: 40, code: 'SLIDE_40_O_U_30', shortLabel: '40 · О→У 30%', labelRu: 'Плавная фаза сужения «О → У» (30%)', category: 'inbetween', mappedViseme: 'O', openY: 0.68, form: -0.52, bgPosition: pos48(40) },
  { index: 41, code: 'SLIDE_41_O_U_70', shortLabel: '41 · О→У 70%', labelRu: 'Мягкий переход к узкому «У» (70%)', category: 'inbetween', mappedViseme: 'U', openY: 0.55, form: -0.63, bgPosition: pos48(41) },
  { index: 42, code: 'SLIDE_42_M_I_38', shortLabel: '42 · М→И 38%', labelRu: 'Плавная улыбка «М → И» (38%)', category: 'inbetween', mappedViseme: 'I', openY: 0.17, form: 0.63, bgPosition: pos48(42) },
  { index: 43, code: 'SLIDE_43_M_I_62', shortLabel: '43 · М→И 62%', labelRu: 'Открывающаяся улыбка «М → И» (62%)', category: 'inbetween', mappedViseme: 'I', openY: 0.26, form: 0.77, bgPosition: pos48(43) },
  { index: 44, code: 'SLIDE_44_I_E_50', shortLabel: '44 · И→Э 50%', labelRu: 'Точный центр перехода «И → Э» (50%)', category: 'inbetween', mappedViseme: 'E', openY: 0.50, form: 0.84, bgPosition: pos48(44) },
  { index: 45, code: 'SLIDE_45_E_A_50', shortLabel: '45 · Э→А 50%', labelRu: 'Точный центр перехода «Э → А» (50%)', category: 'inbetween', mappedViseme: 'A', openY: 0.77, form: 0.68, bgPosition: pos48(45) },
  { index: 46, code: 'SLIDE_46_SMILE_WARM', shortLabel: '46 · Улыбка', labelRu: 'Тёплая живая полуулыбка на паузе', category: 'bridge', mappedViseme: 'SILENT', openY: 0.04, form: 0.58, bgPosition: pos48(46) },
  { index: 47, code: 'SLIDE_47_MBP_SOFT', shortLabel: '47 · М/Б/П', labelRu: 'Естественное смыкание губ на М / Б / П', category: 'bridge', mappedViseme: 'SILENT', openY: 0.01, form: 0.25, bgPosition: pos48(47) }
];

// Keep backwards-compatible export alias so existing imports work seamlessly
export const CUTOUT_VISEME_SLIDES_18 = CUTOUT_VISEME_SLIDES_32;

export const BASE_VISEME_TO_SLIDE_INDEX: Record<AnimeVisemeKey, number> = {
  SILENT: 0,
  A: 7,
  O: 12,
  U: 17,
  I: 24,
  E: 27
};

export function findClosestSlide32(mouthOpenY: number, mouthForm: number): CutoutVisemeSlideSpec {
  let best = CUTOUT_VISEME_SLIDES_32[0];
  let bestDist = Infinity;
  for (const slide of CUTOUT_VISEME_SLIDES_32) {
    const dy = (slide.openY - mouthOpenY) * 1.35;
    const df = (slide.form - mouthForm) * 0.55;
    const dist = dy * dy + df * df;
    if (dist < bestDist) {
      bestDist = dist;
      best = slide;
    }
  }
  return best;
}

export function findClosestSlide48(mouthOpenY: number, mouthForm: number): CutoutVisemeSlideSpec {
  let best = CUTOUT_VISEME_SLIDES_48[0];
  let bestDist = Infinity;
  for (const slide of CUTOUT_VISEME_SLIDES_48) {
    const dy = (slide.openY - mouthOpenY) * 1.35;
    const df = (slide.form - mouthForm) * 0.55;
    const dist = dy * dy + df * df;
    if (dist < bestDist) {
      bestDist = dist;
      best = slide;
    }
  }
  return best;
}

export function resolveClosestSlide32(mouthOpenY: number, mouthForm: number): number {
  return findClosestSlide32(mouthOpenY, mouthForm).index;
}

export function resolveClosestSlide48(mouthOpenY: number, mouthForm: number): number {
  return findClosestSlide48(mouthOpenY, mouthForm).index;
}

export interface AnatomicalTransformResult {
  torsoTransform: string;
  headTransform: string;
  leftBrowTransform: string;
  rightBrowTransform: string;
}

export function computeHeadAndBrowTransform(
  params: Live2DParameterState,
  activeEmotion: EmotionPresetId = 'neutral'
): AnatomicalTransformResult {
  const clampedX = clampParameter(params.angleX, -30, 30);
  const clampedY = clampParameter(params.angleY, -30, 30);
  const clampedZ = clampParameter(params.angleZ, -30, 30);
  const clampedBrowY = clampParameter(params.browY, -1, 1);
  const clampedShoulder = clampParameter(params.shoulderY, -1, 1);

  const headOffset = computeParallaxOffset(clampedX, clampedY, 0.55);
  const shoulderOffset = computeParallaxOffset(clampedX, clampedY, 0.18);

  const torsoRotateZ = Number((clampedZ * 0.12).toFixed(2));
  const torsoTranslateX = Number((shoulderOffset.dx * 0.3).toFixed(2));
  const torsoTranslateY = Number((-clampedShoulder * 2.2).toFixed(2));
  const torsoScaleY = Number((1 + clampedShoulder * 0.012).toFixed(3));

  const headRotateY = Number((clampedX * 0.45).toFixed(2));
  const headRotateX = Number((-clampedY * 0.38).toFixed(2));
  const headRotateZ = Number((clampedZ * 0.72).toFixed(2));
  const headTranslateX = Number((headOffset.dx * 0.4 + clampedZ * 0.18).toFixed(2));
  const headTranslateY = Number((headOffset.dy * 0.4 - clampedShoulder * 1.8).toFixed(2));

  const asymLeft = activeEmotion === 'thinking' ? -0.12 : activeEmotion === 'wink' ? 0.10 : 0;
  const asymRight = activeEmotion === 'thinking' ? 0.15 : activeEmotion === 'wink' ? -0.12 : 0;

  const leftBrowDy = Number((-(clampedBrowY + asymLeft) * 3.4).toFixed(2));
  const rightBrowDy = Number((-(clampedBrowY + asymRight) * 3.4).toFixed(2));
  const leftBrowRot = Number((-(clampedBrowY + asymLeft) * 3.6).toFixed(2));
  const rightBrowRot = Number(((clampedBrowY + asymRight) * 3.6).toFixed(2));

  return {
    torsoTransform: `translate(${torsoTranslateX}px, ${torsoTranslateY}px) rotateZ(${torsoRotateZ}deg) scaleY(${torsoScaleY})`,
    headTransform: `perspective(680px) translate(${headTranslateX}px, ${headTranslateY}px) rotateY(${headRotateY}deg) rotateX(${headRotateX}deg) rotateZ(${headRotateZ}deg)`,
    leftBrowTransform: `translateY(${leftBrowDy}px) rotate(${leftBrowRot}deg)`,
    rightBrowTransform: `translateY(${rightBrowDy}px) rotate(${rightBrowRot}deg)`
  };
}

/**
 * Pure 2D ArtMesh Warp Deformer function (Live2D Cubism style).
 * Deforms normalized UV coordinates (u, v) in [0..1]^2 of the intact character sheet so that:
 * 1) Head tilts smoothly around the cervical neck pivot (0.50, 0.72) while shoulders (v >= 0.86) stay grounded.
 * 2) Native eyebrows at v ≈ 0.406 smoothly raise/lower/arch with a restrained, natural amplitude (max ~2.6px) so she never looks crazy or distorted.
 * 3) Gentle breathing subtly expands the chest/collarbones (0.72 < v < 0.96) without any chest holes or layer seams.
 */
export function computeMeshVertexDeformation(
  u: number,
  v: number,
  params: Live2DParameterState,
  activeEmotion: EmotionPresetId = 'neutral',
  canvasSize = 640
): { x: number; y: number } {
  const angleX = clampParameter(params.angleX, -30, 30);
  const angleY = clampParameter(params.angleY, -30, 30);
  const angleZ = clampParameter(params.angleZ, -30, 30);
  const browY = clampParameter(params.browY, -1, 1);
  const shoulderY = clampParameter(params.shoulderY, -1, 1);

  // 1. Quintic smoothstep head weight: 1.0 above neck (v <= 0.65), 0.0 at grounded shoulders (v >= 0.86)
  let headWeight = 0;
  if (v <= 0.65) {
    headWeight = 1.0;
  } else if (v < 0.86) {
    const t = (0.86 - v) / (0.86 - 0.65);
    headWeight = t * t * t * (t * (t * 6 - 15) + 10);
  }

  // Side hair curls (|u - 0.5| > 0.15 and 0.55 < v < 0.88) retain higher head follow + pendulum sway
  const distFromCenterU = Math.abs(u - 0.5);
  if (distFromCenterU > 0.15 && v > 0.55 && v < 0.89) {
    const curlFactor = Math.min(1, (distFromCenterU - 0.15) / 0.12) * Math.sin(((v - 0.55) / 0.34) * Math.PI);
    headWeight = Math.max(headWeight, curlFactor * 0.78);
  }

  // Cervical neck pivot at (0.50, 0.72)
  const pivotU = 0.50;
  const pivotV = 0.72;
  const radZ = ((angleZ * 0.72 * headWeight) * Math.PI) / 180;
  const cosZ = Math.cos(radZ);
  const sinZ = Math.sin(radZ);

  let du = u - pivotU;
  let dv = v - pivotV;

  // Apply 2.5D faux-perspective foreshortening on head X/Y turn
  const turnXNorm = (angleX / 30) * headWeight;
  const turnYNorm = (-angleY / 30) * headWeight;
  const perspectiveScaleX = 1.0 - Math.abs(turnXNorm) * 0.022 + (u - 0.5) * turnXNorm * 0.05;
  du *= perspectiveScaleX;

  // Rotate around neck pivot
  let warpedU = pivotU + (du * cosZ - dv * sinZ);
  let warpedV = pivotV + (du * sinZ + dv * cosZ);

  // Head parallax translation
  warpedU += turnXNorm * 0.022;
  warpedV += turnYNorm * 0.016;

  // Secondary hair curl pendulum sway
  if (distFromCenterU > 0.16 && v > 0.48 && v < 0.88) {
    const sway = ((v - 0.48) / 0.40) * (1 - Math.max(0, (v - 0.78) / 0.10));
    warpedU += (angleZ * 0.00042 - angleX * 0.00032) * sway;
  }

  // 2. Restrained, Natural Eyebrow Warp Field (strictly in v ∈ [0.35..0.442], never touching eyes at v >= 0.448!)
  if (v > 0.35 && v < 0.442) {
    const presetBrow = EMOTION_PRESETS[activeEmotion]?.params.browY ?? 0;
    const rawEffective = clampParameter(browY - presetBrow * 0.3, -1.0, 1.0);
    // Soft knee compression for positive browY so +0.85..+1.0 never stretches the forehead crazily
    const effectiveBrow =
      rawEffective > 0
        ? Math.tanh(rawEffective * 1.15) * 0.78
        : Math.tanh(rawEffective * 1.1) * 0.85;

    const vNorm = v < 0.404 ? (v - 0.35) / (0.404 - 0.35) : (0.442 - v) / (0.442 - 0.404);
    const vBell = Math.sin(Math.max(0, Math.min(1, vNorm)) * (Math.PI / 2));
    const vWeight = vBell * vBell;

    const dxL = (u - 0.368) / 0.092;
    const dxR = (u - 0.632) / 0.092;
    const wL = Math.abs(dxL) < 1 ? Math.pow(1 - dxL * dxL, 2) : 0;
    const wR = Math.abs(dxR) < 1 ? Math.pow(1 - dxR * dxR, 2) : 0;

    // Gentle arch profile without inner-brow spiking
    const innerArchL = 1 + (u - 0.368) * 0.65 * (effectiveBrow < 0 ? 1.1 : 0.45);
    const innerArchR = 1 + (0.632 - u) * 0.65 * (effectiveBrow < 0 ? 1.1 : 0.45);

    const browShiftV = -effectiveBrow * 0.0092 * vWeight * (wL * innerArchL + wR * innerArchR);
    const browPinchU =
      effectiveBrow < 0
        ? Math.abs(effectiveBrow) * 0.0032 * vWeight * (wL - wR)
        : 0;

    warpedV += browShiftV;
    warpedU += browPinchU;
  }

  // 3. Gentle Organic Chest/Shoulder Breathing (0.68 < v < 0.98, pinned at v=1.0)
  if (v > 0.68 && v < 0.98) {
    const bNorm = Math.sin(((v - 0.68) / 0.30) * Math.PI);
    const bWeight = bNorm * bNorm;
    warpedV -= shoulderY * 0.0052 * bWeight;
    warpedU += (u - 0.5) * shoulderY * 0.0055 * bWeight;
  }

  return {
    x: Number((warpedU * canvasSize).toFixed(2)),
    y: Number((warpedV * canvasSize).toFixed(2))
  };
}

export function resolveIntermediateSlideBridge(
  fromSlide: number,
  toSlide: number,
  use48 = false
): number[] {
  if (fromSlide === toSlide) return [];

  // Dense 48-slide progressive ladders (with ultra-fine half-steps 32..47) vs 32-slide ladders
  const LADDERS_48: number[][] = [
    [0, 32, 1, 33, 2, 34, 3, 35, 4, 36, 5, 37, 6, 7], // M <-> A (14 ultra-smooth steps!)
    [7, 8, 38, 9, 10, 39, 11, 12],                    // A <-> O (8 steps)
    [12, 13, 40, 14, 15, 41, 16, 17],                 // O <-> U (8 steps)
    [17, 18, 19, 20, 32, 0],                          // U <-> M (6 steps)
    [0, 32, 21, 42, 22, 43, 23, 24],                  // M <-> I (8 steps)
    [24, 25, 44, 26, 27, 28, 45, 29, 7],              // I <-> E <-> A (9 steps)
    [24, 25, 30, 39, 11, 12],                         // I <-> O smooth bridge
    [27, 31, 39, 11, 12],                             // E <-> O smooth bridge
    [24, 43, 22, 20, 19, 18, 17],                     // I <-> U smooth bridge
    [27, 44, 30, 40, 15, 17]                          // E <-> U smooth bridge
  ];

  const LADDERS_32: number[][] = [
    [0, 1, 2, 3, 4, 5, 6, 7],       // M <-> A (8 steps)
    [7, 8, 9, 10, 11, 12],          // A <-> O (6 steps)
    [12, 13, 14, 15, 16, 17],       // O <-> U (6 steps)
    [17, 18, 19, 20, 0],            // U <-> M (5 steps)
    [0, 21, 22, 23, 24],            // M <-> I (5 steps)
    [24, 25, 26, 27, 28, 29, 7],    // I <-> E <-> A (7 steps)
    [24, 25, 30, 11, 12],           // I <-> O smooth bridge
    [27, 31, 11, 12],               // E <-> O smooth bridge
    [24, 23, 20, 19, 17],           // I <-> U smooth bridge
    [27, 26, 30, 14, 17]            // E <-> U smooth bridge
  ];

  const ladders = use48 ? LADDERS_48 : LADDERS_32;

  for (const ladder of ladders) {
    const idxA = ladder.indexOf(fromSlide);
    const idxB = ladder.indexOf(toSlide);
    if (idxA !== -1 && idxB !== -1) {
      if (idxA < idxB) {
        return ladder.slice(idxA + 1, idxB);
      } else {
        return ladder.slice(idxB + 1, idxA).reverse();
      }
    }
  }

  const catalog = use48 ? CUTOUT_VISEME_SLIDES_48 : CUTOUT_VISEME_SLIDES_32;
  const specA = catalog[fromSlide] ?? catalog[0];
  const specB = catalog[toSlide] ?? catalog[0];
  const bridges: number[] = [];
  const fracs = use48 ? [0.2, 0.4, 0.6, 0.8] : [0.25, 0.5, 0.75];
  for (const frac of fracs) {
    const midOpen = specA.openY + (specB.openY - specA.openY) * frac;
    const midForm = specA.form + (specB.form - specA.form) * frac;
    const closest = (use48 ? findClosestSlide48(midOpen, midForm) : findClosestSlide32(midOpen, midForm)).index;
    if (
      closest !== fromSlide &&
      closest !== toSlide &&
      bridges[bridges.length - 1] !== closest
    ) {
      bridges.push(closest);
    }
  }
  return bridges;
}

export interface SilentPerformanceKeyframe {
  timeMs: number;
  slideIndex: number;
  charIndex: number;
  angleX: number;
  angleY: number;
  angleZ: number;
  browY: number;
  shoulderY: number;
  mouthOpenY: number;
  mouthForm: number;
  jawScaleX: number;
  jawScaleY: number;
  eyeOpen: number;
  eyeSmile: number;
  gazeX: number;
  gazeY: number;
  cheekBlush: number;
  emotion: EmotionPresetId;
}

export interface SilentPhrasePerformance {
  phrase: string;
  detectedEmotion: EmotionPresetId;
  totalDurationMs: number;
  uniqueSlidesUsed: number[];
  keyframes: SilentPerformanceKeyframe[];
}

function classifyPhonemeToken(ch: string): {
  kind: 'vowel' | 'bilabial' | 'consonant' | 'pause' | 'space';
  targetSlide: number;
  openY: number;
  form: number;
  durationMs: number;
} {
  const c = ch.toLowerCase();
  if ('аяa'.includes(c)) return { kind: 'vowel', targetSlide: 7, openY: 0.88, form: 0.62, durationMs: 140 };
  if ('оёo'.includes(c)) return { kind: 'vowel', targetSlide: 12, openY: 0.76, form: -0.40, durationMs: 135 };
  if ('уюu'.includes(c)) return { kind: 'vowel', targetSlide: 17, openY: 0.46, form: -0.66, durationMs: 130 };
  if ('ийi'.includes(c)) return { kind: 'vowel', targetSlide: 24, openY: 0.38, form: 0.90, durationMs: 125 };
  if ('эеыe'.includes(c)) return { kind: 'vowel', targetSlide: 27, openY: 0.60, form: 0.74, durationMs: 130 };
  if ('мбпmbp'.includes(c)) return { kind: 'bilabial', targetSlide: 47, openY: 0.01, form: 0.28, durationMs: 88 };
  if (',;:-—'.includes(c)) return { kind: 'pause', targetSlide: 46, openY: 0.04, form: 0.52, durationMs: 165 };
  if ('.!?'.includes(c)) return { kind: 'pause', targetSlide: 0, openY: 0.02, form: 0.42, durationMs: 210 };
  if (c === ' ') return { kind: 'space', targetSlide: 32, openY: 0.14, form: 0.44, durationMs: 68 };
  // Non-labial consonants coarticulate softly without snapping mouthForm!
  return { kind: 'consonant', targetSlide: 34, openY: 0.32, form: 0.48, durationMs: 72 };
}

export function compilePhraseToSilentPerformance(
  rawPhrase: string,
  fallbackEmotion: EmotionPresetId = 'neutral'
): SilentPhrasePerformance {
  const phrase = rawPhrase.trim() || 'Привет! Я Алиса, твой голосовой ассистент.';
  const lower = phrase.toLowerCase();
  const hasQuestion = phrase.includes('?');
  const hasExclamation = phrase.includes('!');
  const hasEllipsis = phrase.includes('...');
  const hasAstonishment = /(ого|вау|неужели|ничего себе|вот это да)/i.test(lower);

  // Questions use a warm, curious, friendly face ('neutral' or 'joy') instead of a wide-eyed 'surprise' stare!
  let detectedEmotion: EmotionPresetId = fallbackEmotion;
  if (hasAstonishment) {
    detectedEmotion = 'surprise';
  } else if (hasQuestion) {
    detectedEmotion = fallbackEmotion === 'joy' ? 'joy' : 'neutral';
  } else if (hasExclamation) {
    detectedEmotion = 'joy';
  } else if (hasEllipsis) {
    detectedEmotion = 'thinking';
  }

  const presetParams = EMOTION_PRESETS[detectedEmotion]?.params ?? EMOTION_PRESETS.neutral.params;
  const presetBaseBrow = presetParams.browY ?? 0;
  const presetEyeOpen = presetParams.eyeOpen ?? 1.0;
  const presetEyeSmile = presetParams.eyeSmile ?? 0.2;
  const presetBlush = presetParams.cheekBlush ?? 0.15;

  interface RawAnchor {
    charIndex: number;
    kind: 'vowel' | 'bilabial' | 'consonant' | 'pause' | 'space';
    openY: number;
    form: number;
    durationMs: number;
  }

  const rawAnchors: RawAnchor[] = [];
  for (let i = 0; i < phrase.length; i++) {
    const ch = phrase[i];
    if ('ьъ"\'()«»'.includes(ch.toLowerCase())) continue;
    if (ch === ' ' && i > 0 && phrase[i - 1] === ' ') continue;
    const tok = classifyPhonemeToken(ch);
    if (
      tok.kind === 'consonant' &&
      rawAnchors.length > 0 &&
      rawAnchors[rawAnchors.length - 1].kind === 'consonant'
    ) {
      rawAnchors[rawAnchors.length - 1].durationMs = Math.min(
        108,
        rawAnchors[rawAnchors.length - 1].durationMs + 24
      );
      continue;
    }
    rawAnchors.push({
      charIndex: i,
      kind: tok.kind,
      openY: tok.openY,
      form: tok.form,
      durationMs: tok.durationMs
    });
  }

  // Coarticulate consonants & spaces: inherit smooth mouthForm from nearest vowels and soft-dip openY
  for (let i = 0; i < rawAnchors.length; i++) {
    const cur = rawAnchors[i];
    if (cur.kind === 'consonant' || cur.kind === 'space') {
      let prevVowelForm = 0.44;
      let prevVowelOpen = 0.34;
      for (let p = i - 1; p >= 0; p--) {
        if (rawAnchors[p].kind === 'vowel') {
          prevVowelForm = rawAnchors[p].form;
          prevVowelOpen = rawAnchors[p].openY;
          break;
        }
      }
      let nextVowelForm = prevVowelForm;
      let nextVowelOpen = prevVowelOpen;
      for (let n = i + 1; n < rawAnchors.length; n++) {
        if (rawAnchors[n].kind === 'vowel') {
          nextVowelForm = rawAnchors[n].form;
          nextVowelOpen = rawAnchors[n].openY;
          break;
        }
      }
      cur.form = Number((0.5 * (prevVowelForm + nextVowelForm)).toFixed(2));
      const avgOpen = 0.5 * (prevVowelOpen + nextVowelOpen);
      cur.openY = Number(
        (cur.kind === 'space' ? Math.min(0.22, avgOpen * 0.40) : Math.max(0.20, avgOpen * 0.56)).toFixed(2)
      );
    }
  }

  const keyframes: SilentPerformanceKeyframe[] = [];
  const usedSlides = new Set<number>([0]);
  let currentTimeMs = 0;
  let prevSlide = 0;

  keyframes.push({
    timeMs: 0,
    slideIndex: 0,
    charIndex: 0,
    angleX: 0,
    angleY: 0,
    angleZ: 0,
    browY: presetBaseBrow,
    shoulderY: 0,
    mouthOpenY: 0.02,
    mouthForm: 0.40,
    jawScaleX: 1.0,
    jawScaleY: 1.0,
    eyeOpen: presetEyeOpen,
    eyeSmile: presetEyeSmile,
    gazeX: 0,
    gazeY: 0,
    cheekBlush: presetBlush,
    emotion: detectedEmotion
  });

  for (let aIdx = 0; aIdx < rawAnchors.length; aIdx++) {
    const anchor = rawAnchors[aIdx];
    const targetSlideSpec = findClosestSlide48(anchor.openY, anchor.form);
    const targetSlide =
      anchor.kind === 'bilabial'
        ? 47
        : anchor.kind === 'pause'
        ? hasQuestion || hasExclamation
          ? 46
          : 0
        : targetSlideSpec.index;

    const bridges = resolveIntermediateSlideBridge(prevSlide, targetSlide, true);
    const progress = anchor.charIndex / Math.max(1, phrase.length - 1);

    // Living, expressive yet natural prosody waves (warm mimicry without craziness)
    const slowWave = Math.sin(progress * Math.PI * 2.2);
    const secWave = Math.cos(progress * Math.PI * 1.6);
    const microNod = anchor.kind === 'vowel' ? Math.sin(aIdx * 0.55) * 2.2 : 0;

    // Gentle inquisitive tilt on questions (+5.8° max), soft sway on statements
    const baseTiltZ = hasQuestion
      ? Number((Math.sin(progress * Math.PI * 0.95) * 5.8 + slowWave * 1.8).toFixed(1))
      : Number((slowWave * 3.8).toFixed(1));
    const baseTurnX = Number((secWave * 3.6 + (hasQuestion ? progress * 2.2 : 0)).toFixed(1));
    const basePitchY = Number((microNod + (hasQuestion ? Math.sin(progress * Math.PI) * 2.0 : -0.5)).toFixed(1));

    // Restrained, charming eyebrow mimicry: max +0.28 on questions (NEVER +0.85 manic stretch!)
    const baseBrowY = hasQuestion
      ? Number(clampParameter(presetBaseBrow + 0.06 + Math.sin(progress * Math.PI * 0.9) * 0.22, -0.45, 0.34).toFixed(2))
      : Number(clampParameter(presetBaseBrow + (anchor.kind === 'vowel' ? 0.07 : 0) + slowWave * 0.05, -0.45, 0.34).toFixed(2));

    const gentleBreath = Number((Math.sin(progress * Math.PI * 2) * 0.07).toFixed(2));

    // Expressive eye & cheek micro-mimicry synchronized with speech
    const dynamicEyeSmile = Number(
      clampParameter(
        presetEyeSmile + (anchor.form > 0.5 ? 0.16 : 0.06) + (hasQuestion ? 0.12 * progress : 0),
        0,
        0.95
      ).toFixed(2)
    );
    const dynamicEyeOpen = Number(
      clampParameter(presetEyeOpen - dynamicEyeSmile * 0.08 + (hasQuestion ? 0.03 * progress : 0), 0.12, 1.03).toFixed(2)
    );
    const dynamicGazeX = Number(clampParameter((baseTurnX / 12) + Math.sin(progress * Math.PI * 3) * 0.22, -0.75, 0.75).toFixed(2));
    const dynamicGazeY = Number(clampParameter((hasQuestion ? 0.22 * progress : 0) + Math.cos(progress * Math.PI * 2) * 0.14, -0.5, 0.5).toFixed(2));
    const dynamicBlush = Number(
      clampParameter(presetBlush + (anchor.openY > 0.6 ? 0.12 : 0.04) + (hasExclamation || hasQuestion ? 0.14 * progress : 0), 0, 0.9).toFixed(2)
    );

    const stepMs = bridges.length > 0 ? Math.max(18, Math.round((anchor.durationMs * 0.62) / bridges.length)) : 0;
    const holdMs = Math.max(30, anchor.durationMs - stepMs * bridges.length);

    for (const bSlide of bridges) {
      currentTimeMs += stepMs;
      usedSlides.add(bSlide);
      const bSpec = CUTOUT_VISEME_SLIDES_48[bSlide] ?? CUTOUT_VISEME_SLIDES_48[0];
      keyframes.push({
        timeMs: currentTimeMs,
        slideIndex: bSlide,
        charIndex: anchor.charIndex,
        angleX: baseTurnX,
        angleY: Number((basePitchY * 0.75).toFixed(1)),
        angleZ: baseTiltZ,
        browY: baseBrowY,
        shoulderY: gentleBreath,
        mouthOpenY: bSpec.openY,
        mouthForm: bSpec.form,
        jawScaleX: 1.0,
        jawScaleY: 1.0,
        eyeOpen: dynamicEyeOpen,
        eyeSmile: dynamicEyeSmile,
        gazeX: dynamicGazeX,
        gazeY: dynamicGazeY,
        cheekBlush: dynamicBlush,
        emotion: detectedEmotion
      });
    }

    currentTimeMs += holdMs;
    usedSlides.add(targetSlide);
    const tSpec = CUTOUT_VISEME_SLIDES_48[targetSlide] ?? CUTOUT_VISEME_SLIDES_48[0];
    keyframes.push({
      timeMs: currentTimeMs,
      slideIndex: targetSlide,
      charIndex: anchor.charIndex,
      angleX: baseTurnX,
      angleY: basePitchY,
      angleZ: baseTiltZ,
      browY: baseBrowY,
      shoulderY: gentleBreath,
      mouthOpenY: tSpec.openY,
      mouthForm: tSpec.form,
      jawScaleX: 1.0,
      jawScaleY: 1.0,
      eyeOpen: dynamicEyeOpen,
      eyeSmile: dynamicEyeSmile,
      gazeX: dynamicGazeX,
      gazeY: dynamicGazeY,
      cheekBlush: dynamicBlush,
      emotion: detectedEmotion
    });

    prevSlide = targetSlide;
  }

  // Smooth multi-step closing ladder back to rest (0)
  const closingBridges = resolveIntermediateSlideBridge(prevSlide, 0, true);
  for (const cSlide of closingBridges) {
    currentTimeMs += 26;
    usedSlides.add(cSlide);
    const cSpec = CUTOUT_VISEME_SLIDES_48[cSlide] ?? CUTOUT_VISEME_SLIDES_48[0];
    keyframes.push({
      timeMs: currentTimeMs,
      slideIndex: cSlide,
      charIndex: Math.max(0, phrase.length - 1),
      angleX: 0,
      angleY: 0,
      angleZ: hasQuestion ? 3.5 : 0,
      browY: hasQuestion ? Number((presetBaseBrow + 0.14).toFixed(2)) : presetBaseBrow,
      shoulderY: 0.02,
      mouthOpenY: cSpec.openY,
      mouthForm: cSpec.form,
      jawScaleX: 1.0,
      jawScaleY: 1.0,
      eyeOpen: presetEyeOpen,
      eyeSmile: Number(clampParameter(presetEyeSmile + 0.1, 0, 0.9).toFixed(2)),
      gazeX: 0,
      gazeY: 0,
      cheekBlush: presetBlush,
      emotion: detectedEmotion
    });
  }

  currentTimeMs += 90;
  keyframes.push({
    timeMs: currentTimeMs,
    slideIndex: 0,
    charIndex: Math.max(0, phrase.length - 1),
    angleX: 0,
    angleY: 0,
    angleZ: 0,
    browY: EMOTION_PRESETS[fallbackEmotion]?.params.browY ?? 0,
    shoulderY: 0,
    mouthOpenY: 0.02,
    mouthForm: 0.40,
    jawScaleX: 1.0,
    jawScaleY: 1.0,
    eyeOpen: EMOTION_PRESETS[fallbackEmotion]?.params.eyeOpen ?? 1.0,
    eyeSmile: EMOTION_PRESETS[fallbackEmotion]?.params.eyeSmile ?? 0.18,
    gazeX: 0,
    gazeY: 0,
    cheekBlush: EMOTION_PRESETS[fallbackEmotion]?.params.cheekBlush ?? 0.12,
    emotion: fallbackEmotion
  });

  // 3-pass temporal Gaussian smoothing over mouthForm, angleX/Y/Z, browY, and eye mimicry
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 1; i < keyframes.length - 1; i++) {
      const prev = keyframes[i - 1];
      const cur = keyframes[i];
      const next = keyframes[i + 1];
      cur.mouthForm = Number((0.25 * prev.mouthForm + 0.5 * cur.mouthForm + 0.25 * next.mouthForm).toFixed(3));
      cur.angleX = Number((0.25 * prev.angleX + 0.5 * cur.angleX + 0.25 * next.angleX).toFixed(2));
      cur.angleY = Number((0.25 * prev.angleY + 0.5 * cur.angleY + 0.25 * next.angleY).toFixed(2));
      cur.angleZ = Number((0.25 * prev.angleZ + 0.5 * cur.angleZ + 0.25 * next.angleZ).toFixed(2));
      cur.browY = Number((0.25 * prev.browY + 0.5 * cur.browY + 0.25 * next.browY).toFixed(3));
      cur.eyeSmile = Number((0.25 * prev.eyeSmile + 0.5 * cur.eyeSmile + 0.25 * next.eyeSmile).toFixed(3));
      cur.gazeX = Number((0.25 * prev.gazeX + 0.5 * cur.gazeX + 0.25 * next.gazeX).toFixed(3));
      cur.gazeY = Number((0.25 * prev.gazeY + 0.5 * cur.gazeY + 0.25 * next.gazeY).toFixed(3));
      if (cur.slideIndex !== 0 && cur.slideIndex !== 47) {
        cur.mouthOpenY = Number((0.22 * prev.mouthOpenY + 0.56 * cur.mouthOpenY + 0.22 * next.mouthOpenY).toFixed(3));
        const matched = findClosestSlide48(cur.mouthOpenY, cur.mouthForm);
        cur.slideIndex = matched.index;
        usedSlides.add(matched.index);
      }
    }
  }

  return {
    phrase,
    detectedEmotion,
    totalDurationMs: currentTimeMs,
    uniqueSlidesUsed: Array.from(usedSlides).sort((a, b) => a - b),
    keyframes
  };
}

export interface SampledRigFrame {
  primarySlideIndex: number;
  secondarySlideIndex: number;
  slideBlend: number;
  charIndex: number;
  angleX: number;
  angleY: number;
  angleZ: number;
  browY: number;
  shoulderY: number;
  mouthOpenY: number;
  mouthForm: number;
  jawScaleX: number;
  jawScaleY: number;
  eyeOpen: number;
  eyeSmile: number;
  gazeX: number;
  gazeY: number;
  cheekBlush: number;
  progress: number;
}

export function samplePerformanceAtTime(
  performance: SilentPhrasePerformance,
  elapsedMs: number
): SampledRigFrame {
  const { keyframes, totalDurationMs } = performance;
  if (keyframes.length === 0) {
    return {
      primarySlideIndex: 0,
      secondarySlideIndex: 0,
      slideBlend: 0,
      charIndex: 0,
      angleX: 0,
      angleY: 0,
      angleZ: 0,
      browY: 0,
      shoulderY: 0,
      mouthOpenY: 0.02,
      mouthForm: 0.4,
      jawScaleX: 1,
      jawScaleY: 1,
      eyeOpen: 1,
      eyeSmile: 0.18,
      gazeX: 0,
      gazeY: 0,
      cheekBlush: 0.12,
      progress: 1
    };
  }

  const clampedTime = clampParameter(elapsedMs, 0, totalDurationMs);
  let idx = 0;
  while (idx < keyframes.length - 2 && keyframes[idx + 1].timeMs <= clampedTime) {
    idx += 1;
  }

  const kfA = keyframes[idx];
  const kfB = keyframes[Math.min(keyframes.length - 1, idx + 1)];
  const span = Math.max(1, kfB.timeMs - kfA.timeMs);
  const rawT = clampParameter((clampedTime - kfA.timeMs) / span, 0, 1);
  // C2 Quintic smoothstep interpolation (6t^5 - 15t^4 + 10t^3): zero velocity & zero acceleration jumps!
  const t = rawT * rawT * rawT * (rawT * (rawT * 6 - 15) + 10);

  const lerp = (a: number, b: number) => a + (b - a) * t;

  const smoothOpenY = Number(lerp(kfA.mouthOpenY, kfB.mouthOpenY).toFixed(3));
  const smoothForm = Number(lerp(kfA.mouthForm, kfB.mouthForm).toFixed(3));

  return {
    primarySlideIndex: kfA.slideIndex,
    secondarySlideIndex: kfB.slideIndex,
    slideBlend: Number(t.toFixed(3)),
    charIndex: t < 0.5 ? kfA.charIndex : kfB.charIndex,
    angleX: Number(lerp(kfA.angleX, kfB.angleX).toFixed(1)),
    angleY: Number(lerp(kfA.angleY, kfB.angleY).toFixed(1)),
    angleZ: Number(lerp(kfA.angleZ, kfB.angleZ).toFixed(1)),
    browY: Number(lerp(kfA.browY, kfB.browY).toFixed(2)),
    shoulderY: Number(lerp(kfA.shoulderY, kfB.shoulderY).toFixed(2)),
    mouthOpenY: smoothOpenY,
    mouthForm: smoothForm,
    jawScaleX: 1.0,
    jawScaleY: 1.0,
    eyeOpen: Number(lerp(kfA.eyeOpen ?? 1, kfB.eyeOpen ?? 1).toFixed(2)),
    eyeSmile: Number(lerp(kfA.eyeSmile ?? 0.18, kfB.eyeSmile ?? 0.18).toFixed(2)),
    gazeX: Number(lerp(kfA.gazeX ?? 0, kfB.gazeX ?? 0).toFixed(2)),
    gazeY: Number(lerp(kfA.gazeY ?? 0, kfB.gazeY ?? 0).toFixed(2)),
    cheekBlush: Number(lerp(kfA.cheekBlush ?? 0.12, kfB.cheekBlush ?? 0.12).toFixed(2)),
    progress: totalDurationMs > 0 ? Number((clampedTime / totalDurationMs).toFixed(3)) : 1
  };
}

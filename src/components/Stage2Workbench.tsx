import React, { useState } from 'react';
import {
  STAGE2_IMAGES,
  TURNAROUND_SPECS,
  STAGE2_EXPRESSIONS,
  MATERIAL_REFERENCES,
  VISEME_CHART
} from '../data/stage2Data';
import { generateStage2ApprovalSummary } from '../utils/conceptLogic';
import {
  ZoomIn,
  Check,
  Copy,
  Eye,
  Smile,
  Layers,
  Palette,
  ArrowRight,
  Lock,
  Sparkles
} from 'lucide-react';

interface Stage2WorkbenchProps {
  onOpenLightbox: (title: string, subtitle: string, imagePath: string) => void;
}

const STAGE2_DELIVERABLES = [
  '1. Разворот модели по плечи без нимба (0° Спереди / 30° Три четверти / 90° Профиль)',
  '2. Лист выражений лица (9 эмоций для .exp3.json: Neutral, Joy, Laugh, Sad, Surprise, Angry, Thinking, Wink, Embarrassed)',
  '3. Карта цветов, шейдинга и фактур (Волосы, Кожа, Радужка, Водолазка, Кардиган, Светящийся ИИ-кант)',
  '4. Анатомические крупные планы под нарезку (Слои глаза, 6 висем рта A/I/U/E/O/M и жесты кистей рук)'
];

export const Stage2Workbench: React.FC<Stage2WorkbenchProps> = ({ onOpenLightbox }) => {
  const [selectedExpressionId, setSelectedExpressionId] = useState<string>('joy');
  const [selectedVisemeIndex, setSelectedVisemeIndex] = useState<number>(1);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [approvedItems, setApprovedItems] = useState<string[]>(STAGE2_DELIVERABLES);
  const [stage3Notes, setStage3Notes] = useState<string>('');
  const [isStage2Confirmed, setIsStage2Confirmed] = useState<boolean>(false);
  const [copiedBrief, setCopiedBrief] = useState<boolean>(false);

  const activeExpression =
    STAGE2_EXPRESSIONS.find((e) => e.id === selectedExpressionId) ?? STAGE2_EXPRESSIONS[0];
  const activeViseme = VISEME_CHART[selectedVisemeIndex] ?? VISEME_CHART[0];

  const handleCopyHex = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
    } catch {
      // ignore clipboard errors in sandbox
    }
    setCopiedHex(hex);
    window.setTimeout(() => setCopiedHex(null), 1500);
  };

  const toggleDeliverable = (item: string) => {
    setApprovedItems((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
    setIsStage2Confirmed(false);
  };

  const stage2Brief = generateStage2ApprovalSummary(approvedItems, stage3Notes);

  const handleCopyStage2Brief = async () => {
    try {
      await navigator.clipboard.writeText(stage2Brief);
    } catch {
      // ignore
    }
    setCopiedBrief(true);
    window.setTimeout(() => setCopiedBrief(false), 1800);
  };

  return (
    <div className="space-y-12">
      {/* SECTION 2.1: Turnaround Reference Sheet (0°, 30° 3/4, 90° Profile) — Bust-Up with Shoulders, NO Halo */}
      <section id="stage2-turnaround" className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <div className="text-xs text-slate-500 mb-1">
              Этап 2.1 · Утверждённые правки: Нимб убран · Кадрирование по грудь вместе с плечами (Bust-Up)
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              1. Финальный разворот модели: Спереди (0°), Три четверти (30°) и Профиль (90°)
            </h2>
          </div>
          <button
            type="button"
            onClick={() =>
              onOpenLightbox(
                'Финальный разворот Алисы AI (0° / 30° / 90°)',
                'Концепт №1 (Доработанный): портрет по грудь с плечами, без нимба',
                STAGE2_IMAGES.turnaroundBust
              )
            }
            className="px-3.5 py-2 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 self-start"
          >
            <ZoomIn className="w-3.5 h-3.5" />
            <span>Открыть разворот в полном размере</span>
          </button>
        </div>

        <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
          <img
            src={STAGE2_IMAGES.turnaroundBust}
            alt="Алиса AI — Разворот модели по грудь с плечами без нимба (прозрачный вырезанный фон): вид спереди 0°, три четверти 30° и профиль 90°"
            referrerPolicy="no-referrer"
            className="w-full h-auto object-contain max-h-[540px] mx-auto"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TURNAROUND_SPECS.map((spec, idx) => (
            <div
              key={spec.id}
              className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3"
            >
              <div className="text-xs font-mono text-violet-700 tabular-nums">
                РАКУРС 0{idx + 1} · {spec.angleRange}
              </div>
              <h3 className="text-base font-bold text-slate-900">{spec.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{spec.description}</p>
              <ul className="space-y-1.5 text-xs text-slate-700 list-disc pl-4 pt-1 border-t border-slate-200">
                {spec.riggingNotes.map((note, nIdx) => (
                  <li key={nIdx}>{note}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 2.2: 9 Facial Expressions Sheet & Interactive Parameter Inspector */}
      <section id="stage2-expressions" className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <div className="text-xs text-slate-500 mb-1">
              Этап 2.2 · Лист эмоций (9 ключевых состояний вместо минимальных 8 · Вырезанный прозрачный Alpha PNG)
            </div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Smile className="w-6 h-6 text-violet-600" />
              <span>2. Лист выражений лица «Алиса AI» (9 эмоций по плечи, без нимба, без белого фона)</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={() =>
              onOpenLightbox(
                'Лист выражений лица Алисы AI (9 эмоций)',
                'Neutral, Joy, Laugh, Sad, Surprise, Angry/Pout, Thinking, Wink, Embarrassed',
                STAGE2_IMAGES.expressionsSheet
              )
            }
            className="px-3.5 py-2 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 self-start"
          >
            <ZoomIn className="w-3.5 h-3.5" />
            <span>Увеличить сетку 9 эмоций</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: 3x3 Expression Sheet Image */}
          <div className="lg:col-span-6 space-y-3">
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
              <img
                src={STAGE2_IMAGES.expressionsSheet}
                alt="Лист из 9 эмоций Алисы AI по плечи без нимба (прозрачный фон)"
                referrerPolicy="no-referrer"
                className="w-full h-auto object-contain aspect-square"
              />
            </div>
            <div className="text-xs text-slate-500 text-center">
              Сетка 3×3: 1. Neutral · 2. Joy · 3. Laugh · 4. Sad · 5. Surprise · 6. Angry/Pout · 7. Thinking · 8. Playful Wink · 9. Embarrassed
            </div>
          </div>

          {/* Right: Interactive Expression Breakdown & Cubism Parameter Values */}
          <div className="lg:col-span-6 space-y-5">
            <div>
              <div className="text-xs font-semibold text-slate-700 mb-2">
                Выберите эмоцию для просмотра мимической формулы (.exp3.json):
              </div>
              <div className="grid grid-cols-3 gap-2">
                {STAGE2_EXPRESSIONS.map((exp, idx) => {
                  const isActive = exp.id === selectedExpressionId;
                  return (
                    <button
                      key={exp.id}
                      type="button"
                      onClick={() => setSelectedExpressionId(exp.id)}
                      className={`p-2.5 rounded-lg border text-left transition-colors ${
                        isActive
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-mono text-[11px] opacity-80 tabular-nums">
                        0{idx + 1} · {exp.id}
                      </div>
                      <div className="text-xs font-semibold truncate mt-0.5">
                        {exp.nameRu.split(' (')[0]}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Expression Detail Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <div className="text-xs font-mono text-violet-700">{activeExpression.code}</div>
                  <h3 className="text-lg font-bold text-slate-900">{activeExpression.nameRu}</h3>
                </div>
                <span className="text-xs text-slate-500">{activeExpression.nameEn}</span>
              </div>

              <dl className="space-y-2.5 text-xs">
                <div>
                  <dt className="text-slate-500">Контекст срабатывания у голосового ассистента:</dt>
                  <dd className="font-medium text-slate-900 mt-0.5">{activeExpression.triggerContext}</dd>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <dt className="text-slate-500">Работа бровей (ParamBrow):</dt>
                    <dd className="font-medium text-slate-900 mt-0.5">{activeExpression.browState}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Работа глаз и век (ParamEye):</dt>
                    <dd className="font-medium text-slate-900 mt-0.5">{activeExpression.eyeState}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Форма рта (ParamMouth):</dt>
                    <dd className="font-medium text-slate-900 mt-0.5">{activeExpression.mouthState}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Румянец и доп. акценты:</dt>
                    <dd className="font-medium text-slate-900 mt-0.5">{activeExpression.cheekBlush}</dd>
                  </div>
                </div>
              </dl>

              <div className="pt-3 border-t border-slate-200 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center font-mono text-xs tabular-nums">
                <div className="bg-white border border-slate-200 rounded p-2">
                  <div className="text-[10px] text-slate-500">EyeOpen</div>
                  <div className="font-semibold text-slate-900">{activeExpression.parameters.eyeOpen}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded p-2">
                  <div className="text-[10px] text-slate-500">EyeSmile</div>
                  <div className="font-semibold text-slate-900">{activeExpression.parameters.eyeSmile}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded p-2">
                  <div className="text-[10px] text-slate-500">BrowY</div>
                  <div className="font-semibold text-slate-900">{activeExpression.parameters.browY}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded p-2">
                  <div className="text-[10px] text-slate-500">MouthOpen</div>
                  <div className="font-semibold text-slate-900">{activeExpression.parameters.mouthOpenY}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded p-2">
                  <div className="text-[10px] text-slate-500">MouthForm</div>
                  <div className="font-semibold text-slate-900">{activeExpression.parameters.mouthForm}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded p-2">
                  <div className="text-[10px] text-slate-500">Cheek</div>
                  <div className="font-semibold text-slate-900">{activeExpression.parameters.blushOpacity}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2.3: Close-Ups — Eyes (Multi-Layer) & Mouth (All Viseme Shapes) */}
      <section id="stage2-closeups" className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <div className="text-xs text-slate-500 mb-1">
              Этап 2.3 · Детальная анатомия под нарезку PSD · Многослойная радужка и фонемная матрица рта
            </div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Eye className="w-6 h-6 text-violet-600" />
              <span>3. Крупные планы: Глаза (взрыв-схема слоёв) и Рот (все формы висем)</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={() =>
              onOpenLightbox(
                'Крупные планы: Слои глаза и фонемная карта рта',
                'Технический лист для нарезки в Live2D Cubism',
                STAGE2_IMAGES.closeupEyesMouth
              )
            }
            className="px-3.5 py-2 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 self-start"
          >
            <ZoomIn className="w-3.5 h-3.5" />
            <span>Увеличить схему глаз и рта</span>
          </button>
        </div>

        <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
          <img
            src={STAGE2_IMAGES.closeupEyesMouth}
            alt="Технический лист слоёв глаза и 6 форм рта (A, I, U, E, O, Closed)"
            referrerPolicy="no-referrer"
            className="w-full h-auto object-contain max-h-[520px] mx-auto"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Eye 7-Layer Stack Breakdown */}
          <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-violet-600" />
              <span>Послойная структура глаза (сверху вниз в PSD)</span>
            </h3>
            <ol className="space-y-2 text-xs text-slate-700 list-decimal pl-4">
              <li>
                <strong>Highlight_Star & Drop (Add / 100%):</strong> 3 независимых блика (крупная звезда сверху слева, капля справа и нижняя дуга влажности) — двигаются в противофазе со зрачком при саккадах.
              </li>
              <li>
                <strong>Eyelash_Upper & Lower (Normal):</strong> Верхняя ресничная дуга (разделена на центр, внутренний и внешний кончик для чистого моргания) и нижние ресницы.
              </li>
              <li>
                <strong>Eyelid_Shadow (Multiply / 55%):</strong> Мягкая падающая тень от верхнего века (#4C1D95), перекрывающая верхнюю треть радужки.
              </li>
              <li>
                <strong>Pupil_Core (Normal):</strong> Глубокий фиолетово-индиговый зрачок (#1E1B4B) с мягким сиреневым ободком; сжимается при удивлении, расширяется при радости.
              </li>
              <li>
                <strong>Iris_InnerGlow (Screen / 70%):</strong> Светящийся лавандовый полумесяц в нижней части радужки (#DDD6FE).
              </li>
              <li>
                <strong>Iris_Base (Normal):</strong> Основная чаша радужки с градиентом от королевского аметиста (#5B21B6) к сиреневому (#A78BFA). Все слои 3–6 обрезаются (Clipping Mask) по слою склеры!
              </li>
              <li>
                <strong>Sclera_White (Base Mask):</strong> Белок глаза (#FDFCFE) с лёгким лавандовым затенением по краям; служит маской отсечения (`Clipping ID`) для радужки, зрачка и тени века.
              </li>
            </ol>
          </div>

          {/* Interactive Viseme Chart Inspector */}
          <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Интерактивная карта форм рта (Висемы липсинка)
              </h3>
              <span className="text-xs font-mono text-violet-700">
                2D-сетка: ParamMouthForm × ParamMouthOpenY
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {VISEME_CHART.map((viseme, idx) => (
                <button
                  key={viseme.phoneme}
                  type="button"
                  onClick={() => setSelectedVisemeIndex(idx)}
                  className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                    selectedVisemeIndex === idx
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {viseme.phoneme}
                </button>
              ))}
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                <div>
                  <span className="font-bold text-sm text-slate-900">{activeViseme.phoneme}</span>
                  <span className="text-slate-500 ml-2">({activeViseme.ruVowels})</span>
                </div>
                <div className="font-mono tabular-nums text-violet-700 font-semibold">
                  OpenY: {activeViseme.mouthOpenY.toFixed(2)} · Form: {activeViseme.mouthForm > 0 ? `+${activeViseme.mouthForm.toFixed(2)}` : activeViseme.mouthForm.toFixed(2)}
                </div>
              </div>
              <p className="text-slate-700 leading-relaxed">{activeViseme.anatomicalNotes}</p>
              <div>
                <span className="text-slate-500 block mb-1">Активные слои PSD в этой форме:</span>
                <div className="flex flex-wrap gap-1.5 font-mono text-[11px] text-violet-900">
                  {activeViseme.visibleLayers.map((layer) => (
                    <span key={layer} className="bg-violet-50 border border-violet-200 px-2 py-0.5 rounded">
                      {layer}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2.4: Materials, Shoulder Seam & Expressive Hands Reference Sheet */}
      <section id="stage2-materials" className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <div className="text-xs text-slate-500 mb-1">
              Этап 2.4 · Фактуры, шейдинг, узел плеч/воротника и жесты рук в кадре Bust-Up
            </div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Palette className="w-6 h-6 text-violet-600" />
              <span>4. Лист референсов по материалам, плечевому поясу и кистям рук</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={() =>
              onOpenLightbox(
                'Материалы, узел плеч и кисти рук',
                'Шейдинг волос и кожи, крой воротника/кардигана и жесты рук',
                STAGE2_IMAGES.materialsHands
              )
            }
            className="px-3.5 py-2 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 self-start"
          >
            <ZoomIn className="w-3.5 h-3.5" />
            <span>Увеличить лист материалов и рук</span>
          </button>
        </div>

        <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
          <img
            src={STAGE2_IMAGES.materialsHands}
            alt="Референс-лист материалов, плечевого шва кардигана и жестов кистей рук Алисы AI"
            referrerPolicy="no-referrer"
            className="w-full h-auto object-contain max-h-[500px] mx-auto"
          />
        </div>

        {/* Material & Color Shading Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <th className="py-3 px-4">Зона модели</th>
                <th className="py-3 px-4">Фактура и материал</th>
                <th className="py-3 px-4">База (Base)</th>
                <th className="py-3 px-4">Тень (Cel-Shade)</th>
                <th className="py-3 px-4">Градиент / Блик</th>
                <th className="py-3 px-4">Лайнарт</th>
                <th className="py-3 px-4">Режим наложения слоёв</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {MATERIAL_REFERENCES.map((mat) => (
                <tr key={mat.zone} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-semibold text-slate-900">{mat.zone}</td>
                  <td className="py-3 px-4 text-slate-600">{mat.materialType}</td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleCopyHex(mat.baseHex)}
                      className="inline-flex items-center gap-1.5 font-mono text-slate-800 hover:text-violet-700"
                    >
                      <span
                        className="w-4 h-4 rounded border border-slate-300 shrink-0"
                        style={{ backgroundColor: mat.baseHex }}
                      />
                      <span>{mat.baseHex}</span>
                      {copiedHex === mat.baseHex && <Check className="w-3 h-3 text-emerald-600" />}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleCopyHex(mat.celShadowHex)}
                      className="inline-flex items-center gap-1.5 font-mono text-slate-800 hover:text-violet-700"
                    >
                      <span
                        className="w-4 h-4 rounded border border-slate-300 shrink-0"
                        style={{ backgroundColor: mat.celShadowHex }}
                      />
                      <span>{mat.celShadowHex}</span>
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleCopyHex(mat.softGradientHex)}
                      className="inline-flex items-center gap-1.5 font-mono text-slate-800 hover:text-violet-700"
                    >
                      <span
                        className="w-4 h-4 rounded border border-slate-300 shrink-0"
                        style={{ backgroundColor: mat.softGradientHex }}
                      />
                      <span>{mat.softGradientHex}</span>
                    </button>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700">{mat.lineartHex}</td>
                  <td className="py-3 px-4 text-slate-600">{mat.blendModeNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 2.5: Stage 2 Approval Gate -> Proceed to Stage 3 (PSD Layers & Rigging Setup) */}
      <section id="stage2-approval" className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <div className="text-xs text-slate-500 mb-1">
              Контрольная точка Этапа 2 · Переход к Этапу 3 (Схема слоёв PSD, параметры Cubism, деформеры и физика)
            </div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-violet-600" />
              <span>Утверждение финального арта перед Этапом 3 (Подготовка к риггингу)</span>
            </h2>
          </div>
          <div className="text-xs text-slate-600 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-violet-600" />
            <span>Этап 3 ждёт вашего подтверждения арта</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="text-xs font-semibold text-slate-800">
              Проверьте комплектность материалов Этапа 2:
            </div>
            <div className="space-y-2">
              {STAGE2_DELIVERABLES.map((item) => {
                const checked = approvedItems.includes(item);
                return (
                  <label
                    key={item}
                    className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                      checked
                        ? 'bg-violet-50/70 border-violet-300 text-slate-900'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleDeliverable(item)}
                      className="mt-0.5 accent-violet-600"
                    />
                    <span className="leading-snug">{item}</span>
                  </label>
                );
              })}
            </div>

            <div>
              <label htmlFor="stage3-notes" className="block text-xs font-semibold text-slate-800 mb-1.5">
                Дополнительные комментарии к арту или пожелания к Этапу 3 (нарезка слоёв PSD и деформеры):
              </label>
              <textarea
                id="stage3-notes"
                rows={2}
                value={stage3Notes}
                onChange={(e) => {
                  setStage3Notes(e.target.value);
                  setIsStage2Confirmed(false);
                }}
                placeholder="Например: Всё отлично, утверждаю арт! Переходи к Этапу 3 (слои PSD, параметры, деформеры и физика)..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-violet-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setIsStage2Confirmed(true)}
                className="px-4 py-2.5 text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
              >
                <span>Утвердить арт Этапа 2</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleCopyStage2Brief}
                className="px-4 py-2.5 text-xs font-medium bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                {copiedBrief ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedBrief ? 'Скопировано в буфер' : 'Скопировать подтверждение для чата'}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Лист утверждения Этапа 2</span>
                <span className="font-mono text-violet-700">STAGE-02 READY</span>
              </div>
              <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed bg-white border border-slate-200 rounded-lg p-3.5">
                {stage2Brief}
              </pre>
            </div>

            {isStage2Confirmed ? (
              <div
                role="status"
                className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 text-xs text-emerald-900"
              >
                <strong>Арт Этапа 2 утверждён!</strong> Напишите в чат <em>«Утверждаю, переходи к Этапу 3»</em>, чтобы я подготовил полную схему слоёв PSD (с английскими префиксами и порядком отрисовки), таблицу параметров Cubism, дерево деформеров и пресеты физики.
              </div>
            ) : (
              <div className="text-xs text-slate-500 leading-relaxed">
                По вашему правилу: <strong>Этап 3 — Подготовка к риггингу (только после утверждения арта)</strong> будет выполнен после вашего подтверждения.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

import React, { useState } from 'react';
import {
  STAGE4_BLINK_PHASES,
  STAGE4_IDLE_HARMONICS,
  STAGE4_LIPSYNC_RULES,
  STAGE4_EXPRESSION_PRESETS,
  STAGE4_ASSISTANT_STATES,
  CubismExpressionPresetSpec
} from '../data/stage4Data';
import {
  filterStage4Expressions,
  buildCubismExp3JsonPreview,
  generateStage4ApprovalSummary
} from '../utils/conceptLogic';
import {
  Eye,
  Activity,
  Volume2,
  Sparkles,
  Cpu,
  Check,
  Copy,
  FileCode,
  Search
} from 'lucide-react';

interface Stage4WorkbenchProps {
  onSelectAssistantState?: (stateId: (typeof STAGE4_ASSISTANT_STATES)[number]['id']) => void;
}

export const Stage4Workbench: React.FC<Stage4WorkbenchProps> = ({ onSelectAssistantState }) => {
  const [exprCategory, setExprCategory] = useState<string>('ALL');
  const [exprSearch, setExprSearch] = useState<string>('');
  const [selectedExpPreset, setSelectedExpPreset] = useState<CubismExpressionPresetSpec>(
    STAGE4_EXPRESSION_PRESETS[0]
  );
  const [showExpJsonModal, setShowExpJsonModal] = useState<boolean>(false);
  const [copiedExpJson, setCopiedExpJson] = useState<boolean>(false);

  const [stage5Notes, setStage5Notes] = useState<string>('');
  const [stage4Approved, setStage4Approved] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  const filteredExpressions = filterStage4Expressions(
    STAGE4_EXPRESSION_PRESETS,
    exprCategory,
    exprSearch
  );

  const exp3JsonPreview = buildCubismExp3JsonPreview(selectedExpPreset);
  const approvalSummaryText = generateStage4ApprovalSummary(stage5Notes);

  const handleCopyExpJson = async () => {
    try {
      await navigator.clipboard.writeText(exp3JsonPreview);
    } catch {
      // Fallback for iframe restrictions
    }
    setCopiedExpJson(true);
    window.setTimeout(() => setCopiedExpJson(false), 1800);
  };

  const handleCopyApproval = async () => {
    try {
      await navigator.clipboard.writeText(approvalSummaryText);
    } catch {
      // Fallback for iframe restrictions
    }
    setCopiedSummary(true);
    window.setTimeout(() => setCopiedSummary(false), 1800);
  };

  return (
    <div className="space-y-10">
      {/* 1. Eye Blinking Logic & Timing Curves */}
      <section id="stage4-blink" className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <div className="text-xs text-slate-500 mb-1">
              Этап 4.1 · Естественная биомеханика век при 60 FPS · Стохастический интервал 3.2–5.8 с
            </div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Eye className="w-5 h-5 text-violet-600" />
              <span>1. Логика моргания (Eye Blinking & Highlight Jiggle)</span>
            </h2>
          </div>
          <div className="text-xs font-mono text-violet-800 bg-violet-50 border border-violet-200 px-3.5 py-2 rounded-lg shrink-0">
            Полный цикл: 190 мс (55 мс ↓ · 25 мс ⏸ · 110 мс ↑) · Двойной блинк: 18%
          </div>
        </div>

        {/* Visual Timeline Bar for 190ms Blink */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-700">
            <span>Профиль тайминга одиночного моргания (190 мс @ 60 FPS ≈ 11–12 кадров)</span>
            <span className="font-mono text-slate-500">Асимметрия L/R при задумчивости: 8 мс</span>
          </div>
          <div className="w-full h-8 rounded-lg overflow-hidden flex text-[11px] font-mono font-semibold">
            <div
              style={{ width: '29%' }}
              className="bg-violet-600 text-white flex items-center justify-center px-2 whitespace-nowrap"
            >
              1. Смыкание: 55 мс (29%)
            </div>
            <div
              style={{ width: '13%' }}
              className="bg-slate-900 text-white flex items-center justify-center px-1 whitespace-nowrap"
            >
              2. Пауза: 25 мс
            </div>
            <div
              style={{ width: '58%' }}
              className="bg-indigo-100 text-indigo-950 border-y border-r border-indigo-300 flex items-center justify-center px-2 whitespace-nowrap"
            >
              3. Плавное раскрытие + пружина блика (1.03 overshoot): 110 мс (58%)
            </div>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="py-3 px-4">Фаза цикла</th>
                <th className="py-3 px-4">Длительность</th>
                <th className="py-3 px-4">Диапазон EyeOpen</th>
                <th className="py-3 px-4">Кривая интерполяции (Easing)</th>
                <th className="py-3 px-4">Связанные параметры</th>
                <th className="py-3 px-4">Технические правила анимации</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {STAGE4_BLINK_PHASES.map((phase) => (
                <tr key={phase.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                    {phase.phaseName}
                  </td>
                  <td className="py-3 px-4 font-mono text-violet-700 whitespace-nowrap">
                    {phase.durationMs}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-800 whitespace-nowrap">
                    {phase.eyeOpenRange}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                    {phase.easingCurve}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700">
                    {phase.coupledParameters}
                  </td>
                  <td className="py-3 px-4 text-slate-600 leading-relaxed">
                    {phase.notesRu}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. Background Idle Animation (Breathing, Micro-Sway, Eye Saccades) */}
      <section id="stage4-idle" className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <div className="text-xs text-slate-500 mb-1">
              Этап 4.2 · Непрерывная многочастотная генерация движения без эффекта «зацикленного робота»
            </div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-violet-600" />
              <span>2. Фоновая анимация (Idle: дыхание, покачивание, саккады взгляда)</span>
            </h2>
          </div>
          <div className="text-xs font-mono text-slate-700 bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-lg shrink-0">
            5 независимых гармоник · Фиксация взгляда на собеседнике: 78% времени
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {STAGE4_IDLE_HARMONICS.map((layer) => (
            <div
              key={layer.id}
              className="border border-slate-200 rounded-xl p-4 bg-[#FAF9FC] flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded">
                    T = {layer.periodSec} с · Сдвиг {layer.phaseOffsetDeg}°
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{layer.channelName}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{layer.descriptionRu}</p>
              </div>

              <div className="pt-3 border-t border-slate-200/80 space-y-1 text-[11px] font-mono">
                <div className="text-slate-800">
                  <span className="text-slate-500">Параметры: </span>
                  {layer.targetParams.join(', ')}
                </div>
                <div className="text-slate-700">
                  <span className="text-slate-500">Амплитуда: </span>
                  {layer.amplitude}
                </div>
                <div className="text-slate-600">
                  <span className="text-slate-500">Форма волны: </span>
                  {layer.waveform}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Lip-Sync System (Audio RMS/Formants + TTS Phonemes -> 6 Native Anime Visemes) */}
      <section id="stage4-lipsync" className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <div className="text-xs text-slate-500 mb-1">
              Этап 4.3 · Двухканальный пайплайн синхронизации речи (Audio FFT / TTS Phonemes → 6 аниме-висем)
            </div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-violet-600" />
              <span>3. Система липсинка (Аудио и фонемы → ParamMouthOpenY + ParamMouthForm)</span>
            </h2>
          </div>
          <div className="text-xs font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-lg shrink-0">
            Нативные аниме-рты модели · Безротая база кожи FACE_SkinBase (0 наложений)
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="font-bold text-slate-900">
              Канал А: Потоковый аудио-анализатор (Real-Time WebAudio RMS + F1/F2 Formants)
            </div>
            <p className="text-slate-600 leading-relaxed">
              Используется при голосовом стриминге WebRTC/PCM: огибающая громкости RMS (окно <span className="font-mono">20 мс</span>, атака <span className="font-mono">35 мс</span>, плавный спад <span className="font-mono">85 мс</span>) управляет параметром <span className="font-mono font-semibold">ParamMouthOpenY</span>, а отношение энергий в полосах <span className="font-mono">300–900 Гц (F1)</span> и <span className="font-mono">1600–2700 Гц (F2)</span> переводит <span className="font-mono font-semibold">ParamMouthForm</span> между округлой формой (<span className="font-mono">-0.65</span> для У/О) и улыбкой (<span className="font-mono">+0.95</span> для И/Э).
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="font-bold text-slate-900">
              Канал Б: Таймлайн фонем синтезатора речи (TTS Phoneme Timestamps + Coarticulation)
            </div>
            <p className="text-slate-600 leading-relaxed">
              Используется при синтезе речи Алисы с таймкодами фонем: каждая русская гласная и губная согласная мапится в одну из 6 рисованных аниме-висем с окном опережающей коартикуляции <span className="font-mono">40–55 мс</span> (Critically Damped Spring), при этом взрывные согласные <span className="font-mono">М / Б / П</span> гарантированно смыкают губы на <span className="font-mono">45 мс</span>.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="py-3 px-4">Код висемы</th>
                <th className="py-3 px-4">Аниме-форма рта</th>
                <th className="py-3 px-4">Русские фонемы (TTS)</th>
                <th className="py-3 px-4">Диапазон RMS</th>
                <th className="py-3 px-4">Частоты формант F1 / F2</th>
                <th className="py-3 px-4">OpenY / Form</th>
                <th className="py-3 px-4">Коартикуляция и правила</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {STAGE4_LIPSYNC_RULES.map((rule) => (
                <tr key={rule.visemeKey} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-mono font-bold text-violet-700 whitespace-nowrap">
                    {rule.visemeKey}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                    {rule.visemeLabel}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-800">
                    {rule.ruPhonemes}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                    {rule.rmsRange}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                    {rule.formantHz}
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                    Y: {rule.mouthOpenY.toFixed(2)} · F: {rule.mouthForm > 0 ? `+${rule.mouthForm.toFixed(2)}` : rule.mouthForm.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-slate-600 leading-relaxed">
                    <span className="font-mono text-slate-800 mr-1.5">[{rule.coarticulationMs} мс]</span>
                    {rule.notesRu}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. 13 Expression Presets (.exp3.json) */}
      <section id="stage4-expressions" className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <div className="text-xs text-slate-500 mb-1">
              Этап 4.4 · Полная палитра мимики Live2D Cubism (13 файлов .exp3.json при минимуме 12)
            </div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-600" />
              <span>4. Палитра из 13 эмоций (.exp3.json) и правила смешивания</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowExpJsonModal((v) => !v)}
            className="px-3.5 py-2 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
          >
            <FileCode className="w-4 h-4" />
            <span>{showExpJsonModal ? 'Скрыть инспектор .exp3.json' : 'Инспектор кода .exp3.json'}</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: `Все эмоции (${STAGE4_EXPRESSION_PRESETS.length})` },
              { id: 'BASE', label: 'Базовая (1)' },
              { id: 'POSITIVE', label: 'Позитивные (4)' },
              { id: 'EMPATHY', label: 'Эмпатия и реакции (3)' },
              { id: 'ASSISTANT', label: 'Режимы ИИ-ассистента (5)' }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setExprCategory(cat.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  exprCategory === cat.id
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Поиск пресета эмоции .exp3.json"
              placeholder="Поиск (.exp3.json, эмоция)..."
              value={exprSearch}
              onChange={(e) => setExprSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        {/* Optional Live .exp3.json Code Inspector */}
        {showExpJsonModal && (
          <div className="bg-slate-900 text-slate-100 rounded-xl p-4 space-y-3 border border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <div className="text-xs font-mono text-violet-300">
                Файл: {selectedExpPreset.fileName} · Blend: {selectedExpPreset.blendMode}
              </div>
              <button
                type="button"
                onClick={handleCopyExpJson}
                className="px-3 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white rounded-md flex items-center gap-1.5"
              >
                {copiedExpJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedExpJson ? 'Скопировано' : 'Скопировать .exp3.json'}</span>
              </button>
            </div>
            <pre className="text-xs font-mono text-slate-200 overflow-x-auto max-h-60">
              {exp3JsonPreview}
            </pre>
          </div>
        )}

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="py-3 px-4">Файл пресета (.exp3.json)</th>
                <th className="py-3 px-4">Название эмоции</th>
                <th className="py-3 px-4">Fade In / Out</th>
                <th className="py-3 px-4">Режим Blend</th>
                <th className="py-3 px-4">Ключевые параметры Cubism</th>
                <th className="py-3 px-4">Триггер в диалоге Алисы</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredExpressions.map((exp) => {
                const isSelected = exp.id === selectedExpPreset.id;
                return (
                  <tr
                    key={exp.id}
                    onClick={() => {
                      setSelectedExpPreset(exp);
                      setShowExpJsonModal(true);
                    }}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-violet-50/70' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-violet-700 whitespace-nowrap">
                      {exp.fileName}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {exp.titleRu}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {exp.fadeInSec.toFixed(2)}s / {exp.fadeOutSec.toFixed(2)}s
                    </td>
                    <td className="py-3 px-4 font-mono whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          exp.blendMode === 'Additive'
                            ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}
                      >
                        {exp.blendMode}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                      {Object.entries(exp.parameterValues)
                        .slice(0, 4)
                        .map(([k, v]) => `${k.replace('Param', '')}: ${v}`)
                        .join(' · ')}
                    </td>
                    <td className="py-3 px-4 text-slate-600 leading-relaxed">
                      {exp.triggerContextRu}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. AI Assistant State Machine (7 States) */}
      <section id="stage4-states" className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <div className="text-xs text-slate-500 mb-1">
              Этап 4.5 · Машина состояний голосового и текстового ИИ-ассистента (Cubism MotionManager)
            </div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-violet-600" />
              <span>5. Специфические состояния ИИ-ассистента «Алиса AI» (7 стейтов)</span>
            </h2>
          </div>
          <div className="text-xs text-slate-500">
            Нажмите «Проверить стейт в риге», чтобы протестировать поведение на модели ниже
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {STAGE4_ASSISTANT_STATES.map((st) => (
            <div
              key={st.id}
              className="border border-slate-200 rounded-xl p-5 bg-[#FAF9FC] flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-0.5 rounded">
                    {st.code}
                  </span>
                  <span className="text-[11px] font-mono text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    {st.priority} · Crossfade {st.crossfadeMs} мс
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{st.titleRu}</h3>
                <div className="text-xs font-mono text-slate-600">
                  Motion: <span className="text-slate-900">{st.motionFile}</span> · Exp:{' '}
                  <span className="text-violet-700">{st.expressionId}.exp3.json</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg p-3">
                <div>
                  <span className="font-semibold text-slate-900">Взгляд и моргание: </span>
                  {st.gazeBehaviorRu} ({st.blinkIntervalSec})
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Корпус, плечи и руки: </span>
                  {st.bodyAndHandsBehaviorRu}
                </div>
              </div>

              {onSelectAssistantState && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => onSelectAssistantState(st.id)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
                  >
                    Проверить стейт «{st.id}» в 2.5D-риге ↓
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 6. Stage 4 Approval Gate before Stage 5 */}
      <section
        id="stage4-approval"
        className="bg-white border-2 border-violet-200 rounded-xl p-6 lg:p-8 space-y-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <div className="text-xs font-semibold text-violet-700 mb-1">
              Контрольная точка Этапа 4 · Переход к Этапу 5 (Финализация, экспорт .moc3 и интеграция с Cubism SDK)
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              Готовность анимационной логики к Этапу 5 (Финал и интеграция)
            </h2>
          </div>
          <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-violet-50 text-violet-900 border border-violet-200">
            {stage4Approved
              ? '✓ Этап 4 подтверждён пользователем'
              : 'Этап 5 ждёт подтверждения логики анимации'}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-4">
            <div>
              <label
                htmlFor="stage4-notes-input"
                className="block text-xs font-semibold text-slate-700 mb-2"
              >
                Пожелания к целевой платформе перед Этапом 5 (Web PixiJS / Unity / Desktop / Mobile):
              </label>
              <textarea
                id="stage4-notes-input"
                rows={3}
                value={stage5Notes}
                onChange={(e) => setStage5Notes(e.target.value)}
                placeholder="Например: Всё отлично, переходим к Этапу 5! Нужна интеграция для Web (PixiJS + Cubism SDK for Web) и связка с потоковым TTS..."
                className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-900 focus:border-violet-600 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setStage4Approved(true)}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{stage4Approved ? 'Этап 4 утверждён' : 'Подтвердить Этап 4'}</span>
              </button>
              <button
                type="button"
                onClick={handleCopyApproval}
                className="px-4 py-2.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                {copiedSummary ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-500" />
                )}
                <span>{copiedSummary ? 'Сводка скопирована' : 'Скопировать сводку Этапа 4'}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs whitespace-pre-wrap leading-relaxed">
            {approvalSummaryText}
          </div>
        </div>
      </section>
    </div>
  );
};

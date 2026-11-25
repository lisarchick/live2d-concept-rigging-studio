import React, { useState } from 'react';
import {
  PSD_LAYER_SCHEMA,
  RIG_PARAMETERS,
  DEFORMER_HIERARCHY,
  CUBISM_PHYSICS_GROUPS,
  STAGE3_BLUEPRINT_SHEET_PATH,
  DeformerNode,
  ParamCategory,
  PsdCategory
} from '../data/stage3Data';
import {
  filterPsdLayers,
  buildCubismPhysicsJsonPreview,
  generateStage3ApprovalSummary
} from '../utils/conceptLogic';
import {
  Layers,
  Sliders,
  GitBranch,
  Wind,
  Search,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  Lock,
  ArrowRight,
  ZoomIn
} from 'lucide-react';

interface Stage3WorkbenchProps {
  onOpenLightbox?: (title: string, subtitle: string, imagePath: string) => void;
}

const PSD_CATEGORY_LABELS: { id: 'ALL' | PsdCategory; label: string }[] = [
  { id: 'ALL', label: 'Все слои (42)' },
  { id: 'HAIR_FRONT', label: 'Чёлка и Ахоге' },
  { id: 'EYEBROWS', label: 'Брови' },
  { id: 'EYES', label: 'Глаза' },
  { id: 'MOUTH', label: 'Рот' },
  { id: 'FACE_BASE', label: 'Лицо, Нос, Уши' },
  { id: 'HAIR_SIDE', label: 'Боковые пряди' },
  { id: 'ARMS_HANDS', label: 'Жесты рук' },
  { id: 'NECK_OUTFIT', label: 'Шея, Плечи, Одежда' },
  { id: 'HAIR_BACK', label: 'Задние волосы' }
];

const PARAM_CATEGORIES: { id: 'ALL' | ParamCategory; label: string }[] = [
  { id: 'ALL', label: 'Все параметры (30)' },
  { id: 'Head', label: 'Голова (X/Y/Z)' },
  { id: 'Eyes', label: 'Глаза' },
  { id: 'Brows', label: 'Брови' },
  { id: 'Mouth', label: 'Рот и Щёки' },
  { id: 'Body', label: 'Корпус, Плечи, Руки' },
  { id: 'Hair', label: 'Волосы (Физика)' }
];

const DeformerTreeItem: React.FC<{ node: DeformerNode; depth?: number }> = ({ node, depth = 0 }) => {
  const [expanded, setExpanded] = useState<boolean>(true);
  const hasChildren = Boolean(node.children && node.children.length > 0);

  return (
    <div className="space-y-1">
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg border text-xs ${
          node.type === 'Rotation'
            ? 'bg-violet-50/70 border-violet-200'
            : 'bg-white border-slate-200'
        }`}
        style={{ marginLeft: `${depth * 18}px` }}
      >
        <div className="flex items-start sm:items-center gap-2 min-w-0">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              aria-label={expanded ? `Свернуть ${node.name}` : `Развернуть ${node.name}`}
              className="p-0.5 text-slate-500 hover:text-slate-900 rounded"
            >
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <span className="w-4 inline-block shrink-0" />
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-semibold text-slate-900">{node.name}</span>
              <span className="text-[11px] font-mono text-violet-700">
                [{node.type === 'Rotation' ? 'Rotation Deformer' : 'Warp Deformer'}]
              </span>
            </div>
            <div className="text-slate-600 mt-0.5">{node.descriptionRu}</div>
          </div>
        </div>

        <div className="font-mono text-[11px] text-slate-500 shrink-0 sm:text-right">
          {node.boundParams.join(' · ')}
        </div>
      </div>

      {hasChildren && expanded && (
        <div className="space-y-1">
          {node.children!.map((child) => (
            <DeformerTreeItem key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const Stage3Workbench: React.FC<Stage3WorkbenchProps> = ({ onOpenLightbox }) => {
  const [psdCategory, setPsdCategory] = useState<'ALL' | PsdCategory>('ALL');
  const [psdSearch, setPsdSearch] = useState<string>('');
  const [paramCategory, setParamCategory] = useState<'ALL' | ParamCategory>('ALL');
  const [showPhysicsJson, setShowPhysicsJson] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [notesForStage4, setNotesForStage4] = useState<string>('');
  const [isStage3Confirmed, setIsStage3Confirmed] = useState<boolean>(false);
  const [copiedStage3, setCopiedStage3] = useState<boolean>(false);

  const filteredPsd = filterPsdLayers(PSD_LAYER_SCHEMA, psdCategory, psdSearch);
  const filteredParams =
    paramCategory === 'ALL'
      ? RIG_PARAMETERS
      : RIG_PARAMETERS.filter((p) => p.category === paramCategory);

  const physicsJsonPreview = buildCubismPhysicsJsonPreview(CUBISM_PHYSICS_GROUPS);
  const stage3Brief = generateStage3ApprovalSummary(notesForStage4);

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(physicsJsonPreview);
    } catch {
      // ignore in sandbox
    }
    setCopiedJson(true);
    window.setTimeout(() => setCopiedJson(false), 1800);
  };

  const handleCopyStage3 = async () => {
    try {
      await navigator.clipboard.writeText(stage3Brief);
    } catch {
      // ignore
    }
    setCopiedStage3(true);
    window.setTimeout(() => setCopiedStage3(false), 1800);
  };

  return (
    <div className="space-y-10">
      {/* SECTION 3.0: Visual PSD Layer & Deformer Blueprint Sheet */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="text-xs text-slate-500 mb-1">
              Визуальный чертёж Этапа 3 · Деконструкция утверждённого аниме-арта на PSD-группы и сетку деформеров
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              Схема декомпозиции слоёв PSD и сетки Warp-деформеров
            </h2>
          </div>
          {onOpenLightbox && (
            <button
              type="button"
              onClick={() =>
                onOpenLightbox(
                  'Этап 3: Схема разделения слоёв PSD и деформеров',
                  'Exploded PSD Layer Diagram + Front-Facing Rigging Blueprint (4096×4096)',
                  STAGE3_BLUEPRINT_SHEET_PATH
                )
              }
              className="px-3.5 py-2 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>Увеличить чертёж нарезки PSD</span>
            </button>
          )}
        </div>

        <div className="rounded-xl overflow-hidden border border-slate-200 bg-[#FAF9FC]">
          <img
            src={STAGE3_BLUEPRINT_SHEET_PATH}
            alt="Визуальная схема разделения на слои PSD и сетки деформеров Алисы AI"
            referrerPolicy="no-referrer"
            className="w-full h-auto object-contain"
          />
        </div>
      </section>

      {/* SECTION 3.1: PSD Layer Splitting Schema */}
      <section id="stage3-psd" className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <div className="text-xs text-slate-500 mb-1">
              Этап 3.1 · Холст 4096×4096 px (Bust-Up с плечами, без нимба) · Порядок отрисовки (Draw Order) от переднего плана к заднему
            </div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-6 h-6 text-violet-600" />
              <span>1. Схема разделения на слои (PSD) для Live2D Cubism</span>
            </h2>
          </div>
          <div className="text-xs font-mono text-slate-600 tabular-nums">
            42 группы-шаблона · ~76 рабочих арт-мешей с L/R парами
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {PSD_CATEGORY_LABELS.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setPsdCategory(cat.id)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  psdCategory === cat.id
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Поиск слоя PSD по имени или описанию"
              value={psdSearch}
              onChange={(e) => setPsdSearch(e.target.value)}
              placeholder="Поиск слоя (Eye, Mouth, Hair)..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-violet-500 focus:outline-none"
            />
          </div>
        </div>

        {/* PSD Layer Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <th className="py-3 px-3.5 font-mono tabular-nums">DrawOrder</th>
                <th className="py-3 px-3.5">Папка в PSD</th>
                <th className="py-3 px-3.5">Имя слоя (EN + Префикс)</th>
                <th className="py-3 px-3.5">Режим / Opacity</th>
                <th className="py-3 px-3.5">Clipping Mask</th>
                <th className="py-3 px-3.5">Симметрия</th>
                <th className="py-3 px-3.5">Назначение и правила нарезки</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredPsd.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">
                    Слои по вашему запросу не найдены. Сбросьте фильтр или поисковую строку.
                  </td>
                </tr>
              ) : (
                filteredPsd.map((layer) => (
                  <tr key={layer.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3.5 font-mono font-semibold text-violet-700 tabular-nums">
                      {layer.drawOrder}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-500">{layer.groupPath}</td>
                    <td className="py-2.5 px-3.5 font-mono font-semibold text-slate-900">
                      {layer.layerName}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-700 tabular-nums">
                      {layer.blendMode} ({layer.opacity}%)
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-600">
                      {layer.clippingMask ?? '—'}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-700">{layer.symmetry}</td>
                    <td className="py-2.5 px-3.5 text-slate-700">{layer.notesRu}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 3.2: Rigging Parameters Matrix */}
      <section id="stage3-params" className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <div className="text-xs text-slate-500 mb-1">
              Этап 3.2 · Полная спецификация Cubism SDK ID, диапазонов и ключевых форм
            </div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-6 h-6 text-violet-600" />
              <span>2. Параметры риггинга Live2D (30 параметров)</span>
            </h2>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {PARAM_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setParamCategory(cat.id)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  paramCategory === cat.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <th className="py-3 px-4">ID Параметра</th>
                <th className="py-3 px-4">Описание</th>
                <th className="py-3 px-4 font-mono tabular-nums text-right">Min</th>
                <th className="py-3 px-4 font-mono tabular-nums text-right">Default</th>
                <th className="py-3 px-4 font-mono tabular-nums text-right">Max</th>
                <th className="py-3 px-4">Ключевые формы (Keyforms)</th>
                <th className="py-3 px-4">Какие слои и деформеры двигаются</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredParams.map((param) => (
                <tr key={param.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-mono font-semibold text-violet-700">
                    {param.id}
                  </td>
                  <td className="py-2.5 px-4 font-medium text-slate-900">{param.nameRu}</td>
                  <td className="py-2.5 px-4 font-mono tabular-nums text-right text-slate-700">
                    {param.min}
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums text-right font-semibold text-slate-900">
                    {param.defaultVal}
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums text-right text-slate-700">
                    {param.max}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-600">{param.keyforms}</td>
                  <td className="py-2.5 px-4 text-slate-700">{param.affectedLayersAndDeformers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 3.3: Deformer Hierarchy (Warp & Rotation) */}
      <section id="stage3-deformers" className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 space-y-6">
        <div className="pb-5 border-b border-slate-200">
          <div className="text-xs text-slate-500 mb-1">
            Этап 3.3 · Порядок вложенности от корневого контейнера к частям лица · Защита от двойных трансформаций
          </div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-violet-600" />
            <span>3. Иерархия Warp- и Rotation-деформеров</span>
          </h2>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 overflow-x-auto">
          {DEFORMER_HIERARCHY.map((rootNode) => (
            <DeformerTreeItem key={rootNode.id} node={rootNode} />
          ))}
        </div>
      </section>

      {/* SECTION 3.4: Cubism Physics Settings + .physics3.json Export Preview */}
      <section id="stage3-physics" className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <div className="text-xs text-slate-500 mb-1">
              Этап 3.4 · Частота симуляции 60 FPS · Маятники волос, плечевых прядей, лацканов кардигана и бликов глаз
            </div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Wind className="w-6 h-6 text-violet-600" />
              <span>4. Настройки физики (Cubism Physics3)</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPhysicsJson((v) => !v)}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                showPhysicsJson
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {showPhysicsJson ? 'Скрыть physics3.json' : 'Показать шаблон physics3.json'}
            </button>
            {showPhysicsJson && (
              <button
                type="button"
                onClick={handleCopyJson}
                className="px-3.5 py-2 text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedJson ? 'JSON скопирован' : 'Копировать JSON'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <th className="py-3 px-4">Группа физики</th>
                <th className="py-3 px-4">Входные параметры (Input)</th>
                <th className="py-3 px-4 font-mono text-right tabular-nums">Звенья / Длина</th>
                <th className="py-3 px-4 font-mono text-right tabular-nums">Масса</th>
                <th className="py-3 px-4 font-mono text-right tabular-nums">Затухание</th>
                <th className="py-3 px-4 font-mono text-right tabular-nums">Чувствит.</th>
                <th className="py-3 px-4">Поведение в анимации</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {CUBISM_PHYSICS_GROUPS.map((grp) => (
                <tr key={grp.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="font-mono font-semibold text-violet-700">{grp.groupName}</div>
                    <div className="text-slate-600 mt-0.5">{grp.targetPartRu}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700">
                    {grp.inputParams.join(', ')}
                  </td>
                  <td className="py-3 px-4 font-mono text-right tabular-nums text-slate-800">
                    {grp.pendulumCount} ({grp.pendulumLengths})
                  </td>
                  <td className="py-3 px-4 font-mono text-right tabular-nums text-slate-900">
                    {grp.mass.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 font-mono text-right tabular-nums text-slate-900">
                    {grp.damping.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 font-mono text-right tabular-nums text-slate-900">
                    {grp.sensitivity.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-slate-700">{grp.notesRu}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showPhysicsJson && (
          <div className="bg-slate-950 text-slate-100 rounded-xl p-4 overflow-x-auto">
            <div className="text-xs font-mono text-violet-300 mb-2">
              alisa_ai.physics3.json (готовая структура для Live2D Cubism 4/5)
            </div>
            <pre className="text-xs font-mono leading-relaxed">{physicsJsonPreview}</pre>
          </div>
        )}
      </section>

      {/* SECTION 3.5: Stage 3 Approval Gate -> Stage 4 */}
      <section id="stage3-approval" className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <div className="text-xs text-slate-500 mb-1">
              Контрольная точка Этапа 3 · Переход к Этапу 4 (Анимация, моргание, липсинк, 13 эмоций и состояния ассистента)
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              Готовность риггинг-документации к Этапу 4
            </h2>
          </div>
          <div className="text-xs text-slate-600 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-violet-600" />
            <span>Этап 4 ждёт подтверждения схемы риггинга</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div>
              <label htmlFor="stage4-notes" className="block text-xs font-semibold text-slate-800 mb-1.5">
                Пожелания по поведению и анимации перед Этапом 4 (липсинк, эмоции, состояния ассистента):
              </label>
              <textarea
                id="stage4-notes"
                rows={3}
                value={notesForStage4}
                onChange={(e) => {
                  setNotesForStage4(e.target.value);
                  setIsStage3Confirmed(false);
                }}
                placeholder="Например: Всё отлично, переходим к Этапу 4! Сделай акцент на плавном липсинке и 13 эмоциях..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-violet-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setIsStage3Confirmed(true)}
                className="px-4 py-2.5 text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
              >
                <span>Подтвердить Этап 3</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleCopyStage3}
                className="px-4 py-2.5 text-xs font-medium bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                {copiedStage3 ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedStage3 ? 'Скопировано в буфер' : 'Скопировать сводку Этапа 3'}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
            <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed bg-white border border-slate-200 rounded-lg p-3.5">
              {stage3Brief}
            </pre>

            {isStage3Confirmed && (
              <div
                role="status"
                className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 text-xs text-emerald-900"
              >
                <strong>Этап 3 зафиксирован!</strong> Напишите в чат <em>«Переходи к 4 этапу»</em>, чтобы получить полную логику моргания, саккад, липсинка, 13 `.exp3.json` эмоций и состояний ассистента Алисы.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

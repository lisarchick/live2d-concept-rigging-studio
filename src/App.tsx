import React, { useState, useEffect } from 'react';
import { ALISA_CONCEPTS, RiggingComplexity } from './data/conceptsData';
import { filterConceptsByComplexity } from './utils/conceptLogic';
import { Live2DPrototypeRig, ExternalSpeechCommand } from './components/Live2DPrototypeRig';
import { ObsVtuberStage } from './components/ObsVtuberStage';
import { Stage1AiVoiceWorkbench } from './components/Stage1AiVoiceWorkbench';
import { ComparisonMatrix } from './components/ComparisonMatrix';
import { Stage1ApprovalForm } from './components/Stage1ApprovalForm';
import { Stage2Workbench } from './components/Stage2Workbench';
import { Stage3Workbench } from './components/Stage3Workbench';
import { Stage4Workbench } from './components/Stage4Workbench';
import { AssistantStateId } from './data/stage4Data';
import {
  Check,
  Copy,
  Layers,
  ZoomIn,
  X,
  Grid,
  Sparkles,
  Lock,
  Radio,
  Maximize2
} from 'lucide-react';

interface LightboxState {
  title: string;
  subtitle: string;
  imagePath: string;
}

export default function App() {
  const [isObsPureUrl] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('obs') === 'view' || params.get('obs') === '1';
  });
  const [isFullscreenObsClean, setIsFullscreenObsClean] = useState<boolean>(false);
  const [activeStageTab, setActiveStageTab] = useState<'obs' | 'stage4' | 'stage3' | 'stage2' | 'stage1'>('obs');
  const [selectedConceptId, setSelectedConceptId] = useState<number>(1);
  const [activeRigConceptId, setActiveRigConceptId] = useState<number>(1);
  const [externalAssistantState, setExternalAssistantState] = useState<AssistantStateId | null>(null);
  const [externalSpeechCommand, setExternalSpeechCommand] = useState<ExternalSpeechCommand | null>(null);
  const [complexityFilter, setComplexityFilter] = useState<'ALL' | RiggingComplexity>('ALL');
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [lightboxData, setLightboxData] = useState<LightboxState | null>(null);
  const [showLayerSlicesOverlay, setShowLayerSlicesOverlay] = useState<boolean>(false);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (isObsPureUrl) {
      document.documentElement.style.background = 'transparent';
      document.body.style.background = 'transparent';
    }
  }, [isObsPureUrl]);

  // If opened as ?obs=view inside OBS Studio Browser Source, render 100% pure buttonless transparent stage
  if (isObsPureUrl || isFullscreenObsClean) {
    return (
      <ObsVtuberStage
        isObsPureView={true}
        onExitCleanMode={() => setIsFullscreenObsClean(false)}
      />
    );
  }

  const filteredConcepts = filterConceptsByComplexity(ALISA_CONCEPTS, complexityFilter);
  const activeRigConcept =
    ALISA_CONCEPTS.find((c) => c.id === activeRigConceptId) ?? ALISA_CONCEPTS[0];

  const handleCopyHex = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
    } catch {
      // Fallback if clipboard blocked in iframe
    }
    setCopiedHex(hex);
    window.setTimeout(() => setCopiedHex(null), 1600);
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleInspectInRig = (conceptId: number) => {
    setActiveRigConceptId(conceptId);
    scrollToSection('rig-prototype');
  };

  const handleSelectForStage2 = (conceptId: number) => {
    setSelectedConceptId(conceptId);
    setActiveRigConceptId(conceptId);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9FC] text-slate-900">
      {/* Top Bar Contract: 3 Zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-8">
        <a
          href="#top"
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <span>Алиса AI · OBS VTuber & Live2D Studio</span>
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setActiveStageTab('obs')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeStageTab === 'obs' ? 'text-violet-700 font-bold underline underline-offset-4' : ''
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-emerald-500" />
            <span>Экран для OBS (Трекинг лица)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStageTab('stage4')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeStageTab === 'stage4' ? 'text-violet-700 font-bold underline underline-offset-4' : ''
            }`}
          >
            ИИ-Голос и Ручной Риг
          </button>
          <button
            type="button"
            onClick={() => setActiveStageTab('stage3')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeStageTab === 'stage3' ? 'text-violet-700 font-bold underline underline-offset-4' : ''
            }`}
          >
            Слои PSD (Этап 3)
          </button>
          <button
            type="button"
            onClick={() => setActiveStageTab('stage2')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeStageTab === 'stage2' ? 'text-violet-700 font-bold underline underline-offset-4' : ''
            }`}
          >
            Арт и 9 эмоций
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsFullscreenObsClean(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Чистый экран для OBS (Без кнопок)</span>
          </button>
        </div>
      </header>

      <main id="top" className="flex-1 max-w-[1380px] w-full mx-auto px-6 py-8 space-y-10">
        {/* Stage Switcher Banner */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 lg:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 max-w-3xl">
            <div className="text-xs font-semibold text-violet-700">
              Режим витубинга для OBS Studio · Веб-камера (MediaPipe 52 Blendshapes) + Микрофон (Web Audio 48 слайдов рта)
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900">
              Алиса AI — Экран для OBS с живым отслеживанием рта, глаз, бровей и головы
            </h1>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg self-start shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveStageTab('obs')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStageTab === 'obs'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              OBS VTuber (Трекинг лица)
            </button>
            <button
              type="button"
              onClick={() => setActiveStageTab('stage4')}
              className={`px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStageTab === 'stage4'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Этап 4: ИИ-Голос и Стейты
            </button>
            <button
              type="button"
              onClick={() => setActiveStageTab('stage3')}
              className={`px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStageTab === 'stage3'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Этап 3: Слои и Риг
            </button>
            <button
              type="button"
              onClick={() => setActiveStageTab('stage2')}
              className={`px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStageTab === 'stage2'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Этап 2: Финальный арт
            </button>
            <button
              type="button"
              onClick={() => setActiveStageTab('stage1')}
              className={`px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStageTab === 'stage1'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Этап 1: 5 концептов
            </button>
          </div>
        </section>

        {/* ACTIVE VIEW SWITCHER */}
        {activeStageTab === 'obs' && (
          <div className="space-y-10">
            <ObsVtuberStage />
            <section id="rig-prototype" className="space-y-4">
              <Live2DPrototypeRig
                concept={ALISA_CONCEPTS[0]}
                externalAssistantState={externalAssistantState}
                externalSpeechCommand={externalSpeechCommand}
              />
            </section>
          </div>
        )}

        {activeStageTab === 'stage4' && (
          <div className="space-y-10">
            <Stage1AiVoiceWorkbench
              onTriggerModelSpeech={(cmd) => {
                setExternalSpeechCommand(cmd);
              }}
              onSelectAssistantState={(stateId) => {
                setExternalAssistantState(stateId);
              }}
            />
            <section id="rig-prototype" className="space-y-4">
              <Live2DPrototypeRig
                concept={ALISA_CONCEPTS[0]}
                externalAssistantState={externalAssistantState}
                externalSpeechCommand={externalSpeechCommand}
              />
            </section>
            <Stage4Workbench
              onSelectAssistantState={(stateId) => {
                setExternalAssistantState(stateId);
                scrollToSection('rig-prototype');
              }}
            />
          </div>
        )}

        {activeStageTab === 'stage3' && (
          <div className="space-y-10">
            <Stage3Workbench
              onOpenLightbox={(title, subtitle, imagePath) =>
                setLightboxData({ title, subtitle, imagePath })
              }
            />
            <section id="rig-prototype" className="space-y-4">
              <Live2DPrototypeRig
                concept={ALISA_CONCEPTS[0]}
                externalAssistantState={externalAssistantState}
              />
            </section>
          </div>
        )}

        {activeStageTab === 'stage2' && (
          <>
            <Stage2Workbench
              onOpenLightbox={(title, subtitle, imagePath) =>
                setLightboxData({ title, subtitle, imagePath })
              }
            />
            <section id="rig-prototype" className="space-y-4">
              <Live2DPrototypeRig
                concept={ALISA_CONCEPTS[0]}
                externalAssistantState={externalAssistantState}
              />
            </section>
          </>
        )}

        {activeStageTab === 'stage1' && (
          <div className="space-y-12">
            <section id="concepts" className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-500 mb-1">
                    Архив Этапа 1 · Все 5 концепт-макетов
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Этап 1: Пять концепт-макетов персонажа «Алиса AI»
                  </h2>
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start">
                  {(['ALL', 'Низкая', 'Средняя', 'Высокая'] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setComplexityFilter(level)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        complexityFilter === level
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {level === 'ALL' ? 'Все (5)' : `Риггинг: ${level}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-8">
                {filteredConcepts.map((concept) => {
                  const isSelected = concept.id === selectedConceptId;
                  const hasImgError = imageErrors[concept.id];

                  return (
                    <article
                      key={concept.id}
                      className={`bg-white rounded-xl border transition-colors p-6 lg:p-8 ${
                        isSelected ? 'border-violet-500' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-200">
                        <div>
                          <div className="text-xs text-slate-500 mb-1">
                            {concept.code} · {concept.archetype} · Сложность риггинга: {concept.rigging.level} (~{concept.rigging.estimatedLayers} слоёв)
                          </div>
                          <h3 className="text-2xl font-bold text-slate-900">
                            0{concept.id}. {concept.title}
                          </h3>
                          <p className="text-sm text-slate-600 mt-1">{concept.subtitle}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleInspectInRig(concept.id)}
                            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
                          >
                            <Layers className="w-3.5 h-3.5 text-violet-600" />
                            <span>Проверить в 2.5D-риге</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectForStage2(concept.id)}
                            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-violet-600 text-white'
                                : 'bg-slate-900 text-white hover:bg-slate-800'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                            <span>{isSelected ? 'Выбран как основной' : `Выбрать Концепт №${concept.id}`}</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        <div className="lg:col-span-5 space-y-3">
                          <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                            {!hasImgError ? (
                              <img
                                src={concept.imagePath}
                                alt={`Концепт ${concept.id}: ${concept.title}`}
                                referrerPolicy="no-referrer"
                                onError={() =>
                                  setImageErrors((prev) => ({ ...prev, [concept.id]: true }))
                                }
                                className="w-full h-auto object-contain bg-[#FAF9FC]"
                              />
                            ) : (
                              <div className="aspect-[3/4] w-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-white to-violet-50">
                                <Sparkles className="w-8 h-8 text-violet-600 mb-2" />
                                <div className="font-semibold text-slate-900">{concept.title}</div>
                              </div>
                            )}

                            <div className="p-3 bg-white/95 border-t border-slate-200 flex items-center justify-between gap-2">
                              <span className="text-xs text-slate-600">
                                7. Лист персонажа ({concept.code})
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setLightboxData({
                                    title: concept.title,
                                    subtitle: `${concept.code} · Лист персонажа`,
                                    imagePath: concept.imagePath
                                  })
                                }
                                className="px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-50 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
                              >
                                <ZoomIn className="w-3.5 h-3.5" />
                                <span>Увеличить арт</span>
                              </button>
                            </div>
                          </div>

                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-800">
                                4. Палитра концепта ({concept.palette.length} цветов HEX)
                              </span>
                              <span className="text-slate-500">Нажмите для копирования</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {concept.palette.map((swatch) => (
                                <button
                                  key={swatch.hex}
                                  type="button"
                                  onClick={() => handleCopyHex(swatch.hex)}
                                  className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-slate-200 hover:border-violet-400 text-left transition-colors"
                                >
                                  <span
                                    className="w-6 h-6 rounded-md border border-slate-300 shrink-0"
                                    style={{ backgroundColor: swatch.hex }}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="font-mono text-xs font-semibold text-slate-900 flex items-center justify-between">
                                      <span>{swatch.hex}</span>
                                      {copiedHex === swatch.hex ? (
                                        <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                      ) : (
                                        <Copy className="w-3 h-3 text-slate-400 shrink-0" />
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-500 truncate">
                                      {swatch.name}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="lg:col-span-7 space-y-5">
                          <div className="pb-4 border-b border-slate-200">
                            <h4 className="text-xs font-semibold text-violet-700 mb-1">
                              1. Название и идея образа
                            </h4>
                            <p className="text-sm text-slate-800 leading-relaxed">
                              {concept.ideaSummary}
                            </p>
                          </div>

                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                            <div className="font-semibold text-slate-900">
                              6. Оценка риггинг-сложности: {concept.rigging.level} (~{concept.rigging.estimatedLayers} слоёв)
                            </div>
                            <p className="text-slate-700">{concept.rigging.summary}</p>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section id="rig-prototype" className="space-y-4">
              <Live2DPrototypeRig concept={activeRigConcept} />
            </section>

            <ComparisonMatrix
              concepts={ALISA_CONCEPTS}
              selectedConceptId={selectedConceptId}
              onSelectConcept={handleSelectForStage2}
              onInspectConcept={handleInspectInRig}
            />

            <Stage1ApprovalForm
              selectedConceptId={selectedConceptId}
              onSelectConcept={handleSelectForStage2}
            />
          </div>
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-5 mt-12">
        <div className="max-w-[1380px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            Алиса AI — Студия проектирования 2.5D Live2D VTuber-аватара · Этап 3 (Подготовка к риггингу)
          </div>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setActiveStageTab('stage3')} className="hover:text-slate-900">
              Этап 3 (Риггинг)
            </button>
            <span>·</span>
            <button type="button" onClick={() => setActiveStageTab('stage2')} className="hover:text-slate-900">
              Этап 2 (Финальный арт)
            </button>
            <span>·</span>
            <button type="button" onClick={() => setActiveStageTab('stage1')} className="hover:text-slate-900">
              Этап 1 (Архив 5 концептов)
            </button>
          </div>
        </div>
      </footer>

      {/* Universal Reference Sheet Lightbox Modal with PSD Layer Slice Grid Toggle */}
      {lightboxData && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Просмотр листа ${lightboxData.title}`}
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs text-slate-500">{lightboxData.subtitle}</div>
                <h3 className="text-base font-bold text-slate-900">{lightboxData.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowLayerSlicesOverlay((v) => !v)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    showLayerSlicesOverlay
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>{showLayerSlicesOverlay ? 'Скрыть сетку зон PSD' : 'Показать сетку зон PSD'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxData(null)}
                  aria-label="Закрыть просмотр"
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 flex justify-center relative">
              <div className="relative max-w-4xl w-full">
                <img
                  src={lightboxData.imagePath}
                  alt={lightboxData.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-auto rounded-lg border border-slate-200 bg-white"
                />
                {showLayerSlicesOverlay && (
                  <div className="absolute inset-0 pointer-events-none border-2 border-violet-500/70 rounded-lg">
                    <div className="absolute top-[6%] left-[6%] w-[88%] h-[58%] border border-dashed border-violet-600 bg-violet-500/10 rounded p-1.5 text-[10px] font-mono text-violet-950">
                      HEAD_AND_HAIR_GROUP (±30° X/Y/Z · No Halo · Ahoge Physics)
                    </div>
                    <div className="absolute bottom-[6%] left-[6%] w-[88%] h-[28%] border border-dashed border-indigo-600 bg-indigo-500/10 rounded p-1.5 text-[10px] font-mono text-indigo-950">
                      SHOULDERS_AND_COLLAR_GROUP (Bust-Up Framing · ParamBreath & ParamShoulder)
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

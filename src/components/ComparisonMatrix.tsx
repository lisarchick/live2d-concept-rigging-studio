import React from 'react';
import { ConceptSpec } from '../data/conceptsData';
import { Check, Award } from 'lucide-react';

interface ComparisonMatrixProps {
  concepts: ConceptSpec[];
  selectedConceptId: number;
  onSelectConcept: (id: number) => void;
  onInspectConcept: (id: number) => void;
}

export const ComparisonMatrix: React.FC<ComparisonMatrixProps> = ({
  concepts,
  selectedConceptId,
  onSelectConcept,
  onInspectConcept
}) => {
  return (
    <section id="comparison" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            Сводный анализ · 5 макетов · Силуэт, тембр и сложность производства
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Сравнительная таблица концептов «Алиса AI»
          </h2>
        </div>
        <p className="text-sm text-slate-600 max-w-xl">
          Оценка учитывает читаемость эмоции при поворотах ±30°, трудоёмкость нарезки слоёв в PSD и соответствие спокойному, тёплому и умному голосу с лёгкой игривостью.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3.5 px-4">Концепт</th>
                <th className="py-3.5 px-4">Стиль и силуэт</th>
                <th className="py-3.5 px-4">Настроение</th>
                <th className="py-3.5 px-4">Сложность риггинга</th>
                <th className="py-3.5 px-4 text-right font-mono tabular-nums">Слои PSD</th>
                <th className="py-3.5 px-4">Соответствие голосу Алисы</th>
                <th className="py-3.5 px-4 text-right">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {concepts.map((concept) => {
                const isSelected = concept.id === selectedConceptId;
                return (
                  <tr
                    key={concept.id}
                    className={`transition-colors ${
                      isSelected ? 'bg-violet-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        <span className="font-mono text-xs text-violet-700 tabular-nums">0{concept.id}.</span>
                        <button
                          type="button"
                          onClick={() => onInspectConcept(concept.id)}
                          className="text-left hover:underline focus:outline-none"
                        >
                          {concept.title}
                        </button>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {concept.archetype}
                        {concept.isRecommended ? ' · Рекомендация арт-директора' : ''}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{concept.comparisonRow.style}</td>
                    <td className="py-3.5 px-4 text-slate-700">{concept.comparisonRow.mood}</td>
                    <td className="py-3.5 px-4 text-slate-800 font-medium">
                      {concept.comparisonRow.riggingComplexity}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                      ~{concept.rigging.estimatedLayers}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{concept.comparisonRow.voiceFit}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectConcept(concept.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-violet-600 text-white'
                            : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        {isSelected ? 'Выбран для Этапа 2' : `Выбрать №${concept.id}`}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Art Director Recommendation Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-4xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-violet-700">
              <Award className="w-4 h-4" />
              <span>Вердикт ведущего арт-директора и технического художника Live2D</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Рекомендация: Концепт №1 «Домашний Нео-Уют» (или гибрид Концепта №1 + №5)
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              <strong>Почему Концепт №1 — лучший выбор для старта производства:</strong> Голос Алисы — спокойный, тёплый, дружелюбный и умный, без холодной роботизированности. В <strong>Концепте №1</strong> мягкое волнистое каре до плеч и уютный белый кардиган мгновенно считываются как эмпатия и теплота, а парящий неоново-фиолетовый обруч и светящийся кант-эквалайзер добавляют узнаваемый «дух ИИ». С точки зрения <strong>Live2D Cubism</strong>, длина волос до плеч и закрытый ворот водолазки дают чистые повороты на ±30° без пересечений с руками, позволяя вложить максимум ресурсов в <strong>богатую мимику глаз, рта и 13 эмоций</strong>.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              <strong>Идея для идеального гибрида:</strong> Взять за основу <strong>Концепт №1</strong>, но добавить <strong>внутреннее тёмно-фиолетовое окрашивание прядей из Концепта №2</strong> (для глубокого 2.5D-объёма при повороте головы) и <strong>отключаемые на отдельном слое смарт-очки из Концепта №5</strong> (для режима «серьёзной аналитики / работы»).
            </p>
          </div>
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => onSelectConcept(1)}
              className="px-4 py-2.5 text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Выбрать рекомендованный Концепт №1
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

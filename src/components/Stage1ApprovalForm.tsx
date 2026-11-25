import React, { useState } from 'react';
import { ALISA_CONCEPTS, CUSTOMIZATION_OPTIONS } from '../data/conceptsData';
import { generateStage1ConfirmationBrief } from '../utils/conceptLogic';
import { Copy, Check, Lock, ArrowRight } from 'lucide-react';

interface Stage1ApprovalFormProps {
  selectedConceptId: number;
  onSelectConcept: (id: number) => void;
}

export const Stage1ApprovalForm: React.FC<Stage1ApprovalFormProps> = ({
  selectedConceptId,
  onSelectConcept
}) => {
  const [selectedCustomizations, setSelectedCustomizations] = useState<string[]>([
    'halo_indicator',
    'inner_hair_color',
    'glasses_toggle'
  ]);
  const [customNotes, setCustomNotes] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isLockedIn, setIsLockedIn] = useState<boolean>(false);

  const toggleCustomization = (id: string) => {
    setSelectedCustomizations((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const generatedBrief = generateStage1ConfirmationBrief(
    selectedConceptId,
    selectedCustomizations,
    customNotes,
    CUSTOMIZATION_OPTIONS
  );

  const handleCopyBrief = async () => {
    try {
      await navigator.clipboard.writeText(generatedBrief);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConfirmSelection = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLockedIn(true);
  };

  const currentConcept =
    ALISA_CONCEPTS.find((c) => c.id === selectedConceptId) ?? ALISA_CONCEPTS[0];

  return (
    <section id="approval" className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            Точка принятия решения · Переход от Этапа 1 к Этапу 2 (только после подтверждения)
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Какой макет выбираем и что изменить перед Этапом 2?
          </h2>
        </div>
        <div className="text-xs text-slate-600 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-violet-600" />
          <span>Этапы 2–5 ожидают вашего подтверждения концепта</span>
        </div>
      </div>

      <form onSubmit={handleConfirmSelection} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-5">
          {/* Step 1: Pick Base Concept */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-2">
              1. Выберите базовый макет (1–5):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {ALISA_CONCEPTS.map((c) => {
                const active = c.id === selectedConceptId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onSelectConcept(c.id);
                      setIsLockedIn(false);
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-colors ${
                      active
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-mono text-xs tabular-nums opacity-80">№{c.id}</div>
                    <div className="text-xs font-semibold truncate mt-0.5">
                      {c.title.split(' (')[0]}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Hybrid & Detail Toggles */}
          <div>
            <span className="block text-xs font-semibold text-slate-800 mb-2">
              2. Комбинация деталей из разных концептов (по желанию):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CUSTOMIZATION_OPTIONS.map((opt) => {
                const checked = selectedCustomizations.includes(opt.id);
                return (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                      checked
                        ? 'bg-violet-50/70 border-violet-300 text-slate-900'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        toggleCustomization(opt.id);
                        setIsLockedIn(false);
                      }}
                      className="mt-0.5 accent-violet-600"
                    />
                    <span className="leading-snug">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Step 3: Custom Notes */}
          <div>
            <label
              htmlFor="custom-stage2-notes"
              className="block text-xs font-semibold text-slate-800 mb-1.5"
            >
              3. Ваши комментарии и правки к выбранному макету (длина волос, форма глаз, одежда, оттенки):
            </label>
            <textarea
              id="custom-stage2-notes"
              rows={3}
              value={customNotes}
              onChange={(e) => {
                setCustomNotes(e.target.value);
                setIsLockedIn(false);
              }}
              placeholder="Например: Берём Концепт 1 за основу, но сделаем юбку как в Концепте 3 и добавим отключаемые очки..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-violet-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              className="px-4 py-2.5 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
            >
              <span>Зафиксировать ТЗ для Этапа 2</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleCopyBrief}
              className="px-4 py-2.5 text-xs font-medium bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Скопировано в буфер' : 'Скопировать текст ответа для чата'}</span>
            </button>
          </div>
        </div>

        {/* Live Brief Preview Box */}
        <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Сводка выбора для Этапа 2</span>
              <span className="font-mono text-violet-700">{currentConcept.code}</span>
            </div>
            <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed bg-white border border-slate-200 rounded-lg p-3.5">
              {generatedBrief}
            </pre>
          </div>

          {isLockedIn ? (
            <div
              role="status"
              className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 text-xs text-emerald-900"
            >
              <strong>Выбор зафиксирован:</strong> {currentConcept.title}. Скопируйте сводку выше и отправьте её в чат, чтобы я перешёл к <strong>Этапу 2 (Развороты 0° / 3/4 / Профиль + 8 эмоций + крупные планы глаз, рта и рук)</strong>!
            </div>
          ) : (
            <div className="text-xs text-slate-500 leading-relaxed">
              Напоминание по регламенту проекта: <strong>Этап 2 (Доработка концепта), Этап 3 (Схема слоёв PSD и деформеров), Этап 4 (Анимация и липсинк) и Этап 5 (Интеграция SDK)</strong> будут запущены строго после вашего ответа в чате.
            </div>
          )}
        </div>
      </form>
    </section>
  );
};

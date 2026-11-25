import React, { useMemo, useState } from 'react';
import { Check, Clock, RotateCcw, X } from 'lucide-react';
import type { ProblemSolutionData } from '../../types/platform.ts';

interface Props {
  data: ProblemSolutionData;
}

export const ProblemSolutionView: React.FC<Props> = ({ data }) => {
  const [tab, setTab] = useState<'guide' | 'sorting' | 'checklist'>('guide');
  const [checkedSolutions, setCheckedSolutions] = useState<Record<number, boolean>>({});

  const sortingCards = useMemo(
    () => [
      ...data.mistakesPoints.map((text, idx) => ({
        id: `m-${idx}`,
        text,
        group: 'mistakes' as const,
      })),
      ...data.solutionPoints.slice(0, 4).map((text, idx) => ({
        id: `s-${idx}`,
        text,
        group: 'solution' as const,
      })),
    ].sort((a, b) => a.text.localeCompare(b.text)),
    [data]
  );

  const [sortIdx, setSortIdx] = useState(0);
  const [sortFeedback, setSortFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [sortScore, setSortScore] = useState(0);
  const [sortDone, setSortDone] = useState(false);

  const currentSortCard = sortingCards[sortIdx];

  const handleSortChoice = (choice: 'mistakes' | 'solution') => {
    if (sortFeedback !== null) return;
    const isCorrect = currentSortCard.group === choice;
    setSortFeedback(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) setSortScore((s) => s + 1);
    setTimeout(() => {
      setSortFeedback(null);
      if (sortIdx + 1 < sortingCards.length) {
        setSortIdx((i) => i + 1);
      } else {
        setSortDone(true);
      }
    }, 650);
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--platform-border)] pb-4">
        <div className="inline-flex items-center gap-1 rounded-xl bg-[var(--platform-surface-muted)] p-1">
          <button
            type="button"
            onClick={() => setTab('guide')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
              tab === 'guide'
                ? 'bg-[var(--platform-surface)] text-[var(--platform-text)] shadow-sm'
                : 'text-[var(--platform-text-muted)]'
            }`}
          >
            #مشكلة وحل
          </button>
          <button
            type="button"
            onClick={() => setTab('sorting')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
              tab === 'sorting'
                ? 'bg-[var(--platform-surface)] text-[var(--platform-text)] shadow-sm'
                : 'text-[var(--platform-text-muted)]'
            }`}
          >
            {data.mistakesTitle} / {data.solutionTitle}
          </button>
          <button
            type="button"
            onClick={() => setTab('checklist')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
              tab === 'checklist'
                ? 'bg-[var(--platform-surface)] text-[var(--platform-text)] shadow-sm'
                : 'text-[var(--platform-text-muted)]'
            }`}
          >
            {data.solutionTitle}
          </button>
        </div>

        <div className="inline-flex items-center gap-2 text-sm font-bold text-[#0E7490] tabular-nums">
          <Clock className="w-4 h-4" />
          <span>{data.scheduleLabel}</span>
        </div>
      </div>

      {tab === 'guide' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--platform-border)] bg-[var(--platform-surface-muted)] p-6 text-lg sm:text-xl font-bold leading-relaxed">
            {data.intro}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Why */}
            <div className="rounded-2xl border border-[#0E7490]/25 bg-[var(--platform-surface)] p-6 space-y-4">
              <h4 className="inline-block rounded-xl bg-[#0E7490] px-4 py-2 text-base font-bold text-white">
                {data.whyTitle}
              </h4>
              <ul className="space-y-2.5 text-base font-semibold">
                {data.whyPoints.map((pt) => (
                  <li key={pt} className="flex items-start gap-2.5">
                    <span className="mt-2 h-2 w-2 rounded-full bg-[#0E7490] shrink-0" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Mistakes */}
            <div className="rounded-2xl border border-[#DC2626]/25 bg-[var(--platform-surface)] p-6 space-y-4">
              <h4 className="inline-block rounded-xl bg-[#DC2626] px-4 py-2 text-base font-bold text-white">
                {data.mistakesTitle}
              </h4>
              <ul className="space-y-2.5 text-base font-semibold">
                {data.mistakesPoints.map((pt) => (
                  <li key={pt} className="flex items-start gap-2.5">
                    <X className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Practical Solution + Remember */}
          <div className="rounded-2xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-6 space-y-5">
            <h4 className="inline-block rounded-xl bg-[#0E7490] px-5 py-2 text-lg font-bold text-white">
              {data.solutionTitle}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.solutionPoints.map((pt) => (
                <div
                  key={pt}
                  className="flex items-start gap-2.5 rounded-xl bg-[var(--platform-surface-muted)] p-3.5 text-base font-semibold"
                >
                  <Check className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <span>{pt}</span>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-5 text-slate-900 space-y-2">
              <div className="inline-block rounded-lg bg-amber-400 px-3 py-1 text-sm font-extrabold">
                {data.rememberTitle}
              </div>
              {data.rememberLines.map((line) => (
                <p key={line} className="text-base font-bold">
                  {line}
                </p>
              ))}
            </div>
          </div>

          {/* What to Expect */}
          <div className="rounded-2xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-6 space-y-5">
            <h4 className="text-xl font-extrabold text-[#0E7490]">{data.expectTitle}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 text-slate-900 space-y-3">
                <div className="font-bold text-rose-800">{data.firstDaysTitle}</div>
                <ul className="space-y-1.5 font-semibold">
                  {data.firstDaysPoints.map((pt) => (
                    <li key={pt}>• {pt}</li>
                  ))}
                </ul>
                <div className="pt-2 border-t border-rose-200 text-sm">
                  <span className="font-extrabold text-rose-700">{data.naturalNoteTitle} </span>
                  <span>{data.naturalNoteText}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 text-slate-900 space-y-3">
                <div className="font-bold text-emerald-800">{data.gradualTitle}</div>
                <ul className="space-y-2 font-semibold">
                  {data.gradualPoints.map((pt) => (
                    <li key={pt} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-700" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-xl bg-[var(--platform-surface-muted)] p-4 text-center text-lg font-extrabold">
              {data.closingQuote}
            </div>
          </div>
        </div>
      )}

      {tab === 'sorting' && (
        <div className="mx-auto max-w-xl rounded-3xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-6 sm:p-8 text-center space-y-6">
          {sortDone ? (
            <div className="space-y-5">
              <div className="text-3xl font-extrabold tabular-nums">
                {sortScore} / {sortingCards.length}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSortIdx(0);
                  setSortScore(0);
                  setSortDone(false);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0E7490] px-6 py-3 font-bold text-white"
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة</span>
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm text-[var(--platform-text-muted)] tabular-nums">
                <span>
                  {sortIdx + 1} / {sortingCards.length}
                </span>
                <span>
                  {sortScore} / {sortingCards.length}
                </span>
              </div>

              <div
                className={`rounded-2xl border-2 p-6 text-xl sm:text-2xl font-bold transition-colors ${
                  sortFeedback === 'correct'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                    : sortFeedback === 'wrong'
                      ? 'border-rose-600 bg-rose-50 text-rose-900'
                      : 'border-[var(--platform-border)] bg-[var(--platform-surface-muted)]'
                }`}
              >
                {currentSortCard.text}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleSortChoice('solution')}
                  className="rounded-2xl border-2 border-[#0E7490] bg-[#0E7490] px-5 py-4 text-base font-bold text-white hover:opacity-95"
                >
                  {data.solutionTitle}
                </button>
                <button
                  type="button"
                  onClick={() => handleSortChoice('mistakes')}
                  className="rounded-2xl border-2 border-[#DC2626] bg-[#DC2626] px-5 py-4 text-base font-bold text-white hover:opacity-95"
                >
                  {data.mistakesTitle}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'checklist' && (
        <div className="mx-auto max-w-2xl rounded-3xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-extrabold text-[#0E7490]">{data.solutionTitle}</h3>
            <span className="text-sm font-bold tabular-nums text-[var(--platform-text-muted)]">
              {Object.values(checkedSolutions).filter(Boolean).length} / {data.solutionPoints.length}
            </span>
          </div>

          <div className="space-y-3">
            {data.solutionPoints.map((pt, idx) => {
              const checked = Boolean(checkedSolutions[idx]);
              return (
                <button
                  key={pt}
                  type="button"
                  onClick={() =>
                    setCheckedSolutions((prev) => ({ ...prev, [idx]: !prev[idx] }))
                  }
                  className={`w-full flex items-center gap-3 rounded-2xl border-2 px-5 py-4 text-right text-base sm:text-lg font-bold transition-colors ${
                    checked
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                      : 'border-[var(--platform-border)] bg-[var(--platform-surface-muted)]'
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 ${
                      checked
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-400 bg-white'
                    }`}
                  >
                    {checked && <Check className="w-4 h-4" />}
                  </span>
                  <span>{pt}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

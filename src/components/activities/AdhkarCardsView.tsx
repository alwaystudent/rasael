import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, RotateCcw, ArrowRight, ArrowLeft } from 'lucide-react';
import type { DhikrItem, ThemeMotif } from '../../types/platform.ts';
import { playSoftChime } from '../../services/rewardsStorage.ts';

interface Props {
  items: DhikrItem[];
  motif: ThemeMotif;
  soundEnabled?: boolean;
  onComplete?: () => void;
}

export const AdhkarCardsView: React.FC<Props> = ({
  items,
  motif,
  soundEnabled = true,
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const completionFiredRef = useRef(false);

  const completedTotal = items.filter((item) => (counts[item.id] ?? 0) >= item.repeatCount).length;

  useEffect(() => {
    if (completionFiredRef.current) return;
    if (items.length > 0 && completedTotal === items.length) {
      completionFiredRef.current = true;
      onComplete?.();
    }
  }, [completedTotal, items.length, onComplete]);

  if (!items.length) return null;

  const current = items[currentIndex];
  const currentTapCount = counts[current.id] ?? 0;
  const isDone = currentTapCount >= current.repeatCount;
  const isEvening = motif === 'evening';

  const handleTap = () => {
    if (isDone) return;
    const nextVal = currentTapCount + 1;
    if (nextVal >= current.repeatCount) {
      playSoftChime('success', soundEnabled);
    } else {
      playSoftChime('tap', soundEnabled);
    }
    setCounts((prev) => ({ ...prev, [current.id]: nextVal }));
  };

  const handleResetAll = () => {
    setCounts({});
    setCurrentIndex(0);
    completionFiredRef.current = false;
  };

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="space-y-3 border-b border-[var(--platform-border)] pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm font-bold text-[var(--platform-text-muted)] tabular-nums">
            {completedTotal} / {items.length}
          </div>
          <button
            type="button"
            onClick={handleResetAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--platform-border)] px-3 py-1.5 text-xs font-semibold hover:opacity-80"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة</span>
          </button>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--platform-surface-muted)]">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isEvening ? 'bg-[#F59E0B]' : 'bg-[#0E7490]'
            }`}
            style={{ width: `${Math.round((completedTotal / items.length) * 100)}%` }}
          />
        </div>
      </div>

      {/* Main Card Styled After Morning/Evening PDFs */}
      <motion.div
        key={current.id}
        initial={{ opacity: 0.78, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className={`mx-auto max-w-2xl rounded-3xl border-2 p-7 sm:p-10 text-center space-y-6 shadow-sm transition-colors ${
          isEvening
            ? 'border-[#FBBF24]/50 bg-[#1E3A5F] text-white'
            : 'border-[#0284C7]/30 bg-[#F0F9FF] text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-base font-extrabold tabular-nums ${
              isEvening ? 'bg-[#FBBF24] text-slate-900' : 'bg-[#F59E0B] text-white'
            }`}
          >
            {current.number}
          </span>
          {current.repeatLabel && (
            <span
              className={`font-amiri text-lg font-bold ${
                isEvening ? 'text-[#FDE68A]' : 'text-[#00732F]'
              }`}
            >
              {current.repeatLabel}
            </span>
          )}
        </div>

        <p
          className={`font-amiri text-2xl sm:text-3xl leading-[2.1] font-bold ${
            isEvening ? 'text-white' : 'text-slate-900'
          }`}
        >
          {current.text}
        </p>

        {current.source && (
          <p
            className={`text-sm font-semibold ${
              isEvening ? 'text-[#BAE6FD]' : 'text-[#0E7490]'
            }`}
          >
            {current.source}
          </p>
        )}

        {/* Interactive Counter Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleTap}
            className={`inline-flex items-center justify-center gap-3 rounded-2xl px-8 py-4 text-lg font-extrabold tabular-nums shadow-sm transition-transform active:scale-95 ${
              isDone
                ? 'bg-emerald-600 text-white'
                : isEvening
                  ? 'bg-[#FBBF24] text-slate-900 hover:bg-[#F59E0B]'
                  : 'bg-[#0E7490] text-white hover:opacity-95'
            }`}
          >
            {isDone && <CheckCircle2 className="w-6 h-6" />}
            <span>
              {currentTapCount} / {current.repeatCount}
            </span>
          </button>
        </div>
      </motion.div>

      {/* Prev / Next Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((i) => i - 1)}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] px-4 py-2.5 text-sm font-semibold disabled:opacity-40 whitespace-nowrap"
        >
          <ArrowRight className="w-4 h-4" />
          <span>السابق</span>
        </button>

        <span className="text-sm font-bold tabular-nums text-[var(--platform-text-muted)]">
          {currentIndex + 1} / {items.length}
        </span>

        <button
          type="button"
          disabled={currentIndex === items.length - 1}
          onClick={() => setCurrentIndex((i) => i + 1)}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] px-4 py-2.5 text-sm font-semibold disabled:opacity-40 whitespace-nowrap"
        >
          <span>التالي</span>
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Card Grid Index */}
      <div className="grid grid-cols-5 sm:grid-cols-9 gap-2">
        {items.map((item, idx) => {
          const itemDone = (counts[item.id] ?? 0) >= item.repeatCount;
          const isCurrent = idx === currentIndex;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`h-10 rounded-lg text-sm font-bold tabular-nums transition-colors ${
                isCurrent
                  ? 'bg-[var(--platform-accent)] text-white'
                  : itemDone
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-[var(--platform-surface-muted)] text-[var(--platform-text)] hover:opacity-80'
              }`}
            >
              {item.number}
            </button>
          );
        })}
      </div>
    </div>
  );
};

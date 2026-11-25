import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, RotateCcw, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';
import type { QAItem } from '../../types/platform.ts';
import { playSoftChime } from '../../services/rewardsStorage.ts';

interface Props {
  items: QAItem[];
  author?: string;
  soundEnabled?: boolean;
  onComplete?: () => void;
}

export const AqeedahFlashcardsView: React.FC<Props> = ({
  items,
  author,
  soundEnabled = true,
  onComplete,
}) => {
  const [mode, setMode] = useState<'cards' | 'quiz'>('cards');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [completedIds, setCompletedIds] = useState<Record<string, boolean>>({});
  const completionFiredRef = useRef(false);

  // Quiz state built strictly verbatim from the 25 Q&A items
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const quizQuestions = useMemo(() => {
    return items.map((item, idx) => {
      const otherAnswers = items
        .filter((other) => other.id !== item.id && other.answer !== item.answer)
        .map((other) => other.answer);
      const uniqueDistractors = Array.from(new Set(otherAnswers));
      const d1 = uniqueDistractors[(idx * 3 + 1) % uniqueDistractors.length] || item.answer;
      const d2 = uniqueDistractors[(idx * 5 + 2) % uniqueDistractors.length] || item.answer;
      const options = Array.from(new Set([item.answer, d1, d2]));
      // Deterministic rotation so correct option isn't always first
      const shift = idx % options.length;
      const rotated = [...options.slice(shift), ...options.slice(0, shift)];
      return {
        id: item.id,
        number: item.number,
        question: item.question,
        correctAnswer: item.answer,
        options: rotated,
      };
    });
  }, [items]);

  const completedCount = Object.values(completedIds).filter(Boolean).length;

  useEffect(() => {
    if (completionFiredRef.current) return;
    if (quizFinished || (items.length > 0 && completedCount === items.length)) {
      completionFiredRef.current = true;
      onComplete?.();
    }
  }, [quizFinished, completedCount, items.length, onComplete]);

  if (!items.length) return null;

  const currentCard = items[currentIndex];

  const handleRevealToggle = () => {
    const nextState = !revealed;
    setRevealed(nextState);
    if (nextState) {
      playSoftChime('tap', soundEnabled);
      setCompletedIds((prev) => ({ ...prev, [currentCard.id]: true }));
    }
  };

  const goCard = (nextIdx: number) => {
    setCurrentIndex(nextIdx);
    setRevealed(false);
  };

  const currentQuiz = quizQuestions[quizIndex];

  const handleSelectQuizOption = (opt: string) => {
    if (selectedOption !== null) return;
    setSelectedOption(opt);
    if (opt === currentQuiz.correctAnswer) {
      playSoftChime('success', soundEnabled);
      setScore((s) => s + 1);
    }
  };

  const handleNextQuiz = () => {
    if (quizIndex + 1 < quizQuestions.length) {
      setQuizIndex((q) => q + 1);
      setSelectedOption(null);
    } else {
      setQuizFinished(true);
    }
  };

  const handleResetQuiz = () => {
    setQuizIndex(0);
    setSelectedOption(null);
    setScore(0);
    setQuizFinished(false);
  };

  return (
    <div className="space-y-6">
      {/* Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="inline-flex items-center gap-1 rounded-xl bg-[var(--platform-surface-muted)] p-1">
          <button
            type="button"
            onClick={() => setMode('cards')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              mode === 'cards'
                ? 'bg-[var(--platform-surface)] text-[var(--platform-text)] shadow-sm'
                : 'text-[var(--platform-text-muted)] hover:text-[var(--platform-text)]'
            }`}
          >
            البطاقات التفاعلية ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setMode('quiz')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              mode === 'quiz'
                ? 'bg-[var(--platform-surface)] text-[var(--platform-text)] shadow-sm'
                : 'text-[var(--platform-text-muted)] hover:text-[var(--platform-text)]'
            }`}
          >
            اختبار ({items.length})
          </button>
        </div>

        <div className="flex items-center gap-3 text-sm text-[var(--platform-text-muted)] tabular-nums">
          {author && <span>{author}</span>}
          {author && <span aria-hidden="true">·</span>}
          <span>
            {completedCount} / {items.length}
          </span>
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--platform-surface-muted)]">
        <div
          className="h-full rounded-full bg-[#0E7490] transition-all duration-300"
          style={{
            width: `${
              mode === 'cards'
                ? Math.round((completedCount / items.length) * 100)
                : Math.round(((quizIndex + (quizFinished ? 1 : 0)) / quizQuestions.length) * 100)
            }%`,
          }}
        />
      </div>

      {mode === 'cards' ? (
        <div className="space-y-6">
          {/* Circular Ocean Card Inspired by PDF */}
          <motion.div
            key={currentCard.id}
            initial={{ opacity: 0.75, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="mx-auto max-w-xl rounded-3xl border-4 border-[#0E7490] bg-white p-8 sm:p-12 text-center shadow-sm text-slate-900"
          >
            <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#0E7490] text-xl font-bold text-[#0E7490] tabular-nums">
              {currentCard.number}
            </div>

            <h3 className="font-amiri text-2xl sm:text-3xl font-bold leading-relaxed text-[#0E7490] mb-6">
              {currentCard.question}
            </h3>

            {revealed ? (
              <div className="my-6 rounded-2xl bg-[#F0F9FF] px-6 py-5 border border-[#BAE6FD]">
                <p className="font-amiri text-2xl sm:text-3xl font-bold text-[#9D174D] leading-relaxed">
                  {currentCard.answer}
                </p>
              </div>
            ) : (
              <div className="my-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-5 text-slate-500">
                ؟
              </div>
            )}

            <button
              type="button"
              onClick={handleRevealToggle}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0E7490] px-6 py-3 text-base font-bold text-white hover:opacity-95 transition-opacity whitespace-nowrap active:scale-[0.98]"
            >
              {revealed ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              <span>{revealed ? 'إخفاء' : 'عرض'}</span>
            </button>
          </motion.div>

          {/* Navigation + Number Strip */}
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => goCard(currentIndex - 1)}
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
              onClick={() => goCard(currentIndex + 1)}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] px-4 py-2.5 text-sm font-semibold disabled:opacity-40 whitespace-nowrap"
            >
              <span>التالي</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-9 md:grid-cols-13 gap-2 pt-2">
            {items.map((item, idx) => {
              const isCurrent = idx === currentIndex;
              const isDone = Boolean(completedIds[item.id]);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goCard(idx)}
                  className={`h-10 rounded-lg text-sm font-bold tabular-nums transition-colors ${
                    isCurrent
                      ? 'bg-[#0E7490] text-white'
                      : isDone
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
      ) : quizFinished ? (
        <div className="mx-auto max-w-lg rounded-3xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-8 text-center space-y-5">
          <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto" />
          <div className="text-3xl font-extrabold tabular-nums">
            {score} / {quizQuestions.length}
          </div>
          <button
            type="button"
            onClick={handleResetQuiz}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0E7490] px-6 py-3 font-bold text-white whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" />
            <span>إعادة</span>
          </button>
        </div>
      ) : (
        <div className="mx-auto max-w-xl rounded-3xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between text-sm text-[var(--platform-text-muted)] tabular-nums">
            <span>
              {quizIndex + 1} / {quizQuestions.length}
            </span>
            <span>
              {score} / {quizQuestions.length}
            </span>
          </div>

          <h3 className="font-amiri text-2xl sm:text-3xl font-bold leading-relaxed">
            {currentQuiz.question}
          </h3>

          <div className="space-y-3">
            {currentQuiz.options.map((opt) => {
              const isSelected = selectedOption === opt;
              const isCorrect = opt === currentQuiz.correctAnswer;
              let btnStyle =
                'border-[var(--platform-border)] bg-[var(--platform-surface-muted)] hover:border-[#0E7490]';
              if (selectedOption !== null) {
                if (isCorrect) {
                  btnStyle = 'border-emerald-600 bg-emerald-50 text-emerald-900';
                } else if (isSelected) {
                  btnStyle = 'border-rose-600 bg-rose-50 text-rose-900';
                }
              }

              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelectQuizOption(opt)}
                  className={`w-full rounded-2xl border-2 px-5 py-4 text-right font-amiri text-xl font-bold transition-colors ${btnStyle}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {selectedOption !== null && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleNextQuiz}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0E7490] px-6 py-3 text-sm font-bold text-white whitespace-nowrap"
              >
                <span>التالي</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

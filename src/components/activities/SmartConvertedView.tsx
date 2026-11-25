import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  RotateCcw,
} from 'lucide-react';
import type { SmartConvertedActivity } from '../../types/platform.ts';

interface Props {
  activity: SmartConvertedActivity;
  accentColor: string;
}

export const SmartConvertedView: React.FC<Props> = ({ activity, accentColor }) => {
  const hasFlashcards = activity.flashcards.length > 0;
  const hasQuiz = activity.quizQuestions.length > 0;
  const hasMatching = (activity.matchingPairs?.length || 0) > 0;
  const hasSections = activity.sections.length > 0 || activity.verbatimTextBlocks.length > 0;

  const initialTab = hasFlashcards
    ? 'flashcards'
    : hasQuiz
      ? 'quiz'
      : hasMatching
        ? 'matching'
        : 'sections';

  const [tab, setTab] = useState<'flashcards' | 'quiz' | 'matching' | 'sections'>(initialTab);
  const [cardIdx, setCardIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const [quizIdx, setQuizIdx] = useState(0);
  const [pickedOpt, setPickedOpt] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const currentCard = activity.flashcards[cardIdx];
  const currentQuiz = activity.quizQuestions[quizIdx];

  return (
    <div className="space-y-6">
      {/* Activity Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--platform-border)] pb-4">
        {hasFlashcards && (
          <button
            type="button"
            onClick={() => setTab('flashcards')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors whitespace-nowrap ${
              tab === 'flashcards'
                ? 'text-white shadow-sm'
                : 'bg-[var(--platform-surface-muted)] text-[var(--platform-text)]'
            }`}
            style={tab === 'flashcards' ? { backgroundColor: accentColor } : undefined}
          >
            البطاقات التفاعلية ({activity.flashcards.length})
          </button>
        )}
        {hasQuiz && (
          <button
            type="button"
            onClick={() => setTab('quiz')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors whitespace-nowrap ${
              tab === 'quiz'
                ? 'text-white shadow-sm'
                : 'bg-[var(--platform-surface-muted)] text-[var(--platform-text)]'
            }`}
            style={tab === 'quiz' ? { backgroundColor: accentColor } : undefined}
          >
            اختبار ({activity.quizQuestions.length})
          </button>
        )}
        {hasMatching && (
          <button
            type="button"
            onClick={() => setTab('matching')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors whitespace-nowrap ${
              tab === 'matching'
                ? 'text-white shadow-sm'
                : 'bg-[var(--platform-surface-muted)] text-[var(--platform-text)]'
            }`}
            style={tab === 'matching' ? { backgroundColor: accentColor } : undefined}
          >
            التوصيل ({activity.matchingPairs?.length})
          </button>
        )}
        {hasSections && (
          <button
            type="button"
            onClick={() => setTab('sections')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors whitespace-nowrap ${
              tab === 'sections'
                ? 'text-white shadow-sm'
                : 'bg-[var(--platform-surface-muted)] text-[var(--platform-text)]'
            }`}
            style={tab === 'sections' ? { backgroundColor: accentColor } : undefined}
          >
            المحتوى الكامل
          </button>
        )}
      </div>

      {/* Flashcards */}
      {tab === 'flashcards' && currentCard && (
        <div className="space-y-6">
          <div
            className="mx-auto max-w-xl rounded-3xl border-4 bg-white p-8 sm:p-10 text-center text-slate-900 space-y-6"
            style={{ borderColor: accentColor }}
          >
            <div className="text-sm font-bold text-slate-500 tabular-nums">
              {cardIdx + 1} / {activity.flashcards.length}
            </div>
            <h3 className="font-amiri text-2xl sm:text-3xl font-bold leading-relaxed">
              {currentCard.front}
            </h3>

            {revealed ? (
              <div className="rounded-2xl bg-sky-50 border border-sky-200 p-5 font-amiri text-2xl font-bold text-slate-900">
                {currentCard.back}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-slate-400">
                ؟
              </div>
            )}

            <button
              type="button"
              onClick={() => setRevealed((r) => !r)}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-bold text-white"
              style={{ backgroundColor: accentColor }}
            >
              {revealed ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              <span>{revealed ? 'إخفاء' : 'عرض'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              disabled={cardIdx === 0}
              onClick={() => {
                setCardIdx((i) => i - 1);
                setRevealed(false);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] px-4 py-2.5 text-sm font-semibold disabled:opacity-40"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق</span>
            </button>
            <button
              type="button"
              disabled={cardIdx === activity.flashcards.length - 1}
              onClick={() => {
                setCardIdx((i) => i + 1);
                setRevealed(false);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] px-4 py-2.5 text-sm font-semibold disabled:opacity-40"
            >
              <span>التالي</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Quiz */}
      {tab === 'quiz' && currentQuiz && (
        <div className="mx-auto max-w-xl rounded-3xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-6 sm:p-8 space-y-6">
          {quizDone ? (
            <div className="text-center space-y-5">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <div className="text-3xl font-extrabold tabular-nums">
                {quizScore} / {activity.quizQuestions.length}
              </div>
              <button
                type="button"
                onClick={() => {
                  setQuizIdx(0);
                  setPickedOpt(null);
                  setQuizScore(0);
                  setQuizDone(false);
                }}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-bold text-white"
                style={{ backgroundColor: accentColor }}
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة</span>
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm text-[var(--platform-text-muted)] tabular-nums">
                <span>
                  {quizIdx + 1} / {activity.quizQuestions.length}
                </span>
                <span>
                  {quizScore} / {activity.quizQuestions.length}
                </span>
              </div>

              <h3 className="font-amiri text-2xl font-bold leading-relaxed">
                {currentQuiz.prompt}
              </h3>

              <div className="space-y-3">
                {currentQuiz.options.map((opt, idx) => {
                  const isPicked = pickedOpt === idx;
                  const isCorrect = idx === currentQuiz.correctIndex;
                  let style =
                    'border-[var(--platform-border)] bg-[var(--platform-surface-muted)]';
                  if (pickedOpt !== null) {
                    if (isCorrect) style = 'border-emerald-600 bg-emerald-50 text-emerald-900';
                    else if (isPicked) style = 'border-rose-600 bg-rose-50 text-rose-900';
                  }
                  return (
                    <button
                      key={`${opt}-${idx}`}
                      type="button"
                      onClick={() => {
                        if (pickedOpt !== null) return;
                        setPickedOpt(idx);
                        if (idx === currentQuiz.correctIndex) setQuizScore((s) => s + 1);
                      }}
                      className={`w-full rounded-2xl border-2 px-5 py-4 text-right font-amiri text-xl font-bold transition-colors ${style}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {pickedOpt !== null && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (quizIdx + 1 < activity.quizQuestions.length) {
                        setQuizIdx((i) => i + 1);
                        setPickedOpt(null);
                      } else {
                        setQuizDone(true);
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    <span>التالي</span>
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Matching */}
      {tab === 'matching' && activity.matchingPairs && (
        <div className="rounded-3xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-6 space-y-6">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setMatches({});
                setSelectedLeft(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--platform-border)] px-3 py-1.5 text-xs font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              {activity.matchingPairs.map((pair) => {
                const isSelected = selectedLeft === pair.id;
                const matched = matches[pair.id];
                const isRight = matched === pair.right;
                return (
                  <button
                    key={pair.id}
                    type="button"
                    onClick={() => setSelectedLeft(pair.id)}
                    className={`w-full rounded-xl border-2 p-4 text-right font-bold transition-colors ${
                      isSelected
                        ? 'border-[#0284C7] bg-sky-50 text-slate-900'
                        : matched
                          ? isRight
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                            : 'border-rose-500 bg-rose-50 text-rose-900'
                          : 'border-[var(--platform-border)] bg-[var(--platform-surface-muted)]'
                    }`}
                  >
                    <div>{pair.left}</div>
                    {matched && <div className="mt-1 text-sm text-[#0284C7]">← {matched}</div>}
                  </button>
                );
              })}
            </div>
            <div className="space-y-3">
              {activity.matchingPairs.map((pair) => (
                <button
                  key={`r-${pair.id}`}
                  type="button"
                  onClick={() => {
                    if (!selectedLeft) return;
                    setMatches((prev) => ({ ...prev, [selectedLeft]: pair.right }));
                    setSelectedLeft(null);
                  }}
                  className="w-full rounded-xl border-2 border-[var(--platform-border)] bg-[var(--platform-surface-muted)] p-4 text-right font-bold hover:border-[#0284C7]"
                >
                  {pair.right}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Verbatim Sections */}
      {tab === 'sections' && (
        <div className="space-y-4">
          {activity.sections.length > 0
            ? activity.sections.map((sec) => (
                <div
                  key={sec.id}
                  className="rounded-2xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-6 space-y-3"
                >
                  {sec.heading && (
                    <h4 className="text-lg font-extrabold" style={{ color: accentColor }}>
                      {sec.heading}
                    </h4>
                  )}
                  <div className="space-y-2">
                    {sec.items.map((item, idx) => {
                      const key = `${sec.id}-${idx}`;
                      const checked = Boolean(checkedItems[key]);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() =>
                            setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }))
                          }
                          className={`w-full flex items-start gap-3 rounded-xl p-3 text-right font-amiri text-xl leading-relaxed transition-colors ${
                            checked
                              ? 'bg-emerald-50 text-emerald-900'
                              : 'bg-[var(--platform-surface-muted)]'
                          }`}
                        >
                          <span
                            className={`mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                              checked
                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                : 'border-slate-400 bg-white'
                            }`}
                          >
                            {checked && <Check className="w-3.5 h-3.5" />}
                          </span>
                          <span>{item}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            : activity.verbatimTextBlocks.map((block, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-6 font-amiri text-xl leading-relaxed whitespace-pre-wrap"
                >
                  {block}
                </div>
              ))}
        </div>
      )}
    </div>
  );
};

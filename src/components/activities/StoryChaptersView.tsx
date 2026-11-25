import React, { useState } from 'react';
import { ExternalLink, ArrowRight, ArrowLeft, CheckCircle2, RotateCcw } from 'lucide-react';
import type { StoryChapter, StoryLesson } from '../../types/platform.ts';

interface Props {
  chapters: StoryChapter[];
  lessonsIntro?: string;
  lessonsHeading?: string;
  lessons?: StoryLesson[];
  author?: string;
}

export const StoryChaptersView: React.FC<Props> = ({
  chapters,
  lessonsIntro,
  lessonsHeading,
  lessons = [],
  author,
}) => {
  const [tab, setTab] = useState<'story' | 'lessons' | 'quiz'>('story');
  const [chapterIndex, setChapterIndex] = useState(0);

  // Verbatim quiz derived strictly from the story text
  const storyQuiz = [
    {
      id: 'sq1',
      prompt: '﴿وَمَا تِلْكَ بِيَمِينِكَ يَا مُوسَىٰ﴾',
      options: ['الْعَصَا', 'صُنْدُوقٍ مِنَ الْخَشَبِ', 'نَهْرِ النِّيلِ'],
      correctIndex: 0,
    },
    {
      id: 'sq2',
      prompt: 'أَرْسَلَ مَعَهُ أَخَاهُ لِيُعَاضِدَهُ:',
      options: ['هَارُونَ', 'فِرْعَوْنَ', 'قَوْمِهِ'],
      correctIndex: 0,
    },
    {
      id: 'sq3',
      prompt: 'بَحْرِ الْقُلْزُمِ الْمُسَمَّى الآنَ:',
      options: ['بِالْبَحْرِ الأَحْمَرِ', 'نَهْرِ النِّيلِ', 'أَرْضِ مَدْيَنَ'],
      correctIndex: 0,
    },
    {
      id: 'sq4',
      prompt: 'فَتَجَمَّدَ وَصَارَ طُرُقًا عَلَى قَدْرِ أَسْبَاطِ بَنِي إِسْرَائِيلَ:',
      options: ['اثْنَيْ عَشَرَ طَرِيقًا', 'سَبْعَةَ طُرُقٍ', 'ثَلَاثَةَ طُرُقٍ'],
      correctIndex: 0,
    },
    {
      id: 'sq5',
      prompt: 'الدعوة إلى الله -عز وجل- تكون:',
      options: ['بالحكمة والموعظة الحسنة', 'المكابرة', 'السحر'],
      correctIndex: 0,
    },
  ];

  const [quizIdx, setQuizIdx] = useState(0);
  const [pickedOption, setPickedOption] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);

  const currentChapter = chapters[chapterIndex];
  const currentQ = storyQuiz[quizIdx];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--platform-border)] pb-4">
        <div className="inline-flex items-center gap-1 rounded-xl bg-[var(--platform-surface-muted)] p-1">
          <button
            type="button"
            onClick={() => setTab('story')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
              tab === 'story'
                ? 'bg-[var(--platform-surface)] text-[var(--platform-text)] shadow-sm'
                : 'text-[var(--platform-text-muted)]'
            }`}
          >
            القصة ({chapters.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('lessons')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
              tab === 'lessons'
                ? 'bg-[var(--platform-surface)] text-[var(--platform-text)] shadow-sm'
                : 'text-[var(--platform-text-muted)]'
            }`}
          >
            العبر والفوائد ({lessons.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('quiz')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
              tab === 'quiz'
                ? 'bg-[var(--platform-surface)] text-[var(--platform-text)] shadow-sm'
                : 'text-[var(--platform-text-muted)]'
            }`}
          >
            اختبار ({storyQuiz.length})
          </button>
        </div>

        {author && <span className="text-sm text-[var(--platform-text-muted)]">{author}</span>}
      </div>

      {tab === 'story' && currentChapter && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            {chapters.map((ch, idx) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setChapterIndex(idx)}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors whitespace-nowrap ${
                  idx === chapterIndex
                    ? 'bg-[#9A3412] text-white'
                    : 'bg-[var(--platform-surface-muted)] text-[var(--platform-text)] hover:opacity-85'
                }`}
              >
                {ch.partLabel}
              </button>
            ))}
          </div>

          <div className="rounded-3xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-6 sm:p-10 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--platform-border)] pb-4">
              <div className="inline-flex items-center gap-3">
                <span className="rounded-xl bg-[#FDE68A] px-3 py-1.5 text-sm font-extrabold text-[#9A3412]">
                  {currentChapter.partLabel}
                </span>
                <h3 className="text-lg sm:text-xl font-bold">{currentChapter.title}</h3>
              </div>

              {currentChapter.youtubeUrl && (
                <a
                  href={currentChapter.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--platform-border)] px-3 py-1.5 text-xs font-semibold text-[#0284C7] hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{currentChapter.youtubeUrl}</span>
                </a>
              )}
            </div>

            <div className="space-y-5 font-amiri text-xl sm:text-2xl leading-[2.1]">
              {currentChapter.paragraphs.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              disabled={chapterIndex === 0}
              onClick={() => setChapterIndex((i) => i - 1)}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] px-4 py-2.5 text-sm font-semibold disabled:opacity-40 whitespace-nowrap"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق</span>
            </button>
            <button
              type="button"
              disabled={chapterIndex === chapters.length - 1}
              onClick={() => setChapterIndex((i) => i + 1)}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] px-4 py-2.5 text-sm font-semibold disabled:opacity-40 whitespace-nowrap"
            >
              <span>التالي</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {tab === 'lessons' && (
        <div className="space-y-5">
          {lessonsIntro && (
            <div className="rounded-2xl bg-[#3B82F6]/10 border border-[#3B82F6]/20 p-6 text-center font-amiri text-xl sm:text-2xl leading-relaxed font-bold">
              {lessonsIntro}
            </div>
          )}

          {lessonsHeading && (
            <h3 className="text-lg sm:text-xl font-extrabold text-[#B91C1C]">
              {lessonsHeading}
            </h3>
          )}

          <div className="space-y-3">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="rounded-2xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 space-y-2"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FBBF24] text-xs font-extrabold text-slate-900 tabular-nums">
                    {lesson.number}
                  </span>
                  <p className="font-amiri text-xl leading-relaxed">{lesson.text}</p>
                </div>
                {lesson.footnote && (
                  <p className="pr-10 text-xs text-[var(--platform-text-muted)]">
                    {lesson.footnote}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'quiz' && (
        <div className="mx-auto max-w-xl rounded-3xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-6 sm:p-8 space-y-6">
          {quizDone ? (
            <div className="text-center space-y-5">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <div className="text-3xl font-extrabold tabular-nums">
                {quizScore} / {storyQuiz.length}
              </div>
              <button
                type="button"
                onClick={() => {
                  setQuizIdx(0);
                  setPickedOption(null);
                  setQuizScore(0);
                  setQuizDone(false);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#9A3412] px-6 py-3 font-bold text-white"
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة</span>
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm text-[var(--platform-text-muted)] tabular-nums">
                <span>
                  {quizIdx + 1} / {storyQuiz.length}
                </span>
                <span>
                  {quizScore} / {storyQuiz.length}
                </span>
              </div>

              <h3 className="font-amiri text-2xl font-bold leading-relaxed">
                {currentQ.prompt}
              </h3>

              <div className="space-y-3">
                {currentQ.options.map((opt, oIdx) => {
                  const isPicked = pickedOption === oIdx;
                  const isCorrect = oIdx === currentQ.correctIndex;
                  let style =
                    'border-[var(--platform-border)] bg-[var(--platform-surface-muted)] hover:border-[#9A3412]';
                  if (pickedOption !== null) {
                    if (isCorrect) style = 'border-emerald-600 bg-emerald-50 text-emerald-900';
                    else if (isPicked) style = 'border-rose-600 bg-rose-50 text-rose-900';
                  }
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        if (pickedOption !== null) return;
                        setPickedOption(oIdx);
                        if (oIdx === currentQ.correctIndex) setQuizScore((s) => s + 1);
                      }}
                      className={`w-full rounded-2xl border-2 px-5 py-4 text-right font-amiri text-xl font-bold transition-colors ${style}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {pickedOption !== null && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (quizIdx + 1 < storyQuiz.length) {
                        setQuizIdx((i) => i + 1);
                        setPickedOption(null);
                      } else {
                        setQuizDone(true);
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#9A3412] px-6 py-3 text-sm font-bold text-white"
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
    </div>
  );
};

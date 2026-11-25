import React, { useCallback, useState } from 'react';
import { Award, Check, CheckCircle2, ExternalLink, FileText, Flame, Share2, Star, X } from 'lucide-react';
import type { MaterialItem } from '../types/platform.ts';
import type { EarnedBadge } from '../services/rewardsStorage.ts';
import { getPointsForMaterial, playSoftChime } from '../services/rewardsStorage.ts';
import { BadgeCelebrationOverlay, MotifBadgeIcon } from './BadgeCelebrationOverlay.tsx';
import { AqeedahFlashcardsView } from './activities/AqeedahFlashcardsView.tsx';
import { AqeedahActivitiesPackView } from './activities/AqeedahActivitiesPackView.tsx';
import { AdhkarCardsView } from './activities/AdhkarCardsView.tsx';
import { StoryChaptersView } from './activities/StoryChaptersView.tsx';
import { ProblemSolutionView } from './activities/ProblemSolutionView.tsx';
import { SmartConvertedView } from './activities/SmartConvertedView.tsx';
import { ImageDragDropGameView } from './activities/ImageDragDropGameView.tsx';

interface Props {
  material: MaterialItem;
  showOriginalPdfButton: boolean;
  isCompleted: boolean;
  isDailyChallenge?: boolean;
  isDailyChallengeCompletedToday?: boolean;
  soundEnabled: boolean;
  onActivityComplete: (material: MaterialItem) => {
    badge: EarnedBadge;
    newlyEarned: boolean;
    totalPoints: number;
    dailyBonusAwarded: number;
    dailyChallengeCompletedNow: boolean;
    dailyStreak: number;
  };
  onClose: () => void;
}

export const MaterialPlayerModal: React.FC<Props> = ({
  material,
  showOriginalPdfButton,
  isCompleted,
  isDailyChallenge = false,
  isDailyChallengeCompletedToday = false,
  soundEnabled,
  onActivityComplete,
  onClose,
}) => {
  const [showOriginalSource, setShowOriginalSource] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{
    badge: EarnedBadge;
    newlyEarned: boolean;
    totalPoints: number;
    dailyBonusAwarded: number;
    dailyChallengeCompletedNow: boolean;
    dailyStreak: number;
  } | null>(null);

  const basePoints = getPointsForMaterial(material);
  const activeDailyPending = isDailyChallenge && !isDailyChallengeCompletedToday;
  const displayPoints = activeDailyPending
    ? isCompleted
      ? basePoints
      : basePoints * 2
    : basePoints;

  const triggerCompletion = useCallback(() => {
    const result = onActivityComplete(material);
    playSoftChime('badge', soundEnabled);
    setCelebrationData(result);
  }, [material, onActivityComplete, soundEnabled]);

  const handleShare = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('material', material.id);
    const shareUrl = url.toString();

    try {
      if (navigator.share) {
        await navigator.share({
          title: material.title,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2000);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2000);
      } catch {
        // Ignore clipboard denial
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 sm:p-6 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={material.title}
    >
      <div className="my-4 w-full max-w-5xl rounded-3xl border-2 border-[var(--platform-border)] bg-[var(--platform-bg)] text-[var(--platform-text)] shadow-2xl overflow-hidden">
        {/* Top Accent Ribbon */}
        <div className="h-2 w-full" style={{ backgroundColor: material.accentColor }} />

        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--platform-border)] bg-[var(--platform-surface)] px-5 py-4 sm:px-8">
          <div className="min-w-0 flex items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-xs"
              style={{ backgroundColor: material.accentColor }}
            >
              <MotifBadgeIcon motif={material.themeMotif} className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[var(--platform-text-muted)]">
                {material.category}
                {material.subtitle ? ` · ${material.subtitle}` : ''}
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold truncate">{material.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isDailyChallenge && (
              <span
                className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-extrabold whitespace-nowrap ${
                  isDailyChallengeCompletedToday
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-rose-300 bg-rose-50 text-rose-800'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>
                  {isDailyChallengeCompletedToday ? 'أنجزت تحدي اليوم' : 'التحدي اليومي ×2'}
                </span>
              </span>
            )}

            <span
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-extrabold tabular-nums ${
                isCompleted && !activeDailyPending
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-amber-300 bg-amber-50 text-amber-900'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>
                {activeDailyPending
                  ? `+${displayPoints} نقطة مضاعفة`
                  : isCompleted
                    ? `تم نيل الوسام (+${basePoints})`
                    : `+${basePoints} نقطة`}
              </span>
            </span>

            {showOriginalPdfButton && material.sourceUrl && (
              <button
                type="button"
                onClick={() => setShowOriginalSource((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors whitespace-nowrap ${
                  showOriginalSource
                    ? 'border-[var(--platform-accent)] bg-[var(--platform-accent)] text-white'
                    : 'border-[var(--platform-border)] bg-[var(--platform-surface-muted)]'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>{showOriginalSource ? 'النشاط التفاعلي' : 'عرض الملف'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface-muted)] px-3.5 py-2 text-xs font-bold transition-colors whitespace-nowrap"
            >
              {copiedShare ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              <span>{copiedShare ? 'تم نسخ الرابط' : 'مشاركة'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface-muted)] hover:opacity-80"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-8 space-y-6">
          {showOriginalSource && material.sourceUrl ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[var(--platform-text-muted)]">
                  {material.sourceFileName || material.title}
                </span>
                <a
                  href={material.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0284C7] hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>فتح الملف</span>
                </a>
              </div>

              {material.sourceMimeType?.startsWith('image/') ? (
                <img
                  src={material.sourceUrl}
                  alt={material.title}
                  referrerPolicy="no-referrer"
                  className="mx-auto max-h-[70vh] rounded-2xl border border-[var(--platform-border)] object-contain"
                />
              ) : (
                <iframe
                  src={material.sourceUrl}
                  title={material.title}
                  className="h-[70vh] w-full rounded-2xl border border-[var(--platform-border)] bg-white"
                />
              )}
            </div>
          ) : (
            <>
              {material.activityType === 'qa_flashcards' && material.qaItems && (
                <AqeedahFlashcardsView
                  items={material.qaItems}
                  author={material.author}
                  soundEnabled={soundEnabled}
                  onComplete={triggerCompletion}
                />
              )}
              {material.activityType === 'aqeedah_activities_pack' && (
                <AqeedahActivitiesPackView
                  soundEnabled={soundEnabled}
                  onComplete={triggerCompletion}
                />
              )}
              {material.activityType === 'adhkar_cards' && material.dhikrItems && (
                <AdhkarCardsView
                  items={material.dhikrItems}
                  motif={material.themeMotif}
                  soundEnabled={soundEnabled}
                  onComplete={triggerCompletion}
                />
              )}
              {material.activityType === 'story_chapters' && material.storyChapters && (
                <StoryChaptersView
                  chapters={material.storyChapters}
                  lessonsIntro={material.storyLessonsIntro}
                  lessonsHeading={material.storyLessonsHeading}
                  lessons={material.storyLessons}
                  author={material.author}
                  soundEnabled={soundEnabled}
                  onComplete={triggerCompletion}
                />
              )}
              {material.activityType === 'problem_solution_guide' && material.problemSolution && (
                <ProblemSolutionView
                  data={material.problemSolution}
                  soundEnabled={soundEnabled}
                  onComplete={triggerCompletion}
                />
              )}
              {material.activityType === 'smart_cards' &&
                material.smartActivity?.mode === 'drag_drop_images' &&
                material.smartActivity.dragDropCards && (
                  <ImageDragDropGameView
                    cards={material.smartActivity.dragDropCards}
                    accentColor={material.accentColor}
                    soundEnabled={soundEnabled}
                    onComplete={triggerCompletion}
                  />
                )}
              {material.activityType === 'smart_cards' &&
                material.smartActivity &&
                material.smartActivity.mode !== 'drag_drop_images' && (
                  <SmartConvertedView
                    activity={material.smartActivity}
                    accentColor={material.accentColor}
                    soundEnabled={soundEnabled}
                    onComplete={triggerCompletion}
                  />
                )}

              {/* Activity Completion & Badge Reward Banner */}
              <div className="rounded-2xl border-2 border-[var(--platform-border)] bg-[var(--platform-surface)] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                      isCompleted && !activeDailyPending
                        ? 'bg-emerald-100 text-emerald-700'
                        : activeDailyPending
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {isCompleted && !activeDailyPending ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : activeDailyPending ? (
                      <Flame className="w-6 h-6" />
                    ) : (
                      <Award className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-extrabold">
                      {activeDailyPending
                        ? `التحدي اليومي: ${material.title}`
                        : isCompleted
                          ? `تم نيل وسام: ${material.title}`
                          : `وسام: ${material.title}`}
                    </div>
                    <div className="text-xs font-bold text-[var(--platform-text-muted)] tabular-nums">
                      {activeDailyPending
                        ? `مكافأة النقاط المضاعفة: +${displayPoints} نقطة`
                        : isCompleted
                          ? `+${basePoints} نقطة`
                          : `عند إنهاء النشاط: +${basePoints} نقطة`}
                    </div>
                  </div>
                </div>

                {(!isCompleted || activeDailyPending) && (
                  <button
                    type="button"
                    onClick={triggerCompletion}
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-extrabold text-white shadow-xs transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
                    style={{ backgroundColor: material.accentColor }}
                  >
                    {activeDailyPending ? (
                      <Flame className="w-4 h-4" />
                    ) : (
                      <Award className="w-4 h-4" />
                    )}
                    <span>
                      {activeDailyPending
                        ? 'إتمام التحدي اليومي واستلام النقاط المضاعفة'
                        : 'إتمام النشاط واستلام الوسام'}
                    </span>
                  </button>
                )}
              </div>
            </>
          )}

          {/* External Links from PDF */}
          {material.externalLinks && material.externalLinks.length > 0 && (
            <div className="border-t border-[var(--platform-border)] pt-4 flex flex-wrap items-center gap-4 text-xs text-[var(--platform-text-muted)]">
              {material.externalLinks.map((link) => (
                <a
                  key={link.url + link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-[var(--platform-accent)] hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {celebrationData && (
        <BadgeCelebrationOverlay
          badge={celebrationData.badge}
          totalPoints={celebrationData.totalPoints}
          newlyEarned={celebrationData.newlyEarned}
          dailyBonusAwarded={celebrationData.dailyBonusAwarded}
          dailyChallengeCompletedNow={celebrationData.dailyChallengeCompletedNow}
          dailyStreak={celebrationData.dailyStreak}
          onDismiss={() => setCelebrationData(null)}
        />
      )}
    </div>
  );
};

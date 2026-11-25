import React, { useState } from 'react';
import { Check, ExternalLink, FileText, Share2, X } from 'lucide-react';
import type { MaterialItem } from '../types/platform.ts';
import { AqeedahFlashcardsView } from './activities/AqeedahFlashcardsView.tsx';
import { AqeedahActivitiesPackView } from './activities/AqeedahActivitiesPackView.tsx';
import { AdhkarCardsView } from './activities/AdhkarCardsView.tsx';
import { StoryChaptersView } from './activities/StoryChaptersView.tsx';
import { ProblemSolutionView } from './activities/ProblemSolutionView.tsx';
import { SmartConvertedView } from './activities/SmartConvertedView.tsx';

interface Props {
  material: MaterialItem;
  showOriginalPdfButton: boolean;
  onClose: () => void;
}

export const MaterialPlayerModal: React.FC<Props> = ({
  material,
  showOriginalPdfButton,
  onClose,
}) => {
  const [showOriginalSource, setShowOriginalSource] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

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
      <div className="my-4 w-full max-w-5xl rounded-3xl border border-[var(--platform-border)] bg-[var(--platform-bg)] text-[var(--platform-text)] shadow-2xl overflow-hidden">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--platform-border)] bg-[var(--platform-surface)] px-5 py-4 sm:px-8">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[var(--platform-text-muted)]">
              {material.category}
              {material.subtitle ? ` · ${material.subtitle}` : ''}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold truncate">{material.title}</h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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
                <AqeedahFlashcardsView items={material.qaItems} author={material.author} />
              )}
              {material.activityType === 'aqeedah_activities_pack' && (
                <AqeedahActivitiesPackView />
              )}
              {material.activityType === 'adhkar_cards' && material.dhikrItems && (
                <AdhkarCardsView items={material.dhikrItems} motif={material.themeMotif} />
              )}
              {material.activityType === 'story_chapters' && material.storyChapters && (
                <StoryChaptersView
                  chapters={material.storyChapters}
                  lessonsIntro={material.storyLessonsIntro}
                  lessonsHeading={material.storyLessonsHeading}
                  lessons={material.storyLessons}
                  author={material.author}
                />
              )}
              {material.activityType === 'problem_solution_guide' && material.problemSolution && (
                <ProblemSolutionView data={material.problemSolution} />
              )}
              {material.activityType === 'smart_cards' && material.smartActivity && (
                <SmartConvertedView
                  activity={material.smartActivity}
                  accentColor={material.accentColor}
                />
              )}
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
    </div>
  );
};

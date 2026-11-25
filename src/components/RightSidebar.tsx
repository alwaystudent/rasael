import React from 'react';
import {
  Award,
  BookOpen,
  Check,
  ExternalLink,
  Flame,
  Home,
  LayoutGrid,
  Lightbulb,
  Lock,
  Moon,
  Palette,
  Play,
  Star,
  Sun,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { MaterialItem } from '../types/platform.ts';
import { getPointsForMaterial, type ChildRewardsState } from '../services/rewardsStorage.ts';
import { CHANNEL_SOCIAL_LINKS } from '../data/initialMaterials.ts';
import { MotifBadgeIcon } from './BadgeCelebrationOverlay.tsx';

interface RightSidebarProps {
  categories: string[];
  selectedCategory: string;
  categoryCounts: Record<string, number>;
  publishedMaterials: MaterialItem[];
  rewards: ChildRewardsState;
  earnedPublishedCount: number;
  showFeaturedSection: boolean;
  showChannelLinks: boolean;
  isAuthenticatedAdmin: boolean;
  dailyChallengeMaterial: MaterialItem | null;
  dailyChallengeCompleted: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onSelectSection: (sectionId: 'top' | 'daily-challenge-section' | 'rewards-section' | 'featured-section' | 'materials-section') => void;
  onSelectCategory: (cat: string) => void;
  onOpenMaterial: (id: string) => void;
  onToggleSound: () => void;
  onOpenAdmin: () => void;
}

function getCategoryIcon(cat: string) {
  if (cat === 'الكل') return <LayoutGrid className="w-4 h-4 shrink-0" />;
  if (cat === 'فقرة الأنشطة') return <Palette className="w-4 h-4 shrink-0" />;
  if (cat === 'أَذْكَارُ الصَّبَاحِ') return <Sun className="w-4 h-4 shrink-0" />;
  if (cat === 'أَذْكَارُ الْمَسَاءِ') return <Moon className="w-4 h-4 shrink-0" />;
  if (cat === '#مشكلة وحل') return <Lightbulb className="w-4 h-4 shrink-0" />;
  return <BookOpen className="w-4 h-4 shrink-0" />;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  categories,
  selectedCategory,
  categoryCounts,
  publishedMaterials,
  rewards,
  earnedPublishedCount,
  showFeaturedSection,
  showChannelLinks,
  isAuthenticatedAdmin,
  dailyChallengeMaterial,
  dailyChallengeCompleted,
  mobileOpen,
  onCloseMobile,
  onSelectSection,
  onSelectCategory,
  onOpenMaterial,
  onToggleSound,
  onOpenAdmin,
}) => {
  const totalMaterials = publishedMaterials.length;
  const progressPercent = totalMaterials > 0 ? Math.round((earnedPublishedCount / totalMaterials) * 100) : 0;
  const dailyBasePts = dailyChallengeMaterial ? getPointsForMaterial(dailyChallengeMaterial) : 0;
  const dailyRewardPts = dailyChallengeMaterial
    ? rewards.earnedBadges[dailyChallengeMaterial.id]
      ? dailyBasePts
      : dailyBasePts * 2
    : 0;

  const renderBody = (isMobileDrawer: boolean) => (
    <div className="flex flex-col gap-6 p-4 sm:p-5">
      {isMobileDrawer && (
        <div className="flex items-center justify-between pb-3 border-b border-[var(--platform-border)]">
          <span className="text-base font-extrabold">القائمة الرئيسية</span>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="إغلاق القائمة"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface-muted)] hover:opacity-85"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Daily Challenge Quick Card */}
      {dailyChallengeMaterial && (
        <button
          type="button"
          onClick={() => {
            onOpenMaterial(dailyChallengeMaterial.id);
            if (isMobileDrawer) onCloseMobile();
          }}
          className={`w-full rounded-2xl border-2 p-3.5 text-right transition-all hover:-translate-y-0.5 ${
            dailyChallengeCompleted
              ? 'border-emerald-300 bg-emerald-50/70 text-slate-900'
              : 'border-rose-300 bg-rose-50/75 text-slate-900 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-rose-700">
              <Flame className="w-4 h-4 shrink-0" />
              <span>التحدي اليومي</span>
            </span>
            <span
              className={`text-xs font-extrabold tabular-nums ${
                dailyChallengeCompleted ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {dailyChallengeCompleted ? 'تم الإنجاز' : `×2 (+${dailyRewardPts})`}
            </span>
          </div>
          <div className="truncate text-sm font-extrabold">{dailyChallengeMaterial.title}</div>
          <div className="mt-1 flex items-center justify-between text-[11px] font-bold text-slate-600 tabular-nums">
            <span className="truncate">{dailyChallengeMaterial.category}</span>
            {rewards.dailyStreak > 0 && <span>السلسلة: {rewards.dailyStreak}</span>}
          </div>
        </button>
      )}

      {/* Child Rewards Quick Summary */}
      {totalMaterials > 0 && (
        <button
          type="button"
          onClick={() => {
            onSelectSection('rewards-section');
            if (isMobileDrawer) onCloseMobile();
          }}
          className="w-full rounded-2xl border border-[var(--platform-border)] bg-[var(--platform-surface-muted)]/75 p-3.5 text-right transition-colors hover:border-[var(--platform-accent)]"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 border border-amber-200">
                <Trophy className="w-4 h-4" />
              </div>
              <span className="text-sm font-extrabold">لوحة النقاط والأوسمة</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-[var(--platform-text-muted)] tabular-nums mb-2">
            <span className="inline-flex items-center gap-1 text-amber-700">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>{rewards.points} نقطة</span>
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <Award className="w-3.5 h-3.5" />
              <span>
                {earnedPublishedCount} / {totalMaterials}
              </span>
            </span>
          </div>

          <div className="w-full h-2 overflow-hidden rounded-full bg-[var(--platform-surface)] border border-[var(--platform-border)]">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </button>
      )}

      {/* Main Page Sections */}
      <nav aria-label="الأقسام الرئيسية" className="space-y-1.5">
        <h2 className="px-2 text-xs font-extrabold text-[var(--platform-text-muted)]">
          الأقسام الرئيسية
        </h2>
        <button
          type="button"
          onClick={() => {
            onSelectSection('top');
            if (isMobileDrawer) onCloseMobile();
          }}
          className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--platform-text)] hover:bg-[var(--platform-surface-muted)] transition-colors whitespace-nowrap"
        >
          <Home className="w-4 h-4 shrink-0 text-[var(--platform-accent)]" />
          <span>الرئيسية</span>
        </button>

        {dailyChallengeMaterial && (
          <button
            type="button"
            onClick={() => {
              onSelectSection('daily-challenge-section');
              if (isMobileDrawer) onCloseMobile();
            }}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--platform-text)] hover:bg-[var(--platform-surface-muted)] transition-colors whitespace-nowrap"
          >
            <Flame className="w-4 h-4 shrink-0 text-rose-600" />
            <span>التحدي اليومي</span>
          </button>
        )}

        {totalMaterials > 0 && (
          <button
            type="button"
            onClick={() => {
              onSelectSection('rewards-section');
              if (isMobileDrawer) onCloseMobile();
            }}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--platform-text)] hover:bg-[var(--platform-surface-muted)] transition-colors whitespace-nowrap"
          >
            <Trophy className="w-4 h-4 shrink-0 text-amber-600" />
            <span>الأوسمة والنقاط</span>
          </button>
        )}

        {showFeaturedSection && (
          <button
            type="button"
            onClick={() => {
              onSelectSection('featured-section');
              if (isMobileDrawer) onCloseMobile();
            }}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--platform-text)] hover:bg-[var(--platform-surface-muted)] transition-colors whitespace-nowrap"
          >
            <Play className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>الأنشطة التفاعلية</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            onSelectSection('materials-section');
            if (isMobileDrawer) onCloseMobile();
          }}
          className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--platform-text)] hover:bg-[var(--platform-surface-muted)] transition-colors whitespace-nowrap"
        >
          <BookOpen className="w-4 h-4 shrink-0 text-[#CE1126]" />
          <span>المواد التعليمية</span>
        </button>
      </nav>

      {/* Categories Filter */}
      <div className="space-y-1.5 pt-2 border-t border-[var(--platform-border)]">
        <h2 className="px-2 text-xs font-extrabold text-[var(--platform-text-muted)]">
          التصنيفات
        </h2>
        <div className="space-y-1">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            const count = categoryCounts[cat] ?? 0;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  onSelectCategory(cat);
                  if (isMobileDrawer) onCloseMobile();
                }}
                className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                  isActive
                    ? 'text-white shadow-xs'
                    : 'text-[var(--platform-text-muted)] hover:bg-[var(--platform-surface-muted)] hover:text-[var(--platform-text)]'
                }`}
                style={isActive ? { backgroundColor: 'var(--platform-accent)' } : undefined}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  {getCategoryIcon(cat)}
                  <span className="truncate">{cat}</span>
                </span>
                <span className="text-xs tabular-nums opacity-80 shrink-0">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Access to Key Activities */}
      {publishedMaterials.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-[var(--platform-border)]">
          <h2 className="px-2 text-xs font-extrabold text-[var(--platform-text-muted)]">
            أهم الأنشطة
          </h2>
          <div className="space-y-1">
            {publishedMaterials.map((item) => {
              const earned = Boolean(rewards.earnedBadges[item.id]);
              return (
                <button
                  key={`side-${item.id}`}
                  type="button"
                  onClick={() => {
                    onOpenMaterial(item.id);
                    if (isMobileDrawer) onCloseMobile();
                  }}
                  className="w-full flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-right text-xs sm:text-sm font-bold text-[var(--platform-text)] hover:bg-[var(--platform-surface-muted)] transition-colors"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
                      style={{ backgroundColor: item.accentColor }}
                    >
                      <MotifBadgeIcon motif={item.themeMotif} className="w-3.5 h-3.5" />
                    </span>
                    <span className="truncate">{item.title}</span>
                  </span>
                  {earned ? (
                    <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Play className="w-3.5 h-3.5 shrink-0 text-[var(--platform-text-muted)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sound & Admin Quick Actions */}
      <div className="space-y-2 pt-3 border-t border-[var(--platform-border)]">
        <button
          type="button"
          onClick={onToggleSound}
          className="w-full flex items-center justify-between gap-2 rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface-muted)]/60 px-3 py-2.5 text-xs sm:text-sm font-bold hover:opacity-90"
        >
          <span className="flex items-center gap-2">
            {rewards.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[var(--platform-accent)]" />
            ) : (
              <VolumeX className="w-4 h-4 text-[var(--platform-text-muted)]" />
            )}
            <span>{rewards.soundEnabled ? 'الصوت مفعل' : 'الصوت مكتوم'}</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenAdmin();
            if (isMobileDrawer) onCloseMobile();
          }}
          className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-bold text-white transition-opacity hover:opacity-95"
          style={{ backgroundColor: 'var(--platform-accent)' }}
        >
          {isAuthenticatedAdmin ? (
            <>
              <LayoutGrid className="w-4 h-4" />
              <span>لوحة التحكم</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>تسجيل الدخول</span>
            </>
          )}
        </button>
      </div>

      {/* Channel Links */}
      {showChannelLinks && (
        <div className="space-y-1.5 pt-3 border-t border-[var(--platform-border)]">
          <h2 className="px-2 text-xs font-extrabold text-[var(--platform-text-muted)]">
            روابط القناة
          </h2>
          <div className="space-y-1">
            {CHANNEL_SOCIAL_LINKS.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-[var(--platform-text-muted)] hover:bg-[var(--platform-surface-muted)] hover:text-[var(--platform-accent)] transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{link.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Right Sidebar (first child in RTL flex row = right side) */}
      <aside
        aria-label="القائمة الجانبية"
        className="hidden lg:flex lg:w-72 xl:w-80 shrink-0 flex-col border-l border-[var(--platform-border)] bg-[var(--platform-surface)] sticky top-[61px] h-[calc(100vh-61px)] overflow-y-auto"
      >
        {renderBody(false)}
      </aside>

      {/* Mobile / Tablet Slide-over Right Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/45 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside
            aria-label="القائمة الجانبية"
            className="fixed inset-y-0 right-0 z-50 w-80 max-w-[86vw] bg-[var(--platform-surface)] border-l border-[var(--platform-border)] shadow-2xl overflow-y-auto"
          >
            {renderBody(true)}
          </aside>
        </div>
      )}
    </>
  );
};

import React from 'react';
import { motion } from 'motion/react';
import {
  Award,
  BookOpen,
  Compass,
  Lightbulb,
  Moon,
  Palette,
  Sparkles,
  Star,
  Sun,
  X,
} from 'lucide-react';
import type { ThemeMotif } from '../types/platform.ts';
import type { EarnedBadge } from '../services/rewardsStorage.ts';

interface MotifBadgeIconProps {
  motif: ThemeMotif;
  className?: string;
}

export const MotifBadgeIcon: React.FC<MotifBadgeIconProps> = ({
  motif,
  className = 'w-7 h-7',
}) => {
  if (motif === 'ocean') return <Award className={className} />;
  if (motif === 'activities') return <Palette className={className} />;
  if (motif === 'morning') return <Sun className={className} />;
  if (motif === 'evening') return <Moon className={className} />;
  if (motif === 'desert') return <Compass className={className} />;
  if (motif === 'guide') return <Lightbulb className={className} />;
  return <BookOpen className={className} />;
};

interface CelebrationProps {
  badge: EarnedBadge;
  totalPoints: number;
  newlyEarned: boolean;
  dailyBonusAwarded?: number;
  dailyChallengeCompletedNow?: boolean;
  dailyStreak?: number;
  onDismiss: () => void;
}

const SPARKLE_COLORS = ['#00732F', '#CE1126', '#F59E0B', '#0E7490', '#10B981', '#EC4899'];

export const BadgeCelebrationOverlay: React.FC<CelebrationProps> = ({
  badge,
  totalPoints,
  newlyEarned,
  dailyBonusAwarded = 0,
  dailyChallengeCompletedNow = false,
  dailyStreak = 0,
  onDismiss,
}) => {
  const earnedPointsThisRun = (newlyEarned ? badge.pointsAwarded : 0) + dailyBonusAwarded;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={badge.title}
    >
      <motion.div
        initial={{ scale: 0.82, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="relative w-full max-w-md overflow-hidden rounded-[2rem] border-4 bg-[var(--platform-surface)] p-7 text-center text-[var(--platform-text)] shadow-2xl"
        style={{ borderColor: badge.accentColor }}
      >
        <button
          type="button"
          onClick={onDismiss}
          aria-label="إغلاق"
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface-muted)] hover:opacity-80"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Decorative floating stars */}
        <div className="pointer-events-none relative mx-auto mb-4 flex h-28 w-28 items-center justify-center">
          {SPARKLE_COLORS.map((color, idx) => {
            const angle = (idx * 60 * Math.PI) / 180;
            const x = Math.cos(angle) * 52;
            const y = Math.sin(angle) * 46;
            return (
              <motion.span
                key={color}
                initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                animate={{ scale: [0, 1.2, 1], x, y, opacity: 1 }}
                transition={{ delay: 0.1 + idx * 0.05, duration: 0.45 }}
                className="absolute"
                style={{ color }}
              >
                <Star className="w-4 h-4 fill-current" />
              </motion.span>
            );
          })}

          <motion.div
            initial={{ rotate: -14, scale: 0.7 }}
            animate={{ rotate: [0, -6, 6, 0], scale: 1 }}
            transition={{ duration: 0.65 }}
            className="flex h-22 w-22 items-center justify-center rounded-full border-4 border-amber-300 text-white shadow-lg"
            style={{ backgroundColor: badge.accentColor }}
          >
            <MotifBadgeIcon motif={badge.motif} className="w-11 h-11" />
          </motion.div>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-900">
          <Sparkles className="w-3.5 h-3.5" />
          <span>
            {dailyChallengeCompletedNow
              ? 'إنجاز التحدي اليومي · نقاط مضاعفة ×2'
              : newlyEarned
                ? 'وسام جديد!'
                : 'وسام مكتمل'}
          </span>
        </div>

        <h3 className="mt-3 text-2xl font-extrabold leading-snug">
          وسام: {badge.title}
        </h3>
        <p className="mt-1 text-sm font-bold text-[var(--platform-text-muted)]">
          {badge.category}
          {dailyChallengeCompletedNow && dailyStreak > 0 ? ` · سلسلة الأيام: ${dailyStreak}` : ''}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-[var(--platform-border)] bg-[var(--platform-surface-muted)] p-4">
          <div>
            <div className="text-xs font-bold text-[var(--platform-text-muted)]">
              {dailyChallengeCompletedNow ? 'النقاط المضاعفة' : 'نقاط النشاط'}
            </div>
            <div className="mt-0.5 text-2xl font-extrabold text-emerald-700 tabular-nums">
              +{earnedPointsThisRun > 0 ? earnedPointsThisRun : badge.pointsAwarded}
            </div>
          </div>
          <div className="border-r border-[var(--platform-border)]">
            <div className="text-xs font-bold text-[var(--platform-text-muted)]">مجموع النقاط</div>
            <div className="mt-0.5 text-2xl font-extrabold tabular-nums" style={{ color: badge.accentColor }}>
              {totalPoints}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-6 w-full rounded-2xl py-3.5 text-base font-extrabold text-white shadow-sm transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
          style={{ backgroundColor: badge.accentColor }}
        >
          متابعة
        </button>
      </motion.div>
    </div>
  );
};

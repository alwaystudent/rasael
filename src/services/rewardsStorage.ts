import type { MaterialItem, ThemeMotif } from '../types/platform.ts';

export interface EarnedBadge {
  materialId: string;
  title: string;
  category: string;
  motif: ThemeMotif;
  accentColor: string;
  pointsAwarded: number;
  earnedAt: string;
}

export interface DailyChallengeState {
  dateKey: string;
  materialId: string;
  completed: boolean;
  bonusAwarded: number;
}

export interface ChildRewardsState {
  points: number;
  earnedBadges: Record<string, EarnedBadge>;
  soundEnabled: boolean;
  dailyChallenge?: DailyChallengeState;
  dailyStreak: number;
  lastChallengeCompletedDate?: string;
}

const STORAGE_KEY = 'rasael_emaratia_child_rewards_v1';
export const DEFAULT_ACTIVITY_POINTS = 25;

export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayDateKey(date: Date = new Date()): string {
  const prev = new Date(date.getTime());
  prev.setDate(prev.getDate() - 1);
  return getLocalDateKey(prev);
}

export function getPointsForMaterial(material: MaterialItem): number {
  if (material.activityType === 'aqeedah_activities_pack') return 40;
  if (material.activityType === 'qa_flashcards') return 35;
  if (material.smartActivity?.mode === 'drag_drop_images') return 35;
  if (material.activityType === 'adhkar_cards') return 30;
  if (material.activityType === 'story_chapters') return 30;
  return DEFAULT_ACTIVITY_POINTS;
}

export function loadChildRewards(): ChildRewardsState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { points: 0, earnedBadges: {}, soundEnabled: true, dailyStreak: 0 };
    }
    const parsed = JSON.parse(raw) as Partial<ChildRewardsState>;
    const validDaily =
      parsed.dailyChallenge &&
      typeof parsed.dailyChallenge === 'object' &&
      typeof parsed.dailyChallenge.dateKey === 'string' &&
      typeof parsed.dailyChallenge.materialId === 'string'
        ? {
            dateKey: parsed.dailyChallenge.dateKey,
            materialId: parsed.dailyChallenge.materialId,
            completed: Boolean(parsed.dailyChallenge.completed),
            bonusAwarded:
              typeof parsed.dailyChallenge.bonusAwarded === 'number'
                ? parsed.dailyChallenge.bonusAwarded
                : 0,
          }
        : undefined;

    return {
      points: typeof parsed.points === 'number' && parsed.points >= 0 ? parsed.points : 0,
      earnedBadges:
        parsed.earnedBadges && typeof parsed.earnedBadges === 'object' ? parsed.earnedBadges : {},
      soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
      dailyChallenge: validDaily,
      dailyStreak:
        typeof parsed.dailyStreak === 'number' && parsed.dailyStreak >= 0
          ? parsed.dailyStreak
          : 0,
      lastChallengeCompletedDate:
        typeof parsed.lastChallengeCompletedDate === 'string'
          ? parsed.lastChallengeCompletedDate
          : undefined,
    };
  } catch {
    return { points: 0, earnedBadges: {}, soundEnabled: true, dailyStreak: 0 };
  }
}

export function saveChildRewards(state: ChildRewardsState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

/**
 * Ensures there is a Daily Challenge randomly selected for today from published materials.
 * Persists today's pick so it stays consistent throughout the day.
 */
export function ensureDailyChallenge(
  current: ChildRewardsState,
  publishedMaterials: MaterialItem[]
): {
  nextState: ChildRewardsState;
  changed: boolean;
  challenge: DailyChallengeState | null;
  material: MaterialItem | null;
} {
  if (publishedMaterials.length === 0) {
    return { nextState: current, changed: false, challenge: null, material: null };
  }

  const todayKey = getLocalDateKey();
  const existing = current.dailyChallenge;

  if (existing && existing.dateKey === todayKey) {
    const matched = publishedMaterials.find((m) => m.id === existing.materialId);
    if (matched) {
      return {
        nextState: current,
        changed: false,
        challenge: existing,
        material: matched,
      };
    }
  }

  // Pick randomly for the new day, avoiding repeating yesterday's activity if possible
  const previousId = existing?.materialId;
  const freshPool =
    publishedMaterials.length > 1 && previousId
      ? publishedMaterials.filter((m) => m.id !== previousId)
      : publishedMaterials;

  const picked = freshPool[Math.floor(Math.random() * freshPool.length)] || publishedMaterials[0];
  const newChallenge: DailyChallengeState = {
    dateKey: todayKey,
    materialId: picked.id,
    completed: false,
    bonusAwarded: 0,
  };

  // Reset streak display if more than 1 day passed without completion
  const yesterdayKey = getYesterdayDateKey();
  const streakStillActive =
    current.lastChallengeCompletedDate === todayKey ||
    current.lastChallengeCompletedDate === yesterdayKey;

  const nextState: ChildRewardsState = {
    ...current,
    dailyChallenge: newChallenge,
    dailyStreak: streakStillActive ? current.dailyStreak : 0,
  };

  saveChildRewards(nextState);
  return {
    nextState,
    changed: true,
    challenge: newChallenge,
    material: picked,
  };
}

export function awardBadgeForMaterial(
  current: ChildRewardsState,
  material: MaterialItem
): {
  nextState: ChildRewardsState;
  badge: EarnedBadge;
  newlyEarned: boolean;
  dailyBonusAwarded: number;
  dailyChallengeCompletedNow: boolean;
  dailyStreak: number;
} {
  const todayKey = getLocalDateKey();
  const yesterdayKey = getYesterdayDateKey();
  const existing = current.earnedBadges[material.id];
  const basePoints = getPointsForMaterial(material);

  const isTodaysDailyChallenge =
    current.dailyChallenge?.dateKey === todayKey &&
    current.dailyChallenge?.materialId === material.id &&
    !current.dailyChallenge?.completed;

  const badge: EarnedBadge = existing ?? {
    materialId: material.id,
    title: material.title,
    category: material.category,
    motif: material.themeMotif,
    accentColor: material.accentColor,
    pointsAwarded: basePoints,
    earnedAt: new Date().toISOString(),
  };

  const newlyEarned = !existing;
  const badgePointsToAdd = newlyEarned ? basePoints : 0;
  const dailyBonusAwarded = isTodaysDailyChallenge ? basePoints : 0;
  const totalAdded = badgePointsToAdd + dailyBonusAwarded;

  let nextStreak = current.dailyStreak;
  let nextLastCompleted = current.lastChallengeCompletedDate;
  let nextDailyChallenge = current.dailyChallenge;

  if (isTodaysDailyChallenge && current.dailyChallenge) {
    if (current.lastChallengeCompletedDate === todayKey) {
      nextStreak = Math.max(1, current.dailyStreak);
    } else if (current.lastChallengeCompletedDate === yesterdayKey) {
      nextStreak = current.dailyStreak + 1;
    } else {
      nextStreak = 1;
    }
    nextLastCompleted = todayKey;
    nextDailyChallenge = {
      ...current.dailyChallenge,
      completed: true,
      bonusAwarded: dailyBonusAwarded,
    };
  }

  if (totalAdded === 0 && !isTodaysDailyChallenge) {
    return {
      nextState: current,
      badge,
      newlyEarned: false,
      dailyBonusAwarded: 0,
      dailyChallengeCompletedNow: false,
      dailyStreak: current.dailyStreak,
    };
  }

  const nextState: ChildRewardsState = {
    ...current,
    points: current.points + totalAdded,
    earnedBadges: newlyEarned
      ? {
          ...current.earnedBadges,
          [material.id]: badge,
        }
      : current.earnedBadges,
    dailyChallenge: nextDailyChallenge,
    dailyStreak: nextStreak,
    lastChallengeCompletedDate: nextLastCompleted,
  };

  saveChildRewards(nextState);
  return {
    nextState,
    badge,
    newlyEarned,
    dailyBonusAwarded,
    dailyChallengeCompletedNow: isTodaysDailyChallenge,
    dailyStreak: nextStreak,
  };
}

export function playSoftChime(type: 'tap' | 'success' | 'badge', enabled = true): void {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const notes =
      type === 'badge'
        ? [523.25, 659.25, 783.99, 1046.5]
        : type === 'success'
          ? [587.33, 880]
          : [523.25];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.0001, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.08, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.28);
    });

    setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 800);
  } catch {
    // Ignore audio context restrictions
  }
}

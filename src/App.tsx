import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { motion } from 'motion/react';
import {
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ExternalLink,
  Flame,
  Lightbulb,
  Lock,
  Menu,
  Moon,
  Palette,
  Play,
  Share2,
  Star,
  Sun,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  awardBadgeForMaterial,
  ensureDailyChallenge,
  getLocalDateKey,
  getPointsForMaterial,
  loadChildRewards,
  saveChildRewards,
  type ChildRewardsState,
} from './services/rewardsStorage.ts';
import { MotifBadgeIcon } from './components/BadgeCelebrationOverlay.tsx';
import {
  CHANNEL_SOCIAL_LINKS,
  DEFAULT_APPEARANCE,
  INITIAL_MATERIALS,
} from './data/initialMaterials.ts';
import type { AppearanceConfig, MaterialItem } from './types/platform.ts';
import { ADMIN_EMAIL, auth } from './firebase.ts';
import {
  seedFirestoreIfEmpty,
  subscribeAppearanceFromFirestore,
  subscribeMaterialsFromFirestore,
} from './services/firestoreSync.ts';
import {
  ChannelLogoSVG,
  HeroStorybookIllustration,
  MotifIllustration,
} from './components/ChannelEmblem.tsx';
import { MaterialPlayerModal } from './components/MaterialPlayerModal.tsx';
import { AdminAuthModal } from './components/AdminAuthModal.tsx';
import { AdminDashboardModal } from './components/AdminDashboardModal.tsx';
import { RightSidebar } from './components/RightSidebar.tsx';

function getCategoryIcon(cat: string) {
  if (cat === 'فقرة الأنشطة') return <Palette className="w-4 h-4 shrink-0" />;
  if (cat === 'أَذْكَارُ الصَّبَاحِ') return <Sun className="w-4 h-4 shrink-0" />;
  if (cat === 'أَذْكَارُ الْمَسَاءِ') return <Moon className="w-4 h-4 shrink-0" />;
  if (cat === '#مشكلة وحل') return <Lightbulb className="w-4 h-4 shrink-0" />;
  return <BookOpen className="w-4 h-4 shrink-0" />;
}

export default function App() {
  const [appearance, setAppearance] = useState<AppearanceConfig>(DEFAULT_APPEARANCE);
  const [materials, setMaterials] = useState<MaterialItem[]>(INITIAL_MATERIALS);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [activeMaterialId, setActiveMaterialId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('material');
  });

  // Admin auth state held strictly in memory
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [firebaseAdminUid, setFirebaseAdminUid] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);
  const [rewards, setRewards] = useState<ChildRewardsState>(() => loadChildRewards());

  const isAuthenticatedAdmin = Boolean(adminToken || firebaseAdminUid);

  const handleActivityComplete = useCallback(
    (material: MaterialItem) => {
      const result = awardBadgeForMaterial(rewards, material);
      if (result.newlyEarned || result.dailyChallengeCompletedNow) {
        setRewards(result.nextState);
      }
      return {
        badge: result.badge,
        newlyEarned: result.newlyEarned,
        totalPoints: result.nextState.points,
        dailyBonusAwarded: result.dailyBonusAwarded,
        dailyChallengeCompletedNow: result.dailyChallengeCompletedNow,
        dailyStreak: result.dailyStreak,
      };
    },
    [rewards]
  );

  const handleToggleSound = () => {
    setRewards((prev) => {
      const next = { ...prev, soundEnabled: !prev.soundEnabled };
      saveChildRewards(next);
      return next;
    });
  };

  const fetchPlatformData = useCallback(async (tokenOverride?: string | null) => {
    const activeToken = tokenOverride === undefined ? adminToken : tokenOverride;
    try {
      const endpoint = activeToken ? '/api/admin/platform' : '/api/platform';
      const headers: Record<string, string> = activeToken
        ? { Authorization: `Bearer ${activeToken}` }
        : {};
      const res = await fetch(endpoint, { headers, cache: 'no-store' });
      if (res.status === 401 && activeToken) {
        setAdminToken(null);
        const pubRes = await fetch('/api/platform', { cache: 'no-store' });
        if (pubRes.ok) {
          const pubData = (await pubRes.json()) as {
            appearance: AppearanceConfig;
            materials: MaterialItem[];
          };
          setAppearance(pubData.appearance);
          setMaterials(pubData.materials);
        }
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as {
          appearance: AppearanceConfig;
          materials: MaterialItem[];
        };
        setAppearance(data.appearance);
        setMaterials(data.materials);
      }
    } catch {
      // Keep current state when static-hosted or offline
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    void fetchPlatformData();
  }, [fetchPlatformData]);

  // Monitor Firebase Auth state & auto-seed Firestore when Admin connects
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      const verifiedAdmin =
        user && user.emailVerified && user.email === ADMIN_EMAIL ? user : null;
      setFirebaseAdminUid(verifiedAdmin ? verifiedAdmin.uid : null);
      setAuthReady(true);

      if (verifiedAdmin) {
        try {
          await seedFirestoreIfEmpty(verifiedAdmin.uid, INITIAL_MATERIALS, DEFAULT_APPEARANCE);
        } catch (err) {
          console.error('Firestore initial seed check failed:', err);
        }
        if (!adminToken) {
          try {
            const idToken = await verifiedAdmin.getIdToken();
            const res = await fetch('/api/auth/firebase-login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              cache: 'no-store',
              body: JSON.stringify({ idToken }),
            });
            if (res.ok) {
              const data = (await res.json()) as { token?: string };
              if (data.token) setAdminToken(data.token);
            }
          } catch {
            // Static hosting fallback
          }
        }
      }
    });
    return () => unsub();
  }, [adminToken]);

  // Real-time Firestore subscriptions (auto-syncs across Vercel, Firebase Hosting, and AI Studio)
  useEffect(() => {
    if (!authReady) return;
    const unsubAppearance = subscribeAppearanceFromFirestore((nextAppearance) => {
      setAppearance(nextAppearance);
    });
    const unsubMaterials = subscribeMaterialsFromFirestore(
      Boolean(firebaseAdminUid),
      (nextMaterials) => {
        setMaterials(nextMaterials);
        setLoading(false);
      }
    );
    return () => {
      unsubAppearance();
      unsubMaterials();
    };
  }, [authReady, firebaseAdminUid]);

  // Apply theme preset & primary accent to document root
  useEffect(() => {
    document.documentElement.dataset.theme = appearance.themePreset;
    document.documentElement.style.setProperty('--platform-accent', appearance.primaryAccent);
  }, [appearance]);

  const publishedMaterials = useMemo(
    () => materials.filter((m) => m.published).sort((a, b) => a.order - b.order),
    [materials]
  );

  // Pick & persist one random Daily Challenge activity for today
  useEffect(() => {
    if (publishedMaterials.length === 0) return;
    setRewards((prev) => {
      const res = ensureDailyChallenge(prev, publishedMaterials);
      return res.changed ? res.nextState : prev;
    });
  }, [publishedMaterials]);

  const todayKey = getLocalDateKey();
  const dailyChallengeMaterial = useMemo(() => {
    if (!rewards.dailyChallenge || rewards.dailyChallenge.dateKey !== todayKey) {
      return null;
    }
    return publishedMaterials.find((m) => m.id === rewards.dailyChallenge?.materialId) || null;
  }, [publishedMaterials, rewards.dailyChallenge, todayKey]);

  const dailyChallengeCompletedToday = Boolean(
    dailyChallengeMaterial &&
      rewards.dailyChallenge?.dateKey === todayKey &&
      rewards.dailyChallenge?.materialId === dailyChallengeMaterial.id &&
      rewards.dailyChallenge?.completed
  );

  const earnedPublishedCount = useMemo(
    () => publishedMaterials.filter((m) => Boolean(rewards.earnedBadges[m.id])).length,
    [publishedMaterials, rewards.earnedBadges]
  );

  const visibleMaterials = useMemo(() => {
    if (selectedCategory === 'الكل') return publishedMaterials;
    return publishedMaterials.filter((m) => m.category === selectedCategory);
  }, [publishedMaterials, selectedCategory]);

  const featuredMaterials = useMemo(
    () => publishedMaterials.filter((m) => m.featured),
    [publishedMaterials]
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    materials
      .filter((m) => m.published)
      .forEach((m) => {
        if (m.category) set.add(m.category);
      });
    return ['الكل', ...Array.from(set)];
  }, [materials]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { الكل: publishedMaterials.length };
    publishedMaterials.forEach((m) => {
      if (m.category) {
        counts[m.category] = (counts[m.category] ?? 0) + 1;
      }
    });
    return counts;
  }, [publishedMaterials]);

  const activeMaterial = useMemo(
    () => materials.find((m) => m.id === activeMaterialId) || null,
    [materials, activeMaterialId]
  );

  const handleOpenMaterial = (id: string) => {
    setActiveMaterialId(id);
    const url = new URL(window.location.href);
    url.searchParams.set('material', id);
    window.history.replaceState({}, '', url.toString());
  };

  const handleCloseMaterial = () => {
    setActiveMaterialId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('material');
    window.history.replaceState({}, '', url.toString());
  };

  const handleQuickShare = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const url = new URL(window.location.href);
    url.searchParams.set('material', id);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopiedCardId(id);
      setTimeout(() => setCopiedCardId(null), 1800);
    } catch {
      // Ignore clipboard denial
    }
  };

  const handleNavFilter = (cat: string) => {
    setSelectedCategory(cat);
    const el = document.getElementById('materials-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectSection = (
    sectionId:
      | 'top'
      | 'daily-challenge-section'
      | 'rewards-section'
      | 'featured-section'
      | 'materials-section'
  ) => {
    if (sectionId === 'top') {
      setSelectedCategory('الكل');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const fontSizeClass =
    appearance.fontSize === 'xlarge'
      ? 'text-lg'
      : appearance.fontSize === 'large'
        ? 'text-[17px]'
        : 'text-base';

  const gridColsClass =
    appearance.viewMode === 'list'
      ? 'grid-cols-1'
      : appearance.columns === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={`min-h-screen w-full flex flex-col overflow-x-clip ${fontSizeClass}`}>
      {/* UAE Palette Accent Ribbon */}
      <div className="grid grid-cols-4 h-1.5 w-full" aria-hidden="true">
        <div className="bg-[#00732F]" />
        <div className="bg-[#FFFFFF]" />
        <div className="bg-[#CE1126]" />
        <div className="bg-[#171717]" />
      </div>

      {/* Top Utility Bar (no top logo or platform name) */}
      <header className="sticky top-0 z-30 w-full border-b border-[var(--platform-border)] bg-[var(--platform-surface)]/95 backdrop-blur-sm">
        <div className="flex w-full items-center justify-between gap-8 px-4 sm:px-8 lg:px-10 xl:px-12 py-3">
          {/* Mobile Sidebar Trigger + Desktop Category Links */}
          <div className="flex items-center gap-6 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="فتح القائمة الجانبية"
              className="lg:hidden inline-flex items-center gap-2 rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface-muted)] px-3.5 py-2 text-sm font-bold whitespace-nowrap shrink-0"
            >
              <Menu className="w-4 h-4" />
              <span>القائمة</span>
            </button>

            <nav className="hidden md:flex items-center gap-6 text-sm font-bold text-[var(--platform-text-muted)]">
              <button
                type="button"
                onClick={() => handleNavFilter('العقيدة للأطفال')}
                className="hover:text-[var(--platform-accent)] hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0"
              >
                العقيدة للأطفال
              </button>
              <button
                type="button"
                onClick={() => handleNavFilter('فقرة الأنشطة')}
                className="hover:text-[var(--platform-accent)] hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0"
              >
                فقرة الأنشطة
              </button>
              <button
                type="button"
                onClick={() => handleNavFilter('أَذْكَارُ الصَّبَاحِ')}
                className="hover:text-[var(--platform-accent)] hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0"
              >
                أَذْكَارُ الصَّبَاحِ
              </button>
              <button
                type="button"
                onClick={() => handleNavFilter('قصص')}
                className="hover:text-[var(--platform-accent)] hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0"
              >
                قصص
              </button>
            </nav>
          </div>

          {/* Primary Action */}
          <div className="flex items-center shrink-0">
            {isAuthenticatedAdmin ? (
              <button
                type="button"
                onClick={() => setShowAdminDashboard(true)}
                className="rounded-xl px-4 py-2 text-sm font-bold text-white shadow-xs transition-opacity hover:opacity-95 whitespace-nowrap shrink-0"
                style={{ backgroundColor: 'var(--platform-accent)' }}
              >
                لوحة التحكم
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="rounded-xl px-4 py-2 text-sm font-bold text-white shadow-xs transition-opacity hover:opacity-95 whitespace-nowrap shrink-0"
                style={{ backgroundColor: 'var(--platform-accent)' }}
              >
                تسجيل الدخول
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout with Right Sidebar (RTL: first child appears on the right) */}
      <div className="flex flex-1 w-full">
        <RightSidebar
          categories={categories}
          selectedCategory={selectedCategory}
          categoryCounts={categoryCounts}
          publishedMaterials={publishedMaterials}
          rewards={rewards}
          earnedPublishedCount={earnedPublishedCount}
          showFeaturedSection={appearance.showFeaturedSection && featuredMaterials.length > 0}
          showChannelLinks={appearance.showChannelLinks}
          isAuthenticatedAdmin={isAuthenticatedAdmin}
          dailyChallengeMaterial={dailyChallengeMaterial}
          dailyChallengeCompleted={dailyChallengeCompletedToday}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          onSelectSection={handleSelectSection}
          onSelectCategory={handleNavFilter}
          onOpenMaterial={handleOpenMaterial}
          onToggleSound={handleToggleSound}
          onOpenAdmin={() => {
            if (isAuthenticatedAdmin) {
              setShowAdminDashboard(true);
            } else {
              setShowAuthModal(true);
            }
          }}
        />

        {/* Main Content */}
        <main id="top" className="flex-1 min-w-0">
          {/* Sunlit Storybook Hero Section */}
          <section
          className="w-full border-b border-[var(--platform-border)] storybook-pattern"
          style={{ background: 'var(--platform-hero-bg)' }}
        >
          <div className="w-full px-4 sm:px-8 lg:px-10 xl:px-12 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="lg:col-span-7 space-y-5"
            >
              <div className="flex items-center gap-3">
                <ChannelLogoSVG className="w-12 h-12 shrink-0" />
                <p className="text-sm font-bold text-[var(--platform-text-muted)]">
                  قناة رسائل إماراتية للأطفال · حساب رسائل وألوان للأطفال
                </p>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight text-balance">
                رسائل إماراتية للأطفال
              </h1>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenMaterial('aqeedah-activities-pack')}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#00732F] px-6 py-3.5 text-base font-extrabold text-white shadow-sm transition-transform hover:-translate-y-0.5 active:scale-[0.98] whitespace-nowrap"
                >
                  <Palette className="w-5 h-5" />
                  <span>فقرة الأنشطة</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenMaterial('aqeedah-qa-25')}
                  className="inline-flex items-center gap-2 rounded-2xl border-2 border-[var(--platform-border)] bg-[var(--platform-surface)] px-6 py-3.5 text-base font-extrabold transition-transform hover:-translate-y-0.5 active:scale-[0.98] whitespace-nowrap"
                >
                  <BookOpen className="w-5 h-5" style={{ color: 'var(--platform-accent)' }} />
                  <span>العقيدة للأطفال</span>
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="lg:col-span-5"
            >
              <div className="rounded-3xl border-2 border-[var(--platform-border)] bg-[var(--platform-surface)] p-2.5 shadow-md overflow-hidden">
                <HeroStorybookIllustration className="w-full h-56 sm:h-64 lg:h-72 rounded-2xl" />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Daily Challenge Section */}
        {dailyChallengeMaterial && (
          <section id="daily-challenge-section" className="w-full px-4 sm:px-8 lg:px-10 xl:px-12 pt-8">
            <div className="rounded-3xl border-2 border-rose-200 bg-gradient-to-l from-rose-50/90 via-amber-50/70 to-[var(--platform-surface)] p-5 sm:p-6 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-start sm:items-center gap-4 min-w-0">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
                    style={{ backgroundColor: dailyChallengeMaterial.accentColor }}
                  >
                    <MotifBadgeIcon motif={dailyChallengeMaterial.themeMotif} className="w-7 h-7" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold">
                      <span className="inline-flex items-center gap-1 text-rose-700">
                        <Flame className="w-4 h-4" />
                        <span>التحدي اليومي</span>
                      </span>
                      <span aria-hidden="true" className="text-slate-400">·</span>
                      <span className="text-amber-700 tabular-nums">نقاط مضاعفة ×2</span>
                      {rewards.dailyStreak > 0 && (
                        <>
                          <span aria-hidden="true" className="text-slate-400">·</span>
                          <span className="text-emerald-700 tabular-nums">
                            سلسلة الأيام: {rewards.dailyStreak}
                          </span>
                        </>
                      )}
                    </div>

                    <h2 className="text-lg sm:text-xl font-extrabold truncate">
                      {dailyChallengeMaterial.title}
                    </h2>

                    <div className="text-xs sm:text-sm font-bold text-[var(--platform-text-muted)] tabular-nums">
                      <span>{dailyChallengeMaterial.category}</span>
                      <span aria-hidden="true"> · </span>
                      <span>
                        {dailyChallengeCompletedToday
                          ? `تم إنجاز تحدي اليوم (+${rewards.dailyChallenge?.bonusAwarded || getPointsForMaterial(dailyChallengeMaterial)} نقطة إضافية)`
                          : `المكافأة: +${
                              rewards.earnedBadges[dailyChallengeMaterial.id]
                                ? getPointsForMaterial(dailyChallengeMaterial)
                                : getPointsForMaterial(dailyChallengeMaterial) * 2
                            } نقطة`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenMaterial(dailyChallengeMaterial.id)}
                    className={`inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm sm:text-base font-extrabold shadow-xs transition-transform hover:-translate-y-0.5 active:scale-[0.98] whitespace-nowrap ${
                      dailyChallengeCompletedToday
                        ? 'border-2 border-emerald-300 bg-emerald-50 text-emerald-800'
                        : 'text-white'
                    }`}
                    style={
                      dailyChallengeCompletedToday
                        ? undefined
                        : { backgroundColor: dailyChallengeMaterial.accentColor }
                    }
                  >
                    {dailyChallengeCompletedToday ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span>تم إنجاز تحدي اليوم</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>ابدأ التحدي اليومي</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Child Points & Badges Cabinet */}
        {publishedMaterials.length > 0 && (
          <section id="rewards-section" className="w-full px-4 sm:px-8 lg:px-10 xl:px-12 pt-8">
            <div className="rounded-3xl border-2 border-[var(--platform-border)] bg-[var(--platform-surface)] p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 border-2 border-amber-300">
                    <Trophy className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold">لوحة النقاط والأوسمة</h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm font-bold text-[var(--platform-text-muted)] tabular-nums">
                      <span className="inline-flex items-center gap-1 text-amber-700">
                        <Star className="w-4 h-4 fill-current" />
                        <span>النقاط: {rewards.points}</span>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <Award className="w-4 h-4" />
                        <span>
                          الأوسمة: {earnedPublishedCount} / {publishedMaterials.length}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden sm:block w-36 h-2.5 overflow-hidden rounded-full bg-[var(--platform-surface-muted)]">
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                      style={{
                        width: `${Math.round((earnedPublishedCount / publishedMaterials.length) * 100)}%`,
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleSound}
                    aria-label={rewards.soundEnabled ? 'كتم الصوت' : 'تشغيل الصوت'}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface-muted)] px-3.5 py-2 text-xs font-bold hover:opacity-90"
                  >
                    {rewards.soundEnabled ? (
                      <Volume2 className="w-4 h-4 text-[var(--platform-accent)]" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-[var(--platform-text-muted)]" />
                    )}
                    <span>{rewards.soundEnabled ? 'الصوت مفعل' : 'صامت'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {publishedMaterials.map((item) => {
                  const earned = rewards.earnedBadges[item.id];
                  const pts = getPointsForMaterial(item);
                  return (
                    <button
                      key={`badge-${item.id}`}
                      type="button"
                      onClick={() => handleOpenMaterial(item.id)}
                      className={`group flex flex-col items-center gap-2 rounded-2xl border-2 p-3 text-center transition-all hover:-translate-y-0.5 ${
                        earned
                          ? 'border-amber-300 bg-amber-50/55 text-slate-900 shadow-xs'
                          : 'border-dashed border-[var(--platform-border)] bg-[var(--platform-surface-muted)]/60 text-[var(--platform-text-muted)] hover:border-[var(--platform-accent)]'
                      }`}
                    >
                      <div
                        className={`relative flex h-12 w-12 items-center justify-center rounded-full border-2 transition-transform group-hover:scale-105 ${
                          earned
                            ? 'border-amber-300 text-white shadow-sm'
                            : 'border-slate-300 bg-[var(--platform-surface)] text-slate-400'
                        }`}
                        style={earned ? { backgroundColor: item.accentColor } : undefined}
                      >
                        <MotifBadgeIcon motif={item.themeMotif} className="w-6 h-6" />
                        <span
                          className={`absolute -bottom-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full border border-white text-white ${
                            earned ? 'bg-emerald-600' : 'bg-slate-400'
                          }`}
                        >
                          {earned ? <Check className="w-3 h-3" /> : <Lock className="w-2.5 h-2.5" />}
                        </span>
                      </div>
                      <div className="w-full truncate text-xs font-extrabold">{item.title}</div>
                      <div className="text-[11px] font-bold tabular-nums opacity-80">
                        {earned ? `+${earned.pointsAwarded} نقطة` : `+${pts} نقطة`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Featured Section */}
        {appearance.showFeaturedSection && featuredMaterials.length > 0 && (
          <section id="featured-section" className="w-full px-4 sm:px-8 lg:px-10 xl:px-12 pt-10 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-extrabold">الأنشطة التفاعلية</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featuredMaterials.map((item) => {
                const earned = Boolean(rewards.earnedBadges[item.id]);
                const isTodayDaily = dailyChallengeMaterial?.id === item.id;
                const pts = getPointsForMaterial(item);
                const effectivePts =
                  isTodayDaily && !dailyChallengeCompletedToday
                    ? earned
                      ? pts
                      : pts * 2
                    : pts;
                return (
                  <motion.article
                    key={item.id}
                    whileHover={{ y: -4 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                    onClick={() => handleOpenMaterial(item.id)}
                    className="group cursor-pointer rounded-3xl border-2 border-[var(--platform-border)] bg-[var(--platform-surface)] overflow-hidden shadow-xs hover:shadow-lg transition-shadow"
                  >
                    <div className="h-2 w-full" style={{ backgroundColor: item.accentColor }} />
                    <div className="grid grid-cols-1 sm:grid-cols-12 items-stretch">
                      <div className="sm:col-span-5 overflow-hidden">
                        <MotifIllustration
                          motif={item.themeMotif}
                          className="w-full h-48 sm:h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="sm:col-span-7 p-6 flex flex-col justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-xs font-bold text-[var(--platform-text-muted)]">
                            <span>
                              {item.category}
                              {item.author ? ` · ${item.author}` : ''}
                              {isTodayDaily && !dailyChallengeCompletedToday ? ' · التحدي اليومي' : ''}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 tabular-nums ${
                                isTodayDaily && !dailyChallengeCompletedToday
                                  ? 'text-rose-700'
                                  : earned
                                    ? 'text-emerald-700'
                                    : 'text-amber-700'
                              }`}
                            >
                              {isTodayDaily && !dailyChallengeCompletedToday ? (
                                <Flame className="w-3.5 h-3.5" />
                              ) : earned ? (
                                <Award className="w-3.5 h-3.5" />
                              ) : (
                                <Star className="w-3.5 h-3.5 fill-current" />
                              )}
                              <span>
                                {isTodayDaily && !dailyChallengeCompletedToday
                                  ? `×2 (+${effectivePts})`
                                  : earned
                                    ? 'وسام مكتمل'
                                    : `+${pts}`}
                              </span>
                            </span>
                          </div>
                          <h3 className="text-xl font-extrabold group-hover:underline">
                            {item.title}
                          </h3>
                          {item.subtitle && (
                            <p className="text-sm text-[var(--platform-text-muted)]">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-extrabold text-white"
                            style={{ backgroundColor: item.accentColor }}
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>بدء النشاط</span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleQuickShare(e, item.id)}
                            aria-label="مشاركة"
                            className="inline-flex items-center gap-1 rounded-xl border border-[var(--platform-border)] px-3 py-2 text-xs font-bold text-[var(--platform-text-muted)] hover:text-[var(--platform-text)]"
                          >
                            {copiedCardId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Share2 className="w-3.5 h-3.5" />
                            )}
                            <span>{copiedCardId === item.id ? 'تم النسخ' : 'مشاركة'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </section>
        )}

        {/* Materials Catalog */}
        <section id="materials-section" className="w-full px-4 sm:px-8 lg:px-10 xl:px-12 py-10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-extrabold">المواد التعليمية</h2>

            {appearance.showCategoriesBar && (
              <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-1.5 shadow-xs">
                {categories.map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'text-white shadow-xs'
                          : 'text-[var(--platform-text-muted)] hover:bg-[var(--platform-surface-muted)] hover:text-[var(--platform-text)]'
                      }`}
                      style={isActive ? { backgroundColor: 'var(--platform-accent)' } : undefined}
                    >
                      {cat !== 'الكل' && getCategoryIcon(cat)}
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-[var(--platform-text-muted)]">...</div>
          ) : visibleMaterials.length === 0 ? (
            <div className="rounded-3xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-10 text-center text-sm text-[var(--platform-text-muted)]">
              لا توجد مواد منشورة في هذا التصنيف حالياً.
            </div>
          ) : (
            <div className={`grid gap-6 ${gridColsClass}`}>
              {visibleMaterials.map((item) => {
                const earned = Boolean(rewards.earnedBadges[item.id]);
                const isTodayDaily = dailyChallengeMaterial?.id === item.id;
                const pts = getPointsForMaterial(item);
                const effectivePts =
                  isTodayDaily && !dailyChallengeCompletedToday
                    ? earned
                      ? pts
                      : pts * 2
                    : pts;
                return (
                  <motion.article
                    key={item.id}
                    whileHover={{ y: -4 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                    onClick={() => handleOpenMaterial(item.id)}
                    className={`group cursor-pointer border-2 border-[var(--platform-border)] bg-[var(--platform-surface)] overflow-hidden shadow-xs hover:shadow-lg transition-shadow ${
                      appearance.cardStyle === 'circle'
                        ? 'rounded-[2rem]'
                        : appearance.cardStyle === 'compact'
                          ? 'rounded-2xl'
                          : 'rounded-3xl'
                    } ${
                      appearance.viewMode === 'list'
                        ? 'flex flex-col sm:flex-row items-stretch'
                        : 'flex flex-col'
                    }`}
                  >
                    {appearance.viewMode !== 'list' && (
                      <div className="h-1.5 w-full" style={{ backgroundColor: item.accentColor }} />
                    )}

                    {appearance.cardStyle !== 'compact' && (
                      <div
                        className={`overflow-hidden ${
                          appearance.viewMode === 'list' ? 'sm:w-64 shrink-0' : 'w-full'
                        }`}
                      >
                        <MotifIllustration
                          motif={item.themeMotif}
                          className={`w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                            appearance.viewMode === 'list' ? 'h-48 sm:h-full' : 'h-44 sm:h-48'
                          }`}
                        />
                      </div>
                    )}

                    <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs font-bold text-[var(--platform-text-muted)]">
                          <span>
                            {item.category}
                            {item.author ? ` · ${item.author}` : ''}
                            {isTodayDaily && !dailyChallengeCompletedToday ? ' · التحدي اليومي' : ''}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 tabular-nums ${
                              isTodayDaily && !dailyChallengeCompletedToday
                                ? 'text-rose-700'
                                : earned
                                  ? 'text-emerald-700'
                                  : 'text-amber-700'
                            }`}
                          >
                            {isTodayDaily && !dailyChallengeCompletedToday ? (
                              <Flame className="w-3.5 h-3.5" />
                            ) : earned ? (
                              <Award className="w-3.5 h-3.5" />
                            ) : (
                              <Star className="w-3.5 h-3.5 fill-current" />
                            )}
                            <span>
                              {isTodayDaily && !dailyChallengeCompletedToday
                                ? `×2 (+${effectivePts})`
                                : earned
                                  ? 'وسام مكتمل'
                                  : `+${pts}`}
                            </span>
                          </span>
                        </div>
                        <h3 className="text-lg sm:text-xl font-extrabold group-hover:underline">
                          {item.title}
                        </h3>
                        {item.subtitle && (
                          <p className="text-sm text-[var(--platform-text-muted)]">
                            {item.subtitle}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-[var(--platform-border)]">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-extrabold text-white"
                          style={{ backgroundColor: item.accentColor }}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>عرض النشاط</span>
                        </span>

                        <button
                          type="button"
                          onClick={(e) => handleQuickShare(e, item.id)}
                          className="inline-flex items-center gap-1 rounded-xl border border-[var(--platform-border)] px-3 py-1.5 text-xs font-bold text-[var(--platform-text-muted)] hover:text-[var(--platform-text)]"
                        >
                          {copiedCardId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Share2 className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedCardId === item.id ? 'تم النسخ' : 'مشاركة'}</span>
                        </button>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </section>
      </main>
      </div>

      {/* Footer with exact channel links from attached PDFs */}
      {appearance.showChannelLinks && (
        <footer className="w-full border-t border-[var(--platform-border)] bg-[var(--platform-surface)]">
          <div className="w-full px-4 sm:px-8 lg:px-10 xl:px-12 py-8 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <ChannelLogoSVG className="w-9 h-9 shrink-0" />
              <span className="font-extrabold">قناة رسائل إماراتية للأطفال</span>
            </div>

            <div className="flex flex-wrap items-center gap-5 text-sm font-semibold text-[var(--platform-text-muted)]">
              {CHANNEL_SOCIAL_LINKS.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-[var(--platform-accent)] hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </a>
              ))}
            </div>
          </div>
        </footer>
      )}

      {/* Interactive Activity Modal */}
      {activeMaterial && (
        <MaterialPlayerModal
          material={activeMaterial}
          showOriginalPdfButton={appearance.showOriginalPdfButton}
          isCompleted={Boolean(rewards.earnedBadges[activeMaterial.id])}
          isDailyChallenge={dailyChallengeMaterial?.id === activeMaterial.id}
          isDailyChallengeCompletedToday={dailyChallengeCompletedToday}
          soundEnabled={rewards.soundEnabled}
          onActivityComplete={handleActivityComplete}
          onClose={handleCloseMaterial}
        />
      )}

      {/* Admin Auth Modal */}
      {showAuthModal && (
        <AdminAuthModal
          onSuccess={async (token) => {
            if (token) setAdminToken(token);
            setShowAuthModal(false);
            if (token) await fetchPlatformData(token);
            setShowAdminDashboard(true);
          }}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {/* Admin Dashboard Modal */}
      {showAdminDashboard && isAuthenticatedAdmin && (
        <AdminDashboardModal
          token={adminToken}
          firebaseUid={firebaseAdminUid}
          appearance={appearance}
          materials={materials}
          onRefresh={() => fetchPlatformData(adminToken)}
          onLogout={async () => {
            setAdminToken(null);
            setShowAdminDashboard(false);
            try {
              await signOut(auth);
            } catch {
              // Ignore signOut failure
            }
            await fetchPlatformData(null);
          }}
          onClose={() => setShowAdminDashboard(false)}
        />
      )}
    </div>
  );
}

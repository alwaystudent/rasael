import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  ExternalLink,
  Lightbulb,
  Moon,
  Palette,
  Play,
  Share2,
  Sun,
} from 'lucide-react';
import {
  CHANNEL_SOCIAL_LINKS,
  DEFAULT_APPEARANCE,
  INITIAL_MATERIALS,
} from './data/initialMaterials.ts';
import type { AppearanceConfig, MaterialItem } from './types/platform.ts';
import {
  ChannelLogoSVG,
  HeroStorybookIllustration,
  MotifIllustration,
} from './components/ChannelEmblem.tsx';
import { MaterialPlayerModal } from './components/MaterialPlayerModal.tsx';
import { AdminAuthModal } from './components/AdminAuthModal.tsx';
import { AdminDashboardModal } from './components/AdminDashboardModal.tsx';

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

  // Admin auth token held strictly in memory
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);

  const fetchPlatformData = useCallback(async (tokenOverride?: string | null) => {
    const activeToken = tokenOverride === undefined ? adminToken : tokenOverride;
    try {
      const endpoint = activeToken ? '/api/admin/platform' : '/api/platform';
      const headers: Record<string, string> = activeToken
        ? { Authorization: `Bearer ${activeToken}` }
        : {};
      const res = await fetch(endpoint, { headers });
      if (res.status === 401 && activeToken) {
        setAdminToken(null);
        const pubRes = await fetch('/api/platform');
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
      // Keep current state on transient network failure
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    fetchPlatformData();
  }, [fetchPlatformData]);

  // Apply theme preset & primary accent to document root
  useEffect(() => {
    document.documentElement.dataset.theme = appearance.themePreset;
    document.documentElement.style.setProperty('--platform-accent', appearance.primaryAccent);
  }, [appearance]);

  const visibleMaterials = useMemo(() => {
    const list = materials.filter((m) => m.published);
    if (selectedCategory === 'الكل') return list;
    return list.filter((m) => m.category === selectedCategory);
  }, [materials, selectedCategory]);

  const featuredMaterials = useMemo(
    () => materials.filter((m) => m.published && m.featured),
    [materials]
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
    <div className={`min-h-screen flex flex-col ${fontSizeClass}`}>
      {/* UAE Palette Accent Ribbon */}
      <div className="grid grid-cols-4 h-1.5 w-full" aria-hidden="true">
        <div className="bg-[#00732F]" />
        <div className="bg-[#FFFFFF]" />
        <div className="bg-[#CE1126]" />
        <div className="bg-[#171717]" />
      </div>

      {/* Top Bar Contract: Zone 1 (Brand) — Zone 2 (4 Nav Links) — Zone 3 (1 Primary Action) */}
      <header className="sticky top-0 z-30 border-b border-[var(--platform-border)] bg-[var(--platform-surface)]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 sm:px-8 py-3.5">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setSelectedCategory('الكل');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-3 text-lg sm:text-xl font-extrabold tracking-tight whitespace-nowrap shrink-0"
          >
            <ChannelLogoSVG className="w-10 h-10 shrink-0" />
            <span>رسائل إماراتية للأطفال</span>
          </a>

          {/* Zone 2: 4 Single-line Nav Links */}
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

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            {adminToken ? (
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

      {/* Main Content */}
      <main id="top" className="flex-1">
        {/* Sunlit Storybook Hero Section */}
        <section
          className="border-b border-[var(--platform-border)]"
          style={{ background: 'var(--platform-hero-bg)' }}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-8 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-5">
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
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#00732F] px-6 py-3.5 text-base font-extrabold text-white shadow-sm transition-transform hover:-translate-y-0.5 whitespace-nowrap"
                >
                  <Palette className="w-5 h-5" />
                  <span>فقرة الأنشطة</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenMaterial('aqeedah-qa-25')}
                  className="inline-flex items-center gap-2 rounded-2xl border-2 border-[var(--platform-border)] bg-[var(--platform-surface)] px-6 py-3.5 text-base font-extrabold transition-transform hover:-translate-y-0.5 whitespace-nowrap"
                >
                  <BookOpen className="w-5 h-5" style={{ color: 'var(--platform-accent)' }} />
                  <span>العقيدة للأطفال</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-3xl border-2 border-[var(--platform-border)] bg-[var(--platform-surface)] p-3 shadow-sm">
                <HeroStorybookIllustration className="w-full h-52 sm:h-60 rounded-2xl" />
              </div>
            </div>
          </div>
        </section>

        {/* Featured Section */}
        {appearance.showFeaturedSection && featuredMaterials.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 sm:px-8 pt-10 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-extrabold">الأنشطة التفاعلية</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featuredMaterials.map((item) => (
                <article
                  key={item.id}
                  onClick={() => handleOpenMaterial(item.id)}
                  className="group cursor-pointer rounded-3xl border-2 border-[var(--platform-border)] bg-[var(--platform-surface)] overflow-hidden shadow-xs transition-all hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="h-2 w-full" style={{ backgroundColor: item.accentColor }} />
                  <div className="grid grid-cols-1 sm:grid-cols-12 items-stretch">
                    <div className="sm:col-span-5">
                      <MotifIllustration
                        motif={item.themeMotif}
                        className="w-full h-44 sm:h-full object-cover"
                      />
                    </div>
                    <div className="sm:col-span-7 p-6 flex flex-col justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="text-xs font-bold text-[var(--platform-text-muted)]">
                          {item.category}
                          {item.author ? ` · ${item.author}` : ''}
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
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Materials Catalog */}
        <section id="materials-section" className="mx-auto max-w-7xl px-4 sm:px-8 py-10 space-y-6">
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
              {visibleMaterials.map((item) => (
                <article
                  key={item.id}
                  onClick={() => handleOpenMaterial(item.id)}
                  className={`group cursor-pointer border-2 border-[var(--platform-border)] bg-[var(--platform-surface)] overflow-hidden shadow-xs transition-all hover:-translate-y-1 hover:shadow-md ${
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
                      className={
                        appearance.viewMode === 'list' ? 'sm:w-64 shrink-0' : 'w-full'
                      }
                    >
                      <MotifIllustration
                        motif={item.themeMotif}
                        className={`w-full object-cover ${
                          appearance.viewMode === 'list' ? 'h-44 sm:h-full' : 'h-40'
                        }`}
                      />
                    </div>
                  )}

                  <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-[var(--platform-text-muted)]">
                        {item.category}
                        {item.author ? ` · ${item.author}` : ''}
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
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer with exact channel links from attached PDFs */}
      {appearance.showChannelLinks && (
        <footer className="border-t border-[var(--platform-border)] bg-[var(--platform-surface)]">
          <div className="mx-auto max-w-7xl px-4 sm:px-8 py-8 flex flex-wrap items-center justify-between gap-6">
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
          onClose={handleCloseMaterial}
        />
      )}

      {/* Admin Auth Modal */}
      {showAuthModal && (
        <AdminAuthModal
          onSuccess={async (token) => {
            setAdminToken(token);
            setShowAuthModal(false);
            await fetchPlatformData(token);
            setShowAdminDashboard(true);
          }}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {/* Admin Dashboard Modal */}
      {showAdminDashboard && adminToken && (
        <AdminDashboardModal
          token={adminToken}
          appearance={appearance}
          materials={materials}
          onRefresh={() => fetchPlatformData(adminToken)}
          onLogout={() => {
            setAdminToken(null);
            setShowAdminDashboard(false);
            fetchPlatformData(null);
          }}
          onClose={() => setShowAdminDashboard(false)}
        />
      )}
    </div>
  );
}

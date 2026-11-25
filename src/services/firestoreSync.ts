import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase.ts';
import { DEFAULT_APPEARANCE } from '../data/initialMaterials.ts';
import type { AppearanceConfig, MaterialItem } from '../types/platform.ts';

const APPEARANCE_DOC_PATH = 'platform_config/appearance';

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  return cleaned || `mat-${Date.now()}`;
}

function clip(value: string | undefined, maxLen: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.slice(0, maxLen);
}

function stripUndefinedValue(val: unknown): unknown {
  if (Array.isArray(val)) {
    return val.map(stripUndefinedValue);
  }
  if (val && typeof val === 'object' && Object.getPrototypeOf(val) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefinedValue(v);
      }
    }
    return out;
  }
  return val;
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      out[k] = stripUndefinedValue(v);
    }
  }
  return out;
}

function timestampToIso(value: unknown, fallback?: string): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  return fallback || new Date().toISOString();
}

function buildMaterialFirestoreCreatePayload(
  item: MaterialItem,
  uid: string
): Record<string, unknown> {
  const safeId = sanitizeId(item.id);
  const safeOrder = Number.isInteger(item.order)
    ? Math.min(10000, Math.max(0, item.order))
    : 1;

  return stripUndefined({
    id: safeId,
    title: (clip(item.title, 300) || 'مادة تعليمية').trim(),
    subtitle: item.subtitle ? clip(item.subtitle, 400) : undefined,
    author: item.author ? clip(item.author, 200) : undefined,
    category: (clip(item.category, 120) || 'العقيدة للأطفال').trim(),
    activityType: item.activityType || 'smart_cards',
    accentColor: /^#[0-9a-fA-F]{6}$/.test(item.accentColor) ? item.accentColor : '#0E7490',
    themeMotif: item.themeMotif || 'ocean',
    published: Boolean(item.published),
    featured: Boolean(item.featured),
    order: safeOrder,
    sourceUrl: item.sourceUrl ? clip(item.sourceUrl, 1000) : undefined,
    sourceMimeType: item.sourceMimeType ? clip(item.sourceMimeType, 100) : undefined,
    sourceFileName: item.sourceFileName ? clip(item.sourceFileName, 260) : undefined,
    externalLinks: Array.isArray(item.externalLinks) ? item.externalLinks.slice(0, 10) : undefined,
    qaItems: Array.isArray(item.qaItems) ? item.qaItems.slice(0, 100) : undefined,
    dhikrItems: Array.isArray(item.dhikrItems) ? item.dhikrItems.slice(0, 100) : undefined,
    storyChapters: Array.isArray(item.storyChapters) ? item.storyChapters.slice(0, 30) : undefined,
    storyLessonsIntro: item.storyLessonsIntro ? clip(item.storyLessonsIntro, 2000) : undefined,
    storyLessonsHeading: item.storyLessonsHeading ? clip(item.storyLessonsHeading, 300) : undefined,
    storyLessons: Array.isArray(item.storyLessons) ? item.storyLessons.slice(0, 50) : undefined,
    problemSolution: item.problemSolution,
    smartActivity: item.smartActivity,
    ownerId: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

function buildAppearancePayload(appearance: AppearanceConfig): Record<string, unknown> {
  return {
    themePreset: appearance.themePreset,
    primaryAccent: /^#[0-9a-fA-F]{6}$/.test(appearance.primaryAccent)
      ? appearance.primaryAccent
      : '#0E7490',
    columns: appearance.columns === 2 ? 2 : 3,
    viewMode: appearance.viewMode === 'list' ? 'list' : 'grid',
    cardStyle: appearance.cardStyle,
    fontSize: appearance.fontSize,
    showCategoriesBar: Boolean(appearance.showCategoriesBar),
    showFeaturedSection: Boolean(appearance.showFeaturedSection),
    showChannelLinks: Boolean(appearance.showChannelLinks),
    showOriginalPdfButton: Boolean(appearance.showOriginalPdfButton),
    updatedAt: serverTimestamp(),
  };
}

function docToMaterial(raw: Record<string, unknown>, docId: string): MaterialItem {
  return {
    id: typeof raw.id === 'string' ? raw.id : docId,
    title: typeof raw.title === 'string' ? raw.title : '',
    subtitle: typeof raw.subtitle === 'string' ? raw.subtitle : undefined,
    author: typeof raw.author === 'string' ? raw.author : undefined,
    category: typeof raw.category === 'string' ? raw.category : 'العقيدة للأطفال',
    activityType: (raw.activityType as MaterialItem['activityType']) || 'smart_cards',
    accentColor: typeof raw.accentColor === 'string' ? raw.accentColor : '#0E7490',
    themeMotif: (raw.themeMotif as MaterialItem['themeMotif']) || 'ocean',
    published: Boolean(raw.published),
    featured: Boolean(raw.featured),
    order: typeof raw.order === 'number' ? raw.order : 0,
    sourceUrl: typeof raw.sourceUrl === 'string' ? raw.sourceUrl : undefined,
    sourceMimeType: typeof raw.sourceMimeType === 'string' ? raw.sourceMimeType : undefined,
    sourceFileName: typeof raw.sourceFileName === 'string' ? raw.sourceFileName : undefined,
    externalLinks: Array.isArray(raw.externalLinks)
      ? (raw.externalLinks as MaterialItem['externalLinks'])
      : undefined,
    qaItems: Array.isArray(raw.qaItems) ? (raw.qaItems as MaterialItem['qaItems']) : undefined,
    dhikrItems: Array.isArray(raw.dhikrItems)
      ? (raw.dhikrItems as MaterialItem['dhikrItems'])
      : undefined,
    storyChapters: Array.isArray(raw.storyChapters)
      ? (raw.storyChapters as MaterialItem['storyChapters'])
      : undefined,
    storyLessonsIntro:
      typeof raw.storyLessonsIntro === 'string' ? raw.storyLessonsIntro : undefined,
    storyLessonsHeading:
      typeof raw.storyLessonsHeading === 'string' ? raw.storyLessonsHeading : undefined,
    storyLessons: Array.isArray(raw.storyLessons)
      ? (raw.storyLessons as MaterialItem['storyLessons'])
      : undefined,
    problemSolution: raw.problemSolution as MaterialItem['problemSolution'],
    smartActivity: raw.smartActivity as MaterialItem['smartActivity'],
    createdAt: timestampToIso(raw.createdAt),
  };
}

function docToAppearance(raw: Record<string, unknown>): AppearanceConfig {
  return {
    ...DEFAULT_APPEARANCE,
    themePreset:
      (raw.themePreset as AppearanceConfig['themePreset']) || DEFAULT_APPEARANCE.themePreset,
    primaryAccent:
      typeof raw.primaryAccent === 'string'
        ? raw.primaryAccent
        : DEFAULT_APPEARANCE.primaryAccent,
    columns: raw.columns === 2 || raw.columns === 3 ? raw.columns : DEFAULT_APPEARANCE.columns,
    viewMode:
      raw.viewMode === 'list' || raw.viewMode === 'grid'
        ? raw.viewMode
        : DEFAULT_APPEARANCE.viewMode,
    cardStyle:
      (raw.cardStyle as AppearanceConfig['cardStyle']) || DEFAULT_APPEARANCE.cardStyle,
    fontSize: (raw.fontSize as AppearanceConfig['fontSize']) || DEFAULT_APPEARANCE.fontSize,
    showCategoriesBar:
      typeof raw.showCategoriesBar === 'boolean'
        ? raw.showCategoriesBar
        : DEFAULT_APPEARANCE.showCategoriesBar,
    showFeaturedSection:
      typeof raw.showFeaturedSection === 'boolean'
        ? raw.showFeaturedSection
        : DEFAULT_APPEARANCE.showFeaturedSection,
    showChannelLinks:
      typeof raw.showChannelLinks === 'boolean'
        ? raw.showChannelLinks
        : DEFAULT_APPEARANCE.showChannelLinks,
    showOriginalPdfButton:
      typeof raw.showOriginalPdfButton === 'boolean'
        ? raw.showOriginalPdfButton
        : DEFAULT_APPEARANCE.showOriginalPdfButton,
  };
}

export function subscribeAppearanceFromFirestore(
  onUpdate: (appearance: AppearanceConfig) => void
): () => void {
  const ref = doc(db, 'platform_config', 'appearance');
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        onUpdate(docToAppearance(snap.data() as Record<string, unknown>));
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, APPEARANCE_DOC_PATH);
    }
  );
}

export function subscribeMaterialsFromFirestore(
  isAdminMode: boolean,
  onUpdate: (materials: MaterialItem[]) => void
): () => void {
  const materialsRef = collection(db, 'materials');
  const q = isAdminMode ? materialsRef : query(materialsRef, where('published', '==', true));

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) return;
      const list = snapshot.docs
        .map((d) => docToMaterial(d.data() as Record<string, unknown>, d.id))
        .sort((a, b) => a.order - b.order);
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'materials');
    }
  );
}

export async function seedFirestoreIfEmpty(
  uid: string,
  materials: MaterialItem[],
  appearance: AppearanceConfig
): Promise<{ seededMaterials: number; seededAppearance: boolean }> {
  let seededAppearance = false;
  let seededMaterials = 0;

  try {
    const appearanceRef = doc(db, 'platform_config', 'appearance');
    const appearanceSnap = await getDoc(appearanceRef);
    if (!appearanceSnap.exists()) {
      await setDoc(appearanceRef, buildAppearancePayload(appearance));
      seededAppearance = true;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, APPEARANCE_DOC_PATH);
  }

  try {
    const existingMaterialsSnap = await getDocs(collection(db, 'materials'));
    const existingIds = new Set(existingMaterialsSnap.docs.map((d) => d.id));
    const missing = materials.filter((m) => !existingIds.has(sanitizeId(m.id)));
    if (missing.length > 0) {
      const batch = writeBatch(db);
      for (const item of missing) {
        const safeId = sanitizeId(item.id);
        batch.set(doc(db, 'materials', safeId), buildMaterialFirestoreCreatePayload(item, uid));
        seededMaterials += 1;
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'materials');
  }

  return { seededMaterials, seededAppearance };
}

export async function syncAppearanceToFirestore(appearance: AppearanceConfig): Promise<void> {
  try {
    await setDoc(doc(db, 'platform_config', 'appearance'), buildAppearancePayload(appearance));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, APPEARANCE_DOC_PATH);
  }
}

export async function syncMaterialCreateToFirestore(
  item: MaterialItem,
  uid: string
): Promise<void> {
  const safeId = sanitizeId(item.id);
  try {
    await setDoc(doc(db, 'materials', safeId), buildMaterialFirestoreCreatePayload(item, uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `materials/${safeId}`);
  }
}

export async function syncMaterialUpdateToFirestore(
  item: MaterialItem,
  uid: string
): Promise<void> {
  const safeId = sanitizeId(item.id);
  const ref = doc(db, 'materials', safeId);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, buildMaterialFirestoreCreatePayload(item, uid));
      return;
    }
    const safeOrder = Number.isInteger(item.order)
      ? Math.min(10000, Math.max(0, item.order))
      : 1;
    await updateDoc(
      ref,
      stripUndefined({
        title: (clip(item.title, 300) || 'مادة تعليمية').trim(),
        subtitle: typeof item.subtitle === 'string' ? clip(item.subtitle, 400) : undefined,
        author: typeof item.author === 'string' ? clip(item.author, 200) : undefined,
        category: (clip(item.category, 120) || 'العقيدة للأطفال').trim(),
        activityType: item.activityType || 'smart_cards',
        accentColor: /^#[0-9a-fA-F]{6}$/.test(item.accentColor) ? item.accentColor : '#0E7490',
        themeMotif: item.themeMotif || 'ocean',
        published: Boolean(item.published),
        featured: Boolean(item.featured),
        order: safeOrder,
        smartActivity: item.smartActivity,
        updatedAt: serverTimestamp(),
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `materials/${safeId}`);
  }
}

export async function syncMaterialFieldToggleToFirestore(
  id: string,
  field: 'published' | 'featured',
  nextValue: boolean
): Promise<void> {
  const safeId = sanitizeId(id);
  try {
    await updateDoc(doc(db, 'materials', safeId), {
      [field]: nextValue,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `materials/${safeId}`);
  }
}

export async function syncMaterialsOrderToFirestore(orderedIds: string[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    orderedIds.forEach((rawId, idx) => {
      const safeId = sanitizeId(rawId);
      batch.update(doc(db, 'materials', safeId), {
        order: idx + 1,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'materials');
  }
}

export async function syncMaterialDeleteFromFirestore(id: string): Promise<void> {
  const safeId = sanitizeId(id);
  try {
    await deleteDoc(doc(db, 'materials', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `materials/${safeId}`);
  }
}

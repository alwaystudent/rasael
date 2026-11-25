import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Cloud,
  Edit3,
  Eye,
  EyeOff,
  FileUp,
  Image as ImageIcon,
  LayoutGrid,
  Link2,
  LogOut,
  Move,
  Palette,
  Plus,
  RefreshCw,
  Share2,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  seedFirestoreIfEmpty,
  syncAppearanceToFirestore,
  syncMaterialCreateToFirestore,
  syncMaterialDeleteFromFirestore,
  syncMaterialFieldToggleToFirestore,
  syncMaterialsOrderToFirestore,
  syncMaterialUpdateToFirestore,
} from '../services/firestoreSync.ts';
import type {
  AppearanceConfig,
  CardShapeStyle,
  FontSizeScale,
  MaterialItem,
  SmartConvertedActivity,
  SmartDragDropCard,
  ThemeMotif,
  ThemePresetId,
} from '../types/platform.ts';

interface Props {
  token: string | null;
  firebaseUid: string | null;
  appearance: AppearanceConfig;
  materials: MaterialItem[];
  onRefresh: () => Promise<void>;
  onLogout: () => void;
  onClose: () => void;
}

const ACCENT_SWATCHES = ['#0E7490', '#00732F', '#CE1126', '#D97706', '#1E3A8A', '#9A3412'];

async function parseJsonSafe<T>(res: Response): Promise<T | null> {
  try {
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export const AdminDashboardModal: React.FC<Props> = ({
  token,
  firebaseUid,
  appearance,
  materials,
  onRefresh,
  onLogout,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'distribution' | 'appearance'>('content');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Upload & Smart AI Conversion state
  const [uploading, setUploading] = useState(false);
  const [convertingUrl, setConvertingUrl] = useState(false);
  const [convertingDragDrop, setConvertingDragDrop] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [externalUrlInput, setExternalUrlInput] = useState('');
  const [draftMaterial, setDraftMaterial] = useState<Partial<MaterialItem> | null>(null);

  // Editing existing material state
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Local appearance draft
  const [appearanceDraft, setAppearanceDraft] = useState<AppearanceConfig>(appearance);
  const [savingAppearance, setSavingAppearance] = useState(false);

  const authHeaders: Record<string, string> = token
    ? {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }
    : {
        'Content-Type': 'application/json',
      };

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setErrorMessage(null);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSyncAllToCloud = async () => {
    if (!firebaseUid) {
      setErrorMessage('يرجى تسجيل الدخول بحساب Google لتفعيل المزامنة التلقائية مع Firebase.');
      return;
    }
    setSyncingAll(true);
    setErrorMessage(null);
    try {
      await syncAppearanceToFirestore(appearanceDraft);
      for (const item of materials) {
        await syncMaterialUpdateToFirestore(item, firebaseUid);
      }
      await seedFirestoreIfEmpty(firebaseUid, materials, appearanceDraft);
      showToast('تمت مزامنة كافة المواد والمظهر تلقائياً مع Firebase و Vercel.');
    } catch {
      setErrorMessage('تعذر إتمام المزامنة السحابية حالياً.');
    } finally {
      setSyncingAll(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!token) {
      setErrorMessage('يلزم الاتصال بخادم التحويل الذكي (Gemini) لتحويل الملفات.');
      e.target.value = '';
      return;
    }
    setErrorMessage(null);
    setUploading(true);

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('تعذر قراءة الملف.'));
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/admin/convert-material', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          base64Data,
        }),
      });

      const data = await parseJsonSafe<{
        error?: string;
        sourceUrl?: string;
        sourceMimeType?: string;
        sourceFileName?: string;
        suggestedTitle?: string;
        suggestedSubtitle?: string;
        suggestedCategory?: string;
        smartActivity?: SmartConvertedActivity;
      }>(res);

      if (res.status === 401 && !firebaseUid) {
        onLogout();
        return;
      }

      if (!res.ok || !data) {
        setErrorMessage(data?.error || `تعذر تحويل الملف (رمز الحالة: ${res.status}).`);
        return;
      }

      setDraftMaterial({
        title: data.suggestedTitle || file.name,
        subtitle: data.suggestedSubtitle || '',
        category: data.suggestedCategory || 'العقيدة للأطفال',
        activityType: 'smart_cards',
        accentColor: appearanceDraft.primaryAccent,
        themeMotif: 'ocean',
        published: true,
        featured: false,
        sourceUrl: data.sourceUrl,
        sourceMimeType: data.sourceMimeType,
        sourceFileName: data.sourceFileName,
        smartActivity: data.smartActivity,
      });
      showToast('تم تحويل الملف إلى نشاط تفاعلي بنجاح.');
    } catch {
      setErrorMessage('تعذر رفع أو تحويل الملف.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDragDropImagesUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    appendToDraft = false
  ) => {
    const fileList = Array.from(e.target.files || []);
    if (fileList.length === 0) return;
    if (!token) {
      setErrorMessage('يلزم الاتصال بالخادم لرفع وتحويل الصور إلى لعبة سحب وإفلات.');
      e.target.value = '';
      return;
    }
    if (fileList.length > 10) {
      setErrorMessage('يمكن رفع حتى 10 صور في المرة الواحدة.');
      e.target.value = '';
      return;
    }

    setErrorMessage(null);
    setConvertingDragDrop(true);

    try {
      const imagesPayload = await Promise.all(
        fileList.map(
          (file) =>
            new Promise<{ fileName: string; mimeType: string; base64Data: string }>(
              (resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () =>
                  resolve({
                    fileName: file.name,
                    mimeType: file.type,
                    base64Data: String(reader.result || ''),
                  });
                reader.onerror = () => reject(new Error('تعذر قراءة إحدى الصور.'));
                reader.readAsDataURL(file);
              }
            )
        )
      );

      const res = await fetch('/api/admin/convert-images-dragdrop', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ images: imagesPayload }),
      });

      const data = await parseJsonSafe<{
        error?: string;
        suggestedTitle?: string;
        suggestedCategory?: string;
        smartActivity?: SmartConvertedActivity;
      }>(res);

      if (res.status === 401 && !firebaseUid) {
        onLogout();
        return;
      }

      if (!res.ok || !data?.smartActivity) {
        setErrorMessage(
          data?.error || `تعذر تحويل الصور إلى لعبة سحب وإفلات (رمز الحالة: ${res.status}).`
        );
        return;
      }

      const incomingCards = data.smartActivity.dragDropCards || [];

      if (appendToDraft && draftMaterial) {
        setDraftMaterial((prev) => {
          if (!prev) return prev;
          const prevCards = prev.smartActivity?.dragDropCards || [];
          const mergedCards = [...prevCards, ...incomingCards];
          return {
            ...prev,
            smartActivity: {
              mode: 'drag_drop_images',
              verbatimTextBlocks: mergedCards.map((c) => c.title),
              sections: prev.smartActivity?.sections || [],
              flashcards: prev.smartActivity?.flashcards || [],
              quizQuestions: prev.smartActivity?.quizQuestions || [],
              matchingPairs: prev.smartActivity?.matchingPairs,
              dragDropCards: mergedCards,
              drawingPrompt: prev.smartActivity?.drawingPrompt,
            },
          };
        });
        showToast(`تمت إضافة ${incomingCards.length} صور إلى لعبة السحب والإفلات.`);
      } else {
        setDraftMaterial({
          title: data.suggestedTitle || 'لعبة مطابقة الصور بالعناوين',
          subtitle: 'اسحب كل عنوان وضعه أسفل الصورة المناسبة',
          category: data.suggestedCategory || 'فقرة الأنشطة',
          activityType: 'smart_cards',
          accentColor: appearanceDraft.primaryAccent,
          themeMotif: 'activities',
          published: true,
          featured: false,
          sourceUrl: incomingCards[0]?.imageUrl,
          sourceMimeType: fileList[0]?.type,
          sourceFileName: fileList[0]?.name,
          smartActivity: data.smartActivity,
        });
        showToast('تم تحويل الصور المرفوعة إلى لعبة سحب وإفلات بنجاح.');
      }
    } catch {
      setErrorMessage('تعذر رفع الصور أو تحويلها إلى لعبة سحب وإفلات.');
    } finally {
      setConvertingDragDrop(false);
      e.target.value = '';
    }
  };

  const handleToggleDraftDragDropMode = (enableDragDrop: boolean) => {
    setDraftMaterial((prev) => {
      if (!prev || !prev.smartActivity) return prev;
      if (enableDragDrop) {
        const existingCards = prev.smartActivity.dragDropCards || [];
        const seededCards: SmartDragDropCard[] =
          existingCards.length > 0
            ? existingCards
            : prev.sourceUrl
              ? [
                  {
                    id: `dd-${Date.now()}-0`,
                    title: prev.title?.trim() || 'صورة 1',
                    imageUrl: prev.sourceUrl,
                  },
                ]
              : [];
        return {
          ...prev,
          smartActivity: {
            ...prev.smartActivity,
            mode: 'drag_drop_images',
            dragDropCards: seededCards,
          },
        };
      }
      return {
        ...prev,
        smartActivity: {
          ...prev.smartActivity,
          mode: 'flashcards',
        },
      };
    });
  };

  const handleExternalUrlConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = externalUrlInput.trim();
    if (!url) return;
    if (!token) {
      setErrorMessage('يلزم الاتصال بخادم التحويل الذكي (Gemini) لتحويل الروابط الخارجية.');
      return;
    }
    setErrorMessage(null);
    setConvertingUrl(true);

    try {
      const res = await fetch('/api/admin/convert-url', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ url }),
      });

      const data = await parseJsonSafe<{
        error?: string;
        externalLinks?: { label: string; url: string }[];
        suggestedTitle?: string;
        suggestedSubtitle?: string;
        suggestedCategory?: string;
        smartActivity?: SmartConvertedActivity;
      }>(res);

      if (res.status === 401 && !firebaseUid) {
        onLogout();
        return;
      }

      if (!res.ok || !data) {
        setErrorMessage(data?.error || `تعذر تحويل الرابط الخارجي (رمز الحالة: ${res.status}).`);
        return;
      }

      setDraftMaterial({
        title: data.suggestedTitle || url,
        subtitle: data.suggestedSubtitle || '',
        category: data.suggestedCategory || 'العقيدة للأطفال',
        activityType: 'smart_cards',
        accentColor: appearanceDraft.primaryAccent,
        themeMotif: 'activities',
        published: true,
        featured: false,
        externalLinks: data.externalLinks,
        smartActivity: data.smartActivity,
      });
      setExternalUrlInput('');
      showToast('تم تحويل الرابط إلى نشاط تفاعلي دون حفظ الملف الأصلي.');
    } catch {
      setErrorMessage('تعذر جلب أو تحويل الرابط الخارجي.');
    } finally {
      setConvertingUrl(false);
    }
  };

  const handlePublishDraft = async () => {
    if (!draftMaterial?.title) return;
    setErrorMessage(null);
    try {
      const maxOrder = materials.reduce((acc, m) => Math.max(acc, m.order), 0);
      let createdMaterial: MaterialItem = {
        id: `mat-${Date.now()}`,
        title: draftMaterial.title.trim(),
        subtitle: draftMaterial.subtitle?.trim() || undefined,
        author: draftMaterial.author?.trim() || undefined,
        category: draftMaterial.category?.trim() || 'العقيدة للأطفال',
        activityType: draftMaterial.activityType || 'smart_cards',
        accentColor: draftMaterial.accentColor || appearanceDraft.primaryAccent,
        themeMotif: draftMaterial.themeMotif || 'ocean',
        published: draftMaterial.published ?? true,
        featured: draftMaterial.featured ?? false,
        order: maxOrder + 1,
        sourceUrl: draftMaterial.sourceUrl,
        sourceMimeType: draftMaterial.sourceMimeType,
        sourceFileName: draftMaterial.sourceFileName,
        externalLinks: draftMaterial.externalLinks,
        smartActivity: draftMaterial.smartActivity,
        createdAt: new Date().toISOString(),
      };

      if (token) {
        try {
          const res = await fetch('/api/admin/materials', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(draftMaterial),
          });
          const data = await parseJsonSafe<{ material?: MaterialItem; error?: string }>(res);
          if (res.ok && data?.material) {
            createdMaterial = data.material;
          } else if (!firebaseUid) {
            setErrorMessage(data?.error || `تعذر نشر المحتوى (رمز الحالة: ${res.status}).`);
            return;
          }
        } catch {
          if (!firebaseUid) {
            setErrorMessage('تعذر حفظ المحتوى.');
            return;
          }
        }
      }

      if (firebaseUid) {
        await syncMaterialCreateToFirestore(createdMaterial, firebaseUid);
      }

      setDraftMaterial(null);
      await onRefresh();
      showToast(
        firebaseUid
          ? 'تمت إضافة المحتوى ومزامنته تلقائياً على Firebase و Vercel.'
          : 'تمت إضافة المحتوى ونشره بنجاح.'
      );
    } catch {
      setErrorMessage('تعذر حفظ المحتوى.');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingMaterial) return;
    setErrorMessage(null);
    try {
      if (token) {
        try {
          const res = await fetch(`/api/admin/materials/${editingMaterial.id}`, {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify(editingMaterial),
          });
          const data = await parseJsonSafe<{ error?: string }>(res);
          if (!res.ok && !firebaseUid) {
            setErrorMessage(data?.error || `تعذر تحديث المحتوى (رمز الحالة: ${res.status}).`);
            return;
          }
        } catch {
          if (!firebaseUid) {
            setErrorMessage('تعذر حفظ التعديلات.');
            return;
          }
        }
      }

      if (firebaseUid) {
        await syncMaterialUpdateToFirestore(editingMaterial, firebaseUid);
      }

      setEditingMaterial(null);
      await onRefresh();
      showToast(
        firebaseUid ? 'تم حفظ التعديلات ومزامنتها سحابياً تلقائياً.' : 'تم حفظ التعديلات.'
      );
    } catch {
      setErrorMessage('تعذر حفظ التعديلات.');
    }
  };

  const handleToggleField = async (item: MaterialItem, field: 'published' | 'featured') => {
    try {
      const nextVal = !item[field];
      if (token) {
        try {
          await fetch(`/api/admin/materials/${item.id}`, {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({ [field]: nextVal }),
          });
        } catch {
          if (!firebaseUid) throw new Error('network');
        }
      }
      if (firebaseUid) {
        await syncMaterialFieldToggleToFirestore(item.id, field, nextVal);
      }
      await onRefresh();
    } catch {
      setErrorMessage('تعذر تحديث الحالة.');
    }
  };

  const handleMoveOrder = async (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= materials.length) return;
    const reordered = [...materials];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);
    const orderedIds = reordered.map((m) => m.id);

    try {
      if (token) {
        try {
          await fetch('/api/admin/materials-order', {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({ orderedIds }),
          });
        } catch {
          if (!firebaseUid) throw new Error('network');
        }
      }
      if (firebaseUid) {
        await syncMaterialsOrderToFirestore(orderedIds);
      }
      await onRefresh();
    } catch {
      setErrorMessage('تعذر تغيير الترتيب.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if (token) {
        try {
          const res = await fetch(`/api/admin/materials/${id}`, {
            method: 'DELETE',
            headers: authHeaders,
          });
          if (!res.ok && !firebaseUid) {
            setErrorMessage('تعذر حذف المادة.');
            return;
          }
        } catch {
          if (!firebaseUid) {
            setErrorMessage('تعذر حذف المادة.');
            return;
          }
        }
      }
      if (firebaseUid) {
        await syncMaterialDeleteFromFirestore(id);
      }
      setConfirmDeleteId(null);
      await onRefresh();
      showToast('تم حذف المادة.');
    } catch {
      setErrorMessage('تعذر حذف المادة.');
    }
  };

  const handleShareCopy = async (id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('material', id);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Ignore clipboard denial
    }
  };

  const handleSaveAppearance = async (next: AppearanceConfig) => {
    setAppearanceDraft(next);
    setSavingAppearance(true);
    try {
      if (token) {
        try {
          await fetch('/api/admin/appearance', {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify(next),
          });
        } catch {
          if (!firebaseUid) throw new Error('network');
        }
      }
      if (firebaseUid) {
        await syncAppearanceToFirestore(next);
      }
      await onRefresh();
      showToast(
        firebaseUid
          ? 'تم تحديث المظهر والتوزيع ومزامنته تلقائياً مع Firebase و Vercel.'
          : 'تم تحديث المظهر والتوزيع.'
      );
    } catch {
      setErrorMessage('تعذر حفظ إعدادات المظهر.');
    } finally {
      setSavingAppearance(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/65 p-3 sm:p-6 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="my-4 w-full max-w-6xl rounded-3xl border border-[var(--platform-border)] bg-[var(--platform-bg)] text-[var(--platform-text)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--platform-border)] bg-[var(--platform-surface)] px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-extrabold">لوحة تحكم الإدارة</h2>
            <span
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-bold ${
                firebaseUid
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-amber-300 bg-amber-50 text-amber-900'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>
                {firebaseUid
                  ? 'مزامنة تلقائية نشطة (Firebase + Vercel)'
                  : 'وضع الخادم المحلي فقط'}
              </span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {firebaseUid && (
              <button
                type="button"
                disabled={syncingAll}
                onClick={() => void handleSyncAllToCloud()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--platform-accent)] bg-[var(--platform-surface-muted)] px-3.5 py-2 text-xs font-bold disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? 'animate-spin' : ''}`} />
                <span>{syncingAll ? 'جاري المزامنة...' : 'مزامنة الكل للسحابة'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface-muted)] px-3.5 py-2 text-xs font-bold"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface-muted)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--platform-border)] bg-[var(--platform-surface)] px-6 py-3">
          <button
            type="button"
            onClick={() => setActiveTab('content')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors whitespace-nowrap ${
              activeTab === 'content'
                ? 'bg-[var(--platform-accent)] text-white'
                : 'bg-[var(--platform-surface-muted)] text-[var(--platform-text)]'
            }`}
          >
            <FileUp className="w-4 h-4" />
            <span>المحتوى ({materials.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('distribution')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors whitespace-nowrap ${
              activeTab === 'distribution'
                ? 'bg-[var(--platform-accent)] text-white'
                : 'bg-[var(--platform-surface-muted)] text-[var(--platform-text)]'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>التوزيع</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors whitespace-nowrap ${
              activeTab === 'appearance'
                ? 'bg-[var(--platform-accent)] text-white'
                : 'bg-[var(--platform-surface-muted)] text-[var(--platform-text)]'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>المظهر</span>
          </button>
        </div>

        {/* Feedback Banners */}
        {(statusMessage || errorMessage) && (
          <div className="px-6 pt-4">
            {statusMessage && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">
                {statusMessage}
              </div>
            )}
            {errorMessage && (
              <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-900">
                {errorMessage}
              </div>
            )}
          </div>
        )}

        {/* Tab Body */}
        <div className="p-6 space-y-6">
          {/* TAB 1: CONTENT */}
          {activeTab === 'content' && (
            <div className="space-y-6">
              {/* Smart PDF / Image Upload Box */}
              <div className="rounded-2xl border border-dashed border-[var(--platform-accent)] bg-[var(--platform-surface)] p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-extrabold">
                      إضافة محتوى (PDF أو صور أو أي رابط على الشابكة) وتحويله تلقائياً إلى نشاط تفاعلي
                    </h3>
                    <p className="text-sm text-[var(--platform-text-muted)]">
                      يتم جلب النصوص والمصطلحات كما جاءت في المصدر حرفياً دون أي إضافة أو تغيير، ودون حفظ الملف عند التحويل من رابط.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--platform-accent)] px-4 py-3 text-sm font-bold text-white hover:opacity-95 whitespace-nowrap">
                      <Plus className="w-4 h-4" />
                      <span>{uploading ? 'جاري التحويل الذكي...' : 'رفع PDF أو صورة'}</span>
                      <input
                        type="file"
                        accept="application/pdf,image/png,image/jpeg,image/webp"
                        disabled={uploading || convertingUrl || convertingDragDrop}
                        onChange={handleFileUpload}
                        className="sr-only"
                      />
                    </label>

                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-[var(--platform-accent)] bg-[var(--platform-surface-muted)] px-4 py-2.5 text-sm font-bold text-[var(--platform-text)] hover:opacity-90 whitespace-nowrap">
                      <Move className="w-4 h-4 text-[var(--platform-accent)]" />
                      <span>
                        {convertingDragDrop
                          ? 'جاري تجهيز اللعبة...'
                          : 'تحويل صور إلى لعبة سحب وإفلات'}
                      </span>
                      <input
                        type="file"
                        multiple
                        accept="image/png,image/jpeg,image/webp"
                        disabled={uploading || convertingUrl || convertingDragDrop}
                        onChange={(e) => void handleDragDropImagesUpload(e, false)}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>

                {/* External Link Converter (No Local File Saved) */}
                <form
                  onSubmit={handleExternalUrlConvert}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 border-t border-[var(--platform-border)] pt-4"
                >
                  <div className="relative flex-1">
                    <Link2 className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--platform-text-muted)]" />
                    <input
                      type="url"
                      dir="ltr"
                      required
                      value={externalUrlInput}
                      onChange={(e) => setExternalUrlInput(e.target.value)}
                      placeholder="https://t.me/rasael_emaratia_children/.. أو أي رابط صفحة أو PDF أو صورة"
                      disabled={convertingUrl || uploading || convertingDragDrop}
                      className="w-full rounded-xl border border-[var(--platform-border)] bg-[var(--platform-bg)] pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--platform-accent)]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={convertingUrl || uploading || convertingDragDrop || !externalUrlInput.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--platform-accent)] bg-[var(--platform-surface-muted)] px-5 py-2.5 text-sm font-bold text-[var(--platform-text)] hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                  >
                    <Link2 className="w-4 h-4" />
                    <span>
                      {convertingUrl ? 'جاري الجلب والتحويل...' : 'جلب وتحويل من رابط'}
                    </span>
                  </button>
                </form>

                {/* Draft Preview Before Publish */}
                {draftMaterial && (
                  <div className="rounded-2xl border border-[var(--platform-border)] bg-[var(--platform-bg)] p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-sm font-extrabold text-[var(--platform-accent)]">
                        معاينة النشاط المستخرج
                      </span>

                      <div className="flex flex-wrap items-center gap-2">
                        {(draftMaterial.sourceMimeType?.startsWith('image/') ||
                          draftMaterial.smartActivity?.mode === 'drag_drop_images' ||
                          (draftMaterial.smartActivity?.dragDropCards?.length || 0) > 0) && (
                          <div className="flex items-center gap-1 rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-1">
                            <button
                              type="button"
                              onClick={() => handleToggleDraftDragDropMode(false)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                                draftMaterial.smartActivity?.mode !== 'drag_drop_images'
                                  ? 'bg-[var(--platform-accent)] text-white'
                                  : 'text-[var(--platform-text-muted)]'
                              }`}
                            >
                              نشاط ذكي
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleDraftDragDropMode(true)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                                draftMaterial.smartActivity?.mode === 'drag_drop_images'
                                  ? 'bg-[var(--platform-accent)] text-white'
                                  : 'text-[var(--platform-text-muted)]'
                              }`}
                            >
                              لعبة سحب وإفلات (صور وعناوين)
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setDraftMaterial(null)}
                          className="text-xs font-bold text-rose-600 px-2"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold mb-1">العنوان</label>
                        <input
                          type="text"
                          value={draftMaterial.title || ''}
                          onChange={(e) =>
                            setDraftMaterial((d) => ({ ...d, title: e.target.value }))
                          }
                          className="w-full rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1">العنوان الفرعي</label>
                        <input
                          type="text"
                          value={draftMaterial.subtitle || ''}
                          onChange={(e) =>
                            setDraftMaterial((d) => ({ ...d, subtitle: e.target.value }))
                          }
                          className="w-full rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1">التصنيف</label>
                        <input
                          type="text"
                          value={draftMaterial.category || ''}
                          onChange={(e) =>
                            setDraftMaterial((d) => ({ ...d, category: e.target.value }))
                          }
                          className="w-full rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    {draftMaterial.smartActivity?.mode === 'drag_drop_images' ? (
                      <div className="space-y-3 rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-extrabold text-[var(--platform-text)]">
                            بطاقات الصور والعناوين ({draftMaterial.smartActivity.dragDropCards?.length || 0})
                          </span>
                          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--platform-accent)] bg-[var(--platform-surface-muted)] px-3 py-1.5 text-xs font-bold hover:opacity-90">
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>{convertingDragDrop ? 'جاري الإضافة...' : 'إضافة صور أخرى للعبة'}</span>
                            <input
                              type="file"
                              multiple
                              accept="image/png,image/jpeg,image/webp"
                              disabled={convertingDragDrop}
                              onChange={(e) => void handleDragDropImagesUpload(e, true)}
                              className="sr-only"
                            />
                          </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(draftMaterial.smartActivity.dragDropCards || []).map((card, cIdx) => (
                            <div
                              key={card.id}
                              className="flex items-center gap-3 rounded-xl border border-[var(--platform-border)] bg-[var(--platform-bg)] p-2.5"
                            >
                              <img
                                src={card.imageUrl}
                                alt={card.title}
                                referrerPolicy="no-referrer"
                                className="h-14 w-14 shrink-0 rounded-lg border border-[var(--platform-border)] bg-white object-contain"
                              />
                              <div className="min-w-0 flex-1">
                                <label className="block text-[11px] font-bold text-[var(--platform-text-muted)] mb-1">
                                  العنوان المطابق للصورة {cIdx + 1}
                                </label>
                                <input
                                  type="text"
                                  value={card.title}
                                  onChange={(e) => {
                                    const nextVal = e.target.value;
                                    setDraftMaterial((prev) => {
                                      if (!prev?.smartActivity?.dragDropCards) return prev;
                                      return {
                                        ...prev,
                                        smartActivity: {
                                          ...prev.smartActivity,
                                          dragDropCards: prev.smartActivity.dragDropCards.map((c) =>
                                            c.id === card.id ? { ...c, title: nextVal } : c
                                          ),
                                        },
                                      };
                                    });
                                  }}
                                  className="w-full rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] px-2.5 py-1.5 text-xs font-bold"
                                />
                              </div>
                              <button
                                type="button"
                                aria-label="حذف الصورة"
                                onClick={() => {
                                  setDraftMaterial((prev) => {
                                    if (!prev?.smartActivity?.dragDropCards) return prev;
                                    return {
                                      ...prev,
                                      smartActivity: {
                                        ...prev.smartActivity,
                                        dragDropCards: prev.smartActivity.dragDropCards.filter(
                                          (c) => c.id !== card.id
                                        ),
                                      },
                                    };
                                  });
                                }}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-[var(--platform-text-muted)] tabular-nums">
                        البطاقات: {draftMaterial.smartActivity?.flashcards.length || 0} · الأسئلة:{' '}
                        {draftMaterial.smartActivity?.quizQuestions.length || 0} · الفقرات:{' '}
                        {draftMaterial.smartActivity?.sections.length || 0}
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={handlePublishDraft}
                        disabled={
                          draftMaterial.smartActivity?.mode === 'drag_drop_images' &&
                          (draftMaterial.smartActivity.dragDropCards?.length || 0) === 0
                        }
                        className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                      >
                        حفظ ونشر
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Materials Table / Cards */}
              <div className="space-y-3">
                {materials.map((item, idx) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-[var(--platform-text-muted)] tabular-nums">
                        <span>#{idx + 1}</span>
                        <span aria-hidden="true">·</span>
                        <span>{item.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{item.published ? 'منشور' : 'مخفي'}</span>
                      </div>
                      <div className="text-base sm:text-lg font-extrabold truncate">
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div className="text-xs text-[var(--platform-text-muted)] truncate">
                          {item.subtitle}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleField(item, 'published')}
                        title={item.published ? 'إخفاء' : 'نشر'}
                        className="inline-flex items-center gap-1 rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface-muted)] px-3 py-2 text-xs font-bold"
                      >
                        {item.published ? (
                          <Eye className="w-4 h-4 text-emerald-700" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-slate-500" />
                        )}
                        <span>{item.published ? 'منشور' : 'مخفي'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleField(item, 'featured')}
                        className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold ${
                          item.featured
                            ? 'border-amber-400 bg-amber-50 text-amber-800'
                            : 'border-[var(--platform-border)] bg-[var(--platform-surface-muted)]'
                        }`}
                      >
                        <Star className="w-4 h-4" />
                        <span>مميز</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingMaterial(item)}
                        className="inline-flex items-center gap-1 rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface-muted)] px-3 py-2 text-xs font-bold"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>تعديل</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShareCopy(item.id)}
                        className="inline-flex items-center gap-1 rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface-muted)] px-3 py-2 text-xs font-bold"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Share2 className="w-4 h-4" />
                        )}
                        <span>{copiedId === item.id ? 'تم النسخ' : 'مشاركة'}</span>
                      </button>

                      {confirmDeleteId === item.id ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white"
                          >
                            تأكيد الحذف
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-xl border border-[var(--platform-border)] px-3 py-2 text-xs font-bold"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(item.id)}
                          className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>حذف</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: DISTRIBUTION */}
          {activeTab === 'distribution' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-6 space-y-5">
                <h3 className="text-lg font-extrabold">توزيع الشبكة والأقسام</h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">عدد الأعمدة</label>
                    <div className="flex gap-2">
                      {([2, 3] as const).map((cols) => (
                        <button
                          key={cols}
                          type="button"
                          onClick={() =>
                            handleSaveAppearance({ ...appearanceDraft, columns: cols })
                          }
                          className={`flex-1 rounded-xl py-2.5 text-sm font-bold tabular-nums border ${
                            appearanceDraft.columns === cols
                              ? 'bg-[var(--platform-accent)] text-white border-[var(--platform-accent)]'
                              : 'border-[var(--platform-border)] bg-[var(--platform-surface-muted)]'
                          }`}
                        >
                          {cols}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2">نمط العرض</label>
                    <div className="flex gap-2">
                      {[
                        { id: 'grid' as const, label: 'شبكة' },
                        { id: 'list' as const, label: 'قائمة' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() =>
                            handleSaveAppearance({ ...appearanceDraft, viewMode: m.id })
                          }
                          className={`flex-1 rounded-xl py-2.5 text-sm font-bold border ${
                            appearanceDraft.viewMode === m.id
                              ? 'bg-[var(--platform-accent)] text-white border-[var(--platform-accent)]'
                              : 'border-[var(--platform-border)] bg-[var(--platform-surface-muted)]'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2">شكل البطاقات</label>
                    <div className="flex gap-2">
                      {[
                        { id: 'rounded' as CardShapeStyle, label: 'بطاقات' },
                        { id: 'circle' as CardShapeStyle, label: 'دائري' },
                        { id: 'compact' as CardShapeStyle, label: 'مضغوط' },
                      ].map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() =>
                            handleSaveAppearance({ ...appearanceDraft, cardStyle: s.id })
                          }
                          className={`flex-1 rounded-xl py-2.5 text-xs font-bold border ${
                            appearanceDraft.cardStyle === s.id
                              ? 'bg-[var(--platform-accent)] text-white border-[var(--platform-accent)]'
                              : 'border-[var(--platform-border)] bg-[var(--platform-surface-muted)]'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {[
                    { key: 'showCategoriesBar' as const, label: 'إظهار شريط التصنيفات' },
                    { key: 'showFeaturedSection' as const, label: 'إظهار الأنشطة المميزة' },
                    { key: 'showChannelLinks' as const, label: 'إظهار روابط القناة' },
                    { key: 'showOriginalPdfButton' as const, label: 'إظهار زر عرض الملف الأصلي' },
                  ].map((toggle) => (
                    <button
                      key={toggle.key}
                      type="button"
                      onClick={() =>
                        handleSaveAppearance({
                          ...appearanceDraft,
                          [toggle.key]: !appearanceDraft[toggle.key],
                        })
                      }
                      className="flex items-center justify-between rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface-muted)] px-4 py-3 text-sm font-bold"
                    >
                      <span>{toggle.label}</span>
                      <span
                        className={`rounded-lg px-2.5 py-1 text-xs ${
                          appearanceDraft[toggle.key]
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-300 text-slate-800'
                        }`}
                      >
                        {appearanceDraft[toggle.key] ? 'مفعل' : 'مخفي'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Controls */}
              <div className="rounded-2xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-6 space-y-3">
                <h3 className="text-lg font-extrabold">ترتيب عرض المواد</h3>
                {materials.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface-muted)] px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-extrabold tabular-nums text-[var(--platform-text-muted)]">
                        {idx + 1}
                      </span>
                      <span className="font-bold truncate">{item.title}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveOrder(idx, -1)}
                        className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-2 disabled:opacity-40"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === materials.length - 1}
                        onClick={() => handleMoveOrder(idx, 1)}
                        className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] p-2 disabled:opacity-40"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="rounded-2xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-6 space-y-6">
              <div>
                <h3 className="text-lg font-extrabold mb-3">سمة المنصة</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { id: 'daylight' as ThemePresetId, label: 'النهار والإشراق', bg: '#FAF8F3', fg: '#1E293B' },
                    { id: 'ocean' as ThemePresetId, label: 'البحر واللؤلؤ', bg: '#F2F9FB', fg: '#0F2937' },
                    { id: 'evening' as ThemePresetId, label: 'المساء والنجوم', bg: '#122542', fg: '#F8FAFC' },
                    { id: 'emirati' as ThemePresetId, label: 'ألوان الإمارات', bg: '#F8F9F7', fg: '#00732F' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={savingAppearance}
                      onClick={() =>
                        handleSaveAppearance({ ...appearanceDraft, themePreset: preset.id })
                      }
                      className={`rounded-2xl border-2 p-4 text-right transition-transform hover:scale-[1.01] ${
                        appearanceDraft.themePreset === preset.id
                          ? 'border-[var(--platform-accent)]'
                          : 'border-[var(--platform-border)]'
                      }`}
                      style={{ backgroundColor: preset.bg, color: preset.fg }}
                    >
                      <div className="font-extrabold text-base">{preset.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-extrabold mb-3">اللون الرئيسي</h3>
                <div className="flex flex-wrap items-center gap-3">
                  {ACCENT_SWATCHES.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() =>
                        handleSaveAppearance({ ...appearanceDraft, primaryAccent: hex })
                      }
                      className={`h-11 w-11 rounded-xl border-2 ${
                        appearanceDraft.primaryAccent === hex
                          ? 'border-slate-900 scale-110'
                          : 'border-white'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-extrabold mb-3">حجم الخط</h3>
                <div className="flex flex-wrap gap-3">
                  {[
                    { id: 'normal' as FontSizeScale, label: 'عادي' },
                    { id: 'large' as FontSizeScale, label: 'كبير' },
                    { id: 'xlarge' as FontSizeScale, label: 'كبير جداً' },
                  ].map((fs) => (
                    <button
                      key={fs.id}
                      type="button"
                      onClick={() =>
                        handleSaveAppearance({ ...appearanceDraft, fontSize: fs.id })
                      }
                      className={`rounded-xl border px-5 py-2.5 text-sm font-bold ${
                        appearanceDraft.fontSize === fs.id
                          ? 'bg-[var(--platform-accent)] text-white border-[var(--platform-accent)]'
                          : 'border-[var(--platform-border)] bg-[var(--platform-surface-muted)]'
                      }`}
                    >
                      {fs.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Material Dialog */}
      {editingMaterial && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-xl rounded-3xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold">تعديل المادة</h3>
              <button
                type="button"
                onClick={() => setEditingMaterial(null)}
                className="p-2 rounded-lg border border-[var(--platform-border)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">العنوان</label>
                <input
                  type="text"
                  value={editingMaterial.title}
                  onChange={(e) =>
                    setEditingMaterial({ ...editingMaterial, title: e.target.value })
                  }
                  className="w-full rounded-xl border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">العنوان الفرعي</label>
                <input
                  type="text"
                  value={editingMaterial.subtitle || ''}
                  onChange={(e) =>
                    setEditingMaterial({ ...editingMaterial, subtitle: e.target.value })
                  }
                  className="w-full rounded-xl border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3.5 py-2.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">التصنيف</label>
                  <input
                    type="text"
                    value={editingMaterial.category}
                    onChange={(e) =>
                      setEditingMaterial({ ...editingMaterial, category: e.target.value })
                    }
                    className="w-full rounded-xl border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">المظهر البصري</label>
                  <select
                    value={editingMaterial.themeMotif}
                    onChange={(e) =>
                      setEditingMaterial({
                        ...editingMaterial,
                        themeMotif: e.target.value as ThemeMotif,
                      })
                    }
                    className="w-full rounded-xl border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3.5 py-2.5 text-sm"
                  >
                    <option value="ocean">البحر</option>
                    <option value="activities">الأنشطة</option>
                    <option value="morning">الصباح</option>
                    <option value="evening">المساء</option>
                    <option value="desert">القصص</option>
                    <option value="guide">#مشكلة وحل</option>
                  </select>
                </div>
              </div>

              {editingMaterial.smartActivity?.mode === 'drag_drop_images' &&
                editingMaterial.smartActivity.dragDropCards && (
                  <div className="space-y-2 pt-2 border-t border-[var(--platform-border)]">
                    <label className="block text-xs font-extrabold">
                      عناوين الصور في لعبة السحب والإفلات
                    </label>
                    <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                      {editingMaterial.smartActivity.dragDropCards.map((card, cIdx) => (
                        <div key={card.id} className="flex items-center gap-2.5">
                          <img
                            src={card.imageUrl}
                            alt={card.title}
                            referrerPolicy="no-referrer"
                            className="h-10 w-10 shrink-0 rounded-lg border border-[var(--platform-border)] bg-white object-contain"
                          />
                          <input
                            type="text"
                            value={card.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditingMaterial((prev) => {
                                if (!prev?.smartActivity?.dragDropCards) return prev;
                                return {
                                  ...prev,
                                  smartActivity: {
                                    ...prev.smartActivity,
                                    dragDropCards: prev.smartActivity.dragDropCards.map((c) =>
                                      c.id === card.id ? { ...c, title: val } : c
                                    ),
                                  },
                                };
                              });
                            }}
                            aria-label={`عنوان الصورة ${cIdx + 1}`}
                            className="flex-1 rounded-xl border border-[var(--platform-border)] bg-[var(--platform-bg)] px-3 py-2 text-xs font-bold"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingMaterial(null)}
                className="rounded-xl border border-[var(--platform-border)] px-4 py-2 text-sm font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="rounded-xl bg-[var(--platform-accent)] px-5 py-2 text-sm font-bold text-white"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

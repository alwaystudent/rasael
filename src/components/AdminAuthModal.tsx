import React, { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, Lock, RefreshCw, X } from 'lucide-react';

interface Props {
  onSuccess: (token: string) => void;
  onClose: () => void;
}

interface AuthStatusResponse {
  authenticated?: boolean;
  needsSetup?: boolean;
  mode?: 'env' | 'local-setup';
  error?: string;
}

async function parseJsonSafe<T>(res: Response): Promise<T | null> {
  try {
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export const AdminAuthModal: React.FC<Props> = ({ onSuccess, onClose }) => {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [authMode, setAuthMode] = useState<'env' | 'local-setup' | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAuthStatus = useCallback(async () => {
    setStatusError(null);
    setNeedsSetup(null);
    try {
      const res = await fetch('/api/auth/status', { cache: 'no-store' });
      const data = await parseJsonSafe<AuthStatusResponse>(res);
      if (!res.ok || !data || typeof data.needsSetup !== 'boolean') {
        setStatusError(
          data?.error || `الخادم غير مستجيب بشكل صحيح حالياً (رمز الحالة: ${res.status}).`
        );
        return;
      }
      setNeedsSetup(Boolean(data.needsSetup));
      setAuthMode(data.mode || null);
    } catch {
      setStatusError('تعذر الاتصال بالخادم للتحقق من حالة تسجيل الدخول.');
    }
  }, []);

  useEffect(() => {
    void loadAuthStatus();
  }, [loadAuthStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (needsSetup === null) return;
    setError(null);

    if (needsSetup) {
      if (password.trim().length < 6) {
        setError('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.');
        return;
      }
      if (password !== confirmPassword) {
        setError('كلمتا المرور غير متطابقتين.');
        return;
      }
    }

    setLoading(true);
    try {
      const endpoint = needsSetup ? '/api/auth/setup' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ password }),
      });
      const data = await parseJsonSafe<{ token?: string; error?: string }>(res);
      if (!res.ok || !data?.token) {
        if (data?.error) {
          setError(data.error);
        } else {
          setError(`تعذر إتمام تسجيل الدخول من الخادم (رمز الحالة: ${res.status}).`);
        }
        return;
      }
      onSuccess(data.token);
    } catch {
      setError('تعذر الاتصال بالخادم. يرجى المحاولة مرة أخرى بعد قليل.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-3xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-6 sm:p-8 text-[var(--platform-text)] shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--platform-surface-muted)] text-[var(--platform-accent)]">
              <Lock className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold">
                {needsSetup ? 'إعداد كلمة مرور الإدارة' : 'تسجيل دخول الإدارة'}
              </h2>
              {authMode === 'env' && (
                <p className="text-xs text-[var(--platform-text-muted)]">
                  كلمة المرور مهيأة في إعدادات الخادم (ADMIN_PASSCODE).
                </p>
              )}
              {needsSetup && (
                <p className="text-xs text-[var(--platform-text-muted)]">
                  أنشئ كلمة مرور جديدة لإدارة المنصة.
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--platform-border)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {statusError ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
              {statusError}
            </div>
            <button
              type="button"
              onClick={() => void loadAuthStatus()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white"
              style={{ backgroundColor: 'var(--platform-accent)' }}
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة المحاولة</span>
            </button>
          </div>
        ) : needsSetup === null ? (
          <div className="py-8 text-center text-sm text-[var(--platform-text-muted)]">
            جاري التحقق من الخادم...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-bold" htmlFor="admin-password">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[var(--platform-border)] bg-[var(--platform-bg)] pl-11 pr-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[var(--platform-accent)]"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--platform-text-muted)] hover:text-[var(--platform-text)]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {needsSetup && (
              <div className="space-y-1.5">
                <label className="block text-sm font-bold" htmlFor="admin-password-confirm">
                  تأكيد كلمة المرور
                </label>
                <input
                  id="admin-password-confirm"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-[var(--platform-border)] bg-[var(--platform-bg)] px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[var(--platform-accent)]"
                />
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3 text-base font-bold text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: 'var(--platform-accent)' }}
            >
              {loading ? 'جاري التحقق...' : needsSetup ? 'حفظ والدخول' : 'دخول'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

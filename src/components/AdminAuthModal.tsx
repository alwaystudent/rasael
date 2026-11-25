import React, { useCallback, useEffect, useState } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { Eye, EyeOff, Lock, RefreshCw, X } from 'lucide-react';
import { ADMIN_EMAIL, auth, googleProvider } from '../firebase.ts';

interface Props {
  onSuccess: (token: string | null) => void;
  onClose: () => void;
}

interface AuthStatusResponse {
  authenticated?: boolean;
  needsSetup?: boolean;
  mode?: 'env' | 'local-setup';
  firebaseEnabled?: boolean;
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
  const [googleLoading, setGoogleLoading] = useState(false);

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
      setStatusError('تعذر الاتصال بخادم المصادقة المحلي، يمكنك الدخول عبر حساب Google السحابي.');
    }
  }, []);

  useEffect(() => {
    void loadAuthStatus();
  }, [loadAuthStatus]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const user = cred.user;
      if (!user.emailVerified || user.email !== ADMIN_EMAIL) {
        await signOut(auth);
        setError('هذا الحساب غير مصرح له بإدارة المنصة.');
        return;
      }

      const idToken = await user.getIdToken();
      let backendToken: string | null = null;
      try {
        const res = await fetch('/api/auth/firebase-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ idToken }),
        });
        const data = await parseJsonSafe<{ token?: string }>(res);
        if (res.ok && data?.token) {
          backendToken = data.token;
        }
      } catch {
        // Static hosting fallback: Firebase Auth still grants full Firestore sync
      }

      onSuccess(backendToken);
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setError('تم إغلاق نافذة تسجيل الدخول.');
      } else {
        setError('تعذر تسجيل الدخول عبر حساب Google.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

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
      <div className="w-full max-w-md rounded-3xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-6 sm:p-8 text-[var(--platform-text)] shadow-2xl space-y-5">
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
                  المزامنة التلقائية عبر Google أو كلمة مرور الخادم.
                </p>
              )}
              {needsSetup && (
                <p className="text-xs text-[var(--platform-text-muted)]">
                  ادخل بحساب Google للمزامنة التلقائية أو أنشئ كلمة مرور.
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

        {/* Google / Firebase Cloud Sign-In */}
        <button
          type="button"
          disabled={googleLoading || loading}
          onClick={() => void handleGoogleSignIn()}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border-2 border-[var(--platform-accent)] bg-[var(--platform-surface-muted)] px-4 py-3 text-sm font-extrabold text-[var(--platform-text)] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <span>
            {googleLoading
              ? 'جاري تسجيل الدخول بحساب Google...'
              : 'الدخول بحساب Google (مزامنة Firebase و Vercel تلقائياً)'}
          </span>
        </button>

        <div className="flex items-center gap-3 text-xs font-bold text-[var(--platform-text-muted)]">
          <div className="h-px flex-1 bg-[var(--platform-border)]" />
          <span>أو الدخول بكلمة المرور</span>
          <div className="h-px flex-1 bg-[var(--platform-border)]" />
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
              <span>إعادة فحص الخادم</span>
            </button>
          </div>
        ) : needsSetup === null ? (
          <div className="py-6 text-center text-sm text-[var(--platform-text-muted)]">
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
              disabled={loading || googleLoading}
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

import React, { useEffect, useState } from 'react';
import { Lock, X } from 'lucide-react';

interface Props {
  onSuccess: (token: string) => void;
  onClose: () => void;
}

export const AdminAuthModal: React.FC<Props> = ({ onSuccess, onClose }) => {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/status')
      .then((res) => res.json())
      .then((data: { needsSetup?: boolean }) => {
        if (active) setNeedsSetup(Boolean(data.needsSetup));
      })
      .catch(() => {
        if (active) setNeedsSetup(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setError(data.error || 'تعذر تسجيل الدخول.');
        return;
      }
      onSuccess(data.token);
    } catch {
      setError('تعذر الاتصال بالخادم.');
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
            <h2 className="text-xl font-extrabold">
              {needsSetup ? 'إعداد كلمة مرور الإدارة' : 'تسجيل دخول الإدارة'}
            </h2>
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

        {needsSetup === null ? (
          <div className="py-8 text-center text-sm text-[var(--platform-text-muted)]">...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-bold" htmlFor="admin-password">
                كلمة المرور
              </label>
              <input
                id="admin-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[var(--platform-border)] bg-[var(--platform-bg)] px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[var(--platform-accent)]"
                autoFocus
              />
            </div>

            {needsSetup && (
              <div className="space-y-1.5">
                <label className="block text-sm font-bold" htmlFor="admin-password-confirm">
                  تأكيد كلمة المرور
                </label>
                <input
                  id="admin-password-confirm"
                  type="password"
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
              {loading ? '...' : needsSetup ? 'حفظ والدخول' : 'دخول'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

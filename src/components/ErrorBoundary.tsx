import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'حدث خطأ غير متوقع.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Application boundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-screen flex items-center justify-center bg-[#FFFDF8] p-6 text-slate-900"
        >
          <div className="max-w-md w-full rounded-3xl border-2 border-amber-200 bg-white p-8 text-center shadow-lg space-y-4">
            <h1 className="text-xl font-extrabold">تعذر عرض الصفحة مؤقتاً</h1>
            <p className="text-sm text-slate-600">
              يرجى تحديث الصفحة لإعادة الاتصال والمحاولة مرة أخرى.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-[#0E7490] px-6 py-2.5 text-sm font-bold text-white"
            >
              تحديث الصفحة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

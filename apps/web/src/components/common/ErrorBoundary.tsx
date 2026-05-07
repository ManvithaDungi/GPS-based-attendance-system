import React from 'react';

type Props = {
  fallback?: React.ReactNode;
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Keep it minimal: log for debugging, don't hard-crash the whole app.
    // eslint-disable-next-line no-console
    console.error('Render error caught by ErrorBoundary', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="min-h-screen flex items-center justify-center bg-bg-light dark:bg-bg-dark p-6">
            <div className="max-w-md w-full rounded-2xl p-6 bg-white/70 dark:bg-slate-900/50 border border-black/5 dark:border-white/10">
              <h1 className="text-xl font-black text-slate-800 dark:text-slate-100">Something went wrong</h1>
              <p className="text-sm text-slate-500 mt-2">
                Please refresh the page. If this keeps happening, check the console for details.
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-black"
              >
                Reload
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}


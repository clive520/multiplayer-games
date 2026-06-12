import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught', error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      return (
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6">
          <div className="rounded-lg border border-red-700 bg-red-900/30 p-4 text-sm text-red-300">
            <p className="mb-2 font-semibold">發生錯誤</p>
            <p className="text-xs text-red-400">{this.state.error.message}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={this.reset}
              className="rounded bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600"
            >
              重試
            </button>
            <button
              onClick={() => (window.location.href = '/lobby')}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500"
            >
              回到大廳
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

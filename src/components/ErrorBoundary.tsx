import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-[32px] p-10 shadow-xl border border-gray-100 text-center space-y-6">
            <div className="w-20 h-20 bg-danger/10 rounded-3xl flex items-center justify-center text-danger mx-auto">
              <AlertTriangle size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Something went wrong</h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                An unexpected error occurred in the application. We've been notified and are looking into it.
              </p>
            </div>
            
            {this.state.error && (
              <div className="bg-gray-50 p-4 rounded-xl text-left overflow-auto max-h-32">
                <code className="text-[10px] text-danger font-mono">
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:bg-primary/90 transition-all"
              >
                <RefreshCw size={18} />
                Reload Page
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full py-3 bg-white border border-gray-200 text-slate-600 font-bold rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <Home size={18} />
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

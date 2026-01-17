
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
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
                <div className="min-h-screen bg-[#1a1310] text-[#e3e1df] flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-[#271d1a] border border-[#d6a25b]/20 rounded-2xl p-6 shadow-xl">
                        <h2 className="text-xl font-bold text-[#d6a25b] mb-4">Something went wrong</h2>
                        <p className="mb-4 text-sm text-[#afa9a5]">
                            We encountered an unexpected error. Please try refreshing the page.
                        </p>
                        {this.state.error && (
                            <pre className="bg-black/30 p-4 rounded text-xs overflow-auto mb-6 font-mono text-red-400">
                                {this.state.error.message}
                            </pre>
                        )}
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 px-4 bg-[#d6a25b] hover:bg-[#c4924e] text-[#1a1310] font-semibold rounded-xl transition-colors"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

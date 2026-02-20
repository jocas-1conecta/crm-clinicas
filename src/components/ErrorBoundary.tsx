import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-10 bg-red-50 text-red-900 min-h-screen font-mono">
                    <h1 className="text-2xl font-bold mb-4">Algo salió mal</h1>
                    <div className="bg-white p-6 rounded shadow border border-red-200 overflow-auto">
                        <h2 className="text-xl font-bold text-red-600 mb-2">{this.state.error && this.state.error.toString()}</h2>
                        <pre className="text-xs whitespace-pre-wrap text-gray-700">
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

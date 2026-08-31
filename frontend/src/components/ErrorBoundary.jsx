import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // In a real deployment this would report to an error-tracking service.
    console.error("Uncaught error in component tree:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-2xl mx-auto px-6 py-24 text-center animate-fade-in-up">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-signal/10 border border-signal/30 flex items-center justify-center animate-wiggle">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#B4472A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <p className="font-mono text-[12px] uppercase tracking-wider text-signal mb-2">
            Something broke
          </p>
          <h1 className="font-display text-3xl tracking-tight mb-4">
            This page hit an unexpected error.
          </h1>
          <p className="text-muted mb-8">
            Try reloading. If it keeps happening, the backend API may be unreachable.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary btn-shine"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

"use client";

import React from "react";

type Props = { children: React.ReactNode };
type State = { err: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error, info: React.ErrorInfo) {
    console.error("[boundary]", err, info);
  }

  render() {
    if (this.state.err) {
      return (
        <main className="flex-1 grid place-items-center px-6 py-10 text-center space-y-3">
          <div>
            <h1 className="text-2xl font-heading text-ikigai-rose">
              Algo salió mal
            </h1>
            <p className="text-sm text-ikigai-dark/60 dark:text-ikigai-cream/60">
              Something went wrong
            </p>
          </div>
          <button
            type="button"
            onClick={() => location.reload()}
            className="h-12 px-5 rounded-lg bg-ikigai-purple text-white"
          >
            Reload
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}

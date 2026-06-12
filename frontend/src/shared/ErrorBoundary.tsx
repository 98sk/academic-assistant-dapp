import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./ui/Button";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="glass-card max-w-lg p-6">
            <h1 className="font-display text-lg font-bold text-danger">Une erreur est survenue</h1>
            <p className="mt-2 text-sm text-muted">
              L&apos;application n&apos;a pas pu démarrer. Détails ci-dessous :
            </p>
            <pre className="mt-4 overflow-auto rounded-lg bg-navy-900/40 p-3 text-xs text-primary">
              {this.state.error.message}
            </pre>
            <Button
              type="button"
              variant="primary"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Recharger la page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

import { Component, type ErrorInfo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

/** Evita que falha no Canvas 3D derrube o app inteiro. */
export class GameModalErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[GameModal]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <GameModalErrorFallback
          onReset={this.props.onReset}
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}

function GameModalErrorFallback({
  onReset,
  onRetry,
}: {
  onReset?: () => void;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="font-game text-sm text-red-400">{t("training.loadError")}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onRetry && (
          <Button type="button" variant="default" size="sm" onClick={onRetry}>
            {t("auth.retry")}
          </Button>
        )}
        {onReset && (
          <Button type="button" variant="outline" size="sm" onClick={onReset}>
            {t("training.exit")}
          </Button>
        )}
      </div>
    </div>
  );
}

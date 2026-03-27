import { Component, ErrorInfo, ReactNode } from "react";
import Button from "@/components/ui/Button";
import { useTranslation } from "react-i18next";

// Wrapper component to use hooks in class component
const ErrorFallback = ({ 
  error, 
  onReset 
}: { 
  error?: Error, 
  onReset?: () => void 
}) => {
  const { t } = useTranslation();
  
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4 border border-red-200 bg-red-50 dark:bg-red-950/20 rounded-lg m-4">
      <h2 className="text-xl font-bold text-red-600 dark:text-red-400">
        {t('common.error', 'Something went wrong')}
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-300 max-w-md break-words">
        {error?.message}
      </p>
      {onReset && (
        <Button 
          variant="destructive" 
          onClick={onReset}
        >
          {t('common.resetAndRetry', 'Reset Data & Retry')}
        </Button>
      )}
    </div>
  );
};

interface Props {
  children: ReactNode;
  onReset?: () => void;
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
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback 
          error={this.state.error} 
          onReset={() => {
            this.props.onReset?.();
            this.setState({ hasError: false });
          }} 
        />
      );
    }

    return this.props.children;
  }
}

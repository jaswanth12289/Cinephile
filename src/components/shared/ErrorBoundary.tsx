"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error inside ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 md:p-8 bg-card/20 backdrop-blur-md rounded-2xl border border-red-500/25 text-center space-y-4 shadow-lg select-none max-w-md mx-auto my-6 flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-inner">
            <AlertTriangle className="h-6 w-6" />
          </div>
          
          <div className="space-y-1.5 w-full">
            <h3 className="text-[17px] font-black text-white uppercase tracking-wide">
              Something went wrong
            </h3>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              An unexpected error occurred while rendering this component.
            </p>
            {this.state.error?.message && (
              <pre className="text-[10px] text-red-400 bg-black/45 p-2.5 rounded-lg max-w-full overflow-x-auto select-text font-mono text-left whitespace-pre-wrap break-all">
                {this.state.error.message}
              </pre>
            )}
          </div>

          <div className="pt-2">
            <Button
              onClick={this.handleReset}
              className="font-extrabold uppercase text-xs h-9 px-5 bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-lg shadow-red-600/15 cursor-pointer"
            >
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

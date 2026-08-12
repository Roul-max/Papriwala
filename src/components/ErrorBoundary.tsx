// @ts-nocheck
import React from "react";

interface Props { children: React.ReactNode; label?: string; }
interface State { hasError: boolean; message: string; }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md w-full">
            <p className="text-red-700 font-bold text-lg mb-2">Something went wrong</p>
            <p className="text-red-500 text-sm mb-4">{this.state.message || "An unexpected error occurred."}</p>
            <button
              onClick={() => this.setState({ hasError: false, message: "" })}
              className="bg-maroon text-white px-4 py-2 rounded text-sm font-semibold hover:bg-maroon-light transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    if (process.env.NODE_ENV === "development") console.error("ErrorBoundary caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-1 items-center justify-center p-8">
          <Card className="max-w-sm p-6 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#FAECE7] text-[#D85A30]"><AlertTriangle size={18} /></div>
            <h2 className="mt-3 text-[15px] font-bold text-[#0F1629]">Something went wrong</h2>
            <p className="mt-1 text-[12px] text-[#64748B]">An unexpected error occurred while loading this page.</p>
            <Button className="mt-4" onClick={() => this.setState({ hasError: false, error: undefined })}>Try again</Button>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

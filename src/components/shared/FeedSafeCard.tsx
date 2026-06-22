"use client";

import React, { Component, ReactNode } from "react";
import { FeedCard } from "./FeedCard";

interface Props {
  activity: any;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("FeedCard crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          Activity unavailable (Crash prevented)
        </div>
      );
    }
    return this.props.children;
  }
}

export function FeedSafeCard({ activity: item }: Props) {
  return (
    <ErrorBoundary>
      <FeedCard
        activity={item.activity}
        actor={item.actor}
        initialReactions={item.reactions}
        initialUserReaction={item.userActiveReaction}
        initialSaved={item.initialSaved}
        isSavedPost={item.isSavedPost}
        userPollVote={item.userPollVote}
      />
    </ErrorBoundary>
  );
}

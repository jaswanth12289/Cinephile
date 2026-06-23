"use client";

import { useState, useEffect, memo } from "react";
import { Film, Clock, Star, Flame, X, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAuth } from "@/features/auth/AuthProvider";
import { getWeeklyWrapped } from "@/actions/stats.actions";

interface WeeklyWrappedCardProps {
  data?: any; // optional compatibility
}

export const WeeklyWrappedCard = memo(function WeeklyWrappedCard({ data: initialData }: WeeklyWrappedCardProps) {
  const { user } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const [data, setData] = useState<any>(initialData || null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  // Check localStorage and fetch data on mount
  useEffect(() => {
    if (initialData) {
      setData(initialData);
      const isClosed = localStorage.getItem("weekly_wrapped_dismissed");
      if (!isClosed) {
        setDismissed(false);
      }
      return;
    }

    if (!user) return;

    const isClosed = localStorage.getItem("weekly_wrapped_dismissed");
    if (isClosed) {
      setDismissed(true);
      return;
    }

    setLoading(true);
    getWeeklyWrapped(user?.id)
      .then((res) => {
        if (res && !(res as any).error) {
          setData(res);
          setDismissed(false);
        } else {
          setData(null);
          setDismissed(true);
        }
      })
      .catch((err) => {
        console.warn("Error loading weekly wrapped:", err);
        setDismissed(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user, initialData]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("weekly_wrapped_dismissed", "true");
  };

  if (loading) {
    return (
      <div className="cine-glass rounded-2xl p-6 flex items-center justify-center min-h-[140px] text-muted-foreground select-none">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span className="text-xs font-bold uppercase tracking-wider font-display">Unwrapping your week...</span>
      </div>
    );
  }

  if (!data || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -15, scale: 0.98 }}
        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -15, scale: 0.98 }}
        transition={{ duration: 0.3 }}
        className="relative bg-gradient-to-br from-[#101018]/90 via-[#09090F]/90 to-[#101018]/90 backdrop-blur-xl border border-white/8 rounded-2xl p-5 shadow-2xl overflow-hidden select-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 100% 0%, rgba(139, 92, 246, 0.12) 0%, transparent 50%),
            radial-gradient(circle at 0% 100%, rgba(233, 69, 96, 0.08) 0%, transparent 50%)
          `
        }}
      >
        {/* Sparkles background effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent opacity-60 pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white border border-white/5 transition-all cursor-pointer z-10"
          title="Dismiss Wrapped"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Card Body */}
        <div className="relative space-y-4">
          
          {/* Headline */}
          <div className="flex items-center gap-2 text-primary font-black select-none">
            <Sparkles className="h-4.5 w-4.5 animate-pulse text-amber-400" />
            <span className="text-[12px] uppercase tracking-widest font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-primary font-display">
              Your Weekly Cinema Wrapped
            </span>
          </div>

          <div className="space-y-1 select-none">
            <h3 className="text-[20px] font-black text-white leading-tight font-display">
              A week of great stories.
            </h3>
            <p className="text-[13px] text-zinc-400">
              Here is your Cinephile wrap-up for the last 7 days:
            </p>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 pt-2">
            
            {/* Stat: Logged */}
            <div className="bg-white/3 border border-white/5 rounded-xl p-3 flex items-start gap-3 hover:bg-white/5 transition-colors">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 shrink-0 mt-0.5 border border-blue-500/10">
                <Film className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block font-display">Logged</span>
                <span className="text-[14px] font-extrabold text-white">
                  {data.moviesWatched} films {data.tvWatched > 0 && `· ${data.tvWatched} tv`}
                </span>
              </div>
            </div>

            {/* Stat: Hours */}
            <div className="bg-white/3 border border-white/5 rounded-xl p-3 flex items-start gap-3 hover:bg-white/5 transition-colors">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 shrink-0 mt-0.5 border border-purple-500/10">
                <Clock className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block font-display">Time Spent</span>
                <span className="text-[14px] font-extrabold text-white">
                  {data.hoursSpent} Hours
                </span>
              </div>
            </div>

            {/* Stat: Rating */}
            <div className="bg-white/3 border border-white/5 rounded-xl p-3 flex items-start gap-3 hover:bg-white/5 transition-colors">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 shrink-0 mt-0.5 border border-amber-500/10">
                <Star className="h-4 w-4 fill-amber-400/20" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block font-display">Avg Rating</span>
                <span className="text-[14px] font-extrabold text-white">
                  ★ {data.avgRating}
                </span>
              </div>
            </div>

            {/* Stat: Genre */}
            <div className="bg-white/3 border border-white/5 rounded-xl p-3 flex items-start gap-3 hover:bg-white/5 transition-colors">
              <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400 shrink-0 mt-0.5 border border-rose-500/10">
                <Flame className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block font-display">Top Genre</span>
                <span className="text-[14px] font-extrabold text-white truncate block">
                  {data.favoriteGenre}
                </span>
              </div>
            </div>

          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
});

WeeklyWrappedCard.displayName = "WeeklyWrappedCard";

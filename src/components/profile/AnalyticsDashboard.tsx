"use client";

import { ActivityHeatmap } from "./ActivityHeatmap";
import { Film, Clock, Star, Languages, Video, Award } from "lucide-react";

interface AnalyticsDashboardProps {
  stats: {
    moviesCount: number;
    tvCount: number;
    hoursCount: number;
    avgRating: string;
    favoriteGenre: string;
    longestStreak: number;
    currentStreak: number;
    favoriteDecade: string;
    favoriteLanguage: string;
    topActor: string;
    topDirector: string;
  };
  heatmapData: Record<string, number>;
}

export function AnalyticsDashboard({ stats, heatmapData }: AnalyticsDashboardProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 rounded-2xl p-5 border border-white/5">
          <div className="text-zinc-400 mb-2">
            <Film className="w-5 h-5" />
          </div>
          <div className="text-3xl font-black text-white">{stats.moviesCount}</div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold mt-1">Movies</div>
        </div>
        
        <div className="bg-zinc-900/50 rounded-2xl p-5 border border-white/5">
          <div className="text-zinc-400 mb-2">
            <Video className="w-5 h-5" />
          </div>
          <div className="text-3xl font-black text-white">{stats.tvCount}</div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold mt-1">TV Shows</div>
        </div>

        <div className="bg-zinc-900/50 rounded-2xl p-5 border border-white/5">
          <div className="text-zinc-400 mb-2">
            <Clock className="w-5 h-5" />
          </div>
          <div className="text-3xl font-black text-white">{stats.hoursCount}</div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold mt-1">Hours Watched</div>
        </div>

        <div className="bg-zinc-900/50 rounded-2xl p-5 border border-white/5">
          <div className="text-zinc-400 mb-2">
            <Star className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-white">{stats.avgRating}</div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold mt-1">Avg Rating</div>
        </div>
      </div>

      {/* Deep Dive Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900/30 rounded-2xl p-6 border border-white/5 space-y-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-500" />
            Favorites
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-white/5 pb-2">
              <span className="text-sm text-zinc-500">Top Genre</span>
              <span className="text-lg font-black text-white">{stats.favoriteGenre}</span>
            </div>
            <div className="flex justify-between items-end border-b border-white/5 pb-2">
              <span className="text-sm text-zinc-500">Top Decade</span>
              <span className="text-lg font-black text-white">{stats.favoriteDecade}</span>
            </div>
            <div className="flex justify-between items-end pb-2">
              <span className="text-sm text-zinc-500">Language</span>
              <span className="text-lg font-black text-white flex items-center gap-1">
                <Languages className="w-4 h-4 text-zinc-400" />
                {stats.favoriteLanguage.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/30 rounded-2xl p-6 border border-white/5 space-y-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            Most Watched
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-white/5 pb-2">
              <span className="text-sm text-zinc-500">Director</span>
              <span className="text-lg font-black text-white">{stats.topDirector}</span>
            </div>
            <div className="flex justify-between items-end pb-2">
              <span className="text-sm text-zinc-500">Actor</span>
              <span className="text-lg font-black text-white">{stats.topActor}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-zinc-900/30 rounded-2xl p-6 border border-white/5">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Activity (Last 365 Days)</h3>
          <div className="flex gap-4 text-xs font-bold text-zinc-500">
            <div>
              <span className="text-emerald-500">{stats.currentStreak}</span> Day Streak
            </div>
            <div>
              <span className="text-white">{stats.longestStreak}</span> Longest
            </div>
          </div>
        </div>
        <ActivityHeatmap data={heatmapData} />
      </div>

    </div>
  );
}

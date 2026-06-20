"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface ActivityHeatmapProps {
  data: Record<string, number>; // YYYY-MM-DD -> count
}

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const { weeks, maxCount } = useMemo(() => {
    const today = new Date();
    // Start exactly 365 days ago
    const startDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
    
    // Align to Sunday
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    const weeksArray: { date: string; count: number }[][] = [];
    let currentWeek: { date: string; count: number }[] = [];
    let max = 1;

    let d = new Date(startDate);
    while (d <= today || currentWeek.length > 0) {
      if (currentWeek.length === 7) {
        weeksArray.push(currentWeek);
        currentWeek = [];
      }

      if (d > today) {
        // padding for end of week
        if (currentWeek.length > 0) {
          currentWeek.push({ date: "", count: 0 });
        }
      } else {
        const dateStr = d.toISOString().split("T")[0];
        const count = data[dateStr] || 0;
        if (count > max) max = count;
        currentWeek.push({ date: dateStr, count });
        d.setDate(d.getDate() + 1);
      }
    }

    return { weeks: weeksArray, maxCount: max };
  }, [data]);

  const getColorClass = (count: number, max: number) => {
    if (count === 0) return "bg-zinc-800";
    const intensity = count / max;
    if (intensity < 0.25) return "bg-emerald-900";
    if (intensity < 0.5) return "bg-emerald-700";
    if (intensity < 0.75) return "bg-emerald-500";
    return "bg-emerald-400";
  };

  return (
    <div className="w-full overflow-x-auto scrollbar-hide">
      <div className="min-w-[700px]">
        <div className="flex gap-1">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1">
              {week.map((day, dIdx) => (
                <div
                  key={`${wIdx}-${dIdx}`}
                  title={day.date ? `${day.count} activities on ${day.date}` : ""}
                  className={cn(
                    "w-3 h-3 rounded-sm",
                    day.date ? getColorClass(day.count, maxCount) : "bg-transparent"
                  )}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-4 text-xs text-zinc-500 justify-end pr-2">
          <span>Less</span>
          <div className="w-3 h-3 rounded-sm bg-zinc-800" />
          <div className="w-3 h-3 rounded-sm bg-emerald-900" />
          <div className="w-3 h-3 rounded-sm bg-emerald-700" />
          <div className="w-3 h-3 rounded-sm bg-emerald-500" />
          <div className="w-3 h-3 rounded-sm bg-emerald-400" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

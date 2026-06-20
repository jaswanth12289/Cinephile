"use client";

import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from "recharts";

interface TasteRadarProps {
  data: {
    axis: string; // e.g. "Sci-Fi", "90s", "English"
    value: number; // 0 to 100
  }[];
}

export default function TasteRadar({ data }: TasteRadarProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-[#101018] border border-white/5 rounded-2xl p-6 h-64 flex items-center justify-center">
        <p className="text-zinc-500 text-sm font-bold">Not enough data for Taste Radar.</p>
      </div>
    );
  }

  // Ensure minimum 3 axes for Recharts Radar to render properly
  const chartData = [...data];
  if (chartData.length < 3) {
    chartData.push({ axis: "Drama", value: 10 });
    if (chartData.length < 3) chartData.push({ axis: "Comedy", value: 10 });
  }

  return (
    <div className="bg-[#101018] border border-white/5 rounded-2xl p-4 sm:p-6 h-72 sm:h-80 flex flex-col">
      <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">Taste Radar</h3>
      <div className="flex-1 w-full relative -ml-2 sm:-ml-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
            <PolarGrid stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis 
              dataKey="axis" 
              tick={{ fill: "#A1A1AA", fontSize: 10, fontWeight: "bold" }} 
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 100]} 
              tick={false} 
              axisLine={false} 
            />
            <Tooltip 
              contentStyle={{ backgroundColor: "#000", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }}
              itemStyle={{ color: "#F59E0B", fontWeight: "bold" }}
            />
            <Radar
              name="Taste Match"
              dataKey="value"
              stroke="#F59E0B"
              fill="#F59E0B"
              fillOpacity={0.3}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

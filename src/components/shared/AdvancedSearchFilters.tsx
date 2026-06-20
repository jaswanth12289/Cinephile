"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdvancedSearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  const [year, setYear] = useState(searchParams.get("year") || "");
  const [genre, setGenre] = useState(searchParams.get("genre") || "");
  const [rating, setRating] = useState(searchParams.get("rating") || "");

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (year) params.set("year", year);
    else params.delete("year");
    
    if (genre) params.set("genre", genre);
    else params.delete("genre");

    if (rating) params.set("rating", rating);
    else params.delete("rating");

    setIsOpen(false);
    router.push(`/search?${params.toString()}`);
  };

  const clearFilters = () => {
    setYear("");
    setGenre("");
    setRating("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("year");
    params.delete("genre");
    params.delete("rating");
    setIsOpen(false);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="icon" 
        onClick={() => setIsOpen(true)}
        className="shrink-0 h-10 w-10 border-white/10 bg-white/5 hover:bg-white/10"
      >
        <SlidersHorizontal className="h-4 w-4 text-zinc-400" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#101018] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-black text-white">Filters</h2>
              <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Release Year</label>
                <select 
                  value={year} 
                  onChange={e => setYear(e.target.value)}
                  className="w-full bg-[#09090F] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50"
                >
                  <option value="">Any Year</option>
                  {Array.from({length: 40}, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Genre</label>
                <select 
                  value={genre} 
                  onChange={e => setGenre(e.target.value)}
                  className="w-full bg-[#09090F] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50"
                >
                  <option value="">Any Genre</option>
                  <option value="28">Action</option>
                  <option value="12">Adventure</option>
                  <option value="16">Animation</option>
                  <option value="35">Comedy</option>
                  <option value="80">Crime</option>
                  <option value="99">Documentary</option>
                  <option value="18">Drama</option>
                  <option value="10751">Family</option>
                  <option value="14">Fantasy</option>
                  <option value="36">History</option>
                  <option value="27">Horror</option>
                  <option value="10402">Music</option>
                  <option value="9648">Mystery</option>
                  <option value="10749">Romance</option>
                  <option value="878">Science Fiction</option>
                  <option value="10770">TV Movie</option>
                  <option value="53">Thriller</option>
                  <option value="10752">War</option>
                  <option value="37">Western</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Minimum Rating</label>
                <input 
                  type="range" 
                  min="0" max="10" step="1"
                  value={rating || "0"} 
                  onChange={e => setRating(e.target.value)}
                  className="w-full accent-primary"
                />
                <div className="text-right text-xs font-bold text-white">
                  {rating ? `★ ${rating} / 10` : "Any Rating"}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/10 flex gap-3 bg-[#09090F]">
              <Button variant="outline" className="flex-1 bg-white/5 border-white/10" onClick={clearFilters}>Clear</Button>
              <Button className="flex-1" onClick={applyFilters}>Apply Filters</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

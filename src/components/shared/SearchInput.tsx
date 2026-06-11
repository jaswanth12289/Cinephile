"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface SearchInputProps {
  defaultValue: string;
  activeTab: string;
}

export function SearchInput({ defaultValue, activeTab }: SearchInputProps) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  const addRecentSearch = (query: string) => {
    if (typeof window === "undefined" || !query.trim()) return;
    try {
      const existing: string[] = JSON.parse(localStorage.getItem("cinephile_recent_searches") || "[]");
      const filtered = existing.filter((item: string) => item.toLowerCase() !== query.toLowerCase().trim());
      const updated = [query.trim(), ...filtered].slice(0, 10);
      localStorage.setItem("cinephile_recent_searches", JSON.stringify(updated));
      window.dispatchEvent(new Event("cinephile_recent_searches_updated"));
    } catch (e) {
      console.warn("Failed to update recent searches:", e);
    }
  };

  const debouncedSearch = useDebouncedCallback((val: string) => {
    if (val.trim()) {
      router.replace(`/search?q=${encodeURIComponent(val.trim())}&t=${activeTab}`);
      addRecentSearch(val.trim());
    } else {
      router.replace("/search");
    }
  }, 300);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue(val);
    debouncedSearch(val);
  };

  const handleClear = () => {
    setValue("");
    debouncedSearch("");
  };

  // Sync value when URL query changes externally
  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  return (
    <div className="relative flex-1 flex items-center pl-3">
      <Search className="h-5 w-5 text-muted-foreground absolute left-4 pointer-events-none" />
      <Input
        type="search"
        placeholder="Search movies, TV shows, users..."
        value={value}
        onChange={handleChange}
        className="text-[15px] pl-10 pr-10 bg-transparent border-0 ring-0 outline-none text-white focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground w-full py-3 h-auto"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-4 text-muted-foreground hover:text-white transition-colors cursor-pointer"
          title="Clear search"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

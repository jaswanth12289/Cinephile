"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchInputProps {
  defaultValue: string;
  activeTab: string;
}

export function SearchInput({ defaultValue, activeTab }: SearchInputProps) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  const debouncedSearch = useDebouncedCallback((val: string) => {
    if (val.trim()) {
      router.replace(`/search?q=${encodeURIComponent(val.trim())}&t=${activeTab}`);
    } else {
      router.replace("/search");
    }
  }, 300);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue(val);
    debouncedSearch(val);
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
        className="text-[15px] pl-10 bg-transparent border-0 ring-0 outline-none text-white focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground w-full py-3 h-auto"
      />
    </div>
  );
}

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { getMovieWatchProviders, getTVWatchProviders } from "@/lib/tmdb/client";

interface WatchProvidersProps {
  id: number;
  mediaType: "movie" | "tv";
  region?: string;
}

const REGIONS = [
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
];

export async function WatchProviders({ id, mediaType, region = "IN" }: WatchProvidersProps) {
  const selectedRegion = region.toUpperCase();
  
  // 1. Fetch Watch Providers data
  const data = mediaType === "tv"
    ? await getTVWatchProviders(id).catch(() => null)
    : await getMovieWatchProviders(id).catch(() => null);

  const results = data?.results || {};
  const regionData = results[selectedRegion] || {};

  // Helper to deduplicate provider names
  const deduplicate = (providers: any[] = []) => {
    const seen = new Set();
    return providers.filter((p) => {
      if (!p || !p.provider_name) return false;
      const key = p.provider_name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const flatrate = deduplicate(regionData.flatrate);
  const rent = deduplicate(regionData.rent);
  const buy = deduplicate(regionData.buy);

  const hasAnyProviders = flatrate.length > 0 || rent.length > 0 || buy.length > 0;

  return (
    <section className="bg-card/25 backdrop-blur-md rounded-2xl border border-border/30 p-5 space-y-5">
      {/* Header with Title & Region Selection Links */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
        <h3 className="text-[18px] font-black tracking-tight text-white uppercase select-none">
          Where to Watch
        </h3>
        
        {/* Region Selector Link Pills */}
        <div className="flex flex-wrap gap-1.5 select-none">
          {REGIONS.map((r) => {
            const isActive = selectedRegion === r.code;
            return (
              <Link
                key={r.code}
                href={`?region=${r.code}`}
                scroll={false}
                title={r.name}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                  isActive
                    ? "bg-primary/20 text-primary border-primary/40"
                    : "bg-white/5 text-muted-foreground border-white/5 hover:text-white hover:bg-white/10"
                }`}
              >
                <span>{r.flag}</span>
                <span>{r.code}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Provider Details Categories */}
      {!hasAnyProviders ? (
        <div className="text-center py-6 text-[14px] text-muted-foreground font-medium select-none">
          No streaming providers are currently available in your region ({selectedRegion}).
        </div>
      ) : (
        <div className="space-y-4">
          {/* 1. Flatrate Streaming */}
          {flatrate.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-[12px] font-black uppercase tracking-wider text-muted-foreground select-none">
                Streaming On
              </h4>
              <div className="flex flex-wrap gap-2.5">
                {flatrate.map((p: any) => {
                  const logoUrl = p.logo_path
                    ? `https://image.tmdb.org/t/p/w92${p.logo_path}`
                    : null;
                  return (
                    <div
                      key={p.provider_id}
                      className="flex items-center gap-2 bg-black/35 hover:bg-black/50 border border-white/5 px-2.5 py-1.5 rounded-xl transition-all shadow-sm group select-none cursor-default"
                    >
                      {logoUrl ? (
                        <div className="relative h-6 w-6 rounded-md overflow-hidden bg-muted/20 shadow-inner">
                          <Image
                            src={logoUrl}
                            alt={p.provider_name}
                            fill
                            sizes="24px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center text-[10px] font-black text-primary">
                          {p.provider_name[0]}
                        </div>
                      )}
                      <span className="text-[13px] font-extrabold text-gray-200 group-hover:text-white transition-colors">
                        {p.provider_name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Rent Providers */}
          {rent.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-[12px] font-black uppercase tracking-wider text-muted-foreground select-none">
                Rent
              </h4>
              <div className="flex flex-wrap gap-2.5">
                {rent.map((p: any) => {
                  const logoUrl = p.logo_path
                    ? `https://image.tmdb.org/t/p/w92${p.logo_path}`
                    : null;
                  return (
                    <div
                      key={p.provider_id}
                      className="flex items-center gap-2 bg-black/20 hover:bg-black/35 border border-white/5 px-2.5 py-1.5 rounded-xl transition-all shadow-sm select-none"
                    >
                      {logoUrl ? (
                        <div className="relative h-5.5 w-5.5 rounded-md overflow-hidden bg-muted/20 shadow-inner">
                          <Image
                            src={logoUrl}
                            alt={p.provider_name}
                            fill
                            sizes="22px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-5.5 w-5.5 rounded bg-muted flex items-center justify-center text-[9px] font-black text-gray-400">
                          {p.provider_name[0]}
                        </div>
                      )}
                      <span className="text-[12px] font-bold text-gray-400">
                        {p.provider_name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Buy Providers */}
          {buy.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-[12px] font-black uppercase tracking-wider text-muted-foreground select-none">
                Buy
              </h4>
              <div className="flex flex-wrap gap-2.5">
                {buy.map((p: any) => {
                  const logoUrl = p.logo_path
                    ? `https://image.tmdb.org/t/p/w92${p.logo_path}`
                    : null;
                  return (
                    <div
                      key={p.provider_id}
                      className="flex items-center gap-2 bg-black/20 hover:bg-black/35 border border-white/5 px-2.5 py-1.5 rounded-xl transition-all shadow-sm select-none"
                    >
                      {logoUrl ? (
                        <div className="relative h-5.5 w-5.5 rounded-md overflow-hidden bg-muted/20 shadow-inner">
                          <Image
                            src={logoUrl}
                            alt={p.provider_name}
                            fill
                            sizes="22px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-5.5 w-5.5 rounded bg-muted flex items-center justify-center text-[9px] font-black text-gray-400">
                          {p.provider_name[0]}
                        </div>
                      )}
                      <span className="text-[12px] font-bold text-gray-400">
                        {p.provider_name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

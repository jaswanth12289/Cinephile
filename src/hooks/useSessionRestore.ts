"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useSessionRestore() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Restore session on app load
  useEffect(() => {
    if (typeof window === "undefined") return;

    const timestampStr = localStorage.getItem("cinephile_session_timestamp");
    if (!timestampStr) return;

    const sessionAge = Date.now() - Number(timestampStr);
    const isSessionValid = sessionAge < 24 * 60 * 60 * 1000; // 24 hours

    if (!isSessionValid) {
      // Clear stale state if older than 24 hours
      localStorage.removeItem("cinephile_session_route");
      localStorage.removeItem("cinephile_session_tab");
      localStorage.removeItem("cinephile_session_query");
      localStorage.removeItem("cinephile_session_profile_tab");
      localStorage.removeItem("cinephile_session_scroll");
      localStorage.removeItem("cinephile_session_timestamp");
      return;
    }

    // Removed route restoration based on user instruction to default to Home

    // Restore scroll position
    const savedScroll = localStorage.getItem("cinephile_session_scroll");
    if (savedScroll) {
      try {
        const { x, y } = JSON.parse(savedScroll);
        // Small delay to allow layout hydration
        setTimeout(() => {
          window.scrollTo(x, y);
        }, 150);
      } catch (e) {
        console.warn("Failed to restore scroll position:", e);
      }
    }
  }, []);

  // Save session states when route or query changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if path is an authentication page - don't store these
    if (
      pathname.includes("/login") ||
      pathname.includes("/register") ||
      pathname.includes("/setup-profile")
    ) {
      return;
    }

    const queryParams = new URLSearchParams(window.location.search);
    
    // Save timestamp
    localStorage.setItem("cinephile_session_timestamp", Date.now().toString());

    // Save full route
    const fullRoute = pathname + window.location.search;
    localStorage.setItem("cinephile_session_route", fullRoute);

    // Save active search/profile tab
    const activeTab = queryParams.get("t") || queryParams.get("tab");
    if (activeTab) {
      localStorage.setItem("cinephile_session_tab", activeTab);
    }

    // Save search query
    const searchQuery = queryParams.get("q");
    if (searchQuery) {
      localStorage.setItem("cinephile_session_query", searchQuery);
    }

    // Save profile tab specifically
    if (pathname.startsWith("/u/")) {
      const profileTab = queryParams.get("tab") || "activity";
      localStorage.setItem("cinephile_session_profile_tab", profileTab);
    }
  }, [pathname, searchParams]);

  // Debounced scroll listener to save scroll position
  useEffect(() => {
    if (typeof window === "undefined") return;

    let timeoutId: NodeJS.Timeout;

    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        localStorage.setItem(
          "cinephile_session_scroll",
          JSON.stringify({ x: window.scrollX, y: window.scrollY })
        );
        localStorage.setItem("cinephile_session_timestamp", Date.now().toString());
      }, 250);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timeoutId);
    };
  }, [pathname]);
}
export default useSessionRestore;

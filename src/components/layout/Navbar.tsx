"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { auth, db } from "@/lib/firebase/clientApp";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Compass, Search, Rss, User, LogOut, LogIn, Bell, List, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { useNotificationStore } from "@/store/notificationStore";
import { doc, onSnapshot } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { getCurrentUserProfile } from "@/actions/user.actions";
import { SafeAvatar } from "../shared/SafeAvatar";

const navLinks = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/search",   label: "Search",   icon: Search  },
  { href: "/lists",    label: "Lists",    icon: List    },
  { href: "/feed",     label: "Feed",      icon: Rss     },
];

export function Navbar() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const { unreadCount, fetchUnreadCount, setUnreadCount } = useNotificationStore();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const setOpen = setDropdownOpen;
  const [profile, setProfile] = useState<{
    displayName: string;
    username: string;
    photoURL: string;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const username = profile?.username;
  const isUsernameAvailable = typeof username === "string" && username.trim().length > 0;

  // Poll or retrieve unread notification count once on mount/user change
  useEffect(() => {
    if (!user) return;

    fetchUnreadCount();

    const interval = setInterval(() => {
      fetchUnreadCount(true);
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [user, fetchUnreadCount]);

  // Clear unread count locally when visiting notifications page
  useEffect(() => {
    if (pathname === "/notifications") {
      setUnreadCount(0);
    }
  }, [pathname, setUnreadCount]);

  // Listen to real-time profile changes
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile({
            displayName: data.displayName || "",
            username: data.username || "",
            photoURL: data.photoURL || "",
          });
        }
      },
      async (err) => {
        console.warn("Real-time profile sync failed, falling back to server action fetch:", err);
        try {
          const res = await getCurrentUserProfile();
          if (res.success && res.exists && res.data) {
            setProfile({
              displayName: res.data.displayName || "",
              username: res.data.username || "",
              photoURL: res.data.photoURL || "",
            });
          }
        } catch (e) {
          console.warn("Fallback profile fetch failed:", e);
        }
      }
    );
    return () => unsubscribe();
  }, [user]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setDropdownOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    setSigningOut(true);
    setDropdownOpen(false);
    await signOut(auth);
    router.push("/");
    setSigningOut(false);
  };

  return (
    <>
      <header className={cn(
        "sticky z-50 transition-all duration-300 bg-[#09090F]/75 backdrop-blur-xl border-white/5 shadow-2xl max-w-full overflow-hidden min-w-0 flex-shrink",
        "top-0 w-full rounded-none border-b border-t-0 border-x-0 px-1 sm:px-2",
        "md:top-4 md:mt-4 md:w-[calc(100%-2rem)] md:mx-auto md:max-w-7xl md:rounded-2xl md:border"
      )}>
        <div className="w-full flex h-14 md:h-16 items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group select-none">
            <span className="text-xl font-black text-white leading-none tracking-[0.25em] uppercase font-display transition-all duration-300 group-hover:scale-102 group-hover:text-primary group-hover:drop-shadow-[0_0_15px_rgba(233,69,96,0.35)]">
              Cinephile
            </span>
          </Link>


          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1.5 bg-white/3 p-1 rounded-xl border border-white/3">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch={true}
                  className={cn(
                    "relative flex items-center gap-2 px-4.5 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all duration-300",
                    isActive
                      ? "bg-[#E94560] text-white shadow-[0_4px_12px_rgba(233,69,96,0.25)] scale-[1.02]"
                      : "text-[#A1A1AA] hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Link>
              );
            })}
          </nav>
   
          {/* Auth Actions */}
          <div className="flex items-center gap-2">
            {loading ? (
              <div className="h-9 w-24 rounded-xl bg-white/5 animate-pulse" />
            ) : user ? (
              <>
                {/* Notification Bell */}
                <Link 
                  href="/notifications" 
                  prefetch={true}
                  className="relative p-1.5 md:p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all mr-1 cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="h-4 w-4 md:h-5 md:w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[14px] md:min-w-[16px] h-3.5 md:h-4 rounded-full bg-primary text-[8px] md:text-[9px] font-black text-white flex items-center justify-center px-1 shadow-[0_0_8px_rgba(233,69,96,0.5)]">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Profile Dropdown */}
                <div className="relative flex items-center" ref={dropdownRef}>
                  <button 
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    aria-label="Toggle profile menu"
                    className="flex items-center gap-1.5 md:gap-2.5 px-2 py-1 md:px-3 md:py-1.5 rounded-full bg-white/5 hover:bg-white/8 transition-colors border border-white/5 hover:border-white/10 cursor-pointer select-none shrink-0"
                  >
                    <SafeAvatar
                      src={profile?.photoURL || user.photoURL}
                      alt={profile?.displayName || user.displayName || "User"}
                      name={profile?.displayName || user.displayName || "U"}
                      size={32}
                      className="!h-[24px] !w-[24px] md:!h-[32px] md:!w-[32px] border-white/10"
                    />
                    <div className="hidden sm:flex flex-col text-left min-w-0 max-w-[120px]">
                      <span className="text-xs font-bold text-white truncate leading-none">
                        {profile?.displayName || user.displayName || "Cinephile User"}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-semibold truncate mt-0.5 leading-none">
                        @{profile?.username || user.displayName?.replace(/\s+/g, "").toLowerCase() || "user"}
                      </span>
                    </div>
                    <ChevronDown className="h-3 w-3 md:h-3.5 md:w-3.5 text-zinc-400 shrink-0" />
                  </button>

                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute right-0 top-11 md:top-12.5 w-56 bg-[#09090F]/95 backdrop-blur-2xl border border-white/8 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-white/5"
                      >
                        {/* User Info Header */}
                        <div className="p-3.5 flex items-center gap-3">
                          <SafeAvatar
                            src={profile?.photoURL || user.photoURL}
                            alt={profile?.displayName || user.displayName || "User"}
                            name={profile?.displayName || user.displayName || "U"}
                            size={36}
                            className="border-white/10"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-white truncate leading-tight">
                              {profile?.displayName || user.displayName || "Cinephile User"}
                            </div>
                            <div className="text-[11.5px] text-zinc-500 font-bold truncate mt-0.5">
                              @{profile?.username || user.displayName?.replace(/\s+/g, "").toLowerCase() || "user"}
                            </div>
                          </div>
                        </div>

                        {/* Dropdown Options */}
                        <div className="py-1 flex flex-col">
                          <Link 
                            href={username ? `/u/${username}` : '/setup-profile'}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 px-4.5 py-2.5 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-colors w-full uppercase tracking-wider"
                          >
                            👤 Profile
                          </Link>

                          <Link 
                            href="/setup-profile?edit=true"
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 px-4.5 py-2.5 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-colors w-full uppercase tracking-wider"
                          >
                            ✏️ Edit Profile
                          </Link>

                          {isUsernameAvailable && (
                            <Link 
                              href={`/u/${username}?tab=stats`}
                              onClick={() => setOpen(false)}
                              className="flex items-center gap-3 px-4.5 py-2.5 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-colors w-full uppercase tracking-wider"
                            >
                              📊 Stats
                            </Link>
                          )}

                          <Link 
                            href="/setup-profile?edit=true"
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 px-4.5 py-2.5 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-colors w-full uppercase tracking-wider"
                          >
                            ⚙️ Settings
                          </Link>
                        </div>

                        {/* Logout */}
                        <div className="py-1">
                          <button
                            onClick={async () => {
                              setOpen(false)
                              await signOut(auth)
                              router.push('/')
                            }}
                            className="flex items-center gap-3 px-4.5 py-2.5 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors w-full text-left uppercase tracking-wider"
                          >
                            🚪 Sign Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="flex-shrink-0">
                  <Button variant="ghost" size="sm" className="gap-1.5 cursor-pointer whitespace-nowrap flex-shrink-0">
                    <LogIn className="h-4 w-4" />
                    Sign in
                  </Button>
                </Link>
                <Link href="/register" className="flex-shrink-0">
                  <Button size="sm" className="font-semibold cursor-pointer whitespace-nowrap flex-shrink-0">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border/50 bg-[#09090F]/95 backdrop-blur-xl px-2 pt-2"
        style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
      >
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            prefetch={true}
            className={cn(
              "flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors",
              pathname.startsWith(href)
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
        {user && (
          <Link
            href="/notifications"
            prefetch={true}
            className={cn(
              "flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors relative",
              pathname === "/notifications" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-6 min-w-[14px] h-3.5 rounded-full bg-primary text-[8px] font-bold text-white flex items-center justify-center px-0.5">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
            Notifications
          </Link>
        )}
        {user ? (
          isUsernameAvailable ? (
            <Link
              href={`/u/${username}`}
              prefetch={true}
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-1.5 text-xs font-medium transition-colors",
                pathname.startsWith("/u/") ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <User className="h-5 w-5" />
              Profile
            </Link>
          ) : (
            <div
              className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-xs font-medium text-muted-foreground/50 cursor-not-allowed opacity-50 select-none"
            >
              <User className="h-5 w-5" />
              Profile
            </div>
          )
        ) : (
          <Link
            href="/login"
            className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogIn className="h-5 w-5" />
            Login
          </Link>
        )}
      </nav>
    </>
  );
}


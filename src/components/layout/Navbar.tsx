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
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <Image
            src="/logo.png"
            alt="Cinephile"
            width={128}
            height={70}
            className="h-9 w-auto object-contain transition-transform group-hover:scale-105"
            priority
          />
        </Link>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              prefetch={true}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname.startsWith(href)
                  ? "bg-primary/20 text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
 
        {/* Auth Actions */}
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="h-8 w-24 rounded-lg bg-muted animate-pulse" />
          ) : user ? (
            <>
              {/* Notification Bell */}
              <Link 
                href="/notifications" 
                prefetch={true}
                className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors mr-1 cursor-pointer"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center px-1 animate-pulse">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>

              {/* Profile Dropdown */}
              <div className="relative flex items-center" ref={dropdownRef}>
                <button 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-label="Toggle profile menu"
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-full hover:bg-zinc-900 transition-colors border border-transparent hover:border-zinc-800 cursor-pointer select-none shrink-0"
                >
                  <div className="h-8 w-8 rounded-full overflow-hidden shrink-0 border border-zinc-800 flex items-center justify-center bg-primary/20">
                    {profile?.photoURL || user.photoURL ? (
                      <Image
                        src={profile?.photoURL || user.photoURL || ""}
                        alt={profile?.displayName || user.displayName || "User"}
                        width={32}
                        height={32}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-primary font-black text-sm uppercase select-none">
                        {(profile?.displayName || user.displayName || "U")[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="hidden sm:flex flex-col text-left min-w-0 max-w-[120px]">
                    <span className="text-xs font-bold text-white truncate leading-none">
                      {profile?.displayName || user.displayName || "Cinephile User"}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-semibold truncate mt-0.5 leading-none">
                      @{profile?.username || user.displayName?.replace(/\s+/g, "").toLowerCase() || "user"}
                    </span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="absolute right-0 top-12 w-56 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-zinc-900"
                    >
                      {/* User Info Header */}
                      <div className="p-3.5 flex items-center gap-3">
                        <div className="relative h-9 w-9 rounded-full overflow-hidden shrink-0 border border-zinc-800">
                          {profile?.photoURL || user.photoURL ? (
                            <Image
                              src={profile?.photoURL || user.photoURL || ""}
                              alt={profile?.displayName || user.displayName || "User"}
                              width={36}
                              height={36}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-primary/20 text-primary font-black flex items-center justify-center text-xs select-none">
                              {(profile?.displayName || user.displayName || "U")[0].toUpperCase()}
                            </div>
                          )}
                        </div>
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
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors w-full"
                        >
                          👤 Profile
                        </Link>

                        <Link 
                          href="/setup-profile"
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors w-full"
                        >
                          ✏️ Edit Profile
                        </Link>

                        {isUsernameAvailable && (
                          <Link 
                            href={`/u/${username}?tab=stats`}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors w-full"
                          >
                            📊 Stats
                          </Link>
                        )}

                        <Link 
                          href="/setup-profile"
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors w-full"
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
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-zinc-800 transition-colors w-full text-left"
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
              <Link href="/login">
                <Button variant="ghost" size="sm" className="gap-1.5 cursor-pointer">
                  <LogIn className="h-4 w-4" />
                  Sign in
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="font-semibold cursor-pointer">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border/50 bg-background/90 backdrop-blur-xl px-2 py-2">
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
    </header>
  );
}


"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Home,
  Compass,
  List,
  Activity,
  Bell,
  Settings,
  LogOut,
  Plus,
  User,
  LogIn,
  ShieldAlert,
  Search,
  Users,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useNotificationStore } from "@/store/notificationStore";
import { getCurrentUserProfile } from "@/actions/user.actions";
import { SafeAvatar } from "../shared/SafeAvatar";
import AnimatedLogo from "@/components/shared/AnimatedLogo";

/* ─── nav structure ─────────────────────────────────────────── */
const primaryLinks = [
  { href: "/",         label: "Home",     icon: Home      },
  { href: "/discover", label: "Discover", icon: Compass   },
  { href: "/search",   label: "Search",   icon: Search    },
  { href: "/lists",    label: "Lists",    icon: List      },
  { href: "/feed",     label: "Activity", icon: Activity  },
];

const secondaryLinks = [
  { href: "/clubs", label: "Movie Clubs", icon: Users },
  { href: "/challenges", label: "Challenges", icon: Trophy },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

const bottomLinks = [
  { href: "/setup-profile?edit=true", label: "Settings", icon: Settings },
];

export function Navbar() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { unreadCount, fetchUnreadCount, setUnreadCount } = useNotificationStore();

  const [profile, setProfile] = useState<{
    displayName: string;
    username: string;
    photoURL: string;
    isAdmin: boolean;
  } | null>(null);

  const username = profile?.username;
  const isUsernameAvailable = typeof username === "string" && username.trim().length > 0;

  /* ── notification polling ── */
  useEffect(() => {
    if (!user) return;
    fetchUnreadCount();
    const interval = setInterval(() => fetchUnreadCount(true), 60000);
    return () => clearInterval(interval);
  }, [user, fetchUnreadCount]);

  useEffect(() => {
    if (pathname === "/notifications") setUnreadCount(0);
  }, [pathname, setUnreadCount]);

  /* ── real-time profile sync ── */
  useEffect(() => {
    if (!user) { setProfile(null); return; }
    
    // Initial fetch
    getCurrentUserProfile().then(res => {
      if (res.success && res.exists && res.data) {
        setProfile({ 
          displayName: res.data.display_name || "", 
          username: res.data.username || "", 
          photoURL: res.data.avatar_url || "",
          isAdmin: res.data.role === "admin"
        });
      }
    });

    const supabase = createClient();
    const channel = supabase
      .channel("profile-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload: any) => {
          const d = payload.new;
          setProfile({
            displayName: d.display_name || "",
            username: d.username || "",
            photoURL: d.avatar_url || "",
            isAdmin: d.role === "admin"
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    
    // Also hit API route to clear cookies if needed
    await fetch("/api/auth/session", { method: "DELETE" });
    
    router.push("/");
  };

  /* ─── active check ─────────────────────────────────────────── */
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  /* ─── Sidebar link component ───────────────────────────────── */
  function SidebarLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
    const active = isActive(href);
    return (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
          active
            ? "bg-blue-600/15 text-white border-r-2 border-blue-500"
            : "text-slate-400 hover:text-white hover:bg-white/5"
        )}
      >
        <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-blue-400" : "")} />
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <>
      {/* ══════════════════════════════════════════════════════════
          DESKTOP SIDEBAR
          ══════════════════════════════════════════════════════════ */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 flex-col w-[220px] bg-[#0d1117] border-r border-white/[0.06]">
        
        {/* Logo */}
        <div className="flex items-center h-16 px-5 border-b border-white/[0.06] shrink-0">
          <Link href="/" className="select-none">
            <AnimatedLogo className="text-[1.9rem] tracking-tight" />
          </Link>
        </div>

        {/* Search bar */}
        <div className="px-3 mt-4 shrink-0">
          <Link
            href="/search"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-500 text-sm hover:bg-white/[0.07] transition-colors"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">Search movies, actors...</span>
          </Link>
        </div>

        {/* Primary nav */}
        <nav className="flex flex-col gap-0.5 px-2 mt-5 flex-1 overflow-y-auto scrollbar-hide">
          {primaryLinks.map((l) => (
            <SidebarLink key={l.href} {...l} />
          ))}

          <div className="my-3 border-t border-white/[0.06]" />

          {secondaryLinks.map((l) => (
            <SidebarLink key={l.href} {...l} />
          ))}

          {profile?.isAdmin && (
            <SidebarLink href="/admin" label="Admin" icon={ShieldAlert} />
          )}
        </nav>

        {/* Bottom section */}
        <div className="px-2 pb-4 shrink-0 border-t border-white/[0.06] pt-3">
          {bottomLinks.map((l) => (
            <SidebarLink key={l.href} {...l} />
          ))}

          {user && (
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-white/5 transition-all w-full mt-0.5"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              <span>Logout</span>
            </button>
          )}

          {/* User profile strip */}
          {!loading && user && (
            <Link
              href={isUsernameAvailable ? `/u/${username}` : "/setup-profile"}
              className="flex items-center gap-2.5 mt-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors group"
            >
              <SafeAvatar
                src={profile?.photoURL || user.user_metadata?.avatar_url}
                alt={profile?.displayName || user.user_metadata?.display_name || "User"}
                name={profile?.displayName || user.user_metadata?.display_name || "U"}
                size={34}
                className="shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate leading-none">
                  {profile?.displayName || user.user_metadata?.display_name || "Cinephile User"}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                  @{profile?.username || "user"}
                </p>
              </div>
            </Link>
          )}

          {!loading && !user && (
            <div className="mt-3 flex flex-col gap-2">
              <Link href="/login" className="btn-accent justify-center text-sm py-2">
                Sign In
              </Link>
              <Link href="/register" className="btn-ghost justify-center text-sm py-2">
                Create Account
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════
          MOBILE HEADER
          ══════════════════════════════════════════════════════════ */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-14 px-4 bg-[#0d1117]/95 backdrop-blur-xl border-b border-white/[0.06]">
        {/* Logo */}
        <Link href="/" className="select-none">
          <AnimatedLogo className="text-2xl" />
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Link href="/search" className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <Search className="h-5 w-5" />
          </Link>
          {user && (
            <Link href="/notifications" className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-500" />
              )}
            </Link>
          )}
          {!loading && (
            user ? (
              <Link href={isUsernameAvailable ? `/u/${username}` : "/setup-profile"}>
                <SafeAvatar
                  src={profile?.photoURL || user.user_metadata?.avatar_url}
                  alt={profile?.displayName || user.user_metadata?.display_name || "User"}
                  name={profile?.displayName || user.user_metadata?.display_name || "U"}
                  size={32}
                  className="!h-8 !w-8 border border-white/10"
                />
              </Link>
            ) : (
              <Link href="/login" className="btn-accent py-1.5 px-3 text-xs">
                Sign In
              </Link>
            )
          )}
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════
          MOBILE BOTTOM NAV
          ══════════════════════════════════════════════════════════ */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0d1117]/95 backdrop-blur-xl border-t border-white/[0.06] flex items-center justify-around"
        style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))", paddingTop: "0.5rem" }}
      >
        {/* Home */}
        <Link
          href="/"
          className={cn("mobile-nav-item", isActive("/") ? "text-blue-400" : "text-slate-500")}
        >
          <Home className="h-5 w-5" />
          <span>Home</span>
        </Link>

        {/* Discover */}
        <Link
          href="/discover"
          className={cn("mobile-nav-item", isActive("/discover") ? "text-blue-400" : "text-slate-500")}
        >
          <Compass className="h-5 w-5" />
          <span>Discover</span>
        </Link>

        {/* Centre + button */}
        <Link
          href="/lists?new=true"
          className="flex flex-col items-center"
        >
          <div className="flex items-center justify-center h-11 w-11 rounded-full bg-blue-600 shadow-lg shadow-blue-600/25 hover:bg-blue-500 transition-colors">
            <Plus className="h-5 w-5 text-white" />
          </div>
        </Link>

        {/* Activity */}
        <Link
          href="/feed"
          className={cn("mobile-nav-item", isActive("/feed") ? "text-blue-400" : "text-slate-500")}
        >
          <Activity className="h-5 w-5" />
          <span>Activity</span>
        </Link>

        {/* Profile */}
        {user ? (
          <Link
            href={isUsernameAvailable ? `/u/${username}` : "/setup-profile"}
            className={cn("mobile-nav-item", pathname.startsWith("/u/") ? "text-blue-400" : "text-slate-500")}
          >
            {profile?.photoURL || user.user_metadata?.avatar_url ? (
              <SafeAvatar
                src={profile?.photoURL || user.user_metadata?.avatar_url}
                alt="profile"
                name={profile?.displayName || "U"}
                size={22}
                className="!h-[22px] !w-[22px]"
              />
            ) : (
              <User className="h-5 w-5" />
            )}
            <span>Profile</span>
          </Link>
        ) : (
          <Link href="/login" className={cn("mobile-nav-item", "text-slate-500")}>
            <LogIn className="h-5 w-5" />
            <span>Login</span>
          </Link>
        )}
      </nav>
    </>
  );
}

"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Redirect to setup-profile if onboarding is not complete
  useEffect(() => {
    if (loading || !user) return;

    const isAuthOrSetupRoute =
      pathname === "/setup-profile" ||
      pathname === "/login" ||
      pathname === "/register";

    if (isAuthOrSetupRoute) return;

    const checkOnboarding = async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("profile_completed")
          .eq("id", user.id)
          .maybeSingle();

        if (profile && profile.profile_completed === false) {
          router.push("/setup-profile");
        }
      } catch (err) {
        console.warn("Onboarding check failed:", err);
      }
    };

    checkOnboarding();
  }, [user, loading, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

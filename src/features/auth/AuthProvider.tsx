"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/clientApp";
import { doc, getDoc } from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";
import { getCurrentUserProfile } from "@/actions/user.actions";

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
      
      // Sync auth state with server cookie
      if (user) {
        const idToken = await user.getIdToken();
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
      } else {
        await fetch("/api/auth/session", { method: "DELETE" });
      }
    });

    return () => unsubscribe();
  }, []);

  // Client-side redirect check for profileCompleted === false
  useEffect(() => {
    if (loading || !user) return;

    if (
      pathname === "/setup-profile" ||
      pathname === "/login" ||
      pathname === "/register"
    ) {
      return;
    }

    const checkOnboarding = async () => {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.profileCompleted === false) {
            router.push("/setup-profile");
          }
        }
      } catch (err) {
        console.warn("Client onboarding check failed with getDoc, falling back to server action:", err);
        try {
          const res = await getCurrentUserProfile();
          if (res.success && res.exists && res.data) {
            if (res.data.profileCompleted === false) {
              router.push("/setup-profile");
            }
          }
        } catch (e) {
          console.warn("Fallback onboarding check failed:", e);
        }
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

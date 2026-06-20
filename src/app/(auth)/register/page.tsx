"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase/clientApp";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import Link from "next/link";
import { createUserDocument } from "@/actions/auth.actions";
import { trackEvent } from "@/lib/analytics";
import { Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: fullName || username });
      await createUserDocument(
        result.user.uid,
        email,
        username.replace(/\s+/g, "").toLowerCase(),
        fullName || username
      );
      router.push("/");
    } catch (err: any) {
      let msg = err.message?.replace("Firebase: ", "").replace(/\(auth.*\)\.?/, "") || "Registration failed";
      if (err.code === "auth/email-already-in-use") msg = "This email already has an account.";
      setError(msg);
      trackEvent("auth_failure", { method: "email_register", error: err?.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      let result;
      if (Capacitor.isNativePlatform()) {
        const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
        try { await GoogleAuth.initialize(); } catch {}
        const user = await GoogleAuth.signIn();
        const credential = GoogleAuthProvider.credential(user.authentication.idToken);
        const { signInWithCredential } = await import("firebase/auth");
        result = await signInWithCredential(auth, credential);
      } else {
        const provider = new GoogleAuthProvider();
        result = await signInWithPopup(auth, provider);
      }
      await createUserDocument(
        result.user.uid,
        result.user.email || "",
        result.user.displayName?.replace(/\s+/g, "").toLowerCase() || result.user.uid.slice(0, 8),
        result.user.displayName || "Cinephile User"
      );
      router.push("/");
    } catch (err: any) {
      setError(err?.message || String(err));
      trackEvent("auth_failure", { method: "google_register", error: err?.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0a0d14]">
      {/* ── Left: Form Panel ─────────────────────────── */}
      <div className="flex flex-col items-center justify-center w-full lg:w-[480px] xl:w-[520px] px-8 py-12 lg:px-12 shrink-0">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/">
            <span
              className="text-[2.8rem] text-white leading-none select-none"
              style={{ fontFamily: "var(--font-script)" }}
            >
              cinephile
            </span>
          </Link>
        </div>

        <div className="w-full max-w-[360px]">
          <h1 className="text-2xl font-bold text-white mb-1">Create Account</h1>
          <p className="text-sm text-slate-400 mb-7">Join Cinephile today</p>

          {/* Google sign-in */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.1] text-sm font-semibold text-white hover:bg-white/[0.1] hover:border-white/[0.15] transition-all duration-200 mb-3 disabled:opacity-50"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative flex items-center mb-5">
            <div className="flex-1 border-t border-white/[0.08]" />
            <span className="mx-3 text-xs text-slate-500 font-medium">or</span>
            <div className="flex-1 border-t border-white/[0.08]" />
          </div>

          {/* Registration form */}
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Full Name
              </label>
              <input
                id="register-fullname"
                type="text"
                placeholder="Alex Turner"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.07] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                id="register-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.07] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <input
                id="register-username"
                type="text"
                placeholder="alexturner"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.07] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-white/[0.05] border border-white/[0.1] text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.07] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-medium">
                {error}
                {error.includes("already has an account") && (
                  <Link href="/login" className="ml-2 underline text-red-300">Sign in instead →</Link>
                )}
              </div>
            )}

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all duration-200 shadow-lg shadow-blue-600/20 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "Creating account..." : "Sign Up"}
            </button>
          </form>

          {/* Login link */}
          <p className="text-center text-xs text-slate-500 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
              Login
            </Link>
          </p>
        </div>
      </div>

      {/* ── Right: Cinematic Image Panel ─────────────── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1b2e] via-[#0a1628] to-[#050a10]" />
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-blue-600/8 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-indigo-600/6 rounded-full blur-[80px]" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-12 text-center">
          <div className="mb-8 opacity-25">
            <svg className="h-28 w-28 text-blue-300 mx-auto" fill="none" stroke="currentColor" strokeWidth={0.5} viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" />
              <circle cx="50" cy="50" r="30" />
              <circle cx="50" cy="50" r="10" fill="currentColor" opacity="0.5" />
              <line x1="50" y1="5" x2="50" y2="20" />
              <line x1="50" y1="80" x2="50" y2="95" />
              <line x1="5" y1="50" x2="20" y2="50" />
              <line x1="80" y1="50" x2="95" y2="50" />
            </svg>
          </div>
          <p className="text-xl font-light text-white/70 leading-relaxed max-w-xs mb-3">
            Track every film. Share your passion. Discover what to watch next.
          </p>
          <p className="text-sm text-slate-500">Join thousands of cinephiles today.</p>

          <div className="mt-12 grid grid-cols-3 gap-3 opacity-15">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-lg bg-white/10" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

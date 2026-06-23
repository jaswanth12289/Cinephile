"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import Link from "next/link";
import AnimatedLogo from "@/components/shared/AnimatedLogo";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
        try { await GoogleAuth.initialize(); } catch {}
        const googleUser = await GoogleAuth.signIn();
        const { error: signInError } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: googleUser.authentication.idToken,
        });
        if (signInError) throw signInError;
        router.push("/feed");
        router.refresh();
      } else {
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (oauthError) throw oauthError;
      }
    } catch (err: any) {
      setError(err?.message || String(err));
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) throw signUpError;
      alert("Success! Check your email for a confirmation link (if enabled), or try logging in.");
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || String(err));
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      router.push("/feed");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || String(err));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0a0d14]">
      {/* ── Left: Form Panel ─────────────────────────── */}
      <div className="flex flex-col items-center justify-center w-full lg:w-[480px] xl:w-[520px] px-8 py-12 lg:px-12 shrink-0 z-10">
        <div className="mb-10 text-center">
          <Link href="/">
            <AnimatedLogo className="text-[2.8rem]" />
          </Link>
        </div>

        <div className="w-full max-w-[360px] text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome</h1>
          <p className="text-sm text-slate-400 mb-10">Join the ultimate cinephile community</p>

          {/* Email/Password Form */}
          <form className="mb-6 space-y-4" onSubmit={handleEmailLogin}>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder:text-slate-500 focus:bg-white/[0.08] focus:border-white/20 focus:outline-none transition-all"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder:text-slate-500 focus:bg-white/[0.08] focus:border-white/20 focus:outline-none transition-all"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3.5 rounded-xl bg-white/10 border border-white/10 text-[14px] font-bold text-white hover:bg-white/15 transition-all shadow-lg disabled:opacity-50"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={handleEmailSignUp}
                disabled={loading}
                className="flex-1 py-3.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-[14px] font-bold text-blue-400 hover:bg-blue-600/30 transition-all shadow-lg disabled:opacity-50"
              >
                Sign Up
              </button>
            </div>
          </form>

          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Google sign-in */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl bg-white/[0.06] border border-white/[0.1] text-[15px] font-semibold text-white hover:bg-white/[0.1] hover:border-white/[0.15] transition-all duration-200 shadow-lg shadow-black/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="animate-pulse">Connecting...</span>
            ) : (
              <>
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {error && (
            <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-medium">
              {error}
            </div>
          )}
          
          <p className="mt-8 text-xs text-slate-500">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>

      {/* ── Right: Cinematic Image Panel ─────────────── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1b2e] via-[#0a1628] to-[#050a10]" />
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/8 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/6 rounded-full blur-[80px]" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-12 text-center">
          <div className="mb-8 opacity-30">
            <svg className="h-32 w-32 text-blue-300 mx-auto" fill="none" stroke="currentColor" strokeWidth={0.5} viewBox="0 0 100 100">
              <rect x="5" y="20" width="90" height="65" rx="4" />
              <line x1="5" y1="35" x2="95" y2="35" />
              <line x1="5" y1="70" x2="95" y2="70" />
              <line x1="25" y1="20" x2="25" y2="85" />
              <line x1="75" y1="20" x2="75" y2="85" />
              <rect x="30" y="40" width="40" height="25" rx="2" fill="currentColor" opacity="0.3" />
              <circle cx="15" cy="12" r="4" />
              <circle cx="85" cy="12" r="4" />
              <circle cx="15" cy="92" r="4" />
              <circle cx="85" cy="92" r="4" />
            </svg>
          </div>
          <blockquote className="max-w-sm">
            <p className="text-2xl font-light text-white/80 leading-relaxed italic mb-4">
              &ldquo;Cinema is a mirror by which we often see ourselves.&rdquo;
            </p>
            <cite className="text-sm text-slate-500 not-italic">— Martin Scorsese</cite>
          </blockquote>
        </div>
      </div>
    </div>
  );
}

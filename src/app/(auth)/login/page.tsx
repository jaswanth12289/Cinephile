"use client";

import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase/clientApp";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Capacitor } from "@capacitor/core";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { createUserDocument } from "@/actions/auth.actions";
import { trackEvent } from "@/lib/analytics";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isCapacitor, setIsCapacitor] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsCapacitor(Capacitor.isNativePlatform());
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
      trackEvent("auth_failure", { method: "email", error: err?.message || String(err) });
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
        try {
          await GoogleAuth.initialize();
        } catch (e) {
          // Already initialized or configured
        }
        const user = await GoogleAuth.signIn();
        const credential = GoogleAuthProvider.credential(user.authentication.idToken);
        const { signInWithCredential } = await import("firebase/auth");
        result = await signInWithCredential(auth, credential);
      } else {
        const provider = new GoogleAuthProvider();
        result = await signInWithPopup(auth, provider);
      }

      // Ensure user document exists
      await createUserDocument(
        result.user.uid,
        result.user.email || "",
        result.user.displayName?.replace(/\s+/g, '').toLowerCase() || result.user.uid.slice(0,8),
        result.user.displayName || "Cinephile User"
      );
      router.push("/");
    } catch (err: any) {
      setError(err?.message || String(err));
      trackEvent("auth_failure", { method: "google", error: err?.message || String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
         <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>Enter your email to sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
          
          <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={loading}>
            Google
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 text-sm text-center">
          <div className="text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

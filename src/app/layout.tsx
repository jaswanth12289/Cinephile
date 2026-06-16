import type { Metadata } from "next";
import { Inter, Great_Vibes, Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { DensityProvider } from "@/components/providers/DensityProvider";
import { PwaInstallBanner } from "@/components/shared/PwaInstallBanner";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { CapacitorHandler } from "@/components/shared/CapacitorHandler";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-script",
});

export const metadata: Metadata = {
  title: "Cinephile",
  description: "A social platform for movie and TV enthusiasts.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cinephile",
  },
};

import { Suspense } from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="theme-color" content="#0F0F1A" />
      </head>
      <body className={`${inter.variable} ${outfit.variable} ${greatVibes.variable} ${inter.className}`}>
        <AuthProvider>
          <DensityProvider>
            <ErrorBoundary>
              <Suspense fallback={null}>
                <CapacitorHandler />
              </Suspense>
              <OfflineBanner />
              {children}
              <PwaInstallBanner />
            </ErrorBoundary>
          </DensityProvider>
        </AuthProvider>
      </body>
    </html>
  );
}



import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { PwaInstallBanner } from "@/components/shared/PwaInstallBanner";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <PwaInstallBanner />
        </AuthProvider>
      </body>
    </html>
  );
}

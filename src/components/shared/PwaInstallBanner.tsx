"use client";

import React, { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function PwaInstallBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    // 1. Check if the user previously dismissed the PWA prompt
    const isDismissed = localStorage.getItem("pwa_dismissed") === "true";
    if (isDismissed) return;

    // 2. Listen to beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    // 3. Listen to appinstalled event
    const handleAppInstalled = () => {
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setShowBanner(false);
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.warn("PWA installation prompt failed:", err);
    }
  };

  const handleDismissClick = () => {
    setShowBanner(false);
    localStorage.setItem("pwa_dismissed", "true");
  };

  return (
    <AnimatePresence>
      {showBanner && deferredPrompt && (
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 50, scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed bottom-[76px] left-3 right-3 md:bottom-6 md:right-6 md:left-auto md:w-80 bg-zinc-950/95 border border-zinc-800 rounded-2xl shadow-2xl p-4 flex items-center justify-between gap-4 z-50 backdrop-blur-md"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 select-none">
              <Download className="h-4.5 w-4.5 animate-bounce" />
            </div>
            <div className="min-w-0">
              <h4 className="text-[13px] font-black text-white uppercase tracking-wider">
                Install Cinephile
              </h4>
              <p className="text-[11px] text-zinc-400 font-medium truncate">
                Get home screen access and quick feeds.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="default"
              onClick={handleInstallClick}
              className="text-[11px] font-black uppercase tracking-wider rounded-xl h-11 px-4"
            >
              Install
            </Button>
            <button
              onClick={handleDismissClick}
              aria-label="Dismiss install promotion"
              className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

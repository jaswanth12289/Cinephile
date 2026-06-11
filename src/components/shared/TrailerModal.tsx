"use client";

import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

interface TrailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  youtubeKey: string;
  title: string;
}

export function TrailerModal({ isOpen, onClose, youtubeKey, title }: TrailerModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-md cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-full max-w-5xl aspect-video rounded-2xl border border-white/10 bg-card overflow-hidden shadow-2xl z-10"
          >
            {/* Header / Info bar */}
            <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between text-white z-20 pointer-events-none">
              <span className="text-[14px] md:text-[16px] font-black tracking-wide drop-shadow-md select-none pointer-events-auto">
                {title} — Official Trailer
              </span>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-full bg-black/40 hover:bg-black/80 border border-white/10 flex items-center justify-center text-white/80 hover:text-white pointer-events-auto transition-colors"
                aria-label="Close trailer modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Youtube iframe */}
            <div className="w-full h-full bg-black flex items-center justify-center">
              <iframe
                src={`https://www.youtube.com/embed/${youtubeKey}?autoplay=1&rel=0`}
                title={`${title} Trailer`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { motion, Variants } from 'framer-motion';

const letters = "cinephile".split("");

const container: Variants = { 
  hidden: { opacity: 0 }, 
  visible: { 
    opacity: 1, 
    transition: { staggerChildren: 0.1, delayChildren: 0.1 } 
  } 
};

const letterAnim: Variants = { 
  hidden: { opacity: 0, y: 20 }, 
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring", stiffness: 300 } 
  } 
};

export default function AnimatedLogo({ className = "text-[2.8rem]" }: { className?: string }) {
  return (
    <motion.h1 
      variants={container} 
      initial="hidden" 
      animate="visible" 
      className={`leading-none select-none text-white overflow-visible ${className}`}
      style={{ fontFamily: "var(--font-script)" }}
      aria-label="Cinephile"
    >
      {letters.map((char, i) => (
        <motion.span key={i} variants={letterAnim} className="inline-block">
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </motion.h1>
  );
}

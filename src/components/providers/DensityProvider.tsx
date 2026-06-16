"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type DensityMode = "comfortable" | "compact";

interface DensityContextType {
  density: DensityMode;
  setDensity: (mode: DensityMode) => void;
}

const DensityContext = createContext<DensityContextType | undefined>(undefined);

export function DensityProvider({ children }: { children: React.ReactNode }) {
  const [density, setDensity] = useState<DensityMode>("comfortable");

  useEffect(() => {
    const checkViewport = () => {
      if (window.innerWidth < 768) {
        setDensity("compact");
      } else {
        setDensity("comfortable");
      }
    };
    
    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  return (
    <DensityContext.Provider value={{ density, setDensity }}>
      {children}
    </DensityContext.Provider>
  );
}

export function useDensity() {
  const context = useContext(DensityContext);
  if (!context) {
    // Return a fallback to prevent crash if rendered outside provider
    return { density: "comfortable" as DensityMode, setDensity: () => {} };
  }
  return context;
}

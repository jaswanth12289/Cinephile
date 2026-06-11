"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface SafeAvatarProps {
  src: string | null | undefined;
  alt: string;
  name: string;
  size?: number;
  className?: string;
  textClassName?: string;
}

export function SafeAvatar({
  src,
  alt,
  name,
  size = 40,
  className,
  textClassName,
}: SafeAvatarProps) {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  const initial = name ? name.trim().charAt(0).toUpperCase() : "U";

  if (!src || error) {
    return (
      <div
        className={cn(
          "rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black uppercase select-none shrink-0",
          className
        )}
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        <span className={textClassName}>{initial}</span>
      </div>
    );
  }

  return (
    <div
      className={cn("relative rounded-full overflow-hidden shrink-0 border border-white/5", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={`${size}px`}
        className="object-cover h-full w-full"
        onError={() => setError(true)}
      />
    </div>
  );
}

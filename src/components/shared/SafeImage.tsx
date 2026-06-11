"use client";

import { useState, useEffect } from "react";
import Image, { ImageProps } from "next/image";
import { trackEvent } from "@/lib/analytics";

interface SafeImageProps extends Omit<ImageProps, "onError"> {
  fallbackSrc?: string;
}

export function SafeImage({ src, fallbackSrc = "/placeholder-poster.svg", alt, ...props }: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState<any>(src);

  useEffect(() => {
    setImgSrc(src);
  }, [src]);

  return (
    <Image
      {...props}
      src={imgSrc}
      alt={alt}
      onError={() => {
        trackEvent("image_failure", { src: String(src) });
        setImgSrc(fallbackSrc);
      }}
    />
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Image, { ImageProps } from "next/image";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";

interface CachedImageProps extends Omit<ImageProps, "src"> {
  src: string | null;
  fallbackSrc?: string;
  cacheEnabled?: boolean;
}

export function CachedImage({
  src,
  alt,
  fallbackSrc = "/placeholder-poster.svg",
  cacheEnabled = false,
  className,
  ...props
}: CachedImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(fallbackSrc);

  useEffect(() => {
    if (!src) {
      setImgSrc(fallbackSrc);
      return;
    }

    if (!cacheEnabled || !Capacitor.isNativePlatform()) {
      setImgSrc(src);
      return;
    }

    let isMounted = true;

    async function loadCachedImage() {
      try {
        if (!src) return;
        const filename = src.split("/").pop() || `img_${Date.now()}`;
        const filePath = `cinephile_cache/${filename}`;

        try {
          const result = await Filesystem.getUri({
            directory: Directory.Data,
            path: filePath,
          });
          if (isMounted) {
            setImgSrc(Capacitor.convertFileSrc(result.uri));
          }
          return;
        } catch (e) {
          // File doesn't exist, proceed to cache
        }

        const response = await fetch(src);
        const blob = await response.blob();

        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          const base64Content = base64data.split(",")[1];

          try {
            await Filesystem.mkdir({
              directory: Directory.Data,
              path: "cinephile_cache",
              recursive: true,
            });
          } catch (e) {}

          await Filesystem.writeFile({
            directory: Directory.Data,
            path: filePath,
            data: base64Content,
          });

          const finalResult = await Filesystem.getUri({
            directory: Directory.Data,
            path: filePath,
          });
          if (isMounted) {
            setImgSrc(Capacitor.convertFileSrc(finalResult.uri));
          }
        };
      } catch (err) {
        console.warn("CachedImage error:", err);
        if (isMounted) {
          setImgSrc(src || fallbackSrc);
        }
      }
    }

    loadCachedImage();

    return () => {
      isMounted = false;
    };
  }, [src, fallbackSrc, cacheEnabled]);

  return (
    <Image
      src={imgSrc}
      alt={alt}
      className={className}
      onError={() => setImgSrc(fallbackSrc)}
      {...props}
    />
  );
}

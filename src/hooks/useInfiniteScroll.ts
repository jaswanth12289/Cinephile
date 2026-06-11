import { useEffect, useRef, useCallback } from "react";

interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
  disabled?: boolean;
}

export function useInfiniteScroll(
  callback: () => void,
  options: UseInfiniteScrollOptions = {}
) {
  const { threshold = 0.1, rootMargin = "100px", disabled = false } = options;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);

  const observerCallback = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && !disabled) {
        callback();
      }
    },
    [callback, disabled]
  );

  useEffect(() => {
    if (disabled) return;

    const currentTrigger = triggerRef.current;
    if (!currentTrigger) return;

    const observer = new IntersectionObserver(observerCallback, {
      threshold,
      rootMargin,
    });
    
    observer.observe(currentTrigger);
    observerRef.current = observer;

    return () => {
      if (observerRef.current && currentTrigger) {
        observerRef.current.unobserve(currentTrigger);
      }
    };
  }, [observerCallback, threshold, rootMargin, disabled]);

  return triggerRef;
}

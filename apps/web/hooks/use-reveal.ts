"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Adds a `data-revealed="true"` attribute to the returned ref's
 * element once it enters the viewport. Used by the landing page
 * sections to trigger CSS scroll-reveal transitions without pulling
 * in a heavy animation library.
 *
 * The hook fires only once (one-shot) — repeated scrolling past the
 * element doesn't toggle it back off.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible } as const;
}

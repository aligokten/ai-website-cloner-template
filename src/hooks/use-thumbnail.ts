"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { renderThumbnail } from "@/lib/three/export";
import type { ModelSpec } from "@/types";

function specKey(spec: ModelSpec | null, size: number) {
  if (!spec) return "none";
  return `${spec.seed}:${spec.style}:${spec.topology}:${spec.polycount}:${spec.textured}:${spec.palette.join("")}:${size}`;
}

/** Render a 3D thumbnail lazily, once the card scrolls into view. */
export function useThumbnail(spec: ModelSpec | null, size = 320) {
  const ref = useRef<HTMLDivElement>(null);
  const key = specKey(spec, size);
  const [rendered, setRendered] = useState<{ key: string; src: string } | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !spec) return;

    let cancelled = false;
    const render = () => {
      // Deferred to the next frame so a grid of cards never blocks input.
      requestAnimationFrame(() => {
        if (cancelled) return;
        const src = renderThumbnail(spec, size);
        if (src) setRendered({ key, src });
      });
    };

    if (typeof IntersectionObserver === "undefined") {
      render();
      return () => {
        cancelled = true;
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          render();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [spec, size, key]);

  // A stale render from a previous spec is discarded rather than shown.
  const src = useMemo(
    () => (rendered && rendered.key === key ? rendered.src : null),
    [rendered, key],
  );

  return { ref, src };
}

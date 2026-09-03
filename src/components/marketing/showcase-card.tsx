"use client";

import { Download, Heart } from "lucide-react";
import { useMemo } from "react";
import { useThumbnail } from "@/hooks/use-thumbnail";
import { generateModelSpec } from "@/lib/model-spec";
import type { ShowcaseItem } from "@/lib/showcase";
import { cn } from "@/lib/utils";

export function ShowcaseCard({
  item,
  onOpen,
  className,
}: {
  item: ShowcaseItem;
  onOpen?: (item: ShowcaseItem) => void;
  className?: string;
}) {
  const spec = useMemo(
    () => generateModelSpec({ prompt: item.prompt, style: item.style, polycount: 16_000 }),
    [item.prompt, item.style],
  );
  const { ref, src } = useThumbnail(spec, 360);

  return (
    <button
      type="button"
      onClick={() => onOpen?.(item)}
      className={cn(
        "group surface-card overflow-hidden text-left transition-all hover:-translate-y-0.5 hover:border-brand/40",
        className,
      )}
    >
      <div
        ref={ref}
        className="relative aspect-square overflow-hidden bg-[radial-gradient(110%_90%_at_50%_0%,color-mix(in_oklab,var(--brand)_16%,transparent),transparent_65%)]"
        style={{
          backgroundColor: `color-mix(in oklab, ${spec.palette[0]} 12%, transparent)`,
        }}
      >
        {src ? (
          // A generated data URL, so next/image optimization does not apply.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={`${item.name} — 3D preview`}
            className="size-full object-contain transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="size-full animate-pulse bg-surface-2/40" />
        )}
        <span className="absolute left-3 top-3 rounded-md border border-border bg-background/70 px-2 py-0.5 text-[0.65rem] capitalize backdrop-blur">
          {item.style.replace("-", " ")}
        </span>
      </div>

      <div className="p-4">
        <h3 className="truncate text-sm font-semibold">{item.name}</h3>
        <p className="mt-1 truncate text-xs text-muted-foreground">{item.prompt}</p>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate">@{item.author}</span>
          <span className="flex shrink-0 items-center gap-3">
            <span className="flex items-center gap-1">
              <Heart className="size-3" />
              {item.likes.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Download className="size-3" />
              {item.downloads.toLocaleString()}
            </span>
          </span>
        </div>
      </div>
    </button>
  );
}

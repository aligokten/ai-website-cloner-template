"use client";

import { Copy, Download, Heart, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useThumbnail } from "@/hooks/use-thumbnail";
import { EXPORT_FORMATS, type ExportFormat } from "@/lib/three/export";
import { cn } from "@/lib/utils";
import type { Asset } from "@/types";

interface AssetPanelProps {
  assets: Asset[];
  activeId: string | null;
  onSelect: (asset: Asset) => void;
  onRename: (id: string, name: string) => void;
  onFavorite: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (format: ExportFormat) => void;
  exporting: boolean;
  canExport: boolean;
  exportMessage: string | null;
}

export function AssetPanel({
  assets,
  activeId,
  onSelect,
  onRename,
  onFavorite,
  onDuplicate,
  onDelete,
  onExport,
  exporting,
  canExport,
  exportMessage,
}: AssetPanelProps) {
  const [format, setFormat] = useState<ExportFormat>("glb");
  const active = assets.find((asset) => asset.id === activeId) ?? null;

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-surface p-4">
      <div>
        <h2 className="text-sm font-semibold">Export</h2>
        <div className="mt-2 space-y-2">
          <select
            value={format}
            onChange={(event) => setFormat(event.target.value as ExportFormat)}
            aria-label="Export format"
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-brand"
          >
            {EXPORT_FORMATS.map((option) => (
              <option key={option.id} value={option.id}>
                .{option.extension} — {option.label}
              </option>
            ))}
          </select>
          <Button
            variant="soft"
            size="lg"
            className="w-full"
            disabled={!canExport || exporting}
            onClick={() => onExport(format)}
          >
            <Download />
            {exporting ? "Preparing…" : "Download model"}
          </Button>
          <p className="text-[0.7rem] text-muted-foreground">
            {exportMessage ??
              (EXPORT_FORMATS.find((option) => option.id === format)?.hint ?? "")}
          </p>
        </div>
      </div>

      {active ? (
        <div className="border-t border-border pt-4">
          <h2 className="text-sm font-semibold">Current asset</h2>
          <input
            value={active.name}
            onChange={(event) => onRename(active.id, event.target.value.slice(0, 60))}
            aria-label="Asset name"
            className="mt-2 w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-brand"
          />
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{active.prompt}</p>
          <div className="mt-3 flex gap-1.5">
            <Button
              variant={active.favorite ? "brand" : "soft"}
              size="sm"
              onClick={() => onFavorite(active.id)}
            >
              <Heart />
              {active.favorite ? "Saved" : "Save"}
            </Button>
            <Button variant="soft" size="sm" onClick={() => onDuplicate(active.id)}>
              <Copy />
              Duplicate
            </Button>
            <Button variant="destructive" size="sm" onClick={() => onDelete(active.id)}>
              <Trash2 />
              Delete
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col border-t border-border pt-4">
        <h2 className="text-sm font-semibold">
          Library <span className="text-muted-foreground">({assets.length})</span>
        </h2>
        {assets.length ? (
          <div className="mt-3 grid min-h-0 flex-1 auto-rows-min content-start grid-cols-2 gap-2 overflow-y-auto pr-1">
            {assets.map((asset) => (
              <LibraryCard
                key={asset.id}
                asset={asset}
                active={asset.id === activeId}
                onSelect={() => onSelect(asset)}
              />
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            Generated models land here and stay in this browser.
          </p>
        )}
      </div>
    </div>
  );
}

function LibraryCard({
  asset,
  active,
  onSelect,
}: {
  asset: Asset;
  active: boolean;
  onSelect: () => void;
}) {
  const { ref, src } = useThumbnail(asset.spec ?? null, 200);
  const preview = src ?? asset.thumbnailUrl ?? null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "overflow-hidden rounded-xl border text-left transition-colors",
        active ? "border-brand" : "border-border hover:border-brand/40",
      )}
    >
      <div ref={ref} className="relative aspect-square bg-background">
        {preview ? (
          // Generated in-browser or hosted by the provider — not a static asset.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={asset.name} className="size-full object-contain" />
        ) : (
          <div className="size-full animate-pulse bg-surface-2/40" />
        )}
        {asset.favorite ? (
          <Heart className="absolute right-1.5 top-1.5 size-3 fill-brand text-brand" />
        ) : null}
      </div>
      <p className="truncate px-2 py-1.5 text-[0.7rem]">{asset.name}</p>
    </button>
  );
}

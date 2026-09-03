"use client";

import { ArrowUpRight, Download, Heart, Search, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ShowcaseCard } from "@/components/marketing/showcase-card";
import { ModelViewer, type ModelStats } from "@/components/three/model-viewer";
import { Button } from "@/components/ui/button";
import { generateModelSpec } from "@/lib/model-spec";
import { SHOWCASE, SHOWCASE_CATEGORIES, type ShowcaseItem } from "@/lib/showcase";
import { exportSpec, EXPORT_FORMATS, type ExportFormat } from "@/lib/three/export";
import { cn } from "@/lib/utils";

type SortKey = "popular" | "downloads" | "newest";

const SORTS: Array<{ id: SortKey; label: string }> = [
  { id: "popular", label: "Most liked" },
  { id: "downloads", label: "Most downloaded" },
  { id: "newest", label: "Newest" },
];

export function DiscoverGallery() {
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState<SortKey>("popular");
  // Deep link support: /discover?item=sc-03 opens that model on first paint.
  const [active, setActive] = useState<ShowcaseItem | null>(
    () => SHOWCASE.find((item) => item.id === params.get("item")) ?? null,
  );

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = SHOWCASE.filter((item) => {
      const matchesCategory = category === "All" || item.category === category;
      const matchesQuery =
        !needle ||
        item.name.toLowerCase().includes(needle) ||
        item.prompt.toLowerCase().includes(needle) ||
        item.author.toLowerCase().includes(needle) ||
        item.style.includes(needle);
      return matchesCategory && matchesQuery;
    });
    const sorted = [...filtered];
    if (sort === "popular") sorted.sort((a, b) => b.likes - a.likes);
    if (sort === "downloads") sorted.sort((a, b) => b.downloads - a.downloads);
    if (sort === "newest") sorted.reverse();
    return sorted;
  }, [query, category, sort]);

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search prompts, creators, styles…"
            aria-label="Search the gallery"
            className="h-11 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-brand focus:ring-3 focus:ring-brand/25"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {SORTS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setSort(option.id)}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs transition-colors",
                sort === option.id
                  ? "border-brand bg-brand/15 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {SHOWCASE_CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              category === item
                ? "border-brand bg-brand/15 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        {results.length} {results.length === 1 ? "model" : "models"}
      </p>

      {results.length ? (
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {results.map((item) => (
            <ShowcaseCard key={item.id} item={item} onOpen={setActive} />
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-16 text-center">
          <p className="text-sm text-muted-foreground">
            Nothing matches “{query}”. Try a different prompt or clear the filters.
          </p>
          <Button
            variant="soft"
            size="lg"
            className="mt-4"
            onClick={() => {
              setQuery("");
              setCategory("All");
            }}
          >
            Reset filters
          </Button>
        </div>
      )}

      {active ? <DetailDialog item={active} onClose={() => setActive(null)} /> : null}
    </>
  );
}

function DetailDialog({ item, onClose }: { item: ShowcaseItem; onClose: () => void }) {
  const spec = useMemo(
    () => generateModelSpec({ prompt: item.prompt, style: item.style, polycount: 40_000 }),
    [item.prompt, item.style],
  );
  const [stats, setStats] = useState<ModelStats | null>(null);
  const [format, setFormat] = useState<ExportFormat>("glb");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportSpec(spec, format, item.name);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
      className="fixed inset-0 z-[60] grid place-items-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="surface-card grid max-h-[90vh] w-full max-w-4xl overflow-hidden lg:grid-cols-[1.4fr_1fr]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative min-h-[320px] bg-[radial-gradient(110%_90%_at_50%_0%,color-mix(in_oklab,var(--brand)_16%,transparent),transparent_65%)] lg:min-h-[480px]">
          <ModelViewer spec={spec} autoRotate className="absolute inset-0" onStats={setStats} />
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{item.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">by @{item.author}</p>
            </div>
            <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={onClose}>
              <X />
            </Button>
          </div>

          <p className="rounded-xl border border-border bg-background p-3 text-sm leading-relaxed text-muted-foreground">
            “{item.prompt}”
          </p>

          <dl className="grid grid-cols-2 gap-2 text-sm">
            <Stat label="Style" value={item.style.replace("-", " ")} />
            <Stat label="Category" value={item.category} />
            <Stat label="Triangles" value={stats ? stats.triangles.toLocaleString() : "…"} />
            <Stat label="Vertices" value={stats ? stats.vertices.toLocaleString() : "…"} />
          </dl>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Heart className="size-4" /> {item.likes.toLocaleString()}
            </span>
            <span className="flex items-center gap-1.5">
              <Download className="size-4" /> {item.downloads.toLocaleString()}
            </span>
          </div>

          <div className="mt-auto space-y-2">
            <div className="flex gap-2">
              <select
                value={format}
                onChange={(event) => setFormat(event.target.value as ExportFormat)}
                aria-label="Export format"
                className="h-11 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-brand"
              >
                {EXPORT_FORMATS.map((option) => (
                  <option key={option.id} value={option.id}>
                    .{option.extension} — {option.label}
                  </option>
                ))}
              </select>
              <Button variant="soft" size="xl" disabled={exporting} onClick={() => void handleExport()}>
                <Download />
                {exporting ? "Exporting…" : "Download"}
              </Button>
            </div>
            <Button
              variant="brand"
              size="xl"
              className="w-full"
              render={
                <Link
                  href={`/workspace?prompt=${encodeURIComponent(item.prompt)}&style=${item.style}`}
                >
                  Remix in workspace
                  <ArrowUpRight />
                </Link>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <dt className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium capitalize">{value}</dd>
    </div>
  );
}

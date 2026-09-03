"use client";

import { ArrowRight, Box, Loader2, RotateCw, Shuffle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ModelViewer, type ModelStats } from "@/components/three/model-viewer";
import { Button } from "@/components/ui/button";
import { startJob, trackJob } from "@/lib/generate-client";
import { generateModelSpec } from "@/lib/model-spec";
import { cn } from "@/lib/utils";
import type { ArtStyle, ModelSpec } from "@/types";

const STYLES: Array<{ id: ArtStyle; label: string }> = [
  { id: "realistic", label: "Realistic" },
  { id: "cartoon", label: "Cartoon" },
  { id: "low-poly", label: "Low poly" },
  { id: "voxel", label: "Voxel" },
  { id: "sculpture", label: "Sculpture" },
];

const SUGGESTIONS = [
  "battle-worn steel robot sentinel with orange visor",
  "cyan ice dragon creature with crystal scales",
  "low poly neon magenta racing car",
  "cozy wooden cabin house with snow roof",
  "obsidian katana sword with gold hilt",
  "white astronaut character with gold visor",
];

const DEFAULT_PROMPT = SUGGESTIONS[0];

export function HeroGenerator() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [style, setStyle] = useState<ArtStyle>("realistic");
  const [spec, setSpec] = useState<ModelSpec | null>(null);
  const [stats, setStats] = useState<ModelStats | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  // Seed the canvas immediately so the hero is never an empty box.
  useEffect(() => {
    setSpec(generateModelSpec({ prompt: DEFAULT_PROMPT, style: "realistic", polycount: 24_000 }));
  }, []);

  useEffect(() => () => cancelRef.current?.(), []);

  const generate = useCallback(
    async (nextPrompt: string, nextStyle: ArtStyle) => {
      const trimmed = nextPrompt.trim();
      if (trimmed.length < 2) {
        setError("Describe what you want to build first.");
        return;
      }
      cancelRef.current?.();
      setBusy(true);
      setError(null);
      setProgress(0);
      setStage("Queued");

      try {
        const job = await startJob({
          mode: "text-to-3d",
          prompt: trimmed,
          style: nextStyle,
          polycount: 24_000,
        });
        const tracker = trackJob(job, ({ progress: value, stage: label }) => {
          setProgress(value);
          setStage(label);
        });
        cancelRef.current = tracker.cancel;
        const result = await tracker.promise;
        if (result.spec) setSpec(result.spec);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Generation failed.");
      } finally {
        cancelRef.current = null;
        setBusy(false);
      }
    },
    [],
  );

  const shuffle = () => {
    const next = SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)];
    setPrompt(next);
    void generate(next, style);
  };

  return (
    <div className="surface-card overflow-hidden p-2 shadow-2xl shadow-black/30">
      <div className="grid gap-2 lg:grid-cols-[1fr_380px]">
        <div className="relative min-h-[380px] overflow-hidden rounded-xl bg-[radial-gradient(120%_100%_at_50%_0%,color-mix(in_oklab,var(--brand)_18%,transparent),transparent_60%)] sm:min-h-[460px]">
          <ModelViewer spec={spec} autoRotate className="absolute inset-0" onStats={setStats} />

          <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap items-center gap-2 text-[0.7rem]">
            <span className="rounded-full border border-border bg-background/70 px-2.5 py-1 font-mono backdrop-blur">
              {stats ? `${stats.triangles.toLocaleString()} tris` : "—"}
            </span>
            <span className="rounded-full border border-border bg-background/70 px-2.5 py-1 font-mono backdrop-blur">
              {stats ? `${stats.vertices.toLocaleString()} verts` : "—"}
            </span>
            <span className="rounded-full border border-border bg-background/70 px-2.5 py-1 font-mono capitalize backdrop-blur">
              {spec?.style ?? "—"}
            </span>
          </div>

          <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-border bg-background/70 px-3 py-1 text-[0.7rem] text-muted-foreground backdrop-blur">
            Drag to orbit · scroll to zoom
          </span>

          {busy ? (
            <div className="absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-sm">
              <div className="w-64 text-center">
                <Loader2 className="mx-auto size-6 animate-spin text-brand" />
                <p className="mt-3 text-sm font-medium">{stage}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand to-brand-2 transition-[width] duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 font-mono text-xs text-muted-foreground">{progress}%</p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 p-4">
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="hero-prompt" className="text-sm font-medium">
                Describe your model
              </label>
              <button
                type="button"
                onClick={shuffle}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <Shuffle className="size-3" /> Surprise me
              </button>
            </div>
            <textarea
              id="hero-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={3}
              maxLength={600}
              placeholder="a mossy stone golem with glowing green runes"
              className="mt-2 w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-brand focus:ring-3 focus:ring-brand/25"
            />
          </div>

          <div>
            <p className="text-sm font-medium">Art style</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {STYLES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setStyle(option.id)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                    style === option.id
                      ? "border-brand bg-brand/15 text-foreground"
                      : "border-border text-muted-foreground hover:border-brand/40 hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="mt-auto space-y-2">
            <Button
              variant="brand"
              size="xl"
              className="w-full"
              disabled={busy}
              onClick={() => void generate(prompt, style)}
            >
              {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {busy ? "Generating…" : "Generate in 3D"}
            </Button>
            <Button
              variant="soft"
              size="xl"
              className="w-full"
              render={
                <Link href={`/workspace?prompt=${encodeURIComponent(prompt)}&style=${style}`}>
                  <Box />
                  Open in workspace
                  <ArrowRight />
                </Link>
              }
            />
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <RotateCw className="size-3" />
              Real generation, no sign-up — 20 credits per model
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import {
  Boxes,
  Grid3x3,
  Loader2,
  Play,
  RefreshCw,
  Sun,
} from "lucide-react";
import { ModelViewer, type ModelStats } from "@/components/three/model-viewer";
import { cn } from "@/lib/utils";
import type { AnimationPreset, ModelSpec } from "@/types";

const ENVIRONMENTS = ["studio", "sunset", "night"] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

const ANIMATIONS: Array<{ id: AnimationPreset; label: string }> = [
  { id: "none", label: "None" },
  { id: "idle", label: "Idle" },
  { id: "walk", label: "Walk" },
  { id: "spin", label: "Spin" },
  { id: "bounce", label: "Bounce" },
];

interface ViewportProps {
  spec: ModelSpec | null;
  modelUrl?: string | null;
  onLoadError?: (message: string) => void;
  stats: ModelStats | null;
  onStats: (stats: ModelStats) => void;
  wireframe: boolean;
  onWireframe: (value: boolean) => void;
  autoRotate: boolean;
  onAutoRotate: (value: boolean) => void;
  environment: Environment;
  onEnvironment: (value: Environment) => void;
  animation: AnimationPreset;
  onAnimation: (value: AnimationPreset) => void;
  busy: boolean;
  progress: number;
  stage: string;
}

export function Viewport({
  spec,
  modelUrl = null,
  onLoadError,
  stats,
  onStats,
  wireframe,
  onWireframe,
  autoRotate,
  onAutoRotate,
  environment,
  onEnvironment,
  animation,
  onAnimation,
  busy,
  progress,
  stage,
}: ViewportProps) {
  return (
    <div className="relative flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-[radial-gradient(120%_100%_at_50%_0%,color-mix(in_oklab,var(--brand)_12%,transparent),transparent_60%)]">
      <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-center justify-between gap-2 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Toggle active={wireframe} onClick={() => onWireframe(!wireframe)} label="Wireframe">
            <Grid3x3 className="size-3.5" />
          </Toggle>
          <Toggle active={autoRotate} onClick={() => onAutoRotate(!autoRotate)} label="Auto-rotate">
            <RefreshCw className="size-3.5" />
          </Toggle>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-background/70 p-0.5 backdrop-blur">
            <Sun className="ml-1.5 size-3.5 text-muted-foreground" />
            {ENVIRONMENTS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onEnvironment(option)}
                className={cn(
                  "rounded-md px-2 py-1 text-[0.7rem] capitalize transition-colors",
                  environment === option
                    ? "bg-brand/20 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-background/70 p-0.5 backdrop-blur">
          <Play className="ml-1.5 size-3.5 text-muted-foreground" />
          {ANIMATIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onAnimation(option.id)}
              className={cn(
                "rounded-md px-2 py-1 text-[0.7rem] transition-colors",
                animation === option.id
                  ? "bg-brand/20 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {spec || modelUrl ? (
        <ModelViewer
          spec={spec}
          modelUrl={modelUrl}
          onLoadError={onLoadError}
          animation={animation}
          wireframe={wireframe}
          autoRotate={autoRotate}
          environment={environment}
          onStats={onStats}
          className="absolute inset-0"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center px-6 text-center">
          <div>
            <Boxes className="mx-auto size-10 text-muted-foreground/60" />
            <p className="mt-4 text-sm font-medium">No model loaded</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Describe something on the left and hit generate.
            </p>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-2 p-3 text-[0.7rem]">
        <div className="flex flex-wrap gap-1.5">
          <Chip>{stats ? `${stats.triangles.toLocaleString()} tris` : "— tris"}</Chip>
          <Chip>{stats ? `${stats.vertices.toLocaleString()} verts` : "— verts"}</Chip>
          <Chip>{spec ? spec.topology : "—"}</Chip>
          <Chip>{spec ? spec.style.replace("-", " ") : "—"}</Chip>
        </div>
        <Chip>Drag to orbit · scroll to zoom · right-drag to pan</Chip>
      </div>

      {busy ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-background/75 backdrop-blur-sm">
          <div className="w-72 text-center">
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
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-border bg-background/70 px-2 py-1 font-mono text-muted-foreground backdrop-blur">
      {children}
    </span>
  );
}

function Toggle({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/70 px-2.5 py-1.5 text-[0.7rem] backdrop-blur transition-colors",
        active ? "text-foreground ring-1 ring-brand/50" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      {label}
    </button>
  );
}

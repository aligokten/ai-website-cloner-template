"use client";

import { AlertCircle, Coins, History, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AssetPanel } from "@/components/workspace/asset-panel";
import { ModulePanel, type SubmitPayload } from "@/components/workspace/module-panel";
import { Viewport, type Environment } from "@/components/workspace/viewport";
import type { ModelStats } from "@/components/three/model-viewer";
import { useCredits } from "@/hooks/use-credits";
import { useLibrary } from "@/hooks/use-library";
import { startJob, trackJob } from "@/lib/generate-client";
import { PLANS, type PlanId } from "@/lib/pricing";
import { exportSpec, type ExportFormat } from "@/lib/three/export";
import { cn } from "@/lib/utils";
import type { AnimationPreset, ArtStyle, Asset, ModelSpec, TaskMode } from "@/types";

interface HistoryEntry {
  id: string;
  label: string;
  mode: TaskMode;
  credits: number;
  at: number;
  status: "succeeded" | "failed";
}

const MODE_LABEL: Record<TaskMode, string> = {
  "text-to-3d": "Text to 3D",
  "image-to-3d": "Image to 3D",
  texture: "AI texturing",
  remesh: "Remesh",
  animate: "Animate",
};

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function nameFor(prompt: string) {
  const words = prompt.trim().split(/\s+/).slice(0, 4).join(" ");
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Untitled model";
}

export function Workspace() {
  const params = useSearchParams();
  const { credits, hydrated: creditsReady, spend, refund, setPlan } = useCredits();
  const library = useLibrary();

  const [mode, setMode] = useState<TaskMode>("text-to-3d");
  const [spec, setSpec] = useState<ModelSpec | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [stats, setStats] = useState<ModelStats | null>(null);
  const [animation, setAnimation] = useState<AnimationPreset>("none");
  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [environment, setEnvironment] = useState<Environment>("studio");

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  const initialPrompt = params.get("prompt") ?? undefined;
  const initialStyle = (params.get("style") as ArtStyle | null) ?? undefined;

  useEffect(() => () => cancelRef.current?.(), []);

  // Restore the most recent asset once the library rehydrates.
  useEffect(() => {
    if (!library.hydrated || spec || !library.assets.length) return;
    const latest = library.assets[0];
    setSpec(latest.spec);
    setActiveId(latest.id);
    setAnimation(latest.animation);
  }, [library.hydrated, library.assets, spec]);

  const run = useCallback(
    async (payload: SubmitPayload) => {
      const cost = { "text-to-3d": 20, "image-to-3d": 20, texture: 10, remesh: 5, animate: 10 }[
        payload.mode
      ];

      if (!spend(cost)) {
        setError("Not enough credits for that job.");
        return;
      }

      cancelRef.current?.();
      setBusy(true);
      setError(null);
      setProgress(0);
      setStage("Queued");

      try {
        const job = await startJob({
          mode: payload.mode,
          prompt: payload.prompt,
          style: payload.style,
          polycount: payload.polycount,
          topology: payload.topology,
          paletteOverride: payload.paletteOverride,
          texturePrompt: payload.texturePrompt,
          baseSpec: spec ?? undefined,
        });

        const tracker = trackJob(job, ({ progress: value, stage: label }) => {
          setProgress(value);
          setStage(label);
        });
        cancelRef.current = tracker.cancel;
        const result = await tracker.promise;

        setSpec(result);
        setStats(null);

        if (payload.mode === "text-to-3d" || payload.mode === "image-to-3d") {
          const asset: Asset = {
            id: newId("asset"),
            name: nameFor(payload.prompt),
            prompt: payload.prompt,
            mode: payload.mode,
            spec: result,
            animation: "none",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            favorite: false,
            credits: cost,
            sourceImage: payload.sourceImage,
          };
          library.add(asset);
          setActiveId(asset.id);
          setAnimation("none");
        } else if (activeId) {
          const nextAnimation =
            payload.mode === "animate" ? payload.animation ?? "idle" : undefined;
          library.update(activeId, {
            spec: result,
            credits: (library.assets.find((a) => a.id === activeId)?.credits ?? 0) + cost,
            ...(nextAnimation ? { animation: nextAnimation } : {}),
          });
          if (nextAnimation) setAnimation(nextAnimation);
        }

        setHistory((entries) =>
          [
            {
              id: job.task.id,
              label: payload.prompt || MODE_LABEL[payload.mode],
              mode: payload.mode,
              credits: cost,
              at: Date.now(),
              status: "succeeded" as const,
            },
            ...entries,
          ].slice(0, 12),
        );
      } catch (cause) {
        refund(cost);
        setError(cause instanceof Error ? cause.message : "Generation failed.");
        setHistory((entries) =>
          [
            {
              id: newId("task"),
              label: payload.prompt || MODE_LABEL[payload.mode],
              mode: payload.mode,
              credits: 0,
              at: Date.now(),
              status: "failed" as const,
            },
            ...entries,
          ].slice(0, 12),
        );
      } finally {
        cancelRef.current = null;
        setBusy(false);
      }
    },
    [activeId, library, refund, spend, spec],
  );

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!spec) return;
      setExporting(true);
      setExportMessage(null);
      try {
        const active = library.assets.find((asset) => asset.id === activeId);
        const filename = await exportSpec(spec, format, active?.name ?? "sagg3d-model");
        setExportMessage(`Downloaded ${filename}`);
      } catch (cause) {
        setExportMessage(cause instanceof Error ? cause.message : "Export failed.");
      } finally {
        setExporting(false);
      }
    },
    [activeId, library.assets, spec],
  );

  const selectAsset = useCallback((asset: Asset) => {
    setSpec(asset.spec);
    setActiveId(asset.id);
    setAnimation(asset.animation);
    setStats(null);
  }, []);

  const deleteAsset = useCallback(
    (id: string) => {
      library.remove(id);
      if (id === activeId) {
        setActiveId(null);
        setSpec(null);
      }
    },
    [activeId, library],
  );

  const planName = useMemo(
    () => PLANS.find((plan) => plan.id === credits.plan)?.name ?? "Free",
    [credits.plan],
  );

  return (
    <div className="container-page flex min-h-[calc(100vh-4rem)] flex-col gap-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Workspace</h1>
          <p className="text-sm text-muted-foreground">
            Generate, refine, animate and export — everything runs in this browser.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
            <Coins className="size-4 text-brand" />
            <span className="font-mono text-sm">
              {creditsReady ? credits.balance.toLocaleString() : "—"}
            </span>
            <span className="text-xs text-muted-foreground">credits</span>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
            {(["free", "pro", "studio"] as PlanId[]).map((plan) => (
              <button
                key={plan}
                type="button"
                onClick={() => setPlan(plan)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-xs capitalize transition-colors",
                  credits.plan === plan
                    ? "bg-brand/20 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {plan}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss error">
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      <div className="grid flex-1 gap-4 lg:grid-cols-[300px_minmax(0,1fr)_300px]">
        <ModulePanel
          mode={mode}
          onModeChange={setMode}
          onSubmit={(payload) => void run(payload)}
          busy={busy}
          hasModel={Boolean(spec)}
          balance={credits.balance}
          initialPrompt={initialPrompt}
          initialStyle={initialStyle}
        />

        <div className="flex min-h-[520px] flex-col gap-4">
          <Viewport
            spec={spec}
            stats={stats}
            onStats={setStats}
            wireframe={wireframe}
            onWireframe={setWireframe}
            autoRotate={autoRotate}
            onAutoRotate={setAutoRotate}
            environment={environment}
            onEnvironment={setEnvironment}
            animation={animation}
            onAnimation={(value) => {
              setAnimation(value);
              if (activeId) library.update(activeId, { animation: value });
            }}
            busy={busy}
            progress={progress}
            stage={stage}
          />

          <div className="rounded-2xl border border-border bg-surface p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <History className="size-4 text-muted-foreground" />
              Task queue
              <span className="text-muted-foreground">
                · {planName} plan · {credits.spent} credits used this cycle
              </span>
            </h2>
            {history.length ? (
              <ul className="mt-3 max-h-40 space-y-1.5 overflow-y-auto pr-1">
                {history.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-xs"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          entry.status === "succeeded" ? "bg-success" : "bg-destructive",
                        )}
                      />
                      <span className="shrink-0 text-muted-foreground">
                        {MODE_LABEL[entry.mode]}
                      </span>
                      <span className="truncate">{entry.label}</span>
                    </span>
                    <span className="shrink-0 font-mono text-muted-foreground">
                      {entry.credits ? `-${entry.credits}` : "refunded"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                No jobs yet. Your generation history for this session shows up here.
              </p>
            )}
          </div>
        </div>

        <AssetPanel
          assets={library.assets}
          activeId={activeId}
          onSelect={selectAsset}
          onRename={(id, name) => library.update(id, { name })}
          onFavorite={(id) =>
            library.update(id, {
              favorite: !library.assets.find((asset) => asset.id === id)?.favorite,
            })
          }
          onDuplicate={library.duplicate}
          onDelete={deleteAsset}
          onExport={(format) => void handleExport(format)}
          exporting={exporting}
          canExport={Boolean(spec)}
          exportMessage={exportMessage}
        />
      </div>
    </div>
  );
}

"use client";

import {
  Boxes,
  ImagePlus,
  Loader2,
  PersonStanding,
  Scissors,
  Sparkles,
  Palette as PaletteIcon,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CREDIT_COST } from "@/lib/pricing";
import { samplePaletteFromImage } from "@/lib/three/texture";
import { cn } from "@/lib/utils";
import type { AnimationPreset, ArtStyle, TaskMode, Topology } from "@/types";

export interface SubmitPayload {
  mode: TaskMode;
  prompt: string;
  style: ArtStyle;
  polycount: number;
  topology: Topology;
  texturePrompt?: string;
  paletteOverride?: string[];
  sourceImage?: string;
  animation?: AnimationPreset;
}

const MODULES: Array<{ id: TaskMode; label: string; icon: typeof Boxes }> = [
  { id: "text-to-3d", label: "Text to 3D", icon: Boxes },
  { id: "image-to-3d", label: "Image to 3D", icon: ImagePlus },
  { id: "texture", label: "Texture", icon: PaletteIcon },
  { id: "remesh", label: "Remesh", icon: Scissors },
  { id: "animate", label: "Animate", icon: PersonStanding },
];

const STYLES: Array<{ id: ArtStyle; label: string }> = [
  { id: "realistic", label: "Realistic" },
  { id: "cartoon", label: "Cartoon" },
  { id: "low-poly", label: "Low poly" },
  { id: "voxel", label: "Voxel" },
  { id: "sculpture", label: "Sculpture" },
];

const ANIMATIONS: Array<{ id: AnimationPreset; label: string; hint: string }> = [
  { id: "idle", label: "Idle breathing", hint: "Subtle loop for hero shots" },
  { id: "walk", label: "Walk cycle", hint: "Limb swing, needs a rigged body" },
  { id: "spin", label: "Turntable", hint: "Constant Y rotation" },
  { id: "bounce", label: "Bounce", hint: "Playful vertical loop" },
];

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

interface ModulePanelProps {
  mode: TaskMode;
  onModeChange: (mode: TaskMode) => void;
  onSubmit: (payload: SubmitPayload) => void;
  busy: boolean;
  hasModel: boolean;
  balance: number;
  initialPrompt?: string;
  initialStyle?: ArtStyle;
}

export function ModulePanel({
  mode,
  onModeChange,
  onSubmit,
  busy,
  hasModel,
  balance,
  initialPrompt,
  initialStyle,
}: ModulePanelProps) {
  const [prompt, setPrompt] = useState(initialPrompt ?? "");
  const [style, setStyle] = useState<ArtStyle>(initialStyle ?? "realistic");
  const [polycount, setPolycount] = useState(30_000);
  const [topology, setTopology] = useState<Topology>("triangle");
  const [texturePrompt, setTexturePrompt] = useState("");
  const [animation, setAnimation] = useState<AnimationPreset>("idle");
  const [image, setImage] = useState<string | null>(null);
  const [palette, setPalette] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const cost = CREDIT_COST[mode];
  const needsModel = mode === "texture" || mode === "remesh" || mode === "animate";
  const blocked =
    busy ||
    balance < cost ||
    (needsModel && !hasModel) ||
    (mode === "text-to-3d" && prompt.trim().length < 2) ||
    (mode === "image-to-3d" && !image) ||
    (mode === "texture" && texturePrompt.trim().length < 2);

  const readImage = async (file: File) => {
    setImageError(null);
    if (!file.type.startsWith("image/")) {
      setImageError("That file is not an image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("Images must be under 6 MB.");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read the file"));
      reader.readAsDataURL(file);
    }).catch(() => null);

    if (!dataUrl) {
      setImageError("Could not read that file.");
      return;
    }
    setImage(dataUrl);
    setPalette(await samplePaletteFromImage(dataUrl, 4));
  };

  const submit = () => {
    onSubmit({
      mode,
      prompt: mode === "texture" ? texturePrompt : prompt || "abstract sculpture",
      style,
      polycount,
      topology,
      texturePrompt: mode === "texture" ? texturePrompt : undefined,
      paletteOverride: mode === "image-to-3d" ? palette : undefined,
      sourceImage: mode === "image-to-3d" ? image ?? undefined : undefined,
      animation: mode === "animate" ? animation : undefined,
    });
  };

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto rounded-2xl border border-border bg-surface p-4">
      <div className="grid grid-cols-2 gap-1.5">
        {MODULES.map((module) => {
          const Icon = module.icon;
          const active = mode === module.id;
          return (
            <button
              key={module.id}
              type="button"
              onClick={() => onModeChange(module.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors",
                module.id === "animate" && "col-span-2",
                active
                  ? "border-brand bg-brand/15 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {module.label}
            </button>
          );
        })}
      </div>

      {needsModel && !hasModel ? (
        <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
          Generate or open a model first — this step edits an existing mesh.
        </p>
      ) : null}

      {mode === "text-to-3d" ? (
        <>
          <Field label="Prompt" hint={`${prompt.length}/600`}>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value.slice(0, 600))}
              rows={5}
              placeholder="a mossy stone golem with glowing green runes"
              className={inputClass}
            />
          </Field>
          <StylePicker style={style} onChange={setStyle} />
          <PolySettings
            polycount={polycount}
            onPolycount={setPolycount}
            topology={topology}
            onTopology={setTopology}
          />
        </>
      ) : null}

      {mode === "image-to-3d" ? (
        <>
          <Field label="Reference image">
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const file = event.dataTransfer.files?.[0];
                if (file) void readImage(file);
              }}
              className="relative flex min-h-40 items-center justify-center rounded-xl border border-dashed border-border bg-background p-3 text-center"
            >
              {image ? (
                <>
                  {/* User-supplied data URL — not an optimizable remote asset. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt="Reference" className="max-h-40 rounded-lg object-contain" />
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() => {
                      setImage(null);
                      setPalette([]);
                    }}
                    className="absolute right-2 top-2 rounded-md border border-border bg-background/80 p-1"
                  >
                    <X className="size-3" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center gap-2 text-xs text-muted-foreground"
                >
                  <Upload className="size-5" />
                  Drop an image or click to upload
                  <span className="text-[0.65rem]">PNG, JPG or WebP · up to 6 MB</span>
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void readImage(file);
                }}
              />
            </div>
          </Field>
          {imageError ? <p className="text-xs text-destructive">{imageError}</p> : null}
          {palette.length ? (
            <div>
              <p className="text-xs text-muted-foreground">Sampled palette</p>
              <div className="mt-2 flex gap-1.5">
                {palette.map((color) => (
                  <span
                    key={color}
                    title={color}
                    className="size-7 rounded-md border border-border"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          ) : null}
          <Field label="Subject hint (optional)">
            <input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value.slice(0, 200))}
              placeholder="e.g. sneaker, robot, chair"
              className={inputClass}
            />
          </Field>
          <StylePicker style={style} onChange={setStyle} />
        </>
      ) : null}

      {mode === "texture" ? (
        <Field label="Texture prompt">
          <textarea
            value={texturePrompt}
            onChange={(event) => setTexturePrompt(event.target.value.slice(0, 300))}
            rows={5}
            placeholder="weathered copper with green patina"
            className={inputClass}
          />
        </Field>
      ) : null}

      {mode === "remesh" ? (
        <PolySettings
          polycount={polycount}
          onPolycount={setPolycount}
          topology={topology}
          onTopology={setTopology}
        />
      ) : null}

      {mode === "animate" ? (
        <Field label="Motion">
          <div className="space-y-1.5">
            {ANIMATIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setAnimation(option.id)}
                className={cn(
                  "flex w-full flex-col rounded-lg border px-3 py-2 text-left transition-colors",
                  animation === option.id
                    ? "border-brand bg-brand/15"
                    : "border-border hover:border-brand/40",
                )}
              >
                <span className="text-sm">{option.label}</span>
                <span className="text-[0.7rem] text-muted-foreground">{option.hint}</span>
              </button>
            ))}
          </div>
        </Field>
      ) : null}

      <div className="mt-auto space-y-2 border-t border-border pt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Cost</span>
          <span className={cn("font-mono", balance < cost ? "text-destructive" : "text-brand")}>
            {cost} credits
          </span>
        </div>
        <Button variant="brand" size="xl" className="w-full" disabled={blocked} onClick={submit}>
          {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {busy ? "Working…" : "Generate"}
        </Button>
        {balance < cost ? (
          <p className="text-center text-xs text-destructive">
            Not enough credits. Switch plans in the sidebar to top up.
          </p>
        ) : null}
      </div>
    </div>
  );
}

const inputClass =
  "w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-brand focus:ring-3 focus:ring-brand/25";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {hint ? <span className="font-mono text-[0.65rem] text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function StylePicker({
  style,
  onChange,
}: {
  style: ArtStyle;
  onChange: (style: ArtStyle) => void;
}) {
  return (
    <Field label="Art style">
      <div className="flex flex-wrap gap-1.5">
        {STYLES.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
              style === option.id
                ? "border-brand bg-brand/15 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </Field>
  );
}

function PolySettings({
  polycount,
  onPolycount,
  topology,
  onTopology,
}: {
  polycount: number;
  onPolycount: (value: number) => void;
  topology: Topology;
  onTopology: (value: Topology) => void;
}) {
  return (
    <>
      <Field label="Target polycount" hint={`${polycount.toLocaleString()} ${topology === "quad" ? "quads" : "tris"}`}>
        <input
          type="range"
          min={1_000}
          max={300_000}
          step={1_000}
          value={polycount}
          onChange={(event) => onPolycount(Number(event.target.value))}
          className="w-full accent-[var(--brand)]"
          aria-label="Target polycount"
        />
        <div className="mt-1 flex justify-between text-[0.65rem] text-muted-foreground">
          <span>1k</span>
          <span>300k</span>
        </div>
      </Field>
      <Field label="Topology">
        <div className="grid grid-cols-2 gap-1.5">
          {(["triangle", "quad"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onTopology(option)}
              className={cn(
                "rounded-lg border px-2.5 py-2 text-xs capitalize transition-colors",
                topology === option
                  ? "border-brand bg-brand/15 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </Field>
    </>
  );
}

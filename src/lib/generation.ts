import { generateModelSpec, remeshSpec, retextureSpec } from "@/lib/model-spec";
import { CREDIT_COST } from "@/lib/pricing";
import type { ArtStyle, ModelSpec, ReliefSpec, TaskMode, Topology } from "@/types";

export interface GenerationInput {
  mode?: TaskMode;
  prompt?: string;
  style?: ArtStyle;
  polycount?: number;
  topology?: Topology;
  seed?: number;
  paletteOverride?: string[];
  baseSpec?: ModelSpec;
  texturePrompt?: string;
  /** Data URL of the reference image, forwarded to a provider. */
  image?: string;
  /** Provider task id of the model being refined. */
  baseTaskId?: string;
  /** Geometry reconstructed from the uploaded image. */
  relief?: ReliefSpec;
}

export interface JobStage {
  until: number;
  label: string;
}

/** Progress labels per mode, expressed as fractions of the total duration. */
export const STAGES: Record<TaskMode, JobStage[]> = {
  "text-to-3d": [
    { until: 0.18, label: "Understanding the prompt" },
    { until: 0.55, label: "Generating base geometry" },
    { until: 0.85, label: "Baking PBR textures" },
    { until: 1, label: "Optimizing mesh" },
  ],
  "image-to-3d": [
    { until: 0.2, label: "Analyzing the reference image" },
    { until: 0.55, label: "Reconstructing volume" },
    { until: 0.86, label: "Projecting textures" },
    { until: 1, label: "Optimizing mesh" },
  ],
  texture: [
    { until: 0.4, label: "Reading surface topology" },
    { until: 0.8, label: "Painting PBR maps" },
    { until: 1, label: "Packing 4K textures" },
  ],
  remesh: [
    { until: 0.5, label: "Analyzing topology" },
    { until: 1, label: "Rebuilding polygons" },
  ],
  animate: [
    { until: 0.45, label: "Auto-rigging skeleton" },
    { until: 0.8, label: "Binding skin weights" },
    { until: 1, label: "Retargeting motion" },
  ],
};

export const DURATION: Record<TaskMode, number> = {
  "text-to-3d": 7_000,
  "image-to-3d": 7_500,
  texture: 5_000,
  remesh: 3_000,
  animate: 4_500,
};

/** Returns an error message, or null when the request is valid. */
export function validateInput(input: GenerationInput): string | null {
  const mode = input.mode ?? "text-to-3d";
  if (!(mode in CREDIT_COST)) return `Unknown mode: ${mode}`;

  const prompt = (input.prompt ?? "").trim();
  if ((mode === "text-to-3d" || mode === "texture") && prompt.length < 2) {
    return "Describe what you want to generate — at least 2 characters.";
  }
  if (prompt.length > 600) return "Prompt is limited to 600 characters.";
  if ((mode === "texture" || mode === "remesh" || mode === "animate") && !input.baseSpec) {
    return `The ${mode} step needs an existing model to work on.`;
  }
  return null;
}

/**
 * The generation itself: deterministic, synchronous and dependency-free, so it
 * produces identical results on the server and in the browser.
 */
export function resolveSpec(input: GenerationInput): ModelSpec {
  const mode = input.mode ?? "text-to-3d";
  const prompt = (input.prompt ?? "").trim();

  switch (mode) {
    case "texture":
      return retextureSpec(input.baseSpec as ModelSpec, input.texturePrompt || prompt);
    case "remesh":
      return remeshSpec(
        input.baseSpec as ModelSpec,
        input.polycount ?? 30_000,
        input.topology ?? "triangle",
      );
    case "animate":
      return input.baseSpec as ModelSpec;
    default:
      return generateModelSpec({
        prompt: prompt || "abstract sculpture",
        style: input.style ?? "realistic",
        polycount: input.polycount,
        topology: input.topology,
        seed: input.seed,
        paletteOverride: input.paletteOverride,
        relief: input.relief,
      });
  }
}

export function newTaskId() {
  return `task_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

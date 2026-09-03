import type { ArtStyle, TaskMode, Topology } from "@/types";

export type ProviderId = "local" | "meshy" | "tripo";

export interface ProviderRequest {
  mode: TaskMode;
  prompt: string;
  style: ArtStyle;
  polycount?: number;
  topology?: Topology;
  seed?: number;
  /** Data URL of the source image for image-to-3D. */
  image?: string;
  /** Provider task id of the model being refined (texture / remesh / animate). */
  baseTaskId?: string;
  texturePrompt?: string;
}

export interface ProviderTask {
  /** Provider-side task id, used for polling. */
  id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  /** 0 – 100 */
  progress: number;
  stage?: string;
  error?: string;
  /** Downloadable model files, present once the task succeeds. */
  modelUrls?: Partial<Record<"glb" | "fbx" | "obj" | "usdz" | "stl" | "ply", string>>;
  thumbnailUrl?: string;
}

export interface GenerationProvider {
  readonly id: ProviderId;
  readonly label: string;
  /** Modes this provider can actually run. */
  readonly modes: readonly TaskMode[];
  create(request: ProviderRequest, key: string): Promise<ProviderTask>;
  poll(taskId: string, mode: TaskMode, key: string): Promise<ProviderTask>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

/** Providers reject prompts over their own limits; keep one shared guard. */
export const MAX_PROMPT = 600;

export type ArtStyle =
  | "realistic"
  | "cartoon"
  | "low-poly"
  | "voxel"
  | "sculpture";

export type Topology = "triangle" | "quad";

export type TaskMode =
  | "text-to-3d"
  | "image-to-3d"
  | "texture"
  | "remesh"
  | "animate";

export type TaskStatus = "queued" | "running" | "succeeded" | "failed";

export type AnimationPreset = "none" | "idle" | "spin" | "bounce" | "walk";

/** A deterministic description of a generated mesh — the "model file" of this app. */
export interface ModelPart {
  geometry:
    | "box"
    | "sphere"
    | "cylinder"
    | "cone"
    | "torus"
    | "capsule"
    | "icosahedron"
    | "torusKnot";
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  /** Index into the spec palette. */
  color: number;
  /** Optional limb tag used by the animation presets. */
  tag?: "armL" | "armR" | "legL" | "legR" | "head" | "body" | "prop";
  metalness?: number;
  roughness?: number;
}

export interface ReliefSpec {
  size: number;
  /** Base64, one depth byte per cell. */
  depth: string;
  /** Base64, three color bytes per cell. */
  colors: string;
  aspect: number;
}

export interface ModelSpec {
  archetype: string;
  /** Set when the model was reconstructed from an image rather than assembled. */
  relief?: ReliefSpec;
  seed: number;
  parts: ModelPart[];
  palette: string[];
  style: ArtStyle;
  topology: Topology;
  /** Target polycount in triangles (1k – 300k). */
  polycount: number;
  textured: boolean;
  texturePrompt?: string;
  symmetry: boolean;
}

export interface GenerationTask {
  id: string;
  mode: TaskMode;
  prompt: string;
  style: ArtStyle;
  status: TaskStatus;
  /** 0 – 100 */
  progress: number;
  stage: string;
  credits: number;
  createdAt: number;
  finishedAt?: number;
  spec?: ModelSpec;
  error?: string;
}

export interface Asset {
  id: string;
  name: string;
  prompt: string;
  mode: TaskMode;
  /** Procedural description — absent for models returned by a provider. */
  spec?: ModelSpec;
  /** Provider-generated .glb, when a real 3D model produced this asset. */
  modelUrl?: string;
  modelUrls?: Record<string, string>;
  providerTaskId?: string;
  provider?: string;
  thumbnailUrl?: string;
  animation: AnimationPreset;
  createdAt: number;
  updatedAt: number;
  favorite: boolean;
  credits: number;
  /** Data URL of the source image for image-to-3D assets. */
  sourceImage?: string;
}

export interface CreditState {
  plan: "free" | "pro" | "studio";
  balance: number;
  monthly: number;
  spent: number;
  /** Month key (YYYY-MM) the allowance was last refreshed for. */
  cycle: string;
}

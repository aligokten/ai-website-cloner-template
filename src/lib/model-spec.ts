import { matchArchetype } from "@/lib/archetypes";
import { buildPalette } from "@/lib/palette";
import { hashString, mulberry32, range } from "@/lib/rng";
import type { ArtStyle, ModelPart, ModelSpec, Topology } from "@/types";

export interface GenerateSpecOptions {
  prompt: string;
  style: ArtStyle;
  polycount?: number;
  topology?: Topology;
  seed?: number;
  symmetry?: boolean;
  textured?: boolean;
  /** Colors sampled from a source image (image-to-3D). */
  paletteOverride?: string[];
}

const STYLE_SCALE: Record<ArtStyle, number> = {
  realistic: 1,
  cartoon: 1.08,
  "low-poly": 1,
  voxel: 1,
  sculpture: 1,
};

/** Snap a part onto a voxel grid so the voxel style reads as blocky. */
function voxelize(parts: ModelPart[], grid = 0.16): ModelPart[] {
  const snap = (v: number) => Math.round(v / grid) * grid;
  return parts.map((p) => ({
    ...p,
    geometry: "box" as const,
    rotation: [0, 0, 0] as [number, number, number],
    position: p.position.map(snap) as [number, number, number],
    scale: p.scale.map((v) => Math.max(grid, snap(v))) as [number, number, number],
  }));
}

/** Cartoon proportions: bigger head, chunkier limbs. */
function cartoonize(parts: ModelPart[]): ModelPart[] {
  return parts.map((p) => {
    const factor = p.tag === "head" ? 1.35 : p.tag === "body" ? 1.12 : 0.94;
    return {
      ...p,
      scale: p.scale.map((v) => v * factor) as [number, number, number],
      position:
        p.tag === "head"
          ? ([p.position[0], p.position[1] + 0.1, p.position[2]] as [number, number, number])
          : p.position,
      roughness: 0.75,
      metalness: 0,
    };
  });
}

export function generateModelSpec(options: GenerateSpecOptions): ModelSpec {
  const {
    prompt,
    style,
    polycount = 30_000,
    topology = "triangle",
    symmetry = true,
    textured = true,
    paletteOverride,
  } = options;

  const seed = options.seed ?? hashString(prompt.trim().toLowerCase());
  const rng = mulberry32(seed);
  const archetype = matchArchetype(prompt);

  let parts = archetype.build(rng);
  if (style === "voxel") parts = voxelize(parts);
  if (style === "cartoon") parts = cartoonize(parts);
  if (style === "sculpture") {
    parts = parts.map((p) => ({ ...p, metalness: 0.15, roughness: 0.62 }));
  }
  if (style === "realistic") {
    parts = parts.map((p) => ({
      ...p,
      roughness: p.roughness ?? range(rng, 0.35, 0.7),
      metalness: p.metalness ?? 0.08,
    }));
  }

  const scale = STYLE_SCALE[style];
  if (scale !== 1) {
    parts = parts.map((p) => ({
      ...p,
      scale: p.scale.map((v) => v * scale) as [number, number, number],
    }));
  }

  const palette =
    paletteOverride && paletteOverride.length >= 3
      ? [...paletteOverride, ...buildPalette(prompt, seed)].slice(0, 5)
      : buildPalette(prompt, seed);

  return {
    archetype: archetype.id,
    seed,
    parts,
    palette,
    style,
    topology,
    polycount: Math.max(1_000, Math.min(300_000, Math.round(polycount))),
    textured,
    texturePrompt: textured ? prompt : undefined,
    symmetry,
  };
}

/** Apply a remesh pass: new target polycount and topology, same shape. */
export function remeshSpec(
  spec: ModelSpec,
  polycount: number,
  topology: Topology,
): ModelSpec {
  return {
    ...spec,
    polycount: Math.max(1_000, Math.min(300_000, Math.round(polycount))),
    topology,
  };
}

/** Apply an AI texturing pass driven by a texture prompt. */
export function retextureSpec(spec: ModelSpec, texturePrompt: string): ModelSpec {
  const seed = hashString(`${spec.seed}:${texturePrompt}`);
  return {
    ...spec,
    textured: true,
    texturePrompt,
    palette: buildPalette(texturePrompt, seed),
  };
}

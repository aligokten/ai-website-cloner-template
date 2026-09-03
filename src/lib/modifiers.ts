import type { ModelPart } from "@/types";
import { range, type Rng } from "@/lib/rng";

/**
 * Attachments and proportion changes read straight out of the prompt, so
 * "winged robot with a crown" differs from a plain robot.
 */

const part = (
  geometry: ModelPart["geometry"],
  position: [number, number, number],
  scale: [number, number, number],
  color: number,
  extra: Partial<ModelPart> = {},
): ModelPart => ({
  geometry,
  position,
  scale,
  rotation: extra.rotation ?? [0, 0, 0],
  color,
  ...extra,
});

/** Where to hang an attachment, derived from the model's own bounds. */
export interface Anchors {
  top: number;
  headY: number;
  bodyY: number;
  back: number;
  width: number;
}

export function anchorsFor(parts: ModelPart[]): Anchors {
  let top = 0;
  let width = 0.5;
  let headY = 0;
  let bodyY = 0;
  for (const entry of parts) {
    top = Math.max(top, entry.position[1] + entry.scale[1]);
    width = Math.max(width, Math.abs(entry.position[0]) + entry.scale[0]);
    if (entry.tag === "head") headY = Math.max(headY, entry.position[1]);
    if (entry.tag === "body") bodyY = Math.max(bodyY, entry.position[1]);
  }
  return {
    top,
    headY: headY || top * 0.85,
    bodyY: bodyY || top * 0.5,
    back: -0.3,
    width,
  };
}

type Attachment = (anchors: Anchors, rng: Rng) => ModelPart[];

const wings: Attachment = (a, rng) => {
  const span = range(rng, 0.9, 1.3);
  return [-1, 1].map((side) =>
    part(
      "box",
      [side * (a.width + span * 0.5), a.bodyY + 0.25, a.back],
      [span, 0.42, 0.06],
      3,
      { tag: "prop", rotation: [0, side * 0.25, side * 0.35] },
    ),
  );
};

const horns: Attachment = (a, rng) => {
  const length = range(rng, 0.18, 0.32);
  return [-1, 1].map((side) =>
    part("cone", [side * 0.17, a.headY + 0.3, 0], [0.08, length, 0.08], 4, {
      tag: "head",
      rotation: [0, 0, side * 0.35],
    }),
  );
};

const tail: Attachment = (a, rng) => {
  const segments = Math.round(range(rng, 3, 5));
  return Array.from({ length: segments }, (_, i) =>
    part(
      "sphere",
      [0, a.bodyY - i * 0.1, a.back - 0.35 - i * 0.22],
      [0.14 - i * 0.02, 0.14 - i * 0.02, 0.16],
      2,
      { tag: "prop" },
    ),
  );
};

const hat: Attachment = (a) => [
  part("cylinder", [0, a.headY + 0.32, 0], [0.34, 0.03, 0.34], 3, { tag: "head" }),
  part("cylinder", [0, a.headY + 0.46, 0], [0.22, 0.16, 0.22], 3, { tag: "head" }),
];

const crown: Attachment = (a) => [
  part("cylinder", [0, a.headY + 0.34, 0], [0.26, 0.07, 0.26], 3, {
    tag: "head",
    metalness: 0.85,
    roughness: 0.18,
  }),
  ...Array.from({ length: 5 }, (_, i) => {
    const angle = (i / 5) * Math.PI * 2;
    return part(
      "cone",
      [Math.cos(angle) * 0.24, a.headY + 0.46, Math.sin(angle) * 0.24],
      [0.05, 0.1, 0.05],
      3,
      { tag: "head", metalness: 0.85, roughness: 0.18 },
    );
  }),
];

const shield: Attachment = (a) => [
  part("box", [-(a.width + 0.16), a.bodyY, 0.12], [0.05, 0.34, 0.26], 4, {
    tag: "armL",
    metalness: 0.5,
    roughness: 0.4,
  }),
];

const blade: Attachment = (a) => [
  part("box", [a.width + 0.14, a.bodyY + 0.42, 0], [0.04, 0.5, 0.09], 3, {
    tag: "armR",
    metalness: 0.9,
    roughness: 0.12,
  }),
  part("box", [a.width + 0.14, a.bodyY - 0.06, 0], [0.05, 0.12, 0.05], 4, { tag: "armR" }),
];

const wheels: Attachment = (a) =>
  [
    [-1, 0.7],
    [1, 0.7],
    [-1, -0.7],
    [1, -0.7],
  ].map(([side, z]) =>
    part("cylinder", [side * a.width, 0.3, z], [0.3, 0.12, 0.3], 4, {
      tag: "prop",
      rotation: [0, 0, Math.PI / 2],
      roughness: 0.9,
    }),
  );

const glasses: Attachment = (a) => [
  part("box", [0, a.headY + 0.06, 0.3], [0.3, 0.06, 0.04], 3, {
    tag: "head",
    metalness: 0.3,
    roughness: 0.08,
  }),
];

const backpack: Attachment = (a) => [
  part("box", [0, a.bodyY + 0.1, a.back - 0.22], [0.28, 0.32, 0.16], 2, { tag: "body" }),
];

const ATTACHMENTS: Array<{ keywords: string[]; build: Attachment }> = [
  { keywords: ["wing", "winged", "wings", "angel", "flying"], build: wings },
  { keywords: ["horn", "horns", "horned", "demon", "antler", "antlers"], build: horns },
  { keywords: ["tail", "tailed"], build: tail },
  { keywords: ["hat", "cap", "helmet", "hood"], build: hat },
  { keywords: ["crown", "king", "queen", "royal", "crowned"], build: crown },
  { keywords: ["shield", "buckler"], build: shield },
  { keywords: ["sword", "blade", "katana", "dagger", "armed"], build: blade },
  { keywords: ["wheel", "wheels", "wheeled", "cart", "rover"], build: wheels },
  { keywords: ["glasses", "goggles", "visor", "sunglasses"], build: glasses },
  { keywords: ["backpack", "jetpack", "pack", "satchel"], build: backpack },
];

interface Proportion {
  keywords: string[];
  /** Multipliers applied to the whole model. */
  x: number;
  y: number;
}

const PROPORTIONS: Proportion[] = [
  { keywords: ["tall", "lanky", "towering", "long"], x: 0.88, y: 1.28 },
  { keywords: ["short", "stubby", "squat", "chibi"], x: 1.12, y: 0.76 },
  { keywords: ["fat", "chunky", "thick", "bulky", "heavy", "round"], x: 1.24, y: 0.94 },
  { keywords: ["thin", "slim", "skinny", "slender"], x: 0.78, y: 1.06 },
  { keywords: ["giant", "huge", "massive", "colossal"], x: 1.18, y: 1.18 },
  { keywords: ["tiny", "small", "mini", "miniature"], x: 0.86, y: 0.86 },
];

const MATERIALS: Array<{ keywords: string[]; metalness: number; roughness: number }> = [
  { keywords: ["metal", "metallic", "steel", "iron", "chrome", "silver"], metalness: 0.9, roughness: 0.2 },
  { keywords: ["gold", "golden", "brass", "bronze", "copper"], metalness: 0.95, roughness: 0.24 },
  { keywords: ["glass", "crystal", "glossy", "shiny", "polished"], metalness: 0.2, roughness: 0.05 },
  { keywords: ["stone", "rock", "concrete", "clay", "matte"], metalness: 0, roughness: 0.95 },
  { keywords: ["wood", "wooden", "timber"], metalness: 0, roughness: 0.85 },
  { keywords: ["rusty", "rusted", "worn", "weathered", "old"], metalness: 0.45, roughness: 0.9 },
];

export interface PromptModifiers {
  attachments: string[];
  proportion?: Proportion;
  material?: { metalness: number; roughness: number };
}

export function readModifiers(prompt: string): PromptModifiers {
  const words: string[] = prompt.toLowerCase().match(/[a-z]+/g) ?? [];
  const has = (keywords: string[]) => keywords.some((keyword) => words.includes(keyword));

  return {
    attachments: ATTACHMENTS.filter((entry) => has(entry.keywords)).map(
      (entry) => entry.keywords[0],
    ),
    proportion: PROPORTIONS.find((entry) => has(entry.keywords)),
    material: MATERIALS.find((entry) => has(entry.keywords)),
  };
}

/** Apply everything the prompt asked for on top of the archetype's parts. */
export function applyModifiers(
  parts: ModelPart[],
  modifiers: PromptModifiers,
  rng: Rng,
): ModelPart[] {
  let result = parts;

  if (modifiers.proportion) {
    const { x, y } = modifiers.proportion;
    result = result.map((entry) => ({
      ...entry,
      scale: [entry.scale[0] * x, entry.scale[1] * y, entry.scale[2] * x] as [
        number,
        number,
        number,
      ],
      position: [entry.position[0] * x, entry.position[1] * y, entry.position[2] * x] as [
        number,
        number,
        number,
      ],
    }));
  }

  if (modifiers.material) {
    const { metalness, roughness } = modifiers.material;
    result = result.map((entry) => ({ ...entry, metalness, roughness }));
  }

  if (modifiers.attachments.length) {
    const anchors = anchorsFor(result);
    const extra = ATTACHMENTS.filter((entry) =>
      modifiers.attachments.includes(entry.keywords[0]),
    ).flatMap((entry) => entry.build(anchors, rng));
    result = [...result, ...extra];
  }

  return result;
}

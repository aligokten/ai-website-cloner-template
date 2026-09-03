import type { ModelPart } from "@/types";
import { pick, range, type Rng } from "@/lib/rng";

type Builder = (rng: Rng) => ModelPart[];

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

const humanoid: Builder = (rng) => {
  const bulk = range(rng, 0.85, 1.25);
  const legLength = range(rng, 0.7, 1.0);
  return [
    part("capsule", [0, 1.15, 0], [0.42 * bulk, 0.6, 0.42 * bulk], 0, { tag: "body" }),
    part("sphere", [0, 1.92, 0], [0.34, 0.36, 0.33], 1, { tag: "head" }),
    part("box", [0, 2.02, 0.3], [0.2, 0.09, 0.06], 3, { tag: "head" }),
    part("capsule", [-0.55, 1.2, 0], [0.15, 0.42, 0.15], 2, { tag: "armL", rotation: [0, 0, 0.22] }),
    part("capsule", [0.55, 1.2, 0], [0.15, 0.42, 0.15], 2, { tag: "armR", rotation: [0, 0, -0.22] }),
    part("capsule", [-0.22, 0.42 * legLength, 0], [0.17, 0.45 * legLength, 0.17], 2, { tag: "legL" }),
    part("capsule", [0.22, 0.42 * legLength, 0], [0.17, 0.45 * legLength, 0.17], 2, { tag: "legR" }),
    part("box", [-0.22, 0.05, 0.08], [0.19, 0.08, 0.3], 4, { tag: "legL" }),
    part("box", [0.22, 0.05, 0.08], [0.19, 0.08, 0.3], 4, { tag: "legR" }),
  ];
};

const robot: Builder = (rng) => {
  const antenna = rng() > 0.4;
  const parts: ModelPart[] = [
    part("box", [0, 1.2, 0], [0.5, 0.55, 0.36], 0, { tag: "body", metalness: 0.75, roughness: 0.3 }),
    part("box", [0, 1.92, 0], [0.36, 0.32, 0.34], 1, { tag: "head", metalness: 0.7, roughness: 0.25 }),
    part("box", [0, 1.94, 0.34], [0.26, 0.12, 0.04], 3, { tag: "head", metalness: 0.2, roughness: 0.1 }),
    part("cylinder", [-0.62, 1.25, 0], [0.13, 0.42, 0.13], 2, { tag: "armL", metalness: 0.8, roughness: 0.3 }),
    part("cylinder", [0.62, 1.25, 0], [0.13, 0.42, 0.13], 2, { tag: "armR", metalness: 0.8, roughness: 0.3 }),
    part("box", [-0.62, 0.78, 0], [0.17, 0.14, 0.2], 4, { tag: "armL" }),
    part("box", [0.62, 0.78, 0], [0.17, 0.14, 0.2], 4, { tag: "armR" }),
    part("cylinder", [-0.24, 0.4, 0], [0.16, 0.4, 0.16], 2, { tag: "legL", metalness: 0.8, roughness: 0.35 }),
    part("cylinder", [0.24, 0.4, 0], [0.16, 0.4, 0.16], 2, { tag: "legR", metalness: 0.8, roughness: 0.35 }),
    part("box", [-0.24, 0.05, 0.06], [0.2, 0.1, 0.3], 4, { tag: "legL" }),
    part("box", [0.24, 0.05, 0.06], [0.2, 0.1, 0.3], 4, { tag: "legR" }),
    part("torus", [0, 1.62, 0], [0.3, 0.3, 0.3], 3, { tag: "body", rotation: [Math.PI / 2, 0, 0] }),
  ];
  if (antenna) {
    parts.push(part("cylinder", [0.14, 2.24, 0], [0.02, 0.2, 0.02], 3, { tag: "head" }));
    parts.push(part("sphere", [0.14, 2.46, 0], [0.07, 0.07, 0.07], 3, { tag: "head" }));
  }
  return parts;
};

const creature: Builder = (rng) => {
  const legs = 4;
  const parts: ModelPart[] = [
    part("capsule", [0, 0.9, 0], [0.42, 0.55, 0.42], 0, {
      tag: "body",
      rotation: [Math.PI / 2, 0, 0],
    }),
    part("sphere", [0, 1.12, 0.72], [0.33, 0.31, 0.34], 1, { tag: "head" }),
    part("cone", [-0.16, 1.42, 0.66], [0.1, 0.2, 0.1], 3, { tag: "head" }),
    part("cone", [0.16, 1.42, 0.66], [0.1, 0.2, 0.1], 3, { tag: "head" }),
    part("cone", [0, 1.06, 1.02], [0.11, 0.16, 0.11], 4, { tag: "head", rotation: [Math.PI / 2, 0, 0] }),
    part("capsule", [0, 0.95, -0.78], [0.09, 0.32, 0.09], 2, { tag: "prop", rotation: [-0.6, 0, 0] }),
  ];
  for (let i = 0; i < legs; i++) {
    const x = i % 2 === 0 ? -0.28 : 0.28;
    const z = i < 2 ? 0.34 : -0.34;
    parts.push(
      part("cylinder", [x, 0.32, z], [0.11, 0.32, 0.11], 2, {
        tag: i % 2 === 0 ? "legL" : "legR",
      }),
    );
  }
  if (rng() > 0.5) {
    parts.push(part("sphere", [0, 1.28, 0], [0.2, 0.16, 0.3], 3, { tag: "body" }));
  }
  return parts;
};

const vehicle: Builder = (rng) => {
  const sporty = rng() > 0.5;
  return [
    part("box", [0, 0.62, 0], [1.05, 0.26, 2.0], 0, { tag: "body", metalness: 0.55, roughness: 0.25 }),
    part("box", [0, 0.95, -0.18], [0.82, 0.28, 1.0], 0, { tag: "body", metalness: 0.55, roughness: 0.25 }),
    part("box", [0, 1.0, 0.28], [0.74, 0.22, 0.5], 3, { tag: "body", metalness: 0.1, roughness: 0.05 }),
    part("box", [0, 0.72, 1.02], [0.9, 0.14, 0.16], 4, { tag: "prop" }),
    part("box", [-0.36, 0.78, 1.0], [0.2, 0.09, 0.08], 3, { tag: "prop" }),
    part("box", [0.36, 0.78, 1.0], [0.2, 0.09, 0.08], 3, { tag: "prop" }),
    ...[
      [-0.58, 0.72],
      [0.58, 0.72],
      [-0.58, -0.78],
      [0.58, -0.78],
    ].map(([x, z]) =>
      part("cylinder", [x, 0.34, z], [0.34, 0.14, 0.34], 4, {
        tag: "prop",
        rotation: [0, 0, Math.PI / 2],
        roughness: 0.85,
      }),
    ),
    ...(sporty
      ? [part("box", [0, 1.02, -1.02], [0.9, 0.05, 0.24], 2, { tag: "prop" })]
      : []),
  ];
};

const spaceship: Builder = () => [
  part("capsule", [0, 1.0, 0], [0.34, 0.9, 0.34], 0, {
    tag: "body",
    rotation: [Math.PI / 2, 0, 0],
    metalness: 0.7,
    roughness: 0.25,
  }),
  part("cone", [0, 1.0, 1.35], [0.3, 0.5, 0.3], 1, { tag: "body", rotation: [Math.PI / 2, 0, 0] }),
  part("box", [0, 0.98, -0.1], [2.1, 0.07, 0.68], 2, { tag: "prop" }),
  part("box", [0, 0.98, -0.95], [0.9, 0.06, 0.4], 2, { tag: "prop" }),
  part("cylinder", [-0.5, 0.98, -1.12], [0.14, 0.22, 0.14], 3, { tag: "prop", rotation: [Math.PI / 2, 0, 0] }),
  part("cylinder", [0.5, 0.98, -1.12], [0.14, 0.22, 0.14], 3, { tag: "prop", rotation: [Math.PI / 2, 0, 0] }),
  part("sphere", [0, 1.28, 0.42], [0.26, 0.2, 0.34], 3, { tag: "head", metalness: 0.2, roughness: 0.05 }),
];

const weapon: Builder = (rng) => {
  const bladeLength = range(rng, 1.2, 1.8);
  return [
    part("box", [0, 1.3 + bladeLength / 2, 0], [0.12, bladeLength, 0.03], 3, {
      tag: "body",
      metalness: 0.9,
      roughness: 0.12,
    }),
    part("cone", [0, 1.32 + bladeLength, 0], [0.12, 0.24, 0.03], 3, { tag: "body", metalness: 0.9, roughness: 0.12 }),
    part("box", [0, 1.24, 0], [0.52, 0.09, 0.1], 4, { tag: "body", metalness: 0.7, roughness: 0.3 }),
    part("cylinder", [0, 0.98, 0], [0.06, 0.26, 0.06], 0, { tag: "body", roughness: 0.8 }),
    part("sphere", [0, 0.7, 0], [0.1, 0.1, 0.1], 1, { tag: "body", metalness: 0.6, roughness: 0.3 }),
  ];
};

const building: Builder = (rng) => {
  const floors = Math.round(range(rng, 1, 3));
  const parts: ModelPart[] = [
    part("box", [0, 0.06, 0], [1.7, 0.12, 1.5], 4, { tag: "body", roughness: 0.9 }),
  ];
  for (let i = 0; i < floors; i++) {
    parts.push(
      part("box", [0, 0.5 + i * 0.9, 0], [1.4, 0.45, 1.2], i % 2 === 0 ? 0 : 1, {
        tag: "body",
      }),
    );
    parts.push(
      part("box", [0, 0.5 + i * 0.9, 0.62], [0.3, 0.28, 0.04], 3, { tag: "prop" }),
    );
  }
  const roofY = 0.5 + (floors - 1) * 0.9 + 0.5;
  parts.push(part("cone", [0, roofY + 0.3, 0], [1.15, 0.6, 1.0], 2, { tag: "prop", rotation: [0, Math.PI / 4, 0] }));
  parts.push(part("box", [0.45, roofY + 0.55, -0.2], [0.16, 0.4, 0.16], 4, { tag: "prop" }));
  return parts;
};

const furniture: Builder = (rng) => {
  const backHeight = range(rng, 0.5, 0.85);
  return [
    part("box", [0, 0.62, 0], [0.72, 0.08, 0.72], 0, { tag: "body" }),
    part("box", [0, 0.62 + backHeight / 2, -0.32], [0.72, backHeight, 0.08], 0, { tag: "body" }),
    ...[
      [-0.3, -0.3],
      [0.3, -0.3],
      [-0.3, 0.3],
      [0.3, 0.3],
    ].map(([x, z]) => part("cylinder", [x, 0.3, z], [0.05, 0.3, 0.05], 2, { tag: "prop" })),
    part("box", [0, 0.7, 0], [0.62, 0.06, 0.62], 1, { tag: "prop", roughness: 0.95 }),
  ];
};

const plant: Builder = (rng) => {
  const canopies = Math.round(range(rng, 2, 4));
  const parts: ModelPart[] = [
    part("cylinder", [0, 0.55, 0], [0.13, 0.55, 0.13], 4, { tag: "body", roughness: 0.95 }),
  ];
  for (let i = 0; i < canopies; i++) {
    const y = 1.15 + i * 0.42;
    const s = 0.72 - i * 0.16;
    parts.push(
      part(i === canopies - 1 ? "cone" : "icosahedron", [0, y, 0], [s, s * 0.9, s], i % 2 === 0 ? 0 : 1, {
        tag: "body",
        roughness: 0.9,
      }),
    );
  }
  return parts;
};

const crystal: Builder = (rng) => {
  const shards = Math.round(range(rng, 3, 6));
  const parts: ModelPart[] = [
    part("cylinder", [0, 0.1, 0], [0.6, 0.1, 0.6], 4, { tag: "body", roughness: 0.9 }),
  ];
  for (let i = 0; i < shards; i++) {
    const angle = (i / shards) * Math.PI * 2;
    const radius = range(rng, 0.12, 0.34);
    const height = range(rng, 0.5, 1.3);
    parts.push(
      part("cone", [Math.cos(angle) * radius, 0.15 + height / 2, Math.sin(angle) * radius], [
        range(rng, 0.14, 0.26),
        height,
        range(rng, 0.14, 0.26),
      ], i % 3, {
        tag: "body",
        rotation: [range(rng, -0.2, 0.2), angle, range(rng, -0.2, 0.2)],
        metalness: 0.3,
        roughness: 0.08,
      }),
    );
  }
  return parts;
};

const food: Builder = (rng) => [
  part("cylinder", [0, 0.28, 0], [0.62, 0.28, 0.62], 4, { tag: "body", roughness: 0.9 }),
  part("cylinder", [0, 0.58, 0], [0.58, 0.14, 0.58], 0, { tag: "body" }),
  part("cylinder", [0, 0.74, 0], [0.6, 0.1, 0.6], 1, { tag: "body" }),
  part("sphere", [0, 0.86, 0], [0.6, 0.28, 0.6], 4, { tag: "body" }),
  ...Array.from({ length: 5 }, (_, i) => {
    const angle = (i / 5) * Math.PI * 2 + rng();
    return part("sphere", [Math.cos(angle) * 0.3, 1.0, Math.sin(angle) * 0.3], [0.09, 0.09, 0.09], 2, {
      tag: "prop",
    });
  }),
];

const container: Builder = () => [
  part("cylinder", [0, 0.42, 0], [0.42, 0.42, 0.42], 0, { tag: "body", metalness: 0.1, roughness: 0.08 }),
  part("cylinder", [0, 0.94, 0], [0.14, 0.24, 0.14], 0, { tag: "body", metalness: 0.1, roughness: 0.08 }),
  part("cylinder", [0, 1.2, 0], [0.18, 0.1, 0.18], 4, { tag: "prop", roughness: 0.8 }),
  part("torus", [0, 0.42, 0], [0.44, 0.44, 0.44], 2, { tag: "prop", rotation: [Math.PI / 2, 0, 0] }),
];

const abstract: Builder = (rng) => {
  const count = Math.round(range(rng, 4, 8));
  return Array.from({ length: count }, (_, i) => {
    const geometry = pick(rng, [
      "icosahedron",
      "torusKnot",
      "torus",
      "sphere",
      "box",
      "cone",
    ] as const);
    const s = range(rng, 0.2, 0.6);
    return part(
      geometry,
      [range(rng, -0.7, 0.7), 0.5 + i * range(rng, 0.2, 0.4), range(rng, -0.7, 0.7)],
      [s, s, s],
      i % 5,
      {
        tag: "body",
        rotation: [range(rng, 0, Math.PI), range(rng, 0, Math.PI), range(rng, 0, Math.PI)],
        metalness: rng() > 0.5 ? 0.7 : 0.1,
        roughness: range(rng, 0.1, 0.8),
      },
    );
  });
};

export interface Archetype {
  id: string;
  label: string;
  keywords: string[];
  build: Builder;
}

export const ARCHETYPES: Archetype[] = [
  {
    id: "robot",
    label: "Robot",
    keywords: ["robot", "mech", "droid", "android", "bot", "cyborg", "machine"],
    build: robot,
  },
  {
    id: "character",
    label: "Character",
    keywords: [
      "character", "human", "person", "man", "woman", "knight", "warrior", "wizard",
      "hero", "soldier", "ninja", "pirate", "astronaut", "girl", "boy", "figure", "avatar",
      "golem", "statue", "orc", "elf", "goblin", "zombie", "skeleton", "troll", "guard", "mage",
    ],
    build: humanoid,
  },
  {
    id: "creature",
    label: "Creature",
    keywords: [
      "creature", "animal", "dragon", "cat", "dog", "wolf", "fox", "bear", "horse",
      "dinosaur", "monster", "beast", "lion", "tiger", "deer", "rabbit", "pet",
      "bird", "frog", "turtle", "sheep", "cow", "boar", "panther", "griffin",
    ],
    build: creature,
  },
  {
    id: "vehicle",
    label: "Vehicle",
    keywords: ["car", "vehicle", "truck", "van", "bus", "kart", "racer", "jeep", "automobile"],
    build: vehicle,
  },
  {
    id: "spaceship",
    label: "Spaceship",
    keywords: ["spaceship", "ship", "starship", "rocket", "shuttle", "fighter", "spacecraft", "ufo"],
    build: spaceship,
  },
  {
    id: "weapon",
    label: "Weapon",
    keywords: ["sword", "blade", "axe", "weapon", "dagger", "katana", "spear", "hammer", "staff"],
    build: weapon,
  },
  {
    id: "building",
    label: "Building",
    keywords: ["house", "building", "cabin", "castle", "tower", "cottage", "temple", "shop", "hut"],
    build: building,
  },
  {
    id: "furniture",
    label: "Furniture",
    keywords: ["chair", "table", "desk", "sofa", "stool", "bench", "furniture", "shelf", "throne"],
    build: furniture,
  },
  {
    id: "plant",
    label: "Plant",
    keywords: ["tree", "plant", "bush", "flower", "cactus", "mushroom", "forest", "palm"],
    build: plant,
  },
  {
    id: "crystal",
    label: "Crystal",
    keywords: ["crystal", "gem", "diamond", "rock", "mineral", "shard", "quartz", "ore"],
    build: crystal,
  },
  {
    id: "food",
    label: "Food",
    keywords: ["cake", "burger", "food", "donut", "bread", "pizza", "dessert", "cupcake"],
    build: food,
  },
  {
    id: "container",
    label: "Container",
    keywords: ["potion", "bottle", "flask", "vase", "jar", "barrel", "cup", "mug", "chalice"],
    build: container,
  },
  { id: "abstract", label: "Abstract", keywords: [], build: abstract },
];

export function matchArchetype(prompt: string): Archetype {
  const words: string[] = prompt.toLowerCase().match(/[a-z]+/g) ?? [];
  let best: { archetype: Archetype; score: number } | null = null;
  for (const archetype of ARCHETYPES) {
    let score = 0;
    for (const keyword of archetype.keywords) {
      if (words.includes(keyword)) score += 2;
      else if (words.some((w) => w.startsWith(keyword) || keyword.startsWith(w))) score += 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { archetype, score };
  }
  return best?.archetype ?? ARCHETYPES[ARCHETYPES.length - 1];
}

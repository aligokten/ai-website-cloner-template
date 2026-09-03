import * as THREE from "three";

export type TexturePattern =
  | "noise"
  | "stripes"
  | "scales"
  | "panels"
  | "grain"
  | "flat";

const PATTERN_KEYWORDS: Array<[TexturePattern, string[]]> = [
  ["scales", ["dragon", "scale", "reptile", "fish", "snake", "lizard"]],
  ["panels", ["robot", "metal", "mech", "sci-fi", "scifi", "armor", "steel", "spaceship"]],
  ["stripes", ["stripe", "tiger", "zebra", "cloth", "fabric", "knit", "woven"]],
  ["grain", ["wood", "oak", "timber", "plank", "bark", "leather"]],
  ["noise", ["stone", "rock", "rust", "concrete", "dirt", "sand", "marble", "grunge"]],
];

export function patternFor(prompt: string): TexturePattern {
  const text = prompt.toLowerCase();
  for (const [pattern, keywords] of PATTERN_KEYWORDS) {
    if (keywords.some((keyword) => text.includes(keyword))) return pattern;
  }
  return "noise";
}

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) * (1 + amount));
  const g = clamp(((n >> 8) & 255) * (1 + amount));
  const b = clamp((n & 255) * (1 + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/**
 * Paint a procedural PBR-ish albedo map on a canvas. Runs in the browser only —
 * callers fall back to a flat material during SSR.
 */
export function createProceduralTexture(
  color: string,
  pattern: TexturePattern,
  seed: number,
  size = 256,
): THREE.Texture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);

  let state = seed >>> 0 || 1;
  const rand = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 10000) / 10000;
  };

  switch (pattern) {
    case "noise": {
      for (let i = 0; i < size * size * 0.16; i++) {
        const a = (rand() - 0.5) * 0.5;
        ctx.fillStyle = shade(color, a);
        ctx.fillRect(rand() * size, rand() * size, 2 + rand() * 3, 2 + rand() * 3);
      }
      break;
    }
    case "stripes": {
      const width = 10 + rand() * 14;
      for (let x = 0; x < size; x += width * 2) {
        ctx.fillStyle = shade(color, -0.24);
        ctx.fillRect(x, 0, width, size);
      }
      break;
    }
    case "scales": {
      const r = 12 + rand() * 6;
      for (let y = 0; y < size + r; y += r * 0.8) {
        for (let x = 0; x < size + r; x += r) {
          ctx.beginPath();
          ctx.arc(x + ((y / (r * 0.8)) % 2) * (r / 2), y, r * 0.62, 0, Math.PI);
          ctx.fillStyle = shade(color, (rand() - 0.5) * 0.4);
          ctx.fill();
          ctx.strokeStyle = shade(color, -0.4);
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      break;
    }
    case "panels": {
      const step = size / 4;
      for (let y = 0; y < size; y += step) {
        for (let x = 0; x < size; x += step) {
          ctx.fillStyle = shade(color, (rand() - 0.5) * 0.22);
          ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
        }
      }
      ctx.strokeStyle = shade(color, -0.55);
      ctx.lineWidth = 2;
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * step, 0);
        ctx.lineTo(i * step, size);
        ctx.moveTo(0, i * step);
        ctx.lineTo(size, i * step);
        ctx.stroke();
      }
      break;
    }
    case "grain": {
      for (let y = 0; y < size; y += 3) {
        ctx.strokeStyle = shade(color, (rand() - 0.5) * 0.35);
        ctx.lineWidth = 1 + rand() * 2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(size / 3, y + rand() * 8 - 4, (size * 2) / 3, y - rand() * 8 + 4, size, y);
        ctx.stroke();
      }
      break;
    }
    case "flat":
    default:
      break;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Average the dominant colors of an image, used by Image to 3D. */
export async function samplePaletteFromImage(dataUrl: string, count = 4): Promise<string[]> {
  if (typeof document === "undefined") return [];
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read the image"));
    img.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  const size = 48;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  ctx.drawImage(image, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  // Bucket pixels into a coarse RGB grid and keep the most populated buckets.
  const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = `${r >> 5}:${g >> 5}:${b >> 5}`;
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    bucket.n += 1;
    buckets.set(key, bucket);
  }

  return [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, count)
    .map(({ r, g, b, n }) => normalizeSwatch(r / n, g / n, b / n));
}

/**
 * Photos are often mostly shadow or mostly blown out. Pull each swatch into a
 * usable lightness band so the generated model never reads as a black slab.
 */
function normalizeSwatch(r: number, g: number, b: number): string {
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const target = Math.max(0.28, Math.min(0.82, luminance));
  const gain = luminance < 0.02 ? 1 : target / luminance;
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value * gain)))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

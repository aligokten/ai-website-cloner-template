import { hashString, mulberry32, type Rng } from "@/lib/rng";

const NAMED_COLORS: Record<string, string> = {
  red: "#e0484a",
  crimson: "#c02940",
  orange: "#f08b34",
  amber: "#f0b429",
  yellow: "#f2d049",
  gold: "#d4a437",
  lime: "#a6d64b",
  green: "#4fae63",
  emerald: "#2fa37a",
  teal: "#2f9d9a",
  cyan: "#43b6cf",
  blue: "#4a7fd6",
  navy: "#2c3f78",
  indigo: "#5a5bd6",
  purple: "#8b5cf6",
  violet: "#8b5cf6",
  magenta: "#c057b8",
  pink: "#e07aa8",
  brown: "#8a6244",
  wood: "#a3743f",
  tan: "#c2a077",
  beige: "#d9c6a5",
  white: "#e9ecf2",
  ivory: "#efe9dc",
  grey: "#8a8f9c",
  gray: "#8a8f9c",
  silver: "#b6bcc7",
  steel: "#8d99a8",
  iron: "#6d7480",
  black: "#2a2c33",
  obsidian: "#25262c",
  copper: "#b87333",
  bronze: "#a3702f",
  rust: "#a05334",
  neon: "#3ef2c2",
  pastel: "#f0c2d8",
};

function hslHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(-1, Math.min(Math.min(k - 3, 9 - k), 1));
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Colors explicitly named in the prompt, in the order they appear. */
export function namedColorsFrom(prompt: string): string[] {
  const words: string[] = prompt.toLowerCase().match(/[a-z]+/g) ?? [];
  const found: string[] = [];
  for (const word of words) {
    const hex = NAMED_COLORS[word];
    if (hex && !found.includes(hex)) found.push(hex);
  }
  return found;
}

/**
 * Build a 5-swatch harmonic palette. Named prompt colors take the lead slots,
 * the rest is derived deterministically from the prompt hash.
 */
export function buildPalette(prompt: string, seed: number): string[] {
  const rng = mulberry32(seed ^ hashString(prompt));
  const named = namedColorsFrom(prompt);
  const baseHue = named.length ? hueOf(named[0]) : Math.floor(rng() * 360);
  const scheme = [0, 30, -35, 165, 12];
  const generated = scheme.map((offset, index) =>
    hslHex(
      (baseHue + offset + 360) % 360,
      0.32 + rng() * 0.34,
      index === 4 ? 0.24 + rng() * 0.1 : 0.42 + rng() * 0.28,
    ),
  );
  // One named colour means the prompt is describing the whole object, so let it
  // carry most of the model instead of a single slot.
  if (named.length === 1) {
    const base = named[0];
    const palette = [base, shade(base, 0.18), generated[2], shade(base, -0.22), generated[4]];
    return palette;
  }

  const palette = [...named, ...generated].slice(0, 5);
  while (palette.length < 5) palette.push(generated[palette.length % 5]);
  return palette;
}

function shade(hex: string, amount: number): string {
  const value = parseInt(hex.slice(1), 16);
  const clamp = (channel: number) => Math.max(0, Math.min(255, Math.round(channel * (1 + amount))));
  const r = clamp((value >> 16) & 255);
  const g = clamp((value >> 8) & 255);
  const b = clamp(value & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function hueOf(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return Math.round(((h * 60) + 360) % 360);
}

/** Slightly vary a swatch so repeated parts do not read as flat plastic. */
export function jitter(hex: string, rng: Rng, amount = 0.08): string {
  const n = parseInt(hex.slice(1), 16);
  const shift = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v * (1 + (rng() - 0.5) * 2 * amount))));
  const r = shift((n >> 16) & 255);
  const g = shift((n >> 8) & 255);
  const b = shift(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

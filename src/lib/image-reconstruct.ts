/**
 * Turn a photo into geometry without a model: segment the subject from the
 * background, then inflate the silhouette into a volume using a distance
 * transform, keeping the image's own colors per cell.
 */

export interface ReliefData {
  /** Grid resolution (size × size cells). */
  size: number;
  /** Base64 of one depth byte per cell; 0 means empty. */
  depth: string;
  /** Base64 of three color bytes per cell. */
  colors: string;
  /** Width / height of the original image, so the mesh keeps its proportions. */
  aspect: number;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The image could not be read."));
    image.src = dataUrl;
  });
}

/**
 * Flood fill inwards from the border. Only background connected to the edge is
 * removed, so a subject whose colors match the backdrop stays intact.
 */
function segment(data: Uint8ClampedArray, size: number, tolerance: number): Uint8Array {
  const mask = new Uint8Array(size * size).fill(1);
  const visited = new Uint8Array(size * size);
  const at = (x: number, y: number) => (y * size + x) * 4;

  // Reference background color: the median-ish average of the border ring.
  let br = 0;
  let bg = 0;
  let bb = 0;
  let count = 0;
  for (let i = 0; i < size; i++) {
    for (const [x, y] of [
      [i, 0],
      [i, size - 1],
      [0, i],
      [size - 1, i],
    ] as const) {
      const index = at(x, y);
      br += data[index];
      bg += data[index + 1];
      bb += data[index + 2];
      count++;
    }
  }
  br /= count;
  bg /= count;
  bb /= count;

  const stack: number[] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const cell = y * size + x;
    if (visited[cell]) return;
    visited[cell] = 1;
    stack.push(x, y);
  };

  for (let i = 0; i < size; i++) {
    push(i, 0);
    push(i, size - 1);
    push(0, i);
    push(size - 1, i);
  }

  while (stack.length) {
    const y = stack.pop() as number;
    const x = stack.pop() as number;
    const index = at(x, y);
    const alpha = data[index + 3];

    const transparent = alpha < 128;
    const distance =
      Math.abs(data[index] - br) + Math.abs(data[index + 1] - bg) + Math.abs(data[index + 2] - bb);
    if (!transparent && distance > tolerance) continue;

    mask[y * size + x] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  // The flood fill only reaches background connected to the border, so an
  // enclosed hole (a mug handle, a ring) stays filled. Anything left that still
  // matches the backdrop closely is one of those holes.
  const strict = tolerance * 0.6;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    const index = i * 4;
    if (data[index + 3] < 128) {
      mask[i] = 0;
      continue;
    }
    const distance =
      Math.abs(data[index] - br) + Math.abs(data[index + 1] - bg) + Math.abs(data[index + 2] - bb);
    if (distance <= strict) mask[i] = 0;
  }

  return mask;
}

/** Two-pass chamfer distance transform — cheap and good enough to inflate with. */
function distanceTransform(mask: Uint8Array, size: number): Float32Array {
  const INF = 1e6;
  const dist = new Float32Array(size * size);
  for (let i = 0; i < dist.length; i++) dist[i] = mask[i] ? INF : 0;

  const get = (x: number, y: number) =>
    x < 0 || y < 0 || x >= size || y >= size ? 0 : dist[y * size + x];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cell = y * size + x;
      if (!mask[cell]) continue;
      dist[cell] = Math.min(
        dist[cell],
        get(x - 1, y) + 1,
        get(x, y - 1) + 1,
        get(x - 1, y - 1) + 1.4,
        get(x + 1, y - 1) + 1.4,
      );
    }
  }
  for (let y = size - 1; y >= 0; y--) {
    for (let x = size - 1; x >= 0; x--) {
      const cell = y * size + x;
      if (!mask[cell]) continue;
      dist[cell] = Math.min(
        dist[cell],
        get(x + 1, y) + 1,
        get(x, y + 1) + 1,
        get(x + 1, y + 1) + 1.4,
        get(x - 1, y + 1) + 1.4,
      );
    }
  }
  return dist;
}

export interface ReconstructOptions {
  /** Grid resolution; higher means more polygons. */
  size?: number;
  /** Background color tolerance, 0 – 765. */
  tolerance?: number;
}

export async function reconstructFromImage(
  dataUrl: string,
  options: ReconstructOptions = {},
): Promise<ReliefData | null> {
  if (typeof document === "undefined") return null;

  const size = Math.max(16, Math.min(128, Math.round(options.size ?? 56)));
  const tolerance = options.tolerance ?? 90;

  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  // Letterbox so the subject keeps its proportions inside the square grid.
  const ratio = image.width / image.height || 1;
  const drawWidth = ratio >= 1 ? size : size * ratio;
  const drawHeight = ratio >= 1 ? size / ratio : size;
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(image, (size - drawWidth) / 2, (size - drawHeight) / 2, drawWidth, drawHeight);

  const { data } = ctx.getImageData(0, 0, size, size);
  const mask = segment(data, size, tolerance);

  const filled = mask.reduce((sum, value) => sum + value, 0);
  // A mask that ate everything (or nothing) is worse than no reconstruction.
  if (filled < size * 2 || filled > mask.length * 0.98) return null;

  const dist = distanceTransform(mask, size);
  let maxDist = 0;
  for (const value of dist) maxDist = Math.max(maxDist, value);
  if (maxDist <= 0) return null;

  const depth = new Uint8Array(size * size);
  const colors = new Uint8Array(size * size * 3);
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    // sqrt keeps the surface rounded instead of a cone.
    const normalized = Math.sqrt(dist[i] / maxDist);
    depth[i] = Math.max(1, Math.round(normalized * 255));
    colors[i * 3] = data[i * 4];
    colors[i * 3 + 1] = data[i * 4 + 1];
    colors[i * 3 + 2] = data[i * 4 + 2];
  }

  return { size, depth: toBase64(depth), colors: toBase64(colors), aspect: ratio };
}

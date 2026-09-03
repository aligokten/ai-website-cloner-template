import * as THREE from "three";
import { fromBase64 } from "@/lib/image-reconstruct";
import type { ReliefSpec } from "@/types";

/**
 * Build a double-sided inflated mesh from a reconstructed silhouette: a front
 * surface pushed out by the depth map, a mirrored back surface, and a rim that
 * closes the two along the outline. Colors come from the source image.
 */
export function buildReliefGeometry(relief: ReliefSpec, thickness = 0.55) {
  const { size } = relief;
  const depth = fromBase64(relief.depth);
  const colors = fromBase64(relief.colors);

  const positions: number[] = [];
  const normals: number[] = [];
  const colorAttr: number[] = [];

  const filled = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < size && y < size && depth[y * size + x] > 0;

  // Map grid space to a centered unit square, keeping the image proportions.
  const scaleX = relief.aspect >= 1 ? 1 : relief.aspect;
  const scaleY = relief.aspect >= 1 ? 1 / relief.aspect : 1;
  const px = (x: number) => ((x / (size - 1)) * 2 - 1) * scaleX;
  const py = (y: number) => (1 - (y / (size - 1)) * 2) * scaleY;
  const pz = (x: number, y: number) => (depth[y * size + x] / 255) * thickness;

  const colorAt = (x: number, y: number) => {
    let sx = x;
    let sy = y;
    if (!filled(x, y)) {
      // Edge vertices sit on empty cells; borrow the colour that meets them.
      const neighbours: Array<[number, number]> = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
        [x - 1, y - 1],
        [x + 1, y + 1],
      ];
      const found = neighbours.find(([nx, ny]) => filled(nx, ny));
      if (found) {
        sx = found[0];
        sy = found[1];
      }
    }
    const index = (sy * size + sx) * 3;
    // Undo sRGB so lighting keeps the photo's tones.
    const channel = (value: number) => Math.pow(value / 255, 2.2);
    return [channel(colors[index]), channel(colors[index + 1]), channel(colors[index + 2])];
  };

  const pushVertex = (x: number, y: number, z: number, color: number[], normal: number[]) => {
    positions.push(px(x), py(y), z);
    normals.push(normal[0], normal[1], normal[2]);
    colorAttr.push(color[0], color[1], color[2]);
  };

  /**
   * Emit a quad wherever any corner is filled, letting empty corners sit at
   * zero depth. Front and back then meet along the outline, so the mesh closes
   * itself and needs no separate rim (which used to leave stair-step gaps).
   */
  const surface = (front: boolean) => {
    const sign = front ? 1 : -1;
    const normal = [0, 0, sign];
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        if (!filled(x, y) && !filled(x + 1, y) && !filled(x, y + 1) && !filled(x + 1, y + 1)) {
          continue;
        }
        const corners: Array<[number, number]> = front
          ? [
              [x, y],
              [x, y + 1],
              [x + 1, y],
              [x + 1, y],
              [x, y + 1],
              [x + 1, y + 1],
            ]
          : [
              [x, y],
              [x + 1, y],
              [x, y + 1],
              [x + 1, y],
              [x + 1, y + 1],
              [x, y + 1],
            ];
        for (const [cx, cy] of corners) {
          pushVertex(cx, cy, sign * pz(cx, cy), colorAt(cx, cy), normal);
        }
      }
    }
  };

  surface(true);
  surface(false);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colorAttr, 3));
  geometry.computeVertexNormals();
  return geometry;
}

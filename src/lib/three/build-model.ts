import * as THREE from "three";
import { buildReliefGeometry } from "@/lib/three/build-relief";
import { createProceduralTexture, patternFor } from "@/lib/three/texture";
import type { AnimationPreset, ModelPart, ModelSpec } from "@/types";

export interface BuiltModel {
  group: THREE.Group;
  /** Actual triangles in the built mesh. */
  triangles: number;
  vertices: number;
  materials: THREE.Material[];
  geometries: THREE.BufferGeometry[];
  textures: THREE.Texture[];
}

/** Map a target polycount onto per-primitive segment counts. */
function detailFor(polycount: number, partCount: number) {
  const perPart = polycount / Math.max(1, partCount);
  const level = Math.max(0, Math.min(1, Math.log10(Math.max(perPart, 10)) / 4.2));
  return {
    radial: Math.max(4, Math.round(4 + level * 60)),
    height: Math.max(1, Math.round(1 + level * 24)),
    detail: Math.max(0, Math.round(level * 4)),
    box: Math.max(1, Math.round(1 + level * 14)),
  };
}

function geometryFor(part: ModelPart, detail: ReturnType<typeof detailFor>) {
  const { radial, height, box } = detail;
  switch (part.geometry) {
    case "box":
      return new THREE.BoxGeometry(2, 2, 2, box, box, box);
    case "sphere":
      return new THREE.SphereGeometry(1, radial, Math.max(3, Math.round(radial / 2)));
    case "cylinder":
      return new THREE.CylinderGeometry(1, 1, 2, radial, height);
    case "cone":
      return new THREE.ConeGeometry(1, 2, radial, height);
    case "torus":
      return new THREE.TorusGeometry(1, 0.32, Math.max(4, Math.round(radial / 2)), radial);
    case "capsule":
      return new THREE.CapsuleGeometry(1, 1.2, Math.max(2, Math.round(radial / 4)), radial);
    case "torusKnot":
      return new THREE.TorusKnotGeometry(1, 0.3, Math.max(24, radial * 2), Math.max(6, Math.round(radial / 2)));
    case "icosahedron":
    default:
      return new THREE.IcosahedronGeometry(1, detail.detail);
  }
}

export interface BuildOptions {
  /** Draw an untextured clay material (preview stage / texture disabled). */
  untextured?: boolean;
  /** Skip canvas textures — used for exports and for SSR safety. */
  flatShadingOnly?: boolean;
}

export function buildModel(spec: ModelSpec, options: BuildOptions = {}): BuiltModel {
  if (spec.relief) return buildReliefModel(spec, options);

  const group = new THREE.Group();
  const detail = detailFor(spec.polycount, spec.parts.length);
  const flat = spec.style === "low-poly" || spec.style === "voxel";
  const pattern = patternFor(spec.texturePrompt ?? spec.archetype);

  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const textures: THREE.Texture[] = [];

  let triangles = 0;
  let vertices = 0;

  spec.parts.forEach((part, index) => {
    const geometry = geometryFor(part, flat ? { ...detail, radial: Math.min(detail.radial, 10), detail: Math.min(detail.detail, 1), box: 1, height: 1 } : detail);
    geometries.push(geometry);

    const color = options.untextured
      ? "#b9b6c6"
      : spec.palette[part.color % spec.palette.length] ?? spec.palette[0];

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      flatShading: flat,
      metalness: options.untextured ? 0.05 : part.metalness ?? 0.15,
      roughness: options.untextured ? 0.85 : part.roughness ?? 0.55,
    });

    if (spec.textured && !options.untextured && !options.flatShadingOnly) {
      const texture = createProceduralTexture(color, pattern, spec.seed + index);
      if (texture) {
        material.map = texture;
        textures.push(texture);
      }
    }
    materials.push(material);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...part.position);
    mesh.rotation.set(...part.rotation);
    mesh.scale.set(...part.scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = part.tag ? `${part.tag}_${index}` : `part_${index}`;
    mesh.userData.tag = part.tag ?? "body";
    mesh.userData.basePosition = [...part.position];
    mesh.userData.baseRotation = [...part.rotation];
    group.add(mesh);

    const positionCount = geometry.attributes.position.count;
    vertices += positionCount;
    triangles += geometry.index
      ? geometry.index.count / 3
      : positionCount / 3;
  });

  // Center the model horizontally and rest it on the ground plane.
  const bounds = new THREE.Box3().setFromObject(group);
  const center = bounds.getCenter(new THREE.Vector3());
  group.position.x -= center.x;
  group.position.z -= center.z;
  group.position.y -= bounds.min.y;

  const size = bounds.getSize(new THREE.Vector3());
  const maxAxis = Math.max(size.x, size.y, size.z) || 1;
  const normalized = 2.4 / maxAxis;
  group.scale.setScalar(normalized);
  group.position.multiplyScalar(normalized);

  return {
    group,
    triangles: Math.round(spec.topology === "quad" ? triangles / 2 : triangles),
    vertices,
    materials,
    geometries,
    textures,
  };
}

/** A model reconstructed from an image: one inflated, vertex-colored mesh. */
function buildReliefModel(spec: ModelSpec, options: BuildOptions): BuiltModel {
  const relief = spec.relief as NonNullable<ModelSpec["relief"]>;
  const group = new THREE.Group();
  const geometry = buildReliefGeometry(relief, spec.style === "low-poly" ? 0.34 : 0.46);

  const material = new THREE.MeshStandardMaterial({
    vertexColors: !options.untextured,
    color: options.untextured ? new THREE.Color("#b9b6c6") : 0xffffff,
    flatShading: spec.style === "low-poly" || spec.style === "voxel",
    roughness: 0.88,
    metalness: 0,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.tag = "body";
  mesh.userData.basePosition = [0, 0, 0];
  mesh.userData.baseRotation = [0, 0, 0];
  group.add(mesh);

  const bounds = new THREE.Box3().setFromObject(group);
  const center = bounds.getCenter(new THREE.Vector3());
  group.position.x -= center.x;
  group.position.z -= center.z;
  group.position.y -= bounds.min.y;

  const size = bounds.getSize(new THREE.Vector3());
  const maxAxis = Math.max(size.x, size.y, size.z) || 1;
  const normalized = 2.4 / maxAxis;
  group.scale.setScalar(normalized);
  group.position.multiplyScalar(normalized);

  const count = geometry.attributes.position.count;
  return {
    group,
    triangles: Math.round(spec.topology === "quad" ? count / 6 : count / 3),
    vertices: count,
    materials: [material],
    geometries: [geometry],
    textures: [],
  };
}

export function disposeModel(model: BuiltModel) {
  model.geometries.forEach((geometry) => geometry.dispose());
  model.materials.forEach((material) => material.dispose());
  model.textures.forEach((texture) => texture.dispose());
  model.group.clear();
}

/** Drive the animation presets by mutating each tagged mesh per frame. */
export function applyAnimation(
  group: THREE.Group,
  preset: AnimationPreset,
  time: number,
) {
  if (preset === "none") {
    group.children.forEach((child) => {
      const base = child.userData.basePosition as [number, number, number] | undefined;
      const baseRotation = child.userData.baseRotation as [number, number, number] | undefined;
      if (base) child.position.set(...base);
      if (baseRotation) child.rotation.set(...baseRotation);
    });
    group.rotation.y = 0;
    group.position.y = group.userData.baseY ?? group.position.y;
    return;
  }

  if (preset === "spin") {
    group.rotation.y = time * 0.9;
    return;
  }

  if (preset === "bounce") {
    const baseY = (group.userData.baseY as number | undefined) ?? group.position.y;
    group.userData.baseY = baseY;
    group.position.y = baseY + Math.abs(Math.sin(time * 2.4)) * 0.35;
    group.rotation.y = time * 0.3;
    return;
  }

  group.children.forEach((child) => {
    const tag = child.userData.tag as string | undefined;
    const base = child.userData.basePosition as [number, number, number] | undefined;
    const baseRotation = child.userData.baseRotation as [number, number, number] | undefined;
    if (!base || !baseRotation) return;

    if (preset === "idle") {
      const breathe = Math.sin(time * 1.6) * 0.03;
      child.position.set(base[0], base[1] + (tag === "head" || tag === "body" ? breathe : breathe * 0.4), base[2]);
      if (tag === "armL") child.rotation.z = baseRotation[2] + Math.sin(time * 1.6) * 0.08;
      if (tag === "armR") child.rotation.z = baseRotation[2] - Math.sin(time * 1.6) * 0.08;
      return;
    }

    // walk
    const swing = Math.sin(time * 4);
    switch (tag) {
      case "legL":
      case "armR":
        child.rotation.x = baseRotation[0] + swing * 0.6;
        break;
      case "legR":
      case "armL":
        child.rotation.x = baseRotation[0] - swing * 0.6;
        break;
      case "body":
        child.position.set(base[0], base[1] + Math.abs(swing) * 0.05, base[2]);
        break;
      case "head":
        child.rotation.y = baseRotation[1] + Math.sin(time * 2) * 0.12;
        break;
      default:
        break;
    }
  });
}

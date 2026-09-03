import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";
import { PLYExporter } from "three/examples/jsm/exporters/PLYExporter.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { USDZExporter } from "three/examples/jsm/exporters/USDZExporter.js";
import { buildModel, disposeModel } from "@/lib/three/build-model";
import { disposeLoaded, loadModelFromUrl } from "@/lib/three/load-model";
import type { ModelSpec } from "@/types";

export type ExportFormat = "glb" | "obj" | "stl" | "ply" | "usdz";

export const EXPORT_FORMATS: Array<{
  id: ExportFormat;
  label: string;
  extension: string;
  hint: string;
}> = [
  { id: "glb", label: "glTF Binary", extension: "glb", hint: "Web, Unity, Godot, three.js" },
  { id: "obj", label: "Wavefront OBJ", extension: "obj", hint: "Universal, Blender, Maya" },
  { id: "stl", label: "STL", extension: "stl", hint: "3D printing, slicers" },
  { id: "ply", label: "PLY", extension: "ply", hint: "Point cloud & scan tools" },
  { id: "usdz", label: "USDZ", extension: "usdz", hint: "Apple AR Quick Look" },
];

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 2_000);
}

function slug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "sagg3d-model"
  );
}

async function writeObject(
  object: THREE.Object3D,
  format: ExportFormat,
  filename: string,
): Promise<void> {
  switch (format) {
    case "glb": {
      const exporter = new GLTFExporter();
      const result = await exporter.parseAsync(object, { binary: true });
      download(new Blob([result as ArrayBuffer], { type: "model/gltf-binary" }), filename);
      break;
    }
    case "obj": {
      const text = new OBJExporter().parse(object);
      download(new Blob([text], { type: "text/plain" }), filename);
      break;
    }
    case "stl": {
      const text = new STLExporter().parse(object);
      download(new Blob([text], { type: "model/stl" }), filename);
      break;
    }
    case "ply": {
      const text = new PLYExporter().parse(object, () => {}, { binary: false }) as unknown as string;
      download(new Blob([text ?? ""], { type: "text/plain" }), filename);
      break;
    }
    case "usdz": {
      const exporter = new USDZExporter();
      const result = await exporter.parseAsync(object);
      download(new Blob([result as unknown as ArrayBuffer], { type: "model/vnd.usdz+zip" }), filename);
      break;
    }
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

/** Export a spec to a real, openable model file and trigger the download. */
export async function exportSpec(
  spec: ModelSpec,
  format: ExportFormat,
  name: string,
): Promise<string> {
  const model = buildModel(spec, { flatShadingOnly: format !== "glb" });
  const filename = `${slug(name)}.${format}`;
  try {
    await writeObject(model.group, format, filename);
  } finally {
    disposeModel(model);
  }
  return filename;
}

/**
 * Export a provider-generated model. The .glb is downloaded straight through;
 * other formats are converted in the browser from the loaded mesh.
 */
export async function exportModelUrl(
  url: string,
  format: ExportFormat,
  name: string,
): Promise<string> {
  const filename = `${slug(name)}.${format}`;

  if (format === "glb") {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Could not download the model (${response.status}).`);
    download(await response.blob(), filename);
    return filename;
  }

  const model = await loadModelFromUrl(url);
  try {
    await writeObject(model.group, format, filename);
  } finally {
    disposeLoaded(model);
  }
  return filename;
}

/** Render the current model to a PNG thumbnail (used by the asset library). */
let thumbRenderer: THREE.WebGLRenderer | null = null;
let thumbEnvironment: THREE.Texture | null = null;
// Kept alive: disposing the generator also invalidates the texture it produced.
let thumbPmrem: THREE.PMREMGenerator | null = null;
const thumbCache = new Map<string, string>();

function thumbKey(spec: ModelSpec, size: number) {
  return `${spec.seed}:${spec.archetype}:${spec.style}:${spec.topology}:${spec.polycount}:${spec.textured}:${spec.palette.join("")}:${size}`;
}

export function renderThumbnail(spec: ModelSpec, size = 320): string | null {
  if (typeof document === "undefined") return null;
  const key = thumbKey(spec, size);
  const cached = thumbCache.get(key);
  if (cached) return cached;

  try {
    // One shared renderer — browsers cap the number of live WebGL contexts.
    if (!thumbRenderer) {
      thumbRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      thumbRenderer.setPixelRatio(1);
      thumbRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      thumbRenderer.toneMappingExposure = 1.05;
    }
    thumbRenderer.setSize(size, size);

    const scene = new THREE.Scene();
    if (!thumbEnvironment) {
      thumbPmrem = new THREE.PMREMGenerator(thumbRenderer);
      thumbEnvironment = thumbPmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    }
    scene.environment = thumbEnvironment;

    const model = buildModel(spec, { flatShadingOnly: true });
    scene.add(model.group);

    const key1 = new THREE.DirectionalLight(0xffffff, 1.35);
    key1.position.set(3, 5, 4);
    scene.add(key1);
    const rim = new THREE.DirectionalLight(0x9aa8ff, 0.55);
    rim.position.set(-4, 2, -3);
    scene.add(rim);
    scene.add(new THREE.HemisphereLight(0xbfc6ff, 0x1b1b22, 0.45));

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(3.4, 2.7, 4.4);
    camera.lookAt(0, 1.1, 0);

    thumbRenderer.render(scene, camera);
    const dataUrl = thumbRenderer.domElement.toDataURL("image/png");
    disposeModel(model);
    if (thumbCache.size > 120) thumbCache.clear();
    thumbCache.set(key, dataUrl);
    return dataUrl;
  } catch {
    return null;
  }
}

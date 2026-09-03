import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export interface LoadedModel {
  group: THREE.Group;
  triangles: number;
  vertices: number;
  materials: THREE.Material[];
}

/** Fit any imported mesh into the same stage the procedural models use. */
function normalize(object: THREE.Object3D) {
  const bounds = new THREE.Box3().setFromObject(object);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const maxAxis = Math.max(size.x, size.y, size.z) || 1;
  const scale = 2.4 / maxAxis;

  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y -= bounds.min.y;
  object.scale.setScalar(scale);
  object.position.multiplyScalar(scale);
}

/** Load a .glb/.gltf produced by a generation provider. */
export async function loadModelFromUrl(url: string): Promise<LoadedModel> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  const group = new THREE.Group();
  group.add(gltf.scene);

  let triangles = 0;
  let vertices = 0;
  const materials: THREE.Material[] = [];

  gltf.scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
    const geometry = child.geometry as THREE.BufferGeometry;
    const positionCount = geometry.attributes.position?.count ?? 0;
    vertices += positionCount;
    triangles += geometry.index ? geometry.index.count / 3 : positionCount / 3;
    const material = child.material;
    if (Array.isArray(material)) materials.push(...material);
    else if (material) materials.push(material);
  });

  normalize(group);

  return { group, triangles: Math.round(triangles), vertices, materials };
}

export function disposeLoaded(model: LoadedModel) {
  model.group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const material = child.material;
      if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
      else material?.dispose();
    }
  });
  model.group.clear();
}

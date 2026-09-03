"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { applyAnimation, buildModel, disposeModel } from "@/lib/three/build-model";
import { disposeLoaded, loadModelFromUrl } from "@/lib/three/load-model";
import { cn } from "@/lib/utils";
import type { AnimationPreset, ModelSpec } from "@/types";

export interface ModelStats {
  triangles: number;
  vertices: number;
}

interface ModelViewerProps {
  spec: ModelSpec | null;
  /** A provider-generated .glb — takes precedence over `spec` when present. */
  modelUrl?: string | null;
  onLoadError?: (message: string) => void;
  animation?: AnimationPreset;
  wireframe?: boolean;
  autoRotate?: boolean;
  untextured?: boolean;
  environment?: "studio" | "sunset" | "night";
  className?: string;
  onStats?: (stats: ModelStats) => void;
}

const ENVIRONMENTS = {
  studio: { key: 0xffffff, fill: 0xbfc6ff, ground: 0x1b1b22, intensity: 1.35 },
  sunset: { key: 0xffb27a, fill: 0x8a6bff, ground: 0x2a1a24, intensity: 1.6 },
  night: { key: 0x8fb6ff, fill: 0x4d3fa8, ground: 0x101018, intensity: 0.95 },
} as const;

export function ModelViewer({
  spec,
  modelUrl = null,
  onLoadError,
  animation = "none",
  wireframe = false,
  autoRotate = true,
  untextured = false,
  environment = "studio",
  className,
  onStats,
}: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<ReturnType<typeof buildModel> | null>(null);
  const loadedRef = useRef<Awaited<ReturnType<typeof loadModelFromUrl>> | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationRef = useRef<AnimationPreset>(animation);
  const fallbackRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    animationRef.current = animation;
  }, [animation]);

  // Scene lifecycle — created once per mount.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      // No WebGL in this browser — reveal the static fallback instead.
      if (fallbackRef.current) fallbackRef.current.hidden = false;
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Filmic tone mapping keeps bright, saturated surfaces from clipping to white.
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Metals render black without something to reflect, so give the scene an
    // image-based environment. It also softens every other material.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environmentMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environmentMap;

    const camera = new THREE.PerspectiveCamera(
      40,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      120,
    );
    camera.position.set(3.6, 2.8, 4.6);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 1.05, 0);
    controls.minDistance = 2;
    controls.maxDistance = 14;
    controls.maxPolarAngle = Math.PI * 0.52;
    controlsRef.current = controls;

    const env = ENVIRONMENTS[environment];
    const key = new THREE.DirectionalLight(env.key, env.intensity);
    key.position.set(4, 6, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const rim = new THREE.DirectionalLight(env.fill, 0.55);
    rim.position.set(-5, 2.5, -4);
    scene.add(rim);
    scene.add(new THREE.HemisphereLight(env.fill, env.ground, 0.45));

    const grid = new THREE.GridHelper(24, 24, 0x5b5f76, 0x2c2f3d);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.32;
    scene.add(grid);

    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.ShadowMaterial({ opacity: 0.28 }),
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    const clock = new THREE.Clock();
    let frame = 0;
    const render = () => {
      frame = requestAnimationFrame(render);
      const elapsed = clock.getElapsedTime();
      const active = modelRef.current?.group ?? loadedRef.current?.group;
      if (active) applyAnimation(active, animationRef.current, elapsed);
      controls.autoRotate = autoRotate && animationRef.current !== "spin";
      controls.autoRotateSpeed = 1.1;
      controls.update();
      renderer.render(scene, camera);
    };
    render();

    const observer = new ResizeObserver(() => {
      const width = container.clientWidth;
      const height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });
    observer.observe(container);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      environmentMap.dispose();
      pmrem.dispose();
      if (modelRef.current) {
        scene.remove(modelRef.current.group);
        disposeModel(modelRef.current);
        modelRef.current = null;
      }
      if (loadedRef.current) {
        scene.remove(loadedRef.current.group);
        disposeLoaded(loadedRef.current);
        loadedRef.current = null;
      }
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
      controlsRef.current = null;
    };
  }, [autoRotate, environment]);

  // Swap the mesh whenever the source changes: a provider model wins over a spec.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const clear = () => {
      if (modelRef.current) {
        scene.remove(modelRef.current.group);
        disposeModel(modelRef.current);
        modelRef.current = null;
      }
      if (loadedRef.current) {
        scene.remove(loadedRef.current.group);
        disposeLoaded(loadedRef.current);
        loadedRef.current = null;
      }
    };
    clear();

    if (modelUrl) {
      let cancelled = false;
      loadModelFromUrl(modelUrl)
        .then((model) => {
          if (cancelled || !sceneRef.current) {
            disposeLoaded(model);
            return;
          }
          loadedRef.current = model;
          sceneRef.current.add(model.group);
          onStats?.({ triangles: model.triangles, vertices: model.vertices });
        })
        .catch((cause: unknown) => {
          if (cancelled) return;
          onLoadError?.(
            cause instanceof Error ? cause.message : "The generated model could not be loaded.",
          );
        });
      return () => {
        cancelled = true;
      };
    }

    if (!spec) return;

    const model = buildModel(spec, { untextured });
    modelRef.current = model;
    scene.add(model.group);
    onStats?.({ triangles: model.triangles, vertices: model.vertices });
  }, [spec, modelUrl, untextured, onStats, onLoadError]);

  // Wireframe is a material flag, so it does not need a rebuild.
  useEffect(() => {
    const materials = modelRef.current?.materials ?? loadedRef.current?.materials;
    if (!materials) return;
    materials.forEach((material) => {
      (material as THREE.MeshStandardMaterial).wireframe = wireframe;
    });
  }, [wireframe, spec, modelUrl]);

  return (
    <div ref={containerRef} className={cn("relative h-full w-full", className)} data-testid="model-viewer">
      <p
        ref={fallbackRef}
        hidden
        className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground"
      >
        WebGL is unavailable in this browser, so the 3D preview cannot render.
      </p>
    </div>
  );
}

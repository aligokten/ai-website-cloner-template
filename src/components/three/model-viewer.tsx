"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { applyAnimation, buildModel, disposeModel } from "@/lib/three/build-model";
import { cn } from "@/lib/utils";
import type { AnimationPreset, ModelSpec } from "@/types";

export interface ModelStats {
  triangles: number;
  vertices: number;
}

interface ModelViewerProps {
  spec: ModelSpec | null;
  animation?: AnimationPreset;
  wireframe?: boolean;
  autoRotate?: boolean;
  untextured?: boolean;
  environment?: "studio" | "sunset" | "night";
  className?: string;
  onStats?: (stats: ModelStats) => void;
}

const ENVIRONMENTS = {
  studio: { key: 0xffffff, fill: 0xbfc6ff, ground: 0x1b1b22, intensity: 2.6 },
  sunset: { key: 0xffb27a, fill: 0x8a6bff, ground: 0x2a1a24, intensity: 2.9 },
  night: { key: 0x8fb6ff, fill: 0x4d3fa8, ground: 0x101018, intensity: 1.9 },
} as const;

export function ModelViewer({
  spec,
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
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    sceneRef.current = scene;

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
    const rim = new THREE.DirectionalLight(env.fill, 1.1);
    rim.position.set(-5, 2.5, -4);
    scene.add(rim);
    scene.add(new THREE.HemisphereLight(env.fill, env.ground, 1.3));

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
      const model = modelRef.current;
      if (model) applyAnimation(model.group, animationRef.current, elapsed);
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
      if (modelRef.current) {
        scene.remove(modelRef.current.group);
        disposeModel(modelRef.current);
        modelRef.current = null;
      }
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
      controlsRef.current = null;
    };
  }, [autoRotate, environment]);

  // Rebuild the mesh whenever the spec changes.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (modelRef.current) {
      scene.remove(modelRef.current.group);
      disposeModel(modelRef.current);
      modelRef.current = null;
    }
    if (!spec) return;

    const model = buildModel(spec, { untextured });
    modelRef.current = model;
    scene.add(model.group);
    onStats?.({ triangles: model.triangles, vertices: model.vertices });
  }, [spec, untextured, onStats]);

  // Wireframe is a material flag, so it does not need a rebuild.
  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;
    model.materials.forEach((material) => {
      (material as THREE.MeshStandardMaterial).wireframe = wireframe;
    });
  }, [wireframe, spec]);

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

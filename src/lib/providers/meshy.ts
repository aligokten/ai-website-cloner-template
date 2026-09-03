import {
  ProviderError,
  type GenerationProvider,
  type ProviderRequest,
  type ProviderTask,
} from "@/lib/providers/types";
import type { TaskMode } from "@/types";

const BASE = "https://api.meshy.ai/openapi";

/** Meshy exposes a narrower style vocabulary than the workspace does. */
const ART_STYLE: Record<string, string> = {
  realistic: "realistic",
  sculpture: "sculpture",
  cartoon: "realistic",
  "low-poly": "realistic",
  voxel: "realistic",
};

interface MeshyTask {
  id?: string;
  status?: string;
  progress?: number;
  task_error?: { message?: string };
  thumbnail_url?: string;
  model_urls?: Record<string, string>;
}

function endpointFor(mode: TaskMode) {
  return mode === "image-to-3d" ? `${BASE}/v1/image-to-3d` : `${BASE}/v2/text-to-3d`;
}

async function call<T>(url: string, key: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const text = await response.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text };
  }

  if (!response.ok) {
    const message =
      (payload as { message?: string; error?: string })?.message ??
      (payload as { error?: string })?.error ??
      `Meshy request failed (${response.status})`;
    throw new ProviderError(message, response.status);
  }
  return payload as T;
}

function normalize(task: MeshyTask, fallbackId: string): ProviderTask {
  const raw = (task.status ?? "PENDING").toUpperCase();
  const status: ProviderTask["status"] =
    raw === "SUCCEEDED"
      ? "succeeded"
      : raw === "FAILED" || raw === "CANCELED"
        ? "failed"
        : raw === "IN_PROGRESS"
          ? "running"
          : "queued";

  return {
    id: task.id ?? fallbackId,
    status,
    progress: status === "succeeded" ? 100 : Math.max(0, Math.min(100, task.progress ?? 0)),
    stage: status === "running" ? "Generating on Meshy" : undefined,
    error: task.task_error?.message,
    thumbnailUrl: task.thumbnail_url,
    modelUrls: task.model_urls as ProviderTask["modelUrls"],
  };
}

export const meshyProvider: GenerationProvider = {
  id: "meshy",
  label: "Meshy",
  modes: ["text-to-3d", "image-to-3d", "texture", "remesh"],

  async create(request: ProviderRequest, key: string): Promise<ProviderTask> {
    if (request.mode === "image-to-3d") {
      if (!request.image) throw new ProviderError("An image is required for image to 3D.");
      const created = await call<{ result: string }>(`${BASE}/v1/image-to-3d`, key, {
        method: "POST",
        body: JSON.stringify({
          image_url: request.image,
          should_texture: true,
          should_remesh: true,
          target_polycount: request.polycount,
          topology: request.topology,
        }),
      });
      return { id: created.result, status: "queued", progress: 0 };
    }

    if (request.mode === "texture" || request.mode === "remesh") {
      if (!request.baseTaskId) {
        throw new ProviderError("This step needs the provider task id of an existing model.");
      }
      const created = await call<{ result: string }>(`${BASE}/v2/text-to-3d`, key, {
        method: "POST",
        body: JSON.stringify({
          mode: "refine",
          preview_task_id: request.baseTaskId,
          texture_prompt: request.texturePrompt || request.prompt,
          target_polycount: request.polycount,
          topology: request.topology,
        }),
      });
      return { id: created.result, status: "queued", progress: 0 };
    }

    const created = await call<{ result: string }>(`${BASE}/v2/text-to-3d`, key, {
      method: "POST",
      body: JSON.stringify({
        mode: "preview",
        prompt: request.prompt,
        art_style: ART_STYLE[request.style] ?? "realistic",
        should_remesh: true,
        target_polycount: request.polycount,
        topology: request.topology,
        seed: request.seed,
      }),
    });
    return { id: created.result, status: "queued", progress: 0 };
  },

  async poll(taskId: string, mode: TaskMode, key: string): Promise<ProviderTask> {
    const task = await call<MeshyTask>(`${endpointFor(mode)}/${encodeURIComponent(taskId)}`, key);
    return normalize(task, taskId);
  },
};

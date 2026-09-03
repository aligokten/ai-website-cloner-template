import {
  ProviderError,
  type GenerationProvider,
  type ProviderRequest,
  type ProviderTask,
} from "@/lib/providers/types";
import type { TaskMode } from "@/types";

const BASE = "https://api.tripo3d.ai/v2/openapi";

interface TripoEnvelope<T> {
  code?: number;
  message?: string;
  data?: T;
}

interface TripoTask {
  task_id?: string;
  status?: string;
  progress?: number;
  output?: {
    model?: string;
    pbr_model?: string;
    base_model?: string;
    rendered_image?: string;
  };
}

async function call<T>(url: string, key: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });

  const text = await response.text();
  let payload: TripoEnvelope<T>;
  try {
    payload = text ? (JSON.parse(text) as TripoEnvelope<T>) : {};
  } catch {
    payload = { message: text };
  }

  if (!response.ok || (payload.code !== undefined && payload.code !== 0)) {
    throw new ProviderError(
      payload.message ?? `Tripo request failed (${response.status})`,
      response.status,
    );
  }
  if (!payload.data) throw new ProviderError("Tripo returned an empty response.");
  return payload.data;
}

/** Tripo takes images by token, so a data URL is uploaded first. */
async function uploadImage(dataUrl: string, key: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const form = new FormData();
  form.append("file", blob, "reference.png");
  const data = await call<{ image_token: string }>(`${BASE}/upload`, key, {
    method: "POST",
    body: form,
  });
  return data.image_token;
}

function normalize(task: TripoTask, fallbackId: string): ProviderTask {
  const raw = (task.status ?? "queued").toLowerCase();
  const status: ProviderTask["status"] =
    raw === "success"
      ? "succeeded"
      : raw === "failed" || raw === "cancelled" || raw === "banned"
        ? "failed"
        : raw === "running"
          ? "running"
          : "queued";

  const model = task.output?.pbr_model ?? task.output?.model ?? task.output?.base_model;
  return {
    id: task.task_id ?? fallbackId,
    status,
    progress: status === "succeeded" ? 100 : Math.max(0, Math.min(100, task.progress ?? 0)),
    stage: status === "running" ? "Generating on Tripo" : undefined,
    thumbnailUrl: task.output?.rendered_image,
    modelUrls: model ? { glb: model } : undefined,
  };
}

export const tripoProvider: GenerationProvider = {
  id: "tripo",
  label: "Tripo",
  modes: ["text-to-3d", "image-to-3d"],

  async create(request: ProviderRequest, key: string): Promise<ProviderTask> {
    const body: Record<string, unknown> =
      request.mode === "image-to-3d"
        ? (() => {
            if (!request.image) throw new ProviderError("An image is required for image to 3D.");
            return { type: "image_to_model" };
          })()
        : { type: "text_to_model", prompt: request.prompt };

    if (request.mode === "image-to-3d") {
      body.file = { type: "png", file_token: await uploadImage(request.image as string, key) };
    }
    if (request.seed !== undefined) body.model_seed = request.seed;

    const data = await call<{ task_id: string }>(`${BASE}/task`, key, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { id: data.task_id, status: "queued", progress: 0 };
  },

  async poll(taskId: string, _mode: TaskMode, key: string): Promise<ProviderTask> {
    void _mode;
    const data = await call<TripoTask>(`${BASE}/task/${encodeURIComponent(taskId)}`, key);
    return normalize(data, taskId);
  },
};

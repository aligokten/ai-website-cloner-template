import {
  DURATION,
  newTaskId,
  resolveSpec,
  STAGES,
  validateInput,
  type GenerationInput,
  type JobStage,
} from "@/lib/generation";
import { CREDIT_COST } from "@/lib/pricing";
import { providerById, ProviderError } from "@/lib/providers";
import type { ProviderSettings } from "@/hooks/use-provider-settings";
import type { GenerationTask, ModelSpec, TaskMode } from "@/types";

export type GenerateRequest = GenerationInput & {
  mode: TaskMode;
  prompt: string;
  /** Data URL of the reference image, for image to 3D. */
  image?: string;
  /** Provider task id of the model being refined. */
  baseTaskId?: string;
};

export interface StartedJob {
  task: GenerationTask;
  /** Procedural result, present for local jobs. */
  spec?: ModelSpec;
  duration: number;
  stages: JobStage[];
  /** True when the queue ran in the browser because no API was reachable. */
  local: boolean;
  /** Set when a real generation provider is running the job. */
  remote?: { providerId: string; taskId: string; apiKey?: string };
}

export interface JobProgress {
  progress: number;
  stage: string;
}

export interface JobResult {
  spec?: ModelSpec;
  /** Downloadable .glb from the provider. */
  modelUrl?: string;
  modelUrls?: Record<string, string>;
  providerTaskId?: string;
}

/**
 * Run the job in the browser with the procedural engine. Generation is
 * deterministic and dependency-free, so a static deployment behaves exactly
 * like the API-backed one.
 */
function runLocally(input: GenerateRequest): StartedJob {
  const invalid = validateInput(input);
  if (invalid) throw new Error(invalid);

  const spec = resolveSpec(input);
  return {
    task: {
      id: newTaskId(),
      mode: input.mode,
      prompt: input.prompt.trim() || spec.archetype,
      style: input.style ?? "realistic",
      status: "queued",
      progress: 0,
      stage: "Queued",
      credits: CREDIT_COST[input.mode],
      createdAt: Date.now(),
    },
    spec,
    duration: DURATION[input.mode],
    stages: STAGES[input.mode],
    local: true,
  };
}

/** Talk to a real generation provider straight from the browser (BYO key). */
async function runWithProvider(
  input: GenerateRequest,
  settings: ProviderSettings,
): Promise<StartedJob> {
  const provider = providerById(settings.providerId);
  if (!provider) throw new Error(`Unknown provider: ${settings.providerId}`);
  if (!provider.modes.includes(input.mode)) {
    throw new Error(`${provider.label} does not support ${input.mode}.`);
  }

  let task;
  try {
    task = await provider.create(
      {
        mode: input.mode,
        prompt: input.prompt,
        style: input.style ?? "realistic",
        polycount: input.polycount,
        topology: input.topology,
        seed: input.seed,
        image: input.image,
        baseTaskId: input.baseTaskId,
        texturePrompt: input.texturePrompt,
      },
      settings.apiKey,
    );
  } catch (cause) {
    if (cause instanceof ProviderError) throw new Error(cause.message);
    // A browser-to-provider call can be refused by CORS; the server route is the fix.
    throw new Error(
      `Could not reach ${provider.label} from the browser. If this is a CORS error, run the app ` +
        `with SAGG3D_PROVIDER and SAGG3D_API_KEY set so the request goes through the server.`,
    );
  }

  return {
    task: {
      id: task.id,
      mode: input.mode,
      prompt: input.prompt,
      style: input.style ?? "realistic",
      status: "queued",
      progress: 0,
      stage: `Queued on ${provider.label}`,
      credits: CREDIT_COST[input.mode],
      createdAt: Date.now(),
    },
    duration: DURATION[input.mode],
    stages: STAGES[input.mode],
    local: false,
    remote: { providerId: provider.id, taskId: task.id, apiKey: settings.apiKey },
  };
}

export async function startJob(
  input: GenerateRequest,
  settings?: ProviderSettings,
): Promise<StartedJob> {
  if (settings && settings.providerId !== "local" && settings.apiKey.trim()) {
    return runWithProvider(input, settings);
  }

  if (process.env.NEXT_PUBLIC_STATIC_EXPORT === "true") return runLocally(input);

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const payload = (await response.json()) as Partial<StartedJob> & { error?: string };
    if (response.status === 400 && payload.error) {
      throw new ValidationError(payload.error);
    }
    if (!response.ok || !payload.task) return runLocally(input);
    return { ...(payload as StartedJob), local: payload.remote ? false : payload.local ?? false };
  } catch (cause) {
    if (cause instanceof ValidationError) throw new Error(cause.message);
    return runLocally(input);
  }
}

class ValidationError extends Error {}

/**
 * Drive a job to completion: poll the provider when one is running it, the API
 * queue when the server owns it, and the local timeline otherwise.
 */
export function trackJob(
  job: StartedJob,
  onProgress: (progress: JobProgress) => void,
): { promise: Promise<JobResult>; cancel: () => void } {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const localProgress = (): JobProgress => {
    const elapsed = Date.now() - job.task.createdAt;
    const ratio = Math.min(1, elapsed / job.duration);
    return {
      progress: Math.round(ratio * 100),
      stage:
        ratio >= 1
          ? "Completed"
          : job.stages.find((stage) => ratio <= stage.until)?.label ?? "Working",
    };
  };

  const promise = new Promise<JobResult>((resolve, reject) => {
    const tick = async () => {
      if (cancelled) return;

      // 1. A real provider owns the job.
      if (job.remote?.apiKey) {
        const provider = providerById(job.remote.providerId);
        if (!provider) {
          reject(new Error(`Unknown provider: ${job.remote.providerId}`));
          return;
        }
        try {
          const task = await provider.poll(job.remote.taskId, job.task.mode, job.remote.apiKey);
          if (cancelled) return;
          onProgress({
            progress: task.progress,
            stage: task.stage ?? `${provider.label}: ${task.status}`,
          });
          if (task.status === "failed") {
            reject(new Error(task.error ?? `${provider.label} could not finish this job.`));
            return;
          }
          if (task.status === "succeeded") {
            const modelUrl = task.modelUrls?.glb;
            if (!modelUrl) {
              reject(new Error(`${provider.label} returned no .glb for this task.`));
              return;
            }
            resolve({
              modelUrl,
              modelUrls: task.modelUrls as Record<string, string>,
              providerTaskId: task.id,
            });
            return;
          }
        } catch (cause) {
          reject(cause instanceof Error ? cause : new Error("Provider polling failed."));
          return;
        }
        timer = setTimeout(tick, 2_000);
        return;
      }

      // 2. The built-in queue, which may itself be proxying a provider.
      let progress = localProgress();
      if (!job.local) {
        try {
          const response = await fetch(
            `/api/generate?id=${encodeURIComponent(job.task.id)}&mode=${job.task.mode}`,
            { cache: "no-store" },
          );
          if (response.ok) {
            const payload = (await response.json()) as {
              task: GenerationTask;
              modelUrls?: Record<string, string>;
            };
            const { task } = payload;
            progress = { progress: task.progress, stage: task.stage };
            if (task.status === "failed") {
              reject(new Error(task.error ?? "Generation failed."));
              return;
            }
            if (task.status === "succeeded" && payload.modelUrls?.glb) {
              onProgress({ progress: 100, stage: "Completed" });
              resolve({
                modelUrl: payload.modelUrls.glb,
                modelUrls: payload.modelUrls,
                providerTaskId: task.id,
              });
              return;
            }
          }
        } catch {
          // Network hiccup — keep driving from the local timeline.
        }
      }

      if (cancelled) return;
      onProgress(progress);
      if (progress.progress >= 100) {
        resolve({ spec: job.spec });
        return;
      }
      timer = setTimeout(tick, job.remote ? 2_000 : 350);
    };
    void tick();
  });

  return {
    promise,
    cancel: () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    },
  };
}

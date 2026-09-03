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
import type { GenerationTask, ModelSpec, TaskMode } from "@/types";

export type GenerateRequest = GenerationInput & { mode: TaskMode; prompt: string };

export interface StartedJob {
  task: GenerationTask;
  spec: ModelSpec;
  duration: number;
  stages: JobStage[];
  /** True when the queue ran in the browser because no API was reachable. */
  local: boolean;
}

export interface JobProgress {
  progress: number;
  stage: string;
}

/**
 * Run the job in the browser. Generation is deterministic and dependency-free,
 * so a static deployment (GitHub Pages) behaves exactly like the API-backed one.
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

/** Static deployments (GitHub Pages) ship without the queue endpoint. */
const API_AVAILABLE = process.env.NEXT_PUBLIC_STATIC_EXPORT !== "true";

export async function startJob(input: GenerateRequest): Promise<StartedJob> {
  if (!API_AVAILABLE) return runLocally(input);

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const payload = (await response.json()) as Partial<StartedJob> & { error?: string };
    if (response.status === 400 && payload.error) {
      // A real validation failure — surface it rather than silently retrying.
      throw new ValidationError(payload.error);
    }
    if (!response.ok || !payload.task || !payload.spec) {
      return runLocally(input);
    }
    return { ...(payload as StartedJob), local: false };
  } catch (cause) {
    if (cause instanceof ValidationError) throw new Error(cause.message);
    // No API on this host (static export) or the network failed — run in-browser.
    return runLocally(input);
  }
}

class ValidationError extends Error {}

/**
 * Poll the queue until the job finishes. Falls back to the timeline returned by
 * the POST when the polling instance no longer holds the task (cold start), and
 * skips polling entirely for jobs that already ran locally.
 */
export function trackJob(
  job: StartedJob,
  onProgress: (progress: JobProgress) => void,
): { promise: Promise<ModelSpec>; cancel: () => void } {
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

  const promise = new Promise<ModelSpec>((resolve, reject) => {
    const tick = async () => {
      if (cancelled) return;
      let progress = localProgress();

      if (!job.local) {
        try {
          const response = await fetch(`/api/generate?id=${encodeURIComponent(job.task.id)}`, {
            cache: "no-store",
          });
          if (response.ok) {
            const { task } = (await response.json()) as { task: GenerationTask };
            progress = { progress: task.progress, stage: task.stage };
            if (task.status === "failed") {
              reject(new Error(task.error ?? "Generation failed."));
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
        resolve(job.spec);
        return;
      }
      timer = setTimeout(tick, 350);
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

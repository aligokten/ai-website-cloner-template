import type { ArtStyle, GenerationTask, ModelSpec, TaskMode, Topology } from "@/types";

export interface GenerateRequest {
  mode: TaskMode;
  prompt: string;
  style?: ArtStyle;
  polycount?: number;
  topology?: Topology;
  seed?: number;
  paletteOverride?: string[];
  baseSpec?: ModelSpec;
  texturePrompt?: string;
}

export interface StartedJob {
  task: GenerationTask;
  spec: ModelSpec;
  duration: number;
  stages: Array<{ until: number; label: string }>;
}

export interface JobProgress {
  progress: number;
  stage: string;
}

export async function startJob(input: GenerateRequest): Promise<StartedJob> {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = (await response.json()) as Partial<StartedJob> & { error?: string };
  if (!response.ok || !payload.task || !payload.spec) {
    throw new Error(payload.error ?? "Generation failed. Please try again.");
  }
  return payload as StartedJob;
}

/**
 * Poll the queue until the job finishes. Falls back to the timeline returned by
 * the POST when the polling instance no longer holds the task (cold start).
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

import { NextResponse } from "next/server";
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
import { ProviderError, serverProvider } from "@/lib/providers";
import type { GenerationTask, TaskMode } from "@/types";

export const dynamic = "force-dynamic";

interface StoredTask extends GenerationTask {
  /** Milliseconds the job takes end to end. */
  duration: number;
  stages: JobStage[];
}

/**
 * In-memory task store. The generation itself is deterministic and instant —
 * the store exists so the client can poll a job the way it would poll a real
 * GPU queue, including staged progress.
 */
const tasks = new Map<string, StoredTask>();
const TTL = 1000 * 60 * 30;

function sweep() {
  const now = Date.now();
  for (const [id, task] of tasks) {
    if (now - task.createdAt > TTL) tasks.delete(id);
  }
}

function project(task: StoredTask): GenerationTask {
  const elapsed = Date.now() - task.createdAt;
  if (task.status === "failed") return strip(task);

  if (elapsed >= task.duration) {
    task.status = "succeeded";
    task.progress = 100;
    task.stage = "Completed";
    task.finishedAt = task.finishedAt ?? task.createdAt + task.duration;
    return strip(task);
  }

  const ratio = Math.max(0.02, elapsed / task.duration);
  task.status = "running";
  task.progress = Math.round(ratio * 100);
  task.stage = task.stages.find((stage) => ratio <= stage.until)?.label ?? "Working";
  return strip(task);
}

function strip(task: StoredTask): GenerationTask {
  const { duration: _duration, stages: _stages, ...rest } = task;
  void _duration;
  void _stages;
  return {
    ...rest,
    // The spec is only revealed once the job finishes, like a real render queue.
    spec: rest.status === "succeeded" ? rest.spec : undefined,
  };
}

export async function POST(request: Request) {
  sweep();

  let body: GenerationInput;
  try {
    body = (await request.json()) as GenerationInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const invalid = validateInput(body);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const mode: TaskMode = body.mode ?? "text-to-3d";

  // A configured provider runs the real thing; the procedural engine is the fallback.
  const configured = serverProvider();
  if (configured && configured.provider.modes.includes(mode)) {
    try {
      const remote = await configured.provider.create(
        {
          mode,
          prompt: (body.prompt ?? "").trim(),
          style: body.style ?? "realistic",
          polycount: body.polycount,
          topology: body.topology,
          seed: body.seed,
          image: body.image,
          baseTaskId: body.baseTaskId,
          texturePrompt: body.texturePrompt,
        },
        configured.key,
      );
      return NextResponse.json(
        {
          task: {
            id: remote.id,
            mode,
            prompt: (body.prompt ?? "").trim(),
            style: body.style ?? "realistic",
            status: "queued",
            progress: 0,
            stage: `Queued on ${configured.provider.label}`,
            credits: CREDIT_COST[mode],
            createdAt: Date.now(),
          },
          duration: DURATION[mode],
          stages: STAGES[mode],
          remote: { providerId: configured.provider.id, taskId: remote.id },
        },
        { status: 201 },
      );
    } catch (cause) {
      const message =
        cause instanceof ProviderError ? cause.message : `${configured.provider.label} rejected the job.`;
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }
  const spec = resolveSpec(body);
  const duration = DURATION[mode];

  const task: StoredTask = {
    id: newTaskId(),
    mode,
    prompt: (body.prompt ?? "").trim() || spec.archetype,
    style: body.style ?? "realistic",
    status: "queued",
    progress: 0,
    stage: "Queued",
    credits: CREDIT_COST[mode],
    createdAt: Date.now(),
    spec,
    duration,
    stages: STAGES[mode],
  };
  tasks.set(task.id, task);

  // The spec is returned up front so the client can keep driving the job if the
  // polling instance is cold (serverless) — the UI still gates it behind progress.
  return NextResponse.json(
    { task: strip(task), spec, duration, stages: task.stages },
    { status: 201 },
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing task id." }, { status: 400 });
  }

  const task = tasks.get(id);
  if (task) return NextResponse.json({ task: project(task) });

  // Not one of ours — it may belong to the configured provider.
  const configured = serverProvider();
  if (configured) {
    const mode = (url.searchParams.get("mode") as TaskMode | null) ?? "text-to-3d";
    try {
      const remote = await configured.provider.poll(id, mode, configured.key);
      return NextResponse.json({
        task: {
          id: remote.id,
          mode,
          prompt: "",
          style: "realistic",
          status: remote.status,
          progress: remote.progress,
          stage: remote.stage ?? remote.status,
          credits: CREDIT_COST[mode],
          createdAt: Date.now(),
          error: remote.error,
        },
        modelUrls: remote.modelUrls,
        thumbnailUrl: remote.thumbnailUrl,
      });
    } catch (cause) {
      const message =
        cause instanceof ProviderError ? cause.message : "Provider polling failed.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  return NextResponse.json({ error: "Task not found or expired." }, { status: 404 });
}

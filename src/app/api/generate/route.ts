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
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing task id." }, { status: 400 });
  }
  const task = tasks.get(id);
  if (!task) {
    return NextResponse.json({ error: "Task not found or expired." }, { status: 404 });
  }
  return NextResponse.json({ task: project(task) });
}

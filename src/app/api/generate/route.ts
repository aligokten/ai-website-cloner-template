import { NextResponse } from "next/server";
import { generateModelSpec, remeshSpec, retextureSpec } from "@/lib/model-spec";
import { CREDIT_COST } from "@/lib/pricing";
import type { ArtStyle, GenerationTask, ModelSpec, TaskMode, Topology } from "@/types";

export const dynamic = "force-dynamic";

interface StoredTask extends GenerationTask {
  /** Milliseconds the job takes end to end. */
  duration: number;
  stages: Array<{ until: number; label: string }>;
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

const STAGES: Record<TaskMode, Array<{ ratio: number; label: string }>> = {
  "text-to-3d": [
    { ratio: 0.18, label: "Understanding the prompt" },
    { ratio: 0.55, label: "Generating base geometry" },
    { ratio: 0.85, label: "Baking PBR textures" },
    { ratio: 1, label: "Optimizing mesh" },
  ],
  "image-to-3d": [
    { ratio: 0.2, label: "Analyzing the reference image" },
    { ratio: 0.55, label: "Reconstructing volume" },
    { ratio: 0.86, label: "Projecting textures" },
    { ratio: 1, label: "Optimizing mesh" },
  ],
  texture: [
    { ratio: 0.4, label: "Reading surface topology" },
    { ratio: 0.8, label: "Painting PBR maps" },
    { ratio: 1, label: "Packing 4K textures" },
  ],
  remesh: [
    { ratio: 0.5, label: "Analyzing topology" },
    { ratio: 1, label: "Rebuilding polygons" },
  ],
  animate: [
    { ratio: 0.45, label: "Auto-rigging skeleton" },
    { ratio: 0.8, label: "Binding skin weights" },
    { ratio: 1, label: "Retargeting motion" },
  ],
};

const DURATION: Record<TaskMode, number> = {
  "text-to-3d": 7_000,
  "image-to-3d": 7_500,
  texture: 5_000,
  remesh: 3_000,
  animate: 4_500,
};

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

interface GenerateBody {
  mode?: TaskMode;
  prompt?: string;
  style?: ArtStyle;
  polycount?: number;
  topology?: Topology;
  seed?: number;
  paletteOverride?: string[];
  baseSpec?: ModelSpec;
  texturePrompt?: string;
}

export async function POST(request: Request) {
  sweep();

  let body: GenerateBody;
  try {
    body = (await request.json()) as GenerateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const mode: TaskMode = body.mode ?? "text-to-3d";
  if (!(mode in CREDIT_COST)) {
    return NextResponse.json({ error: `Unknown mode: ${mode}` }, { status: 400 });
  }

  const prompt = (body.prompt ?? "").trim();
  if ((mode === "text-to-3d" || mode === "texture") && prompt.length < 2) {
    return NextResponse.json(
      { error: "Describe what you want to generate — at least 2 characters." },
      { status: 400 },
    );
  }
  if (prompt.length > 600) {
    return NextResponse.json({ error: "Prompt is limited to 600 characters." }, { status: 400 });
  }
  if ((mode === "texture" || mode === "remesh" || mode === "animate") && !body.baseSpec) {
    return NextResponse.json(
      { error: `The ${mode} step needs an existing model to work on.` },
      { status: 400 },
    );
  }

  const style: ArtStyle = body.style ?? "realistic";
  let spec: ModelSpec;
  switch (mode) {
    case "texture":
      spec = retextureSpec(body.baseSpec as ModelSpec, body.texturePrompt || prompt);
      break;
    case "remesh":
      spec = remeshSpec(
        body.baseSpec as ModelSpec,
        body.polycount ?? 30_000,
        body.topology ?? "triangle",
      );
      break;
    case "animate":
      spec = body.baseSpec as ModelSpec;
      break;
    default:
      spec = generateModelSpec({
        prompt: prompt || "abstract sculpture",
        style,
        polycount: body.polycount,
        topology: body.topology,
        seed: body.seed,
        paletteOverride: body.paletteOverride,
      });
  }

  const duration = DURATION[mode];
  const id = `task_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const task: StoredTask = {
    id,
    mode,
    prompt: prompt || spec.archetype,
    style,
    status: "queued",
    progress: 0,
    stage: "Queued",
    credits: CREDIT_COST[mode],
    createdAt: Date.now(),
    spec,
    duration,
    stages: STAGES[mode].map((stage) => ({ until: stage.ratio, label: stage.label })),
  };
  tasks.set(id, task);

  // The spec is returned up front so the client can keep driving the job if the
  // polling instance is cold (serverless) — the UI still gates it behind progress.
  return NextResponse.json(
    {
      task: strip(task),
      spec,
      duration,
      stages: task.stages,
    },
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

export const PILLARS = [
  {
    id: "generate",
    title: "Generate",
    blurb: "Text, image or multi-view in, textured mesh out — in about 30 seconds.",
    items: ["Text to 3D", "Image to 3D", "Multi-view reconstruction", "Seed control"],
  },
  {
    id: "refine",
    title: "Refine",
    blurb: "Fix topology and repaint surfaces without leaving the browser.",
    items: ["AI texturing, 4K PBR", "Remesh 1k–300k", "Quad or triangle", "Stylize & low poly"],
  },
  {
    id: "animate",
    title: "Animate",
    blurb: "Auto-rig humanoids and creatures, then drop in motion from the library.",
    items: ["Auto-rigging", "600+ motion library", "Idle, walk, spin, bounce", "Loop preview"],
  },
  {
    id: "deliver",
    title: "Deliver",
    blurb: "Ship to your engine, your slicer or your pipeline.",
    items: ["GLB, OBJ, STL, PLY, USDZ", "DCC bridge plugins", "REST API", "MCP for AI agents"],
  },
] as const;

export const FEATURES = [
  {
    id: "text-to-3d",
    title: "Text to 3D",
    description:
      "Write a prompt, pick an art style and get a fully textured mesh. Realistic, cartoon, low poly, voxel or sculpted — with adaptive or fixed polycount.",
    bullets: ["5 art styles", "Deterministic seeds", "Adaptive polycount", "Prompt-driven palettes"],
  },
  {
    id: "image-to-3d",
    title: "Image to 3D",
    description:
      "Upload a photo or a concept sketch. SAGG3D reads the silhouette and the dominant colors, rebuilds volume and projects the texture back onto the mesh.",
    bullets: ["Single image input", "Palette extraction", "Free retries", "No install required"],
  },
  {
    id: "texturing",
    title: "AI texturing",
    description:
      "Repaint any model from a text prompt. Albedo, metalness and roughness are generated together so materials read correctly under any lighting.",
    bullets: ["4K PBR maps", "Prompt-driven materials", "Scales, panels, grain patterns", "Non-destructive"],
  },
  {
    id: "remesh",
    title: "Remesh",
    description:
      "Rebuild topology for the pipeline you actually ship into. Choose quad or triangle output and a target between 1k and 300k polygons.",
    bullets: ["Quad or triangle", "1k – 300k target", "Rig-ready output", "Live triangle counter"],
  },
  {
    id: "animate",
    title: "Animate",
    description:
      "Auto-rig characters and creatures, then preview motion right in the viewport. Export the animated mesh or take the skeleton into your DCC.",
    bullets: ["Automatic skeletons", "Idle, walk, bounce, spin", "Loop preview", "Retargetable"],
  },
  {
    id: "workspace",
    title: "Workspace",
    description:
      "One place for every asset. Generation queue, credits, versions, favorites and exports — all persisted, all searchable.",
    bullets: ["Task queue", "Asset library", "Credit ledger", "Instant re-export"],
  },
] as const;

export const WORKFLOW = [
  {
    step: "01",
    title: "Describe it",
    body: "Type a prompt or drop in a reference image. Choose an art style and a target polycount.",
  },
  {
    step: "02",
    title: "Generate & refine",
    body: "Watch geometry, textures and optimization run stage by stage, then remesh or repaint until it fits your scene.",
  },
  {
    step: "03",
    title: "Rig, animate, export",
    body: "Auto-rig, preview motion and export to GLB, OBJ, STL, PLY or USDZ — ready for Unity, Unreal, Blender or a slicer.",
  },
] as const;

export const INTEGRATIONS = [
  "Unity",
  "Unreal Engine",
  "Blender",
  "Godot",
  "Maya",
  "Cinema 4D",
  "Houdini",
  "three.js",
] as const;

export const TESTIMONIALS = [
  {
    quote:
      "We blocked out an entire level in an afternoon. What used to be a two-week outsourcing loop is now a prompt and a remesh pass.",
    name: "Dana Whitfield",
    role: "Art Director, Northlight Games",
  },
  {
    quote:
      "The remesh output actually rigs. That is the part nobody else gets right — quad topology at 12k that animates cleanly.",
    name: "Marco Deniz",
    role: "Technical Artist, Pixelforge",
  },
  {
    quote:
      "Our product team ships AR previews weekly now. USDZ straight out of the workspace, no pipeline in between.",
    name: "Priya Raman",
    role: "Head of Product, Aurora XR",
  },
] as const;

export const FAQ = [
  {
    q: "How does SAGG3D generate a model?",
    a: "Your prompt is parsed for subject, style and color, then matched to a structural archetype. The generator assembles the mesh part by part, resolves proportions for the chosen art style, and bakes procedural PBR materials from the palette. Every prompt is deterministic — the same words always return the same model.",
  },
  {
    q: "What do credits cost?",
    a: "Text to 3D and Image to 3D cost 20 credits. AI texturing and animation cost 10, and a remesh pass costs 5. The Free plan includes 100 credits a month, Pro 1,000 and Studio 4,000 per seat.",
  },
  {
    q: "Which formats can I export?",
    a: "GLB, OBJ, STL, PLY and USDZ export directly from the workspace and open in Blender, Unity, Unreal, Godot and Apple Quick Look. FBX and .blend are delivered through the DCC bridge plugins.",
  },
  {
    q: "Who owns the models I generate?",
    a: "On paid plans your assets are private and you own them outright, including commercial use. Free plan outputs are published under CC BY 4.0, so they can be used commercially with attribution.",
  },
  {
    q: "Do I need a GPU?",
    a: "No. Generation runs on our side and the viewport renders with WebGL, so a laptop browser is enough. Nothing to install.",
  },
  {
    q: "Can I use the API?",
    a: "Yes. Paid plans include REST access with the same modes as the workspace — text to 3D, image to 3D, texturing, remesh and animation — plus MCP endpoints so AI agents can generate assets directly.",
  },
] as const;

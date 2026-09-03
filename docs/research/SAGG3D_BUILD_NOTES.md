# SAGG3D.ai — build notes

## Source and constraint

The target was `meshy.ai`. This build environment's egress proxy blocks that
domain (`EGRESS_BLOCKED` on both `meshy.ai` and `www.meshy.ai`, and on
third-party mirrors), so no DOM, CSS, asset or screenshot extraction was
possible. Nothing here is a pixel-level trace of the original.

What the structure *is* based on: publicly documented product facts gathered
through web search — the four feature pillars (generation, refinement,
animation, delivery), the module list (Text to 3D, Image to 3D, AI texturing,
Remesh, Animate), the credit costs, the plan tiers and allowances, and the
export format list. Layout, palette, typography and copy are original work in
the same product category, rebranded to SAGG3D.ai.

## Design tokens

Defined in `src/app/globals.css` as oklch custom properties, dark-first with a
`.light` override class.

| Token | Dark | Role |
| --- | --- | --- |
| `--background` | `oklch(0.148 0.014 285)` | Page ground |
| `--surface` | `oklch(0.183 0.015 285)` | Cards, panels |
| `--surface-2` | `oklch(0.219 0.017 285)` | Raised controls |
| `--brand` | `oklch(0.646 0.216 292)` | Violet primary |
| `--brand-2` | `oklch(0.76 0.14 205)` | Cyan gradient end |
| `--radius` | `0.75rem` | Base radius scale |

Type is the system sans stack; there are no webfont downloads (the network
policy blocks Google Fonts too). Utility classes `container-page`,
`surface-card`, `text-gradient`, `glow-brand` and `grid-backdrop` carry the
repeated visual patterns.

## Architecture

```
src/app/(marketing)/   Landing, /features, /pricing, /discover
src/app/workspace/     The application
src/app/api/generate/  Generation queue (POST creates, GET polls)
src/lib/               Generation engine, content, pricing, site config
src/lib/three/         Mesh builder, procedural textures, exporters
src/components/three/  WebGL viewport
```

## How generation actually works

There is no model server. Generation is deterministic and local:

1. `matchArchetype()` scores the prompt against keyword sets and picks one of
   13 structural archetypes (robot, character, creature, vehicle, spaceship,
   weapon, building, furniture, plant, crystal, food, container, abstract).
2. The archetype builder emits a part list — primitive, transform, color slot
   and an optional rig tag — seeded by a `mulberry32` PRNG keyed on the prompt
   hash, so the same prompt always returns the same model.
3. `buildPalette()` reads color words out of the prompt and fills the rest of
   the five-swatch palette harmonically. Image to 3D replaces the lead swatches
   with colors sampled from the uploaded file, lightness-normalized so dark
   photos do not produce black models.
4. Art style rewrites the parts: voxel snaps to a grid and forces boxes,
   cartoon enlarges heads and chunks up limbs, low-poly caps segment counts,
   realistic and sculpture adjust roughness and metalness.
5. `buildModel()` turns the spec into a `THREE.Group`, mapping the target
   polycount onto per-primitive segment counts, painting procedural canvas
   textures picked by prompt keywords (scales, panels, stripes, grain, noise),
   then centering and normalizing scale. Triangle and vertex counts shown in
   the UI are measured off the real geometry.

`/api/generate` holds the staged queue: it validates the request, computes the
spec, and reports progress through named stages. The POST response also carries
the timeline so the client can finish a job if a serverless instance goes cold
between polls.

## What is genuinely functional

- Text to 3D, Image to 3D, AI texturing, Remesh and Animate, each spending
  credits and running through the staged queue.
- WebGL viewport with orbit/zoom/pan, wireframe, three lighting environments,
  auto-rotate and five animation presets driven per-frame off the rig tags.
- Exports that produce real files via three.js exporters — GLB, OBJ, STL, PLY
  and USDZ. FBX and `.blend` are described as DCC-bridge deliveries and are not
  offered in the export list.
- Credit ledger with plan switching and monthly cycle refill, plus an asset
  library (rename, favorite, duplicate, delete) — both persisted to
  `localStorage`.
- Gallery search, category filter and sort; every card thumbnail is rendered
  from its prompt at scroll-in through a single shared WebGL renderer.

## Verification

`npm run check` passes (lint, typecheck, production build). A Playwright pass
against the production server covered: landing generation, all five export
formats, the discover gallery and detail dialog, and a workspace run of text to
3D → remesh → texture → animate → export, with zero console or page errors.

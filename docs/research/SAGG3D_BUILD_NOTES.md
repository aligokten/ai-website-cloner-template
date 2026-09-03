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

## Deployment (GitHub Pages)

`.github/workflows/deploy-pages.yml` builds and publishes the site on every push
to `master` or the feature branch, and on manual dispatch.

Pages serves static files only, so the workflow removes `src/app/api` before
building and sets `GITHUB_PAGES=true`, which switches `next.config.ts` to
`output: "export"` with the repository sub-path as `basePath`. Nothing is lost:
generation is deterministic and dependency-free, so `src/lib/generation.ts` is
shared between the route handler and the browser, and `startJob()` runs the
queue locally when `NEXT_PUBLIC_STATIC_EXPORT` is set. Text to 3D, Image to 3D,
texturing, remesh, animation, the WebGL viewport, the credit ledger, the asset
library and every export format all work on the static build — verified with a
Playwright pass against `out/` served under the sub-path, with zero console
errors.

A server deployment (Vercel, a container, `next start`) needs no flags: the
default config keeps `output: "standalone"` and the live `/api/generate` queue.

## Running against a real 3D model

The built-in engine is deterministic and free, but it assembles shapes rather
than generating them — for arbitrary prompts it can only get so close. The
workspace therefore has a provider layer (`src/lib/providers/`) that hands the
job to an actual 3D generative model:

| Provider | Modes | Configure |
| --- | --- | --- |
| Built-in | all five | nothing — the default |
| Meshy | text, image, texture, remesh | `SAGG3D_PROVIDER=meshy` + `SAGG3D_API_KEY` |
| Tripo | text, image | `SAGG3D_PROVIDER=tripo` + `SAGG3D_API_KEY` |

Server deployments set those two variables and `/api/generate` creates and polls
the provider task; the browser never sees the key. Where no server is available
(the GitHub Pages build), the workspace's **Engine** panel accepts a key that
stays in that browser's local storage and calls the provider directly — with the
caveat that a provider may refuse cross-origin browser calls, in which case the
server route is the answer. Either way the finished `.glb` is loaded into the
same viewport (`src/lib/three/load-model.ts`) and can be re-exported to every
supported format.

**Not verified live.** This build environment blocks egress to every generation
API (`api.meshy.ai`, `api.tripo3d.ai`, `fal.run`, `api.replicate.com` all fail to
connect), so the adapters are written against each provider's documented REST
shape and exercised only through types, the build, and the UI paths. The request
and response mapping is isolated in one small file per provider so a field name
that has since changed is a one-line correction.

## Image to 3D, without a model

`src/lib/image-reconstruct.ts` builds geometry from the picture itself:

1. Draw the upload into a square grid (56×56 by default), letterboxed so the
   subject keeps its proportions.
2. Flood fill inwards from the border to remove the backdrop, using alpha when
   the image has it and a border-averaged reference color otherwise. A second
   pass removes enclosed regions that still match the backdrop, so a mug handle
   keeps its hole.
3. Run a two-pass chamfer distance transform over the mask and take its square
   root as depth — the silhouette inflates into a rounded volume instead of a
   flat slab.
4. Store depth and RGB as base64 bytes on the spec, so an asset stays small
   enough for local storage.

`src/lib/three/build-relief.ts` turns that into a mesh: a front surface pushed
out by the depth map, a mirrored back, and quads emitted wherever any corner is
filled so the two sides meet along the outline and close the model with no rim
seam. Colors are per-vertex, linearized from sRGB.

## Prompt modifiers

`src/lib/modifiers.ts` reads attachments (wings, horns, tail, hat, crown,
shield, blade, wheels, glasses, backpack), proportion words (tall, squat,
chunky, slender, giant, tiny) and materials (metal, gold, glass, stone, wood,
rusty) out of the prompt and applies them to the archetype's parts before the
art-style pass. A single named color now carries most of the palette rather than
one slot, so "golden robot" reads as gold.

The viewport also gained an image-based environment (`RoomEnvironment` through
`PMREMGenerator`) and ACES tone mapping: metals need something to reflect or
they render black, and the direct lights came down accordingly.

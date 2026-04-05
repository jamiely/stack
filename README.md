# Tower Stacker

Desktop-first browser prototype for the `Tower Stacker` stacking game described in [docs/design.md](/Users/jamiely/code/stack/docs/design.md) and staged through [plan.md](/Users/jamiely/code/stack/plan.md).

Feature tracking notes live in [docs/features.md](/Users/jamiely/code/stack/docs/features.md).

## Current Status

The repo now includes a playable early milestone:

- Vite + TypeScript + Three.js application shell
- Alternating X/Z stack placement with trim-or-miss gameplay
- Combo streak tracking (default target: 8 perfect hits) with live HUD progress
- Recovery rewards at combo milestones: capped slab-growth recovery plus temporary movement slowdown windows
- Lightweight audio + haptics feedback manager (perfect/trim/miss cues) with safe browser capability gating
- V3 distraction framework with deterministic seeded state, level-gated channel activation, runtime toggle/threshold tuning hooks, on-demand debug launch triggers, and V3.3 actor visuals (gorilla deterministic tower-climb pathing with rhythmic slam pulses, UFO full-circuit tower orbit with off-screen fly-off exits toward the player + contrast wash, UFO orbit locked to one slab-height above the top floor with projected sizing so it appears roughly slab-height tall, persistent world-projected rounded-lobe cloud cover with lane-aware depth styling and stack occlusion using camera-relative despawn/recycle lifecycle semantics, tremor pulse, and simulation-driven fireworks with shell launch arcs that now spawn slightly above the current tower top at launch time, primary/secondary burst staging, isotropic burst-direction sampling with reduced particle drag/gravity shaping for a more spherical chrysanthemum silhouette, particle fade/cleanup, and render metadata-backed DOM nodes) plus intermittent tentacle bursts with deterministic purple/green/pink palettes that persist across prior slabs, are resolved once per newly landed slab via deterministic per-placement chance, target camera-visible faces only, and undulate more strongly)
- V4.1 structural integrity telemetry with deterministic center-of-mass approximation, `stable/precarious/unstable` tiering, and precarious camera wobble feedback
- V4.2 collapse fail sequence: hard misses trigger a deterministic tower-topple presentation with failure camera pullback, a finer cube-like voxelized tower explosion burst (including still-visible landed slabs and trimmed debris pieces, with voxel budget distributed so upper slabs are still represented and off-screen slabs culled beyond roughly two block-heights), and collapse feedback cues
- V5.1 performance/scalability pass: distant slab archival into static chunk proxies, distraction LOD throttling, strict debris pooling/caps, and runtime perf diagnostics
- Upward camera follow with frame-rate-independent smoothing + eased look-target tracking + tunable framing offset/focal Y offset (with camera height now independent from focal-point offset), score/player-built-height HUD (excluding prebuilt starter slabs), impact flash + configurable placement shake feedback, tremor pulses with subtle Y-camera shake, slabs spawning near the top footprint (over the previous slab when wide, minimum clearance when thin), vertically centered 3D window façades (body frames, protruding sills, deterministic per-side count variation, one consistent style per slab, rectangular/pointed-gothic/rounded-gothic/planter/shuttered/bay variants), stronger edge clearance (with a minimum edge distance plus half-window edge padding) and centered anti-gapping spacing, deterministic shutter color variation, occasional darker slab-hue trim variants, animated lower ledges that expand in after placement and vary from 25–100% span, a randomly selected dancing character (Remy/Timmy/Amy/AJ) loaded from a cast asset pool (`assets/remy_character_t_pose.glb`, `assets/timmy_tiny_webp.glb`, `assets/amy_tiny_webp.glb`, `assets/aj_tiny_webp.glb`) with a randomly selected animation clip from (`assets/remy_hip_hop_animation_inplace.glb`, `assets/house_dancing_inplace.glb`, `assets/chicken_dance_inplace.glb`, `assets/ymca_dance_inplace.glb`) and a fresh character+animation reroll whenever the dancer reappears after being hidden (character picks now advance in strict next-up rotation through the full cast before repeating, even across run resets), (with `SkeletonUtils.retargetClip(...)` fallback when needed) and played in ping-pong loop mode to avoid non-seam loop pops, and anchored to a visible ledge with automatic sizing by slab height (the selected dancer stays on the current visible ledge instead of hopping every placement, very wide ledges at 75%+ span now host a two-dancer pair using the next two characters in rotation (always distinct), auto-orients to the best up-axis for non-Y-up exports, disables mesh frustum culling for reliability, falls back to top-slab placement if no ledge anchor is available, and is temporarily hidden only when tentacle bursts are active on that same ledge face to avoid clipping), decorative windows/eaves/weathering constrained to camera-facing sides, always-on scalloped eave trims on all visible sides with seam-sealed corners (flush spans + tiny corner seal pieces) to avoid both corner gaps and spikes, bottom-half weathering on landed slabs (including prebuilt starters), deterministic slab facade styles (smooth/brick/siding), a gradual/eased day-night cycle (night → dawn → early morning → noon → evening → sunset → night) with smoother animated background blending, a subtle nighttime star field, and a noon-weighted camera flare that strengthens toward midday and tracks near the stack center, and falling debris
- Runtime debug panel for gameplay tuning, gated behind `?debug`
- Vitest unit test setup with 90%+ enforced coverage on non-rendering code (logic modules + non-rendering runtime services such as debug config and feedback orchestration)
- Playwright coverage for autostart boot flow, keyboard + pointer stops, miss/restart flow, deterministic test stepping, runtime debug tuning updates, and a canonical deterministic fireworks chrysanthemum screenshot gate
- Deterministic test mode (`?test`) with a guarded `window.__towerStackerTestApi` control surface for stepping, scripted placement setup, combo-state inspection, recovery telemetry, feedback telemetry, distraction-state/actor-visual assertions (including per-cloud diagnostics with id/position/lane/recycle metadata, fireworks lifecycle counters + cap/drop counters, and step-gated updates when paused), integrity telemetry assertions, collapse-state assertions, and performance diagnostics assertions
- Git hooks for unit tests on commit and Playwright on commit/push

## Development

```sh
npm install
npm run dev
```

The dev server runs on `http://127.0.0.1:4173`.

## Scripts

- `npm run dev`: start the Vite dev server
- `npm run build`: type-check and produce a production build
- `npm run check`: run TypeScript type-checking only
- `npm run test`: run Vitest once
- `npm run test:unit`: run the unit suite used by pre-commit
- `npm run coverage`: enforce the non-rendering-code coverage threshold
- `npm run test:e2e`: run the Playwright suite used by pre-commit and pre-push

## Controls

- Runs start automatically on load; the `Tower stacker` title briefly appears, then eases out to the left
- `Space`/`Enter` on key release, mouse click, or tap while playing: stop the moving slab
- During `game_over`, gameplay input (`Space`/`Enter` release, click, or touch in the play area) immediately restarts the run (no restart button)
- Visit `/?debug` to expose the runtime tuning panel
- In debug mode, additional diagnostics appear: the top-bar status card plus overlay body/renderer details
- Add `?test` (or `?testMode`) for deterministic test mode; add `&paused=0` to auto-run instead of booting paused; optional `&seed=<int>` drives deterministic seeded distraction/simulation state and is surfaced through test-state snapshots
- Debug panel controls: tune camera (height/distance/lerp + framing offset + focal-point camera Y offset), block dimensions (width/length) plus slab height (default 3.0 with a 1.0–5.0 runtime range so 3.0 sits at slider center; dimension/prebuilt-level edits rebuild the world immediately for live visual feedback) with a `Normalize W/L/H` quick action, a block-motion pause toggle (`Pause Block Motion` / `Resume Block Motion`) for inspecting placements, dancer placement controls (rotation on X/Y/Z and translation on X/Y/Z, now mapped directly so slider values reflect the applied transform, with per-character normalization defaults (`Remy: Rot Y=-9, Rot X=-7, Rot Z=89`; `Timmy: Rot Y=-180, Rot X=180, Rot Z=180`; `Amy: Rot Y=-180, Rot X=180, Rot Z=180`; `AJ: Rot Y=-180, Rot X=180, Rot Z=180`; all use `Move Y=0.85`) plus `Reset Remy Placement`), movement speed/ramp, perfect tolerance, combo target, recovery growth/slowdown behavior, audio/haptics enablement, distraction toggles/thresholds/speed, fireworks simulation controls (launch interval min/max, shell speed min/max, shell gravity, shell trail ticks min/max, secondary delay min/max, particle lifetime min/max, primary/secondary particle counts, ring bias, radial jitter, vertical bias, speed jitter, and active-particle cap with relationship sanitization), cloud simulation controls (count `0–12`, drift speed with explicit zero-drift support, spawn-above/despawn-below lifecycle bands with sanitization + minimum separation), launch distraction channels on demand (tentacle/gorilla/tremor/ufo/contrast/clouds/fireworks), day/night cycle duration, integrity thresholds/wobble strength, collapse duration/tilt/pullback/drop, quality preset + auto fallback + frame budget, archival/LOD/debris perf knobs, starting stack size (default raised so base extends below screen), debris lifetime, placement shake amount, and grid visibility (now off by default); default fireworks morphology/count values are pre-tuned for the chrysanthemum profile (`41/10` primary/secondary with `ring 0.75`, `radial jitter 0.5`, `vertical bias -0.25`, `speed jitter 0.4`), and fireworks rendering maps simulation shell/particle IDs and stages to DOM metadata for deterministic E2E assertions
- HUD includes a combo card (`current/target`) so perfect streak progress is visible even outside debug mode

## Notes

- The Playwright path supports environments where WebGL is unavailable by degrading to a non-WebGL fallback while preserving the HUD and interaction surface.
- Character loading supports Draco-compressed GLTF assets when present; this repo serves decoders from `public/draco/` and the runtime uses `import.meta.env.BASE_URL + "draco/"` for `DRACOLoader`.
- Fireworks visual-regression workflow: the canonical gate is `fireworks chrysanthemum canonical snapshot remains stable` (seed `42`, first primary burst transition + 2 paused ticks). Run it in isolation with `npm run test:e2e -- tests/e2e/fireworks.spec.ts -g "fireworks chrysanthemum canonical snapshot remains stable"`; refresh the baseline intentionally with `npx playwright test tests/e2e/fireworks.spec.ts -g "fireworks chrysanthemum canonical snapshot remains stable" --update-snapshots`.
- Local hooks can be enabled with `git config core.hooksPath .githooks` if they are not already configured.
- `.github/workflows/deploy-pages.yml` publishes the built site to GitHub Pages from `main` and builds with a repository-name base path so project Pages URLs resolve assets correctly.

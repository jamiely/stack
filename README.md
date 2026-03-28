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
- V3 distraction framework with deterministic seeded state, level-gated channel activation, runtime toggle/threshold tuning hooks, on-demand debug launch triggers, and V3.2 actor visuals (gorilla climber, UFO flyby/contrast wash, front-layer cloud occlusion, tremor pulse)
- V4.1 structural integrity telemetry with deterministic center-of-mass approximation, `stable/precarious/unstable` tiering, and precarious camera wobble feedback
- V4.2 collapse fail sequence: hard misses or unstable integrity now trigger a deterministic tower-topple presentation with failure camera pullback and collapse feedback cues
- V5.1 performance/scalability pass: distant slab archival into static chunk proxies, distraction LOD throttling, strict debris pooling/caps, and runtime perf diagnostics
- Upward camera follow, score/height HUD, impact flash feedback, and falling debris
- Runtime debug panel for gameplay tuning, gated behind `?debug`
- Vitest unit test setup with 90%+ enforced coverage on the logic layer
- Playwright coverage for boot/start, keyboard + pointer stops, miss/restart flow, deterministic test stepping, and runtime debug tuning updates
- Deterministic test mode (`?test`) with a guarded `window.__towerStackerTestApi` control surface for stepping, scripted placement setup, combo-state inspection, recovery telemetry, feedback telemetry, distraction-state/actor-visual assertions, integrity telemetry assertions, collapse-state assertions, and performance diagnostics assertions
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
- `npm run coverage`: enforce the logic-layer coverage threshold
- `npm run test:e2e`: run the Playwright suite used by pre-commit and pre-push

## Controls

- `Start Run`: begins a stacking run
- `Space`, `Enter`, mouse click, or tap while playing: stop the moving slab
- `Return To Title`: exit the active run
- `Restart Run`: restart after a miss
- Visit `/?debug` to expose the runtime tuning panel
- In debug mode, additional diagnostics appear: the top-bar status card plus overlay body/renderer details
- Add `?test` (or `?testMode`) for deterministic test mode; add `&paused=0` to auto-run instead of booting paused; optional `&seed=<int>` drives deterministic seeded active-slab spawn states and is surfaced through test-state snapshots
- Debug panel controls: tune camera, slab dimensions, movement speed/ramp, perfect tolerance, combo target, recovery growth/slowdown behavior, audio/haptics enablement, distraction toggles/thresholds/speed, launch distraction channels on demand (tentacle/gorilla/tremor/ufo/contrast/clouds), integrity thresholds/wobble strength, collapse duration/tilt/pullback/drop, quality preset + auto fallback + frame budget, archival/LOD/debris perf knobs, starting stack size, debris lifetime/tumble, and grid visibility
- HUD includes a combo card (`current/target`) so perfect streak progress is visible even outside debug mode

## Notes

- The Playwright path supports environments where WebGL is unavailable by degrading to a non-WebGL fallback while preserving the HUD and interaction surface.
- Local hooks can be enabled with `git config core.hooksPath .githooks` if they are not already configured.
- `.github/workflows/deploy-pages.yml` publishes the built site to GitHub Pages from `main` and builds with a repository-name base path so project Pages URLs resolve assets correctly.

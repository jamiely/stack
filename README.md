# Tower Stacker

Desktop-first browser prototype for the `Tower Stacker` stacking game described in [docs/design.md](/Users/jamiely/code/stack/docs/design.md) and staged through [plan.md](/Users/jamiely/code/stack/plan.md).

Feature tracking notes live in [docs/features.md](/Users/jamiely/code/stack/docs/features.md).

## Current Status

The repo now includes a playable early milestone:

- Vite + TypeScript + Three.js application shell
- Alternating X/Z stack placement with trim-or-miss gameplay
- Upward camera follow, score/height HUD, and falling debris
- Runtime debug panel for gameplay tuning, gated behind `?debug`
- Vitest unit test setup with 90%+ enforced coverage on the logic layer
- Playwright smoke coverage for boot, start flow, and debug gating
- Deterministic test mode (`?test`) with a guarded `window.__towerStackerTestApi` control surface for stepping and scripted placement setup
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
- Add `?test` (or `?testMode`) for deterministic test mode; add `&paused=0` to auto-run instead of booting paused
- Debug panel controls: tune camera, slab dimensions, movement speed/ramp, perfect tolerance, starting stack size, debris lifetime, and grid visibility

## Notes

- The Playwright path supports environments where WebGL is unavailable by degrading to a non-WebGL fallback while preserving the HUD and interaction surface.
- Local hooks can be enabled with `git config core.hooksPath .githooks` if they are not already configured.
- `.github/workflows/deploy-pages.yml` publishes the built site to GitHub Pages from `main` and builds with a repository-name base path so project Pages URLs resolve assets correctly.

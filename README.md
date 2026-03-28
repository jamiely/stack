# Tower Stacker

Desktop-first browser prototype for the `Tower Stacker` stacking game described in [docs/design.md](/Users/jamiely/code/stack/docs/design.md) and staged through [plan.md](/Users/jamiely/code/stack/plan.md).

## Current Status

The repo now includes the milestone-one scaffold:

- Vite + TypeScript + Three.js application shell
- Title overlay and HUD
- Runtime debug panel for camera and slab preview motion
- Vitest unit test setup with 90%+ enforced coverage on the logic layer
- Playwright smoke coverage for boot and start flow
- Git hooks for unit tests on commit and Playwright on commit/push

Core stop-and-trim gameplay, deterministic test mode, and richer debug/test controls are still pending.

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

- `Start Prototype`: enters the live shell preview
- `Return To Title`: returns to the idle overlay
- `Swap Axis Preview` / `Reset Axis`: flips the active preview motion axis
- Debug panel sliders: tune camera height, camera distance, camera lerp, motion range, and motion speed
- Debug panel checkbox: toggle grid visibility

## Notes

- The Playwright path supports environments where WebGL is unavailable by degrading to a non-WebGL fallback while preserving the HUD and interaction surface.
- Local hooks can be enabled with `git config core.hooksPath .githooks` if they are not already configured.

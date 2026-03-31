# Existing Patterns

## Deterministic simulation is kept in pure `logic/*` modules
- Distraction state follows a pure `create...State` + `update...State` pattern with explicit config/state inputs and no DOM access, which is the closest precedent for the new cloud simulation module (`src/game/logic/distractions.ts:66-170`).
- Seeded determinism uses a shared PRNG helper (`createSeededRandom`) that normalizes seeds and returns stable replayable values (`src/game/logic/random.ts:3-16`).
- Test-mode URL parsing and fixed-step semantics are centralized in runtime helpers, not embedded directly in rendering code (`src/game/logic/runtime.ts:7-24`).

## Current cloud system is still Game-local and mixed with rendering
- Cloud state is stored on `Game` instance fields (`cloudWorldAnchors`, `cloudSpawnFromTop`, `cloudSizeScales`) with fixed initial array sizes (`src/game/Game.ts:421-426`).
- Overlay creation currently hardcodes three cloud DOM nodes during distraction overlay setup (`src/game/Game.ts:610-627`).
- `updateCloudLayer` mixes lifecycle decisions, world/projection math, lane-ish depth scaling, and direct DOM style writes in one method (`src/game/Game.ts:1549-1651`).
- Lifecycle currently includes level-interval respawn (`CLOUD_RESPAWN_LEVEL_INTERVAL`) in addition to projection-threshold respawn checks (`src/game/Game.ts:260`, `src/game/Game.ts:1581-1588`, `src/game/logic/clouds.ts:7-14`).

## Debug-control integration pattern
- Numeric slider metadata lives in `DEBUG_RANGES`; toggles in `DEBUG_TOGGLE_META` (`src/game/Game.ts:163-223`).
- Debug panel is generated from those metadata maps with `data-debug-key` hooks and immediate `applyDebugConfig` on input/change (`src/game/Game.ts:651-720`).
- Runtime clamping is centralized in `clampDebugConfig`, including dependent constraints (example: `integrityUnstableThreshold` depends on precarious threshold; `lodFarDistance` depends on `lodNearDistance`) (`src/game/debugConfig.ts:63-142`).
- `applyDebugConfig` clamps, updates systems, and re-syncs all debug inputs from the canonical config object (`src/game/Game.ts:2191-2238`).

## Test/API observability pattern
- Test API exposes deterministic stepping (`stepSimulation`) and full state retrieval via `getState` (`src/game/Game.ts:2359-2390`).
- Public state already reports distraction visual telemetry (including aggregate `cloudOpacity`), so cloud diagnostics should follow this state-shaping pattern (`src/game/types.ts:130-214`, `src/game/Game.ts:2393-2461`).
- Existing e2e tests interact with sliders via `input[data-debug-key="..."]`, then step simulation before assertions (`tests/e2e/clouds.spec.ts:13-58`, `tests/e2e/gameplay.spec.ts:1009-1060`).
- Existing cloud tests are currently limited to projection respawn/X-spawn helper behavior, leaving room for the new deterministic lifecycle test matrix (`tests/unit/clouds.test.ts:4-27`).

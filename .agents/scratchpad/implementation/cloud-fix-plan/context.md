# Cloud Fix Plan — Implementation Context

## Research summary
- The approved design aligns with current architecture direction: pure deterministic logic modules in `src/game/logic/` plus Game-level adapters for rendering and orchestration (`src/game/logic/distractions.ts:66-170`, `src/game/Game.ts:1549-1651`).
- Existing cloud behavior is not yet modularized; it is embedded in `Game.updateCloudLayer` and depends on mixed world/projection math + DOM mutation (`src/game/Game.ts:1549-1651`).
- Deterministic test primitives already exist (seeded RNG, fixed-step test mode, scriptable API), so cloud acceptance checks can be added without inventing new harness infrastructure (`src/game/logic/random.ts:3-16`, `src/game/logic/runtime.ts:7-24`, `src/game/Game.ts:2359-2461`).

## Primary integration points
1. **Cloud simulation module (new)**
   - Place under `src/game/logic/` following pure update style used by distractions.
   - Reuse seeded randomness conventions (`src/game/logic/random.ts:3-16`).
2. **Game runtime wiring**
   - Replace legacy cloud fields/update path currently centered at `updateCloudLayer` and `createCloudAnchor` (`src/game/Game.ts:1549-1701`).
   - Keep compatibility with distraction LOD update cadence (`src/game/Game.ts:1336-1340`, `src/game/Game.ts:1501-1503`).
3. **Debug control surface**
   - Add numeric/toggle entries via `DEBUG_RANGES`/`DEBUG_TOGGLE_META`; this automatically drives debug panel generation (`src/game/Game.ts:163-223`, `src/game/Game.ts:651-720`).
   - Add clamp/sanitize rules in `clampDebugConfig` (`src/game/debugConfig.ts:63-142`).
4. **Public test state + typing**
   - Extend `PublicGameState` and `getPublicState()` for per-cloud diagnostics while preserving existing fields (`src/game/types.ts:99-214`, `src/game/Game.ts:2393-2461`).
5. **Tests**
   - Expand `tests/unit/clouds.test.ts` into deterministic lifecycle/lane/drift/clamp coverage.
   - Add deterministic e2e assertions to `tests/e2e/clouds.spec.ts` (and possibly gameplay cloud checks) using existing stepSimulation patterns (`tests/e2e/clouds.spec.ts:9-105`, `tests/e2e/gameplay.spec.ts:1009-1132`).

## Constraints and gotchas for Builder phase
- Current cloud respawn has two triggers (level interval + projected threshold); design requires camera-threshold-driven lifecycle, so interval respawn path should be retired or justified (`src/game/Game.ts:1581-1588`, `src/game/logic/clouds.ts:7-14`).
- Current cloud DOM node count is fixed at 3 in multiple locations; implementing count/density control needs dynamic pool sizing and synchronized state arrays (`src/game/Game.ts:421-423`, `src/game/Game.ts:623-627`).
- Existing test state only exposes `distractions.visuals.cloudOpacity`, not per-cloud diagnostics required by the plan (`src/game/Game.ts:2424-2435`, `src/game/types.ts:130-159`).
- Debug slider integer handling is duplicated in two locations; if new integer cloud controls are added, update both spots (or consolidate) to avoid UI/value mismatches (`src/game/Game.ts:678-692`, `src/game/Game.ts:2317-2333`).
- Existing e2e practice requires stepping simulation after debug config changes before asserting state changes; preserve this for stable tests (see prior fix memory and current tests) (`tests/e2e/clouds.spec.ts:31-58`, `tests/e2e/gameplay.spec.ts:687-734`).

## Builder-ready file targets
- `src/game/logic/clouds.ts` (likely rewrite/split)
- `src/game/Game.ts` (cloud integration, diagnostics wiring)
- `src/game/debugConfig.ts` and `src/game/types.ts` (new cloud config/typing)
- `src/styles.css` (rounded-lobe cloud visuals)
- `tests/unit/clouds.test.ts`, `tests/unit/debugConfig.test.ts` (unit coverage)
- `tests/e2e/clouds.spec.ts` (+ possibly `tests/e2e/gameplay.spec.ts`) for deterministic acceptance checks
- `docs/features.md` + `README.md` in final documentation step

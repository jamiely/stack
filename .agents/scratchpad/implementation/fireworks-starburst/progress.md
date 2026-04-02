# Progress — fireworks-starburst

## Current Step
- Step 3: Add morphology shaping controls + configurable particle counts

## Active Wave
- Runtime task id: task-1775095818-f279
- Runtime task key: pdd:fireworks-starburst:step-03:add-morphology-shaping-controls-and-configurable-particle-counts
- Code task file: .agents/scratchpad/implementation/fireworks-starburst/tasks/task-03-add-morphology-shaping-controls-and-configurable-particle-counts.code-task.md
- Wave status: active (Step 3 only mirrored)

## Step Status
- Step 1: completed
- Step 2: completed
- Step 3: completed (awaiting critic review)
- Step 4: pending
- Step 5: pending
- Step 6: pending
- Step 7: pending
- Step 8: pending

## 2026-04-02 — Queue advance to Step 3
- Closed Step 2 runtime wave after passed review/finalizer handoff.
- Mirrored only Step 3 into runtime queue as `task-1775095818-f279`.
- Next handoff event should target Builder for Step 3 TDD execution.

## 2026-04-02 — Queue advance to Step 2
- Closed Step 1 runtime wave after passed re-review/finalizer handoff.
- Mirrored only Step 2 into runtime queue as `task-1775095329-2ecf`.
- Next handoff event should target Builder for Step 2 TDD execution.

## 2026-04-02 — Step 1 TDD Evidence (task-1775094463-a9d7)
- **RED**
  - Added failing assertions in `tests/unit/debugConfig.test.ts` for new fireworks morphology/count controls (bounds, integer coercion, and non-finite fallback behavior).
  - Added failing sanitization assertions in `tests/unit/fireworks.test.ts` for simulation-side counterparts.
  - Verified failure via `npm run test:unit -- tests/unit/debugConfig.test.ts tests/unit/fireworks.test.ts` (new fields were `undefined` before implementation).
- **GREEN**
  - Extended schema/defaults in `src/game/types.ts`, `src/game/debugConfig.ts`, and `src/game/logic/fireworks.ts`.
  - Implemented clamp/sanitize contracts for new controls with finite fallbacks and integer coercion for particle counts.
  - Updated fireworks config mapping in `src/game/Game.ts` and updated typed test config fixtures.
  - Re-ran targeted unit tests to green.
- **REFACTOR / ALIGNMENT**
  - Added shared finite clamp helpers in `debugConfig.ts` for explicit non-finite handling.
  - Kept existing fireworks cap guardrails unchanged (`distractionFireworksMaxActiveParticles` / `maxActiveParticles`).
  - Added `DEBUG_RANGES` metadata entries to satisfy extended `DebugNumberKey` surface.

## Verification
- `npm run test:unit` ✅
- `npm run test:e2e` ✅
- `npm run build` ✅
- Logs captured:
  - `.agents/scratchpad/implementation/fireworks-starburst/logs/test.log`
  - `.agents/scratchpad/implementation/fireworks-starburst/logs/build.log`

## 2026-04-02 — Step 2 TDD Evidence (task-1775095329-2ecf)
- **RED**
  - Added failing isotropic-sanity coverage in `tests/unit/fireworks.test.ts` (`keeps neutral primary burst directions approximately isotropic across deterministic seeds`) plus a helper that deterministically steps to first primary burst.
  - Verified failure with `npm run test:unit -- tests/unit/fireworks.test.ts` (`meanUnitY` exceeded tolerance, confirming vertical bias in the previous sampler).
- **GREEN**
  - Replaced primary/secondary burst direction generation in `src/game/logic/fireworks.ts` with deterministic isotropic spherical sampling (`unitY ∈ [-1,1]`, radial magnitude from sphere surface).
  - Preserved RNG cursor contract (still four samples/particle: azimuth, vertical component, speed, lifetime).
  - Removed legacy emission-time gravity/drag directional skew so neutral settings produce balanced direction vectors.
- **REFACTOR / ALIGNMENT**
  - Removed now-unused `gravity`/`drag` parameters from `emitBurstParticles` call sites/signature to keep the sampler API minimal and explicit.
  - Updated feature documentation mentions in `docs/features.md` and `README.md` to reflect isotropic neutral burst sampling behavior.
- **Verification**
  - Targeted: `npm run test:unit -- tests/unit/fireworks.test.ts` ✅
  - Full gates: `npm run test:unit && npm run test:e2e` ✅, `npm run build` ✅
  - Logs refreshed at:
    - `.agents/scratchpad/implementation/fireworks-starburst/logs/test.log`
    - `.agents/scratchpad/implementation/fireworks-starburst/logs/build.log`

## 2026-04-02 — Step 1 review-reject fix (rounding parity)
- **RED**
  - Added `tests/unit/fireworks.test.ts` assertion that decimal count fields are rounded (`40.9 -> 41`, `9.6 -> 10`) in `sanitizeFireworksConfig`.
  - Verified failure with `npm run test:unit -- tests/unit/fireworks.test.ts` (received `40` before fix).
- **GREEN**
  - Updated `src/game/logic/fireworks.ts` `clampIntFinite` from `Math.floor` to `Math.round` so simulation-side sanitization mirrors debug clamp count behavior.
  - Re-ran targeted suite: `npm run test:unit -- tests/unit/fireworks.test.ts tests/unit/debugConfig.test.ts` ✅.
- **REFACTOR / ALIGNMENT**
  - No additional refactor required; change is isolated to shared integer finite clamp helper used by count sanitization.
  - Full verification rerun and logs refreshed.

## 2026-04-02 — Step 3 TDD Evidence (task-1775095818-f279)
- **RED**
  - Added failing morphology/count tests in `tests/unit/fireworks.test.ts`:
    - configurable primary/secondary particle counts under cap headroom,
    - ring + vertical bias direction shaping,
    - radial/speed jitter bounded spread behavior.
  - Confirmed initial failures with `npm run test:unit -- tests/unit/fireworks.test.ts` (legacy fixed counts and unused morphology knobs).
- **GREEN**
  - Implemented config-driven particle counts across launch demand estimation, reclaim logic, and primary/secondary burst emission in `src/game/logic/fireworks.ts`.
  - Added bounded deterministic morphology shaping (ring compression, vertical bias, azimuth/vertical jitter, speed jitter envelope) in emission vector/speed generation.
  - Kept RNG consumption deterministic at 4 samples/particle and preserved lifecycle/cap telemetry pathways.
- **REFACTOR / ALIGNMENT**
  - Renamed hardcoded fallback constants to `DEFAULT_*` to clarify schema-default intent vs runtime counts.
  - Consolidated shaping constants near other firework simulation guardrails for readable bounds.
- **Verification**
  - Targeted: `npm run test:unit -- tests/unit/fireworks.test.ts` ✅
  - Full gates: `npm run test:unit && npm run test:e2e` ✅; `npm run build` ✅
  - Logs refreshed:
    - `.agents/scratchpad/implementation/fireworks-starburst/logs/test.log`
    - `.agents/scratchpad/implementation/fireworks-starburst/logs/build.log`

# Progress — fireworks-starburst

## Current Step
- Step 5: Wire controls through Game debug ranges + simulation mapping

## Active Wave
- Runtime task id: task-1775096809-f43e
- Runtime task key: pdd:fireworks-starburst:step-05:wire-controls-through-game-debug-ranges-and-simulation-mapping
- Code task file: .agents/scratchpad/implementation/fireworks-starburst/tasks/task-05-wire-controls-through-game-debug-ranges-and-simulation-mapping.code-task.md
- Wave status: active (Step 5 only mirrored)

## Step Status
- Step 1: completed
- Step 2: completed
- Step 3: completed
- Step 4: completed
- Step 5: completed
- Step 6: pending
- Step 7: pending
- Step 8: pending

## 2026-04-02 — Queue advance to Step 5
- Closed Step 4 runtime wave after passed review/finalizer handoff.
- Mirrored only Step 5 into runtime queue as `task-1775096809-f43e`.
- Next handoff event targets Builder for Step 5 TDD execution.

## 2026-04-02 — Step 5 TDD Evidence (task-1775096809-f43e)
- **RED**
  - Added paused deterministic integration coverage in `tests/e2e/fireworks.spec.ts` that applies new morphology/count controls through the test debug API and requires no telemetry mutation until `stepSimulation(...)` is invoked.
  - Added assertions that the debug panel integer display rounds the new count controls (`40.9 -> 41`, `9.6 -> 10`) to verify integer formatting/parsing parity with runtime sliders.
- **GREEN**
  - Updated integer-key handling in `src/game/Game.ts` so the new count controls (`distractionFireworksPrimaryParticleCount`, `distractionFireworksSecondaryParticleCount`) are rounded consistently in both slider input handling and HUD debug value rendering.
  - Verified simulation mapping remains intact via existing `buildFireworksSimulationConfig()` fields and the new paused-step e2e assertions.
- **REFACTOR / ALIGNMENT**
  - Kept integer-key lists ordered with neighboring fireworks controls to match existing debug panel organization and avoid introducing new helper abstractions in this narrow step.
- **Verification**
  - `npm run test:unit` ✅ (24 files / 173 tests)
  - `npm run test:e2e -- tests/e2e/fireworks.spec.ts` ✅ (5 tests)
  - `npm run build` ✅
  - Logs refreshed:
    - `.agents/scratchpad/implementation/fireworks-starburst/logs/test.log`
    - `.agents/scratchpad/implementation/fireworks-starburst/logs/build.log`

## 2026-04-02 — Step 4 TDD Evidence (task-1775096280-6688)
- **RED**
  - Replaced cap-guardrail stress assertions in `tests/unit/fireworks.test.ts` with elevated morphology/count pressure (`primaryParticleCount=120`, `secondaryParticleCount=120`, ring/jitter extremes) and dual-step-size runs (`1/60`, `1/30`).
  - Added failing assertions that stress runs still produce launches/bursts, stay cap-bounded every tick, and keep first degradation secondary-first.
  - Verified failures via `npm run test:unit -- tests/unit/fireworks.test.ts` (launches remained `0`, firstDrop counters `null`).
- **GREEN**
  - Updated `src/game/logic/fireworks.ts` to use cap-aware effective emission counts (`min(configuredCount, maxActiveParticles)`) for launch demand checks, primary reclaim demand, and primary/secondary emission targets.
  - This preserves activity when configured counts exceed cap while keeping per-tick hard cap enforcement and deterministic cursor flow intact.
  - Re-ran targeted suite to green: `npm run test:unit -- tests/unit/fireworks.test.ts` ✅.
- **REFACTOR / ALIGNMENT**
  - Consolidated effective-count derivation once per step and reused at all cap decision points to avoid divergent guardrail math.
  - Left lifecycle cleanup/completion telemetry code paths unchanged; stress tests now exercise them under elevated morphology pressure.
- **Verification**
  - Full gates: `npm run test:unit && npm run test:e2e` ✅; `npm run build` ✅
  - Logs refreshed:
    - `.agents/scratchpad/implementation/fireworks-starburst/logs/test.log`
    - `.agents/scratchpad/implementation/fireworks-starburst/logs/build.log`

## 2026-04-02 — Queue advance to Step 4
- Closed Step 3 runtime wave after passed review/finalizer handoff.
- Mirrored only Step 4 into runtime queue as `task-1775096280-6688`.
- Next handoff event should target Builder for Step 4 TDD execution.

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

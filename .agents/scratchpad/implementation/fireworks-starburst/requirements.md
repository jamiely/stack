# Requirements — fireworks-starburst

## Objective
Implement the fireworks chrysanthemum starburst plan (`.agents/planning/2026-04-02-fireworks-starburst/implementation/plan.md`) beginning at Step 1, preserving deterministic simulation behavior and existing performance/cap guardrails.

## Consolidated requirements

1. **Config schema expansion (Step 1)**
   - Extend runtime debug/config schema for new chrysanthemum morphology controls (counts + shape controls) across:
     - `DebugConfig` (`src/game/types.ts`)
     - `defaultDebugConfig` + `clampDebugConfig` (`src/game/debugConfig.ts`)
     - `FireworksConfig` (`src/game/logic/fireworks.ts`)
   - New controls must be clamped/normalized and integer-rounded where appropriate.

2. **Deterministic isotropic burst sampling (Step 2)**
   - Replace current burst-direction sampling in fireworks simulation with deterministic isotropic spherical sampling.
   - RNG cursor progression must remain explicit and stable so same seed/config/steps produce same output.

3. **Morphology shaping and count control (Step 3)**
   - Replace fixed particle counts with config-driven counts.
   - Add ring/jitter/vertical-bias shaping controls with safe clamp limits.
   - Maintain cap logic behavior: bounded `maxActiveParticles` and secondary-first degradation under pressure.

4. **Runtime wiring and debug UI exposure (Step 4)**
   - Add new controls to `DEBUG_RANGES` and propagate through `buildFireworksSimulationConfig()`.
   - Preserve paused deterministic semantics: config changes become effective on manual step/tick, not retroactively.

5. **Coverage and deterministic testing (Step 5)**
   - Expand non-rendering unit tests (`tests/unit/debugConfig.test.ts`, `tests/unit/fireworks.test.ts`) for clamp logic and deterministic morphology behavior.
   - Maintain project requirement: at least 90% unit-test coverage for non-rendering code.

6. **Canonical visual acceptance gate (Step 6)**
   - Canonical style reference source: `/Users/jamiely/Library/Containers/cc.ffitch.shottr/Data/tmp/cc.ffitch.shottr/SCR-20260401-sfur.jpeg`.
   - Committed Playwright baseline path: `tests/e2e/fireworks.spec.ts-snapshots/fireworks-chrysanthemum-canonical-chromium-darwin.png`.
   - Deterministic capture anchor: `?debug&test&paused=1&seed=42`, trigger deterministic launch, detect first `primaryBursts` transition `0 -> 1`, then manual-step exactly 2 ticks before screenshot.
   - Screenshot assertion contract:
     - `animations: "disabled"`
     - `caret: "hide"`
     - `scale: "css"`
     - `threshold: 0.12`
     - `maxDiffPixels: 180`

7. **Default tuning (Step 7)**
   - Tune defaults to produce chrysanthemum-like appearance without manual user tuning on startup.
   - Preserve cap/perf guardrails and existing deterministic lifecycle correctness.

8. **Regression and docs closure (Step 8)**
   - Update docs (`README.md`, `docs/features.md`) to reflect new controls/behavior.
   - Re-run full required suite (unit + Playwright) and ensure release readiness.

## Assumptions
- Existing fireworks simulation lifecycle/event telemetry remains the base contract; the feature extends morphology rather than introducing style modes.
- Existing public test API (`window.__towerStackerTestApi`) remains the harness for deterministic stepping and capture orchestration.

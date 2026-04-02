# Implementation Plan — Fireworks Chrysanthemum Starburst

## Checklist
- [ ] Step 1: Extend fireworks/debug config schema for chrysanthemum controls
- [ ] Step 2: Implement deterministic isotropic burst-direction sampling in simulation core
- [ ] Step 3: Add ring/jitter/vertical-bias shaping and replace fixed particle counts
- [ ] Step 4: Wire new controls through Game debug panel and simulation config mapping
- [ ] Step 5: Update unit tests for config clamps and deterministic morphology behavior
- [ ] Step 6: Add deterministic Playwright screenshot verification for chrysanthemum appearance
- [ ] Step 7: Tune defaults to match chrysanthemum reference while preserving cap/perf guardrails
- [ ] Step 8: Final regression/documentation pass and release readiness

---

## Step 1: Extend fireworks/debug config schema for chrysanthemum controls
**Objective**
Add new shape-related config fields across shared types, defaults, and clamp/sanitize pathways.

**Implementation guidance**
- Update `DebugConfig` in `src/game/types.ts` with new knobs (counts + shape controls).
- Add defaults in `src/game/debugConfig.ts`.
- Add clamp/normalization rules in `clampDebugConfig` for all new fields.
- Extend `FireworksConfig` in `src/game/logic/fireworks.ts` for simulation-side consumption.

**Test requirements**
- Add/adjust unit tests in `tests/unit/debugConfig.test.ts` for bounds, integer rounding, and normalization behavior.
- Ensure existing debug-config tests continue passing.

**Integration with previous work**
- Builds directly on existing debug/config architecture without changing runtime behavior yet.

**Demo**
- Project compiles with new fields present in config objects and clamping path; no runtime errors from missing properties.

---

## Step 2: Implement deterministic isotropic burst-direction sampling in simulation core
**Objective**
Replace the current burst direction generation with isotropic spherical sampling to produce circular radial spread.

**Implementation guidance**
- Refactor `emitBurstParticles(...)` in `src/game/logic/fireworks.ts`.
- Use deterministic seed+cursor samples to generate uniform directions on a sphere.
- Keep RNG cursor progression explicit and stable.
- Preserve existing lifecycle integration (gravity, drag, lifetime, cleanup).

**Test requirements**
- Add/adjust unit tests in `tests/unit/fireworks.test.ts` to confirm deterministic equivalence under same seed/config after refactor.
- Add distribution sanity assertions (e.g., no systemic bell-biased vertical skew at baseline settings).

**Integration with previous work**
- Consumes Step 1 config model; no UI dependency yet.

**Demo**
- Running deterministic simulation with fixed seed yields repeatable burst layouts that are visibly more circular.

---

## Step 3: Add ring/jitter/vertical-bias shaping and replace fixed particle counts
**Objective**
Introduce runtime-tunable chrysanthemum morphology controls while keeping one universal burst style.

**Implementation guidance**
- Replace hardcoded `PRIMARY_PARTICLE_COUNT`/`SECONDARY_PARTICLE_COUNT` usage with config values.
- Implement speed shaping blend for subtle concentric ring behavior and jitter.
- Add vertical-bias handling with safe clamp limits.
- Keep existing cap logic (`maxActiveParticles`, secondary-drop-first) intact.

**Test requirements**
- Unit tests verifying:
  - count controls affect emitted particle totals within cap constraints,
  - ring/jitter/bias parameters stay bounded and deterministic,
  - cap/degradation behavior still holds under higher configured counts.

**Integration with previous work**
- Extends Step 2 sampler with artistic controls and Step 1 config values.

**Demo**
- Fixed seed runs show one default chrysanthemum style that can be tuned by shape knobs without enabling style variants.

---

## Step 4: Wire new controls through Game debug panel and simulation config mapping
**Objective**
Expose new tuning knobs in runtime debug UI and pass them into fireworks simulation config.

**Implementation guidance**
- Add entries to `DEBUG_RANGES` in `src/game/Game.ts`.
- Include values in `buildFireworksSimulationConfig()`.
- Ensure existing paused-test-mode behavior remains: config applies on next step.

**Test requirements**
- Add/adjust e2e or unit-leaning integration checks that debug config updates propagate to simulation after `stepSimulation`.
- Keep existing fireworks debug behavior tests green.

**Integration with previous work**
- Makes Step 1–3 tunables accessible at runtime.

**Demo**
- In `?debug&test`, sliders visibly change burst morphology on subsequent deterministic steps.

---

## Step 5: Update unit tests for config clamps and deterministic morphology behavior
**Objective**
Provide robust non-rendering coverage for new shape logic and maintain coverage target.

**Implementation guidance**
- Expand `tests/unit/fireworks.test.ts` with morphology-focused deterministic assertions.
- Expand `tests/unit/debugConfig.test.ts` for all new clamp paths.
- Keep tests focused on pure/simulation logic rather than rendering.

**Test requirements**
- Unit suite passes with >=90% non-rendering coverage maintained.

**Integration with previous work**
- Validates Steps 1–4 correctness and guardrails.

**Demo**
- Unit test report shows new assertions covering shape controls and deterministic behavior.

---

## Step 6: Add deterministic Playwright screenshot verification for chrysanthemum appearance
**Objective**
Add visual acceptance test proving burst shape matches intended chrysanthemum look in deterministic mode.

**Implementation guidance**
- Extend `tests/e2e/fireworks.spec.ts` with a new screenshot-based scenario.
- Use `?debug&test&paused=1&seed=<fixed>` and scripted stepping.
- Capture at a fixed tick window around primary burst.
- Compare against committed baseline consistent with provided reference image.

**Test requirements**
- New e2e screenshot assertion passes locally and in CI.
- Existing fireworks e2e lifecycle/cap/cleanup tests remain passing.

**Integration with previous work**
- Uses new controls from Step 4 and deterministic sim from Steps 2–3.

**Demo**
- Playwright run includes a stable chrysanthemum screenshot assertion that fails on visual regressions.

---

## Step 7: Tune defaults to match chrysanthemum reference while preserving cap/perf guardrails
**Objective**
Set default parameters to produce the desired look without requiring manual tuning on startup.

**Implementation guidance**
- Tune defaults in `defaultDebugConfig` for a convincing chrysanthemum profile.
- Verify with deterministic screenshot and manual runtime checks.
- Keep particle counts and speed spread within safe cap/perf envelope.

**Test requirements**
- Re-run full unit + e2e suites after default tuning.
- Confirm cap-related tests and stress paths still pass.

**Integration with previous work**
- Finalizes visual target on top of prior functional and test scaffolding.

**Demo**
- Launching with default config produces chrysanthemum-like bursts matching target style without additional tweaks.

---

## Step 8: Final regression/documentation pass and release readiness
**Objective**
Close the feature with documentation accuracy and full regression confidence.

**Implementation guidance**
- Update `README.md` and `docs/features.md` for new fireworks controls/visual behavior.
- If needed, update design/plan cross-references where implementation decisions were finalized.
- Run all required checks (unit + Playwright).

**Test requirements**
- All tests green.
- Coverage threshold remains satisfied.

**Integration with previous work**
- Consolidates Steps 1–7 into a releasable, documented state.

**Demo**
- Repository includes updated docs and passing CI-ready test suite for the chrysanthemum burst feature.

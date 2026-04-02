# Implementation Plan — fireworks-starburst

## Test Strategy (TDD-first)

### Unit tests (non-rendering, deterministic)
1. **`tests/unit/debugConfig.test.ts`**
   - `clamps_new_fireworks_morphology_controls`: verify new knobs clamp to safe ranges.
   - `normalizes_fireworks_morphology_min_max_pairs`: verify min/max inversion correction for any new paired controls.
   - `rounds_fireworks_count_controls_to_integers`: verify count-like fields are integer-coerced.
   - `preserves_existing_fireworks_guardrails`: maxActiveParticles and existing legacy controls still clamp correctly.

2. **`tests/unit/fireworks.test.ts`**
   - `sanitize_fireworks_config_clamps_new_morphology_fields`: sanitize path mirrors debug clamp safety.
   - `isotropic_sampler_replays_identically`: same seed/config/steps => byte-equal state snapshots.
   - `isotropic_sampler_neutral_bias_has_balanced_vertical_distribution`: neutral settings show no directional skew beyond deterministic tolerance window.
   - `morphology_knobs_change_distribution_without_breaking_bounds`: ring/jitter/vertical bias shift emitted velocities/positions within expected bounded ranges.
   - `configurable_primary_secondary_counts_are_applied`: emitted particle counts follow config when cap headroom exists.
   - `cap_pressure_drops_secondary_before_primary_with_new_counts`: degradation priority remains secondary-first under stress.

### Integration tests (runtime wiring + paused semantics)
1. **`tests/e2e/fireworks.spec.ts` existing deterministic API-based scenarios**
   - Extend paused-step assertions to prove new debug controls do not mutate sim state until `stepSimulation`.
   - Verify `buildFireworksSimulationConfig` wiring by setting new debug controls and observing expected state/telemetry deltas after deterministic stepping.
   - Keep render metadata + cleanup parity assertions green (DOM mirrors sim entities).

### E2E visual scenario (single canonical gate)
Harness: **Playwright browser automation** (`tests/e2e/fireworks.spec.ts`)

Scenario: `fireworks chrysanthemum canonical snapshot remains stable`
1. Open `/?debug&test&paused=1&seed=42`.
2. Start game, keep paused, enable fireworks channel with deterministic launch-friendly config.
3. Step one tick at a time until `primaryBursts` transitions from `0 -> 1`.
4. Step exactly 2 additional ticks.
5. Capture screenshot of fireworks layer/viewport with:
   - `animations: "disabled"`
   - `caret: "hide"`
   - `scale: "css"`
6. Assert against baseline:
   - `tests/e2e/fireworks.spec.ts-snapshots/fireworks-chrysanthemum-canonical-chromium-darwin.png`
   - `threshold: 0.12`
   - `maxDiffPixels: 180`
7. **Adversarial attempt in same test block**: intentionally perturb one morphology knob (e.g., extreme vertical bias), repeat deterministic capture flow, and assert telemetry changed vs canonical setup before restoring canonical config for snapshot assertion. This validates the capture anchor is sensitive to morphology drift.

## Implementation Steps (numbered wave plan)

### Step 1: Extend fireworks config schema + clamp/sanitize contracts
- **Files**: `src/game/types.ts`, `src/game/debugConfig.ts`, `src/game/logic/fireworks.ts`, `tests/unit/debugConfig.test.ts`, `tests/unit/fireworks.test.ts`.
- **TDD**:
  1. Add failing debug-config clamp tests for new controls.
  2. Add failing sanitize tests for simulation config counterparts.
  3. Implement type/default/clamp/sanitize updates.
- **Success criteria**:
  - New fields exist across DebugConfig and FireworksConfig.
  - Clamp/sanitize behavior passes all new tests (including integer coercion + min/max normalization).
- **Demo**: `clampDebugConfig` + `sanitizeFireworksConfig` return stable, bounded morphology values for adversarial input payloads.

### Step 2: Implement deterministic isotropic burst direction sampler
- **Files**: `src/game/logic/fireworks.ts`, `tests/unit/fireworks.test.ts`.
- **TDD**:
  1. Add failing determinism + neutral-distribution sanity tests.
  2. Refactor burst emission direction generation to isotropic spherical sampling.
  3. Ensure RNG cursor consumption remains explicit/stable.
- **Success criteria**:
  - Same-seed replay tests pass unchanged across repeated runs.
  - Neutral bias distribution checks pass and avoid legacy directional artifacts.
- **Demo**: deterministic simulation snapshots are identical between replays while showing isotropic burst spread characteristics.

### Step 3: Add morphology shaping controls + configurable particle counts
- **Files**: `src/game/logic/fireworks.ts`, `tests/unit/fireworks.test.ts`.
- **TDD**:
  1. Add failing tests for configurable primary/secondary counts and ring/jitter/vertical-bias bounded behavior.
  2. Replace fixed count constants with config-driven values.
  3. Apply shaping transforms to emitted particle vectors/speeds.
- **Success criteria**:
  - Morphology controls affect emitted patterns deterministically.
  - Counts track config when uncapped.
  - Existing lifecycle completion windows remain valid.
- **Demo**: fixed seed with altered morphology knobs yields predictably different but bounded burst structure.

### Step 4: Preserve cap guardrails under new morphology/count envelope
- **Files**: `src/game/logic/fireworks.ts`, `tests/unit/fireworks.test.ts`.
- **TDD**:
  1. Add/extend failing stress tests for cap bounds with elevated configured counts.
  2. Ensure degradation order still drops secondary emissions before primary reductions.
  3. Refactor if needed to keep prior invariants without nondeterminism.
- **Success criteria**:
  - Active particle count never exceeds `maxActiveParticles`.
  - First degradation event is secondary-first.
- **Demo**: stress simulation runs to completion with bounded particles and expected drop counters.

### Step 5: Wire controls through Game debug ranges + simulation mapping
- **Files**: `src/game/Game.ts`, `src/game/debugConfig.ts` (if label/range metadata helpers touched), `tests/e2e/fireworks.spec.ts`.
- **TDD**:
  1. Add failing integration/e2e checks that new controls can be applied via test API and only affect state after step while paused.
  2. Add `DEBUG_RANGES` entries and mapping in `buildFireworksSimulationConfig`.
  3. Verify integer sliders/formatting for count controls.
- **Success criteria**:
  - New sliders appear in debug panel metadata.
  - Test API config changes propagate to fireworks state on deterministic step boundaries.
- **Demo**: in paused test mode, applying new knobs then stepping updates fireworks telemetry predictably.

### Step 6: Add canonical deterministic screenshot gate
- **Files**: `tests/e2e/fireworks.spec.ts`, `tests/e2e/fireworks.spec.ts-snapshots/fireworks-chrysanthemum-canonical-chromium-darwin.png`.
- **TDD**:
  1. Add failing screenshot test anchored at first primary burst transition +2 ticks with required tolerance contract.
  2. Capture/update canonical baseline image.
  3. Stabilize selectors/capture scope if needed (without relaxing contract).
- **Success criteria**:
  - Screenshot test passes locally and remains deterministic on repeated runs.
  - Existing fireworks e2e specs remain green.
- **Demo**: Playwright run demonstrates visual regression gate that detects morphology drift while passing canonical appearance.

### Step 7: Tune default values to match chrysanthemum reference style
- **Files**: `src/game/debugConfig.ts`, optionally `tests/unit/fireworks.test.ts` expectations if defaults are asserted.
- **TDD**:
  1. Add/adjust assertions that default config remains within cap-safe envelope.
  2. Iteratively tune defaults to align with style reference and keep Step 6 snapshot green.
- **Success criteria**:
  - Default startup behavior produces target chrysanthemum-like burst without manual tuning.
  - Cap/perf guardrails and determinism tests still pass.
- **Demo**: launching default game settings yields visually target-aligned bursts that still satisfy stress constraints.

### Step 8: Regression + documentation closure
- **Files**: `README.md`, `docs/features.md`, any relevant `docs/` notes.
- **TDD/verification**:
  1. Update docs to describe new controls, deterministic screenshot gate, and debug/test workflow changes.
  2. Run full required quality gates (unit, Playwright, coverage threshold).
- **Success criteria**:
  - Documentation matches shipped behavior.
  - Full suite passes with non-rendering coverage >=90%.
- **Demo**: CI-ready branch with updated docs and green verification gates.

## Step-wave handoff note
Task Writer should materialize tasks for **Step 1 only** first, then proceed wave-by-wave after each step is verified complete.
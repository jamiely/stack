# Implementation Plan

## Checklist

- [ ] Step 1: Introduce cloud simulation domain model and deterministic update primitives
- [ ] Step 2: Implement camera-relative spawn/despawn and recycle lifecycle in pure logic
- [ ] Step 3: Implement explicit front/behind depth-lane policy and horizontal drift behavior
- [ ] Step 4: Integrate new cloud system into `Game` and remove legacy cloud implementation path
- [ ] Step 5: Add runtime cloud debug controls, defaults, and clamp ranges
- [ ] Step 6: Implement rounded-lobe procedural cloud visuals in the DOM/CSS render layer
- [ ] Step 7: Expand deterministic test API/state surface for cloud diagnostics
- [ ] Step 8: Add/upgrade unit and Playwright coverage for cloud behavior acceptance checks
- [ ] Step 9: Update project docs (`docs/features.md`, README if needed) and finalize planning validation

---

Convert the design into a series of implementation steps that will build each component in a test-driven manner following agile best practices. Each step must result in a working, demoable increment of functionality. Prioritize best practices, incremental progress, and early testing, ensuring no big jumps in complexity at any stage. Make sure that each step builds on the previous steps, and ends with wiring things together. There should be no hanging or orphaned code that isn't integrated into a previous step.

## Step 1: Introduce cloud simulation domain model and deterministic update primitives

**Objective**
Create a new pure cloud simulation module with explicit entities/config/state contracts, backed by deterministic seeded randomness.

**Implementation guidance**
- Add new non-rendering cloud types (`CloudEntity`, `CloudSystemConfig`, simulation state).
- Add initialization and deterministic RNG plumbing for cloud creation.
- Keep module free of DOM and Three.js rendering dependencies.

**Test requirements**
- Unit tests for deterministic initialization (same seed/config -> identical initial entities).
- Unit tests for state shape invariants (finite coordinates, valid lane/style enums).

**Integration with previous work**
- Add module without replacing runtime behavior yet.
- Keep current clouds rendering path unchanged while new logic is introduced.

**Demo**
- Run unit tests proving deterministic, pure cloud-state initialization in isolation.

## Step 2: Implement camera-relative spawn/despawn and recycle lifecycle in pure logic

**Objective**
Implement camera-relative lifecycle thresholds and recycling semantics (no destroy/recreate), replacing ad-hoc respawn triggers.

**Implementation guidance**
- Add functions that compute despawn/recycle by camera-relative world bands.
- Implement recycle that reinitializes cloud above camera-top band and increments recycle metadata.
- Remove/avoid any periodic level-interval respawn behavior in new logic.

**Test requirements**
- Unit tests: recycle only when crossing configured bottom threshold.
- Unit tests: recycled Y always lands inside configured spawn-above-camera band.
- Unit tests: non-threshold conditions do not recycle.

**Integration with previous work**
- Extend Step 1 simulation update APIs with lifecycle semantics.

**Demo**
- Simulated fixed-step run shows clouds persist until threshold crossing, then recycle predictably.

## Step 3: Implement explicit front/behind depth-lane policy and horizontal drift behavior

**Objective**
Add deterministic depth-lane assignment (front/back mix) and slow horizontal drift independent of stack ascent.

**Implementation guidance**
- Encode depth-lane policy as explicit config/invariant (target ratio or deterministic alternation policy).
- Set lane-specific depth offsets so some clouds remain in front of stack and some behind.
- Apply horizontal velocity drift per update; avoid ambient vertical bob policies.

**Test requirements**
- Unit tests for lane-mix invariants over initialization and recycle events.
- Unit tests for horizontal drift progression over fixed steps.
- Unit tests ensuring no time-based downward vertical drift in world state.

**Integration with previous work**
- Build on lifecycle logic from Step 2; maintain deterministic behavior.

**Demo**
- Simulation snapshot shows stable front/back composition and gradual X drift over time.

## Step 4: Integrate new cloud system into `Game` and remove legacy cloud implementation path

**Objective**
Wire new pure cloud simulation into runtime update flow and fully retire legacy cloud anchor/respawn logic.

**Implementation guidance**
- Replace `updateCloudLayer` internals to consume cloud simulation state.
- Remove old mixed camera/NDC anchor construction and legacy periodic respawn constants/paths.
- Keep LOD update cadence behavior compatible with existing performance architecture.

**Test requirements**
- Unit-level integration tests (if applicable) for mapping simulation outputs to projected transforms.
- Regression tests ensuring cloud channel toggles still enable/disable cloud layer as expected.

**Integration with previous work**
- This is the first full runtime adoption of Steps 1–3.

**Demo**
- Running game in debug mode shows cloud layer still active, now driven by new simulation pipeline.

## Step 5: Add runtime cloud debug controls, defaults, and clamp ranges

**Objective**
Expose required cloud tuning controls and enforce safe range clamping.

**Implementation guidance**
- Extend `DebugConfig`, defaults, clamps, debug panel metadata/ranges for:
  - cloud count/density
  - horizontal drift speed
  - spawn-above-camera band
  - despawn-below-camera threshold
  - (optional but recommended) front/back ratio and lane depth offsets
- Ensure live application updates simulation behavior without restart when feasible.

**Test requirements**
- Unit tests for debug clamping of new keys.
- Playwright checks that runtime slider changes affect cloud behavior/state.

**Integration with previous work**
- Adds runtime tuning to integrated cloud system from Step 4.

**Demo**
- In `?debug`, cloud controls appear and visibly alter cloud behavior during play.

## Step 6: Implement rounded-lobe procedural cloud visuals in the DOM/CSS render layer

**Objective**
Replace existing single-oval cloud appearance with smooth, non-pixelized rounded-lobe procedural style.

**Implementation guidance**
- Update cloud DOM/CSS to support multi-lobe silhouettes (class/variable-driven variants).
- Keep render adapter logic independent of cloud simulation rules.
- Optionally differentiate front/back lanes with subtle opacity/tint/depth scaling.

**Test requirements**
- Playwright visual/regression assertions that cloud nodes render and remain visible with new style.
- Unit tests (if logic extracted) for style variant selection determinism.

**Integration with previous work**
- Visual layer upgrade on top of stable simulation/runtime plumbing.

**Demo**
- Cloud layer shows chunky Mario-style rounded-lobe clouds (smooth, non-pixelized) in game.

## Step 7: Expand deterministic test API/state surface for cloud diagnostics

**Objective**
Expose cloud diagnostics in guarded test mode to support robust deterministic assertions.

**Implementation guidance**
- Extend test/public state (test mode safe) with per-cloud diagnostics:
  - world x/y/z
  - lane front/back
  - recycle count/event data
- Keep API backwards compatible for existing tests.

**Test requirements**
- Unit tests for public state mapping and diagnostics formatting.
- Playwright tests reading cloud diagnostics for deterministic progression.

**Integration with previous work**
- Makes integrated system observable for acceptance tests and future regressions.

**Demo**
- `window.__towerStackerTestApi.getState()` includes cloud diagnostics enabling deterministic comparisons.

## Step 8: Add/upgrade unit and Playwright coverage for cloud behavior acceptance checks

**Objective**
Implement full acceptance test matrix for cloud behavior and deterministic reliability.

**Implementation guidance**
- Expand unit tests around pure cloud simulation module first.
- Update/add Playwright flows for scripted ascent and cloud lifecycle checks.
- Keep tests deterministic via seed + fixed stepping.

**Test requirements**
- Required checks:
  1. Cloud screen Y changes correctly when camera ascends.
  2. Clouds recycle only when crossing configured bottom threshold.
  3. Spawn X sampling uses visible world-width with edge clipping allowance.
  4. Same seed + same steps yields repeatable cloud trajectories.
  5. Mixed front/behind depth lanes are maintained.

**Integration with previous work**
- Validates and locks behavior from Steps 1–7.

**Demo**
- Test suite passes with deterministic cloud assertions and no regressions in core gameplay flows.

## Step 9: Update project docs (`docs/features.md`, README if needed) and finalize planning validation

**Objective**
Synchronize documentation with implemented cloud architecture, controls, and test guarantees.

**Implementation guidance**
- Update `docs/features.md` cloud behavior and debug control sections.
- Update README if setup/controls/test workflow surface changed.
- Ensure implementation notes match deterministic/testing requirements in repo governance.

**Test requirements**
- Re-run unit + Playwright suites after docs-adjacent changes to keep commit gates green.

**Integration with previous work**
- Finalizes and communicates completed functionality with no orphaned behavior.

**Demo**
- Docs accurately describe rewritten cloud system, tuning controls, and deterministic test coverage.

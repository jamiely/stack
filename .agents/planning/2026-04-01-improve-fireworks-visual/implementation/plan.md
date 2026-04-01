# Implementation Plan: Fireworks Visual Overhaul

## Checklist
- [ ] Step 1: Create deterministic fireworks domain model and simulation scaffolding
- [ ] Step 2: Implement launch-shell arc simulation and apex trigger events
- [ ] Step 3: Implement primary chrysanthemum burst emission with vivid multicolor trails
- [ ] Step 4: Implement secondary spark emission and downward drift/fade lifecycle
- [ ] Step 5: Add world-space spawn placement behind stack with broad randomization
- [ ] Step 6: Integrate render adapter and replace existing DOM fireworks visual path
- [ ] Step 7: Add runtime debug controls and forced-launch debug action hooks
- [ ] Step 8: Add performance guardrails (caps/throttling/pooling + quality scaling)
- [ ] Step 9: Wire deterministic test mode + Playwright coverage for staged fireworks flows
- [ ] Step 10: Final integration hardening, docs updates, and validation pass

## Step 1: Create deterministic fireworks domain model and simulation scaffolding
**Objective**
Establish a testable, deterministic fireworks simulation core independent from rendering.

**Implementation guidance**
- Add a new fireworks logic module with typed entities (launch shell + particle states).
- Add seeded RNG plumbing from existing game seed flow into fireworks subsystem.
- Add fixed-step-friendly update entrypoint (`update(dt)` and test stepping helper).
- Keep output as simulation snapshots/events that render code can consume later.

**Test requirements**
- Unit tests for state initialization determinism.
- Unit tests proving equal seed + equal steps => equal snapshots/events.
- Unit tests for basic lifecycle bookkeeping (empty update, no spawns when disabled).

**Integration with previous work**
- First increment; no prior dependencies beyond existing game seed/debug config architecture.

**Demo**
- Run a deterministic unit test that steps simulation N ticks and prints/asserts stable snapshot counters.

## Step 2: Implement launch-shell arc simulation and apex trigger events
**Objective**
Implement the per-firework launch behavior: upward travel with slight arc until apex trigger.

**Implementation guidance**
- Add `LaunchShell` state updates (velocity integration + lateral arc bias + gravity).
- Add apex trigger rule (fuse elapsed and/or upward velocity threshold).
- Emit a structured primary-burst event at apex and retire shell.

**Test requirements**
- Unit tests for shell motion progression (y rises then peaks).
- Unit tests for apex event trigger correctness and single-fire semantics.
- Unit tests for deterministic shell trajectories under fixed inputs.

**Integration with previous work**
- Builds directly on Step 1 simulation core and event pipeline.

**Demo**
- Deterministic test fixture launches one shell and verifies apex event occurs at expected simulated time window.

## Step 3: Implement primary chrysanthemum burst emission with vivid multicolor trails
**Objective**
Create the primary spherical burst behavior prioritized by requirements.

**Implementation guidance**
- On apex event, emit radial particle set with near-spherical direction distribution.
- Implement vivid multicolor palette sampling (deterministic via seeded RNG).
- Add longer trail settings for primary particles.

**Test requirements**
- Unit tests validating emitted particle count and radial spread constraints.
- Unit tests for palette range validity and deterministic color selection.
- Unit tests for trail parameter assignment for primary particles.

**Integration with previous work**
- Consumes apex events from Step 2 and writes particles into simulation state from Step 1.

**Demo**
- Snapshot test showing one shell produces expected primary burst particle set with multicolor/trail metadata.

## Step 4: Implement secondary spark emission and downward drift/fade lifecycle
**Objective**
Add mandatory secondary sparks from the primary burst and ensure they drift downward before fade-out.

**Implementation guidance**
- Add secondary emission rules (from primary center or selected primaries, per design).
- Add gravity/drag/lifetime/alpha/size-over-life updates.
- Ensure each firework follows full multi-stage lifecycle.

**Test requirements**
- Unit tests for secondary emission count/chance behavior.
- Unit tests verifying downward velocity trend over lifetime due to gravity.
- Unit tests for fade and expiry behavior (alpha/lifetime reaching zero).

**Integration with previous work**
- Extends particle lifecycle from Steps 1–3 with additional stage transitions.

**Demo**
- Deterministic simulation run confirms sequence: launch -> primary -> secondary -> decay/cleanup.

## Step 5: Add world-space spawn placement behind stack with broad randomization
**Objective**
Ensure fireworks originate from varied world locations behind stack (not viewport-anchored positions).

**Implementation guidance**
- Implement world-space spawn sampling across wide background bounds behind tower.
- Project for visibility checks only; keep simulation in world coordinates.
- Respect level gating and channel enable logic already used by distractions.

**Test requirements**
- Unit tests for spawn bounds and variability distribution.
- Unit tests confirming placement generation is world-space and deterministic by seed.
- Unit tests for enable/start-level gating compatibility.

**Integration with previous work**
- Feeds spawn points into shell launcher from Step 2; no render dependency yet.

**Demo**
- Debug snapshot or logged sample shows varied launch origins spanning configured background bounds.

## Step 6: Integrate render adapter and replace existing DOM fireworks visual path
**Objective**
Render fireworks from simulation state in-world and remove dependence on old DOM burst pulse visuals.

**Implementation guidance**
- Implement fireworks render adapter in existing render stack (world-space, camera-consistent).
- Bind active particle data each frame to renderer primitives.
- Decommission old `.distraction-fireworks` pulse behavior path.

**Test requirements**
- Unit tests for render adapter data mapping (non-visual logic boundaries).
- Playwright smoke assertion that fireworks are visible when channel active.
- Regression checks that unrelated distraction channels still render correctly.

**Integration with previous work**
- First full end-to-end visual integration using simulation from Steps 1–5.

**Demo**
- In-game run shows launch arcs and chrysanthemum bursts behind stack in world-consistent positions.

## Step 7: Add runtime debug controls and forced-launch debug action hooks
**Objective**
Expose tunable fireworks controls for rapid iteration without code edits.

**Implementation guidance**
- Add debug config fields, sanitization/clamps, and UI controls for launch/burst/gravity/fade/budget settings.
- Add on-demand debug action to force fireworks launch.
- Ensure control updates apply live and deterministically when test mode dictates fixed stepping.

**Test requirements**
- Unit tests for config clamp/sanitization behavior.
- Unit tests for debug force-launch routing.
- Playwright checks that slider/toggle changes visibly affect fireworks behavior.

**Integration with previous work**
- Controls tune simulation and rendering introduced in prior steps.

**Demo**
- Open debug panel, adjust launch rate/particle counts/gravity, and observe immediate behavior changes.

## Step 8: Add performance guardrails (caps/throttling/pooling + quality scaling)
**Objective**
Maintain smooth performance on lower-end devices under increased fireworks activity.

**Implementation guidance**
- Add hard `maxActiveParticles` cap and graceful degradation policy.
- Add emission throttling under high load (drop secondary first, then reduce burst density).
- Add pooling/reuse for shells and particles to minimize allocations.
- Tie update density to existing quality scalars/LOD pathways where appropriate.

**Test requirements**
- Unit tests for cap enforcement and degradation priority rules.
- Unit tests verifying pool reuse semantics and reset correctness.
- Playwright/perf smoke test in high-activity config to ensure stable behavior.

**Integration with previous work**
- Wraps existing lifecycle/render path with production-grade runtime protection.

**Demo**
- With aggressive debug settings, fireworks remain active without runaway particle growth or hard stutter.

## Step 9: Wire deterministic test mode + Playwright coverage for staged fireworks flows
**Objective**
Ensure reliable automated validation of the new staged fireworks lifecycle.

**Implementation guidance**
- Expose deterministic stepping hooks/state probes for fireworks in test mode.
- Add Playwright tests for launch->primary->secondary->fade progression.
- Add Playwright checks for varied placement and debug control interactions.

**Test requirements**
- New Playwright spec(s) for core fireworks gameplay flow.
- Unit tests covering deterministic stepping interfaces.
- Ensure non-rendering touched code maintains >=90% unit coverage.

**Integration with previous work**
- Validates all previous steps through deterministic E2E assertions.

**Demo**
- CI-style local run passes unit + Playwright suites with deterministic fireworks assertions.

## Step 10: Final integration hardening, docs updates, and validation pass
**Objective**
Finalize feature quality, ensure docs accuracy, and confirm release readiness.

**Implementation guidance**
- Remove obsolete fireworks CSS/logic leftovers.
- Update `README.md` and `docs/features.md` to reflect new fireworks behavior and debug controls.
- Validate compatibility with distraction framework and quality settings.
- Run full test suite and coverage checks.

**Test requirements**
- Full unit suite passes with required coverage threshold.
- Full Playwright suite passes.
- Regression checks for adjacent distraction systems.

**Integration with previous work**
- Polishes and secures the complete integrated feature set.

**Demo**
- Final game build demonstrates fully staged chrysanthemum fireworks with varied behind-stack placement, runtime tuning, and stable performance.

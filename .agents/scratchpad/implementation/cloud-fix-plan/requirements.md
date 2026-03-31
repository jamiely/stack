# Cloud Fix Plan — Consolidated Requirements

## Objective
Implement the cloud system rewrite defined in `.agents/planning/cloud fix/implementation/plan.md` with deterministic behavior, camera-relative lifecycle correctness, upgraded rounded-lobe visuals, and expanded test/debug observability.

## In Scope
1. Replace legacy cloud lifecycle/movement logic with deterministic world-space simulation primitives.
2. Implement camera-relative spawn/despawn thresholds and recycle behavior (no random vanish before threshold).
3. Preserve intentional front/behind lane composition with deterministic assignment and stable recycle behavior.
4. Support horizontal drift as a tunable behavior.
5. Add runtime debug controls for cloud count/density, drift speed, spawn-above band, and despawn-below threshold (plus lane controls if added).
6. Enforce clamp/sanitization rules for all new cloud debug controls.
7. Replace cloud visuals with procedural rounded-lobe (smooth, non-pixelized) DOM/CSS style.
8. Expose deterministic cloud diagnostics through test-mode state for Playwright assertions.
9. Add/update unit and Playwright tests to cover acceptance gates.
10. Update docs (`docs/features.md`, and README if behavior/controls surface changes).

## Explicit Non-Goals
1. Weather systems (rain/snow/wind, weather-time-of-day coupling).
2. New generic parallax/background-layer architecture not directly required for clouds.
3. Broad non-cloud background renderer refactors.
4. Camera-system redesign beyond consuming existing camera/world bounds.
5. Unrelated gameplay tuning.
6. New low-end performance mode architecture in this milestone.

## Acceptance Gates (Ship Criteria)
1. **Deterministic behavior checks (automated):**
   - Camera ascent causes expected cloud screen-Y progression.
   - Recycle happens only after configured despawn threshold crossing.
   - Spawn-X sampling uses visible world width with edge-clipping allowance.
   - Same seed + same steps => repeatable trajectories (float tolerance <= 1e-4).
   - Front/back lane mix remains present in tuned mixed-lane scenarios.
2. **Visual checks:**
   - Cloud layer remains visibly populated across scripted ascent scenarios (unless intentionally configured sparse/empty).
   - Clouds use rounded-lobe procedural style (smooth/non-pixelized).
   - Front/behind layering is visually and state-wise represented.
3. **Runtime/debug checks:**
   - `?debug` exposes required cloud controls.
   - Clamp/sanitization logic enforces valid runtime ranges.
   - Live control changes affect behavior without restart.
4. **Regression/performance checks:**
   - Unit tests pass.
   - Core Playwright gameplay flows pass.
   - Existing performance smoke expectations remain non-regressed.
5. **Testability/documentation checks:**
   - `getState()` includes cloud diagnostics needed by deterministic assertions.
   - `docs/features.md` (and README where applicable) reflects shipped behavior.

## Edge-Case Runtime Semantics (Required)
1. Minimum density/count values are valid sparse modes; not inherently a bug.
2. Maximum density/count honors clamps with deterministic bounded entity count and stable IDs.
3. Zero horizontal drift is valid: stationary X except at recycle reseed.
4. Invalid or inverted spawn/despawn inputs must be sanitized before simulation to avoid frame-by-frame recycle thrash.
5. Tight but valid thresholds may recycle quickly if deterministic and threshold-driven.
6. Tests must validate policy compliance (clamps, thresholds, deterministic progression), not assume dense/drifting visuals.

## Assumptions
1. Existing deterministic stepping and seeded test mode remain available for Playwright and unit integration.
2. Cloud diagnostics can be added to test-mode `getState()` without breaking existing state consumers.
3. Cloud rewrite will align with current performance architecture (no new quality-mode subsystem).

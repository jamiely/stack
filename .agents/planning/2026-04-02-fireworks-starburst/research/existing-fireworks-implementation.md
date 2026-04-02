# Existing Fireworks Implementation Research

## Scope
Map current fireworks simulation/rendering/debug/test surfaces to identify where to implement a chrysanthemum-style circular burst.

## Findings

### 1) Simulation core is centralized and deterministic
- Core file: `src/game/logic/fireworks.ts`
- Burst particle generation happens in `emitBurstParticles(...)`.
- Determinism is already built in:
  - `initializeFireworksState({ seed, config })`
  - deterministic sampling via `sampleNoise(seed, cursor)` and cursor progression.
- This aligns with the requirement to keep deterministic test behavior.

### 2) Likely shape-bias source
Current burst direction sampling:
- `azimuth = rand * 2π`
- `elevation = (rand - 0.5) * π`
- velocity components derived with `cos/sin` from azimuth + elevation.

This creates a visually non-uniform distribution in world space for the desired effect and then interacts with gravity/drag, often reading as a bell/arc in projection.

### 3) Render mapping is adapter-based and low-risk to keep unchanged
- Render adapter in `src/game/Game.ts`:
  - `updateFireworksLayer()` maps simulation entities to `.distraction-fireworks__entity` nodes.
  - Particle styling controlled in `src/styles.css`.
- This means burst-shape improvements should stay mostly in simulation logic, with optional minor visual tuning (size/alpha).

### 4) Debug control extension path is clear
- Current debug config and clamps:
  - `src/game/types.ts` (`DebugConfig`)
  - `src/game/debugConfig.ts` (`defaultDebugConfig`, `clampDebugConfig`)
  - `src/game/Game.ts` (`DEBUG_RANGES`, panel wiring, `buildFireworksSimulationConfig()`)
- Existing fireworks controls already include intervals/speeds/gravity/trail/delay/lifetime/cap.
- Adding shape controls is consistent with existing architecture.

### 5) Existing tests are strong for lifecycle/cap/determinism, not visual shape
- Unit: `tests/unit/fireworks.test.ts` (determinism, lifecycle windows, cap guardrails, cleanup).
- E2E: `tests/e2e/fireworks.spec.ts` (debug-step behavior, counters, DOM metadata, cleanup).
- Gap: no screenshot-based morphology verification for “chrysanthemum look”.

## Architecture map
```mermaid
flowchart LR
  A[DebugConfig sliders\nGame.ts] --> B[buildFireworksSimulationConfig]
  B --> C[stepFireworksState\nlogic/fireworks.ts]
  C --> D[FireworksState\n(shells, particles, telemetry)]
  D --> E[updateFireworksLayer\nGame.ts]
  E --> F[DOM nodes\n.distraction-fireworks__entity]
  F --> G[Visual output]

  H[Test API\n__towerStackerTestApi] --> C
  H --> D
```

## Candidate touch points for implementation
1. `src/game/logic/fireworks.ts`
   - Adjust/replace direction sampling in `emitBurstParticles`.
   - Optionally differentiate primary vs secondary radial behavior.
2. `src/game/types.ts` + `src/game/debugConfig.ts`
   - Add new shape-related debug fields and clamp logic.
3. `src/game/Game.ts`
   - Expose debug sliders and pass through in `buildFireworksSimulationConfig`.
4. `tests/unit/fireworks.test.ts` and new/extended e2e test(s)
   - Add distribution-focused assertions + deterministic screenshot path.

## References
- `src/game/logic/fireworks.ts`
- `src/game/Game.ts`
- `src/game/debugConfig.ts`
- `src/game/types.ts`
- `tests/unit/fireworks.test.ts`
- `tests/e2e/fireworks.spec.ts`

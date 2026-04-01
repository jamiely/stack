# Research: Recommended Direction for Tower Stacker Fireworks

## Recommendation
Adopt a **replacement fireworks subsystem** using a deterministic, budgeted CPU particle simulation with staged emitters, rendered in-world (projected behind the stack).

This best matches requirements and keeps implementation complexity moderate.

## Proposed Runtime Architecture

```mermaid
flowchart TD
  A[Seeded RNG + Debug Config] --> B[FireworkSpawner]
  B --> C[LaunchShell Entities]
  C --> D[Apex Trigger Logic]
  D --> E[Primary Burst Emitter]
  E --> F[Secondary Spark Emitter]
  F --> G[Particle Integrator\n(gravity/drag/lifetime)]
  G --> H[Renderer Adapter\n(Three.js points/sprites)]
  G --> I[Cull + Pool Return]
```

## World Placement Strategy (Behind Stack, Varied)
- Sample launch X/Z from a wide world-space band centered around tower origin.
- Constrain Y launch near lower visible region.
- Ensure burst apex target falls in camera-visible region behind stack silhouette.
- Use camera projection only for visibility checks; maintain world-space truth.

## Deterministic Testability Strategy
- Firework RNG seeded from game seed + channel counters.
- Add deterministic stepping hook for fireworks simulation tick.
- Expose event counters/state snapshots for tests:
  - launched shells
  - primary burst count
  - secondary spark count
  - expired particles

## Suggested Debug Controls (Runtime Tuning)
- `fireworksLaunchRate`
- `fireworksLaunchSpeedMin/Max`
- `fireworksArcLateralBias`
- `fireworksPrimaryParticleCount`
- `fireworksPrimarySpeedMin/Max`
- `fireworksSecondarySpawnChance`
- `fireworksSecondaryCount`
- `fireworksGravity`
- `fireworksTrailDrag`
- `fireworksLifetimeMs`
- `fireworksMaxActiveParticles`

## Performance Guardrails
- Hard cap active particles; reject/degrade new emissions when near cap.
- Prefer pooled particle structs/objects.
- Run fireworks updates at configurable stride under low quality presets.
- Clamp cluster concurrency.

## Fit Against User Requirements
- Chrysanthemum shape: radial primary emission + trails ✅
- Arc launch and apex burst ✅
- Secondary sparks and downward drift/fade ✅
- Full background variation behind stack ✅
- Increased activity with low-end stability ✅ (with budgets)

## Risks and Mitigations
- Risk: too many particles cause frame drops.
  - Mitigation: max-particle cap + adaptive emission throttle.
- Risk: visual clutter behind tower.
  - Mitigation: depth-aware alpha and limited simultaneous apex events.
- Risk: nondeterministic tests.
  - Mitigation: seeded RNG + deterministic fixed-step update mode.

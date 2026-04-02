# Chrysanthemum Distribution Strategy Research

## Goal
Produce a more circular chrysanthemum-style burst (not bell-shaped), default for all fireworks, while retaining deterministic behavior and performance.

## Recommended emission model

### Primary recommendation
Use **uniform sphere direction sampling** for base direction vectors, then apply controlled radial speed variance.

Practical approach:
1. Sample `u,v in [0,1)`.
2. `azimuth = 2πu`
3. `z = 1 - 2v` (uniform in [-1,1])
4. `r = sqrt(max(0, 1 - z^2))`
5. direction = `(r*cos(azimuth), z, r*sin(azimuth))`
6. velocity = direction * sampledSpeed

This avoids elevation-angle bias and yields a visually circular shell at emission time.

### Optional ring layering (if needed for closer chrysanthemum likeness)
Use a light concentric-ring profile for primary bursts by quantizing speed around 2–3 nearby radii with jitter:
- ring speeds centered around `[s0, s1, s2]`
- small random jitter per particle.

This still stays deterministic (seeded samples) and can enhance petal-like radial layering.

## Suggested debug controls (single universal preset, no style variants)
Add runtime knobs that tune one preset:
- `distractionFireworksPrimaryParticleCount` (replace hardcoded 20 if desired)
- `distractionFireworksSecondaryParticleCount` (replace hardcoded 12 if desired)
- `distractionFireworksRadialUniformity` (0..1, where 1 is strict uniform sphere)
- `distractionFireworksRingWeight` (0..1 blend between smooth radial and ringed speeds)
- `distractionFireworksSpeedJitter` (0..1)
- `distractionFireworksVerticalBias` (small clampable offset; default neutral)

These maintain one default style while enabling tuning.

## Performance considerations
- Uniform sphere sampling is computationally similar to current trig path.
- Keeping particle cap guardrails and drop strategy unchanged protects low-end performance.
- If counts increase, rely on existing `maxActiveParticles` and secondary-drop-first policy.

## Parameter-flow diagram
```mermaid
flowchart TD
  A[Seed + rngCursor] --> B[Direction sampler\n(uniform sphere)]
  A --> C[Speed sampler\n(base + jitter/rings)]
  B --> D[Velocity vector]
  C --> D
  D --> E[Particle integration\n(gravity + drag)]
  E --> F[Projected burst shape]

  G[Debug controls\nshape knobs] --> B
  G --> C
```

## Tradeoff summary
| Option | Pros | Cons | Recommendation |
|---|---|---|---|
| Keep current azimuth/elevation sampler | No code churn | Can appear bell/arc in practice | No |
| Uniform sphere sampler | Strong circular distribution, deterministic, low cost | Needs test updates/tuning | **Yes** |
| Full style presets (multiple modes) | Flexible | Against requirement for one universal default | No |
| Physics-heavy particle simulation | Potential realism | Higher cost/complexity | No |

## References
- Internal code: `src/game/logic/fireworks.ts`
- Requirement notes: `.agents/planning/2026-04-02-fireworks-starburst/idea-honing.md`

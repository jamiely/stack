# Research: Current Fireworks Implementation and Gaps

## Scope
Analyze the repo’s existing fireworks effect and identify what prevents the requested behavior:
- launch from varied positions behind the stack
- slight arc
- primary burst + secondary sparks
- downward drift + fade
- performance-safe behavior

## Findings from Current Code

### 1) Fireworks are currently a 2D DOM pulse, not a particle simulation
- `src/game/Game.ts` updates `.distraction-fireworks` as a single HTML actor.
- It sets position using percent-of-screen translation (`xPercent`, `yPercent`) and scales one burst element.
- Signal source is `snapshot.signals.fireworks` from distraction pulses.

### 2) Movement is viewport-relative, not world-projected
- Placement is computed in screen percentage space rather than from world coordinates projected by camera.
- This limits believable depth/behind-stack positioning.

### 3) No launch physics or multi-stage lifecycle
- Current effect is one conic-gradient burst that scales/fades.
- No launch shell, no ballistic arc, no secondary emission stage.

### 4) Existing control surface is channel-level only
- Current debug config exposes enable + start level for fireworks as a distraction channel.
- No fireworks-specific physics/visual tuning parameters yet.

## Current Fireworks Data Flow (Observed)

```mermaid
flowchart LR
  A[Distraction Config\n(enable/start level/motion speed)] --> B[updateDistractionState]
  B --> C[snapshot.active.fireworks + snapshot.signals.fireworks]
  C --> D[Game.ts DOM actor update]
  D --> E[.distraction-fireworks CSS scale/opacity pulse]
```

## Gap vs Requested Behavior

| Requested | Current | Gap |
|---|---|---|
| Launch from varied positions behind stack | Screen-percent drift | Needs world-space spawn + camera projection |
| Slight launch arc | None | Needs projectile integration |
| Primary chrysanthemum-like burst (spherical) | Flat radial/conic pulse | Needs particle burst emission |
| Secondary sparks from primary | None | Needs staged emission graph |
| Sparks drift downward and fade | None | Needs gravity + lifetime fade/size over time |
| Increased activity but smooth on low-end | Very cheap current effect | Needs budgeted particle counts + throttling |

## Code Locations
- `src/game/Game.ts` (fireworks actor creation + update logic around `snapshot.active.fireworks`)
- `src/styles.css` (`.distraction-fireworks` and `.distraction-fireworks__burst`)
- `src/game/logic/distractions.ts` (channel activation and pulsed signal)
- `src/game/debugConfig.ts` (available debug controls)
- `todo.md` (already captures target behavior for launch/burst/secondary/fall)

## Implication
A targeted extension is possible, but a **full replacement** of the current fireworks visual path is cleaner and better aligned with the requested multi-stage behavior.

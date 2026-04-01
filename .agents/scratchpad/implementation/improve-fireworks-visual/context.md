# Implementation Context — improve-fireworks-visual

## Research Summary
The approved design aligns with existing architecture if fireworks follow the same separation used by clouds: a deterministic logic module (`initialize + step + typed state`) plus a Game-level adapter and test snapshot mapping. Current fireworks are still a pulse-only channel with a single DOM burst element and no lifecycle telemetry.

## Key Integration Points
1. **Distraction gating source of truth**
   - Fireworks enable/start-level semantics currently come from distraction config + `updateDistractionState`; this should remain authoritative for channel gating (`src/game/logic/distractions.ts:94`, `src/game/debugConfig.ts:41`, `src/game/debugConfig.ts:113`).
2. **Game simulation loop hookup**
   - New fireworks system should update inside `runSimulationStep` and respect paused deterministic stepping behavior (`src/game/Game.ts:890`, `src/game/Game.ts:897`, `src/game/Game.ts:2374`).
3. **Debug controls + force launch wiring**
   - Add new fireworks numeric controls through `DebugConfig` + `DEBUG_RANGES` + `clampDebugConfig` and route force-launch through existing debug action surface (`src/game/types.ts:32`, `src/game/Game.ts:164`, `src/game/debugConfig.ts:68`, `src/game/Game.ts:730`, `src/game/Game.ts:1196`).
4. **Public test-state observability**
   - Extend `getPublicState().distractions` with fireworks lifecycle diagnostics (similar spirit to cloud diagnostics) while keeping payload scoped for deterministic assertions (`src/game/Game.ts:2397`, `src/game/Game.ts:2425`, `src/game/types.ts:124`, `tests/e2e/clouds.spec.ts:348`).
5. **Legacy render removal target**
   - Existing fireworks DOM actor/CSS path lives in `buildDistractionOverlay`, `updateDistractionActors`, and `.distraction-fireworks*`; these are the primary replacement/decommission points (`src/game/Game.ts:629`, `src/game/Game.ts:1502`, `src/styles.css:203`).

## Constraints & Considerations
- **Determinism discipline**: simulation code must use seeded RNG helper and fixed-step progression only; avoid introducing `Math.random` in fireworks logic (`src/game/logic/random.ts:3`, `tests/unit/distractions.test.ts:61`, `tests/unit/clouds.test.ts:87`).
- **Paused-mode semantics**: in paused test mode, state changes from debug config should not mutate simulation outcomes until explicit `stepSimulation` calls (`src/game/Game.ts:878`, `src/game/Game.ts:882`, `tests/e2e/clouds.spec.ts:245`).
- **Testing shape expected by repo**: add both unit lifecycle/cap tests and Playwright staged-flow assertions using existing deterministic test API style (`tests/unit/clouds.test.ts:171`, `tests/e2e/gameplay.spec.ts:142`, `tests/e2e/clouds.spec.ts:245`).
- **Backward compatibility pressure**: existing debug launch coverage already includes the fireworks button indirectly via channel list; overhaul should preserve button/testid contract (`src/game/Game.ts:742`, `tests/e2e/gameplay.spec.ts:568`).

## Builder Hand-off Notes
- Start by landing a standalone `logic/fireworks.ts` + unit tests before touching rendering.
- Keep snapshot additions minimal and explicitly lifecycle-focused to avoid over-broad public API churn.
- Replace fireworks-only DOM pulse behavior incrementally to prevent regressions in other distraction actors.

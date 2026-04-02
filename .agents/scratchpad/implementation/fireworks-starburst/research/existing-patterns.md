# Existing Patterns — Fireworks Starburst

## 1) Fireworks tuning follows a four-layer wiring pattern
1. Declare debug fields in `DebugConfig`.
2. Set defaults + clamp/normalize in `defaultDebugConfig` and `clampDebugConfig`.
3. Expose sliders in `DEBUG_RANGES`.
4. Map debug values into simulation config via `buildFireworksSimulationConfig()`.

**Evidence**
- Debug config fields are declared in shared types (`src/game/types.ts:32`, `src/game/types.ts:71-82`).
- Fireworks defaults/clamps already exist in `debugConfig.ts` (`src/game/debugConfig.ts:43-54`, `src/game/debugConfig.ts:86-112`, `src/game/debugConfig.ts:156-167`).
- Runtime slider metadata is centralized in `DEBUG_RANGES` (`src/game/Game.ts:165`, `src/game/Game.ts:193-204`).
- Game-to-simulation mapping is centralized in `buildFireworksSimulationConfig` (`src/game/Game.ts:1728-1741`).

## 2) Determinism pattern is seed + explicit RNG cursor progression
The simulation uses seed-based sampling and explicit cursor increments; emissions consume samples in fixed order.

**Evidence**
- Fireworks state keeps `seed` and `rngCursor` (`src/game/logic/fireworks.ts:148-151`).
- Sampling helper increments cursor (`src/game/logic/fireworks.ts:839-844`).
- Burst emission consumes samples in a fixed sequence (azimuth/elevation/speed/lifetime) (`src/game/logic/fireworks.ts:766-773`).
- Launch scheduling and secondary delay also consume cursor-based samples (`src/game/logic/fireworks.ts:403`, `src/game/logic/fireworks.ts:449`).

## 3) Current burst morphology still uses fixed counts + angle-based emission
The current logic is not yet config-driven for particle counts and still uses fixed primary/secondary constants.

**Evidence**
- Hardcoded burst counts exist (`src/game/logic/fireworks.ts:27-28`).
- Those constants are used in launch-demand, primary emit, and secondary emit paths (`src/game/logic/fireworks.ts:366`, `src/game/logic/fireworks.ts:434`, `src/game/logic/fireworks.ts:495`).
- Direction generation currently uses azimuth/elevation trigonometric conversion (`src/game/logic/fireworks.ts:775-780`).

## 4) Cap/degradation safety contract is secondary-first
Under cap pressure, secondary particles are reclaimed/dropped before primary demand is denied.

**Evidence**
- Secondary reclaim helper exists and filters secondary particles first (`src/game/logic/fireworks.ts:679-714`).
- Primary burst path calls this helper before emission (`src/game/logic/fireworks.ts:417-423`).
- Telemetry tracks dropped secondary/primary separately (`src/game/logic/fireworks.ts:117-118`, `src/game/logic/fireworks.ts:607-610`).

## 5) Paused test semantics are step-gated and already validated in e2e
When paused, simulation does not advance; applying debug config updates requires `stepSimulation(...)` to observe effects.

**Evidence**
- Main tick skips simulation when paused and only updates visuals/camera (`src/game/Game.ts:897-903`).
- Test API steps via explicit `runSimulationStep` loop (`src/game/Game.ts:2548`).
- Existing e2e test explicitly verifies paused stability until manual step (`tests/e2e/fireworks.spec.ts:3-60`).
- Feature docs codify this behavior (`docs/features.md:98-99`).

## 6) Existing verification pattern: logic-heavy unit coverage + deterministic Playwright flows
Fireworks work is currently protected by unit tests for sanitization/lifecycle and e2e tests for paused config application, lifecycle counters, render metadata, cleanup, and cap stress.

**Evidence**
- Unit tests target sanitize + lifecycle behavior (`tests/unit/fireworks.test.ts:1-319`).
- Debug clamp tests already include fireworks min/max normalization (`tests/unit/debugConfig.test.ts:166-190`).
- E2E suite covers paused step semantics and lifecycle/cap/cleanup (`tests/e2e/fireworks.spec.ts:3-374`).
- Project-level requirement for deterministic Playwright + debug/test mode + 90% non-rendering coverage is codified (`docs/design.md:237`, `docs/design.md:253`, `docs/design.md:277`).

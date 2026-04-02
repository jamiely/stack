# Implementation Context — fireworks-starburst

## Summary
Design is implementation-feasible with current architecture and maps cleanly onto existing fireworks patterns. Step 1 should start by extending the existing debug-config → clamp → UI range → simulation-config pipeline, then move into simulation morphology updates.

## Integration points (what Builder will touch)
1. **Config/type surface**
   - Add new fireworks morphology fields to `DebugConfig`.
   - Files: `src/game/types.ts`, `src/game/debugConfig.ts`.
   - Existing fireworks fields and clamp normalization already provide direct template.
   - Sources: `src/game/types.ts:32,71-82`; `src/game/debugConfig.ts:43-54,86-112,156-167,200-214`.

2. **Runtime debug UI + mapping**
   - Add new sliders in `DEBUG_RANGES` and include any new integer-like keys in integer formatting/parsing lists.
   - Pass new values in `buildFireworksSimulationConfig()`.
   - Files: `src/game/Game.ts`.
   - Sources: `src/game/Game.ts:165,193-204,693-711,1728-1741,2488-2507`.

3. **Simulation morphology core**
   - Replace hardcoded particle counts and current angle-based emission in `emitBurstParticles(...)` with config-driven deterministic morphology.
   - Preserve seed+cursor determinism and secondary-first degradation.
   - File: `src/game/logic/fireworks.ts`.
   - Sources: `src/game/logic/fireworks.ts:27-42,366,417-423,434,495,717-811,839-844`.

4. **Tests**
   - Extend unit tests for new clamp behavior + deterministic morphology behavior.
   - Extend fireworks e2e with screenshot gate using deterministic paused stepping.
   - Files: `tests/unit/debugConfig.test.ts`, `tests/unit/fireworks.test.ts`, `tests/e2e/fireworks.spec.ts`.
   - Sources: `tests/unit/debugConfig.test.ts:166-190`; `tests/unit/fireworks.test.ts:1-319`; `tests/e2e/fireworks.spec.ts:3-374`.

## Key constraints and gotchas
- **Paused semantics are step-gated**: while paused, simulation does not advance; config effects should be asserted after `stepSimulation(...)`.
  - Sources: `src/game/Game.ts:897-903,2548`; `tests/e2e/fireworks.spec.ts:3-60`; `docs/features.md:98-99`.

- **Guardrails must remain intact**: cap logic and secondary-first degradation are existing behavior contracts.
  - Sources: `src/game/logic/fireworks.ts:417-423,679-714`; `tests/e2e/fireworks.spec.ts:294-374`.

- **Current implementation uses fixed counts** (`20/12`) and inline primary/secondary shaping constants.
  - This is where Step 3 should focus after Step 1-2 schema/sampler work.
  - Sources: `src/game/logic/fireworks.ts:27-28,434,495,437-440,498-501`.

- **Canonical screenshot contract is strict and pre-defined** (seed 42, first primary burst transition +2 ticks, threshold 0.12, maxDiffPixels 180, fixed baseline path).
  - Sources: `.agents/scratchpad/implementation/fireworks-starburst/requirements.md:32-41`; `.agents/scratchpad/implementation/fireworks-starburst/design.md:32-36`.

## Repo-level quality gates to preserve
- Deterministic instrumentation + Playwright e2e are first-class requirements.
- Non-rendering unit coverage target is >=90%.
- Sources: `docs/design.md:237,253,277`.

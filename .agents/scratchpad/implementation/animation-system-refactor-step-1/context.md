# Animation System Refactor Step 1 — Implementation Context

## Research summary
- Step 1 requirements/design map cleanly to existing `Game` callsites: current lifecycle entrypoints already exist as discrete methods (`loadRemyCharacter`, `updateRemyAnimation`, `detachRemyCharacter`, reset-time teardown), so introducing a facade is primarily routing + ownership boundary work rather than behavior invention (`src/game/Game.ts:1260-1271`, `src/game/Game.ts:1349-1368`, `src/game/Game.ts:2548-2554`, `src/game/Game.ts:2644`, `src/game/Game.ts:3426-3433`).
- Real-time and deterministic stepping both funnel through `runSimulationStep`, so update forwarding must remain exactly-once in this single path to satisfy Step 1 regression intent (`src/game/Game.ts:1260-1271`, `src/game/Game.ts:3855-3858`).
- Ledge/tentacle orchestration is still strongly Game-local and should remain so in Step 1 (anchor discovery, suppression checks, eligible ledge selection) (`src/game/Game.ts:2261-2274`, `src/game/Game.ts:3373-3423`, `src/game/Game.ts:3084-3140`).

## Primary integration points for Builder
1. **Game field wiring for manager facade**
   - Mirror existing manager field style (`feedbackManager`) with a narrow API object on `Game` (`src/game/Game.ts:502-506`, `src/game/FeedbackManager.ts:24-84`).
2. **Route lifecycle entrypoints through facade**
   - `preload`/spawn path: current `loadRemyCharacter()` calls in boot + refresh branches (`src/game/Game.ts:1455-1456`, `src/game/Game.ts:2641-2644`).
   - `update`: current `runSimulationStep -> updateRemyAnimation` path (`src/game/Game.ts:1260-1271`, `src/game/Game.ts:2548-2554`).
   - `release`: current `detachRemyCharacter()` calls in anchor/suppression/fallback branches (`src/game/Game.ts:3095-3134`, `src/game/Game.ts:3333`, `src/game/Game.ts:3426-3433`).
   - `disposeAll`: reset-time teardown (`src/game/Game.ts:1349-1368`).
3. **Maintain out-of-scope Step 1 boundaries**
   - Keep selection/loading/retarget internals, Remy naming, and ledge orchestration in `Game` for now (`.agents/scratchpad/implementation/animation-system-refactor-step-1/requirements.md:22-33`, `.agents/scratchpad/implementation/animation-system-refactor-step-1/design.md:18-20`).

## Constraints and considerations
- **Private-method access constraint:** facade implementation in another file cannot directly call `Game` private methods; Builder should inject callbacks/bridge functions from inside `Game` when constructing the manager (`src/game/Game.ts:2548`, `src/game/Game.ts:2644`, `src/game/Game.ts:3426`).
- **Coverage scope constraint:** Vitest coverage includes `src/game/logic/**/*.ts` (plus two explicit files). A new manager in `src/game/logic/` auto-participates in coverage; placing it elsewhere may require coverage include updates to keep policy-aligned metrics (`vitest.config.ts:10-16`).
- **Test surface constraint:** there are no direct unit tests for `Game`; Step 1 contract tests should focus on manager forwarding with fakes, then rely on existing Playwright smoke/gameplay regression for end-to-end safety (`tests/unit/*.test.ts`, `tests/unit/FeedbackManager.test.ts:95-207`, `tests/e2e/smoke.spec.ts:3-24`, `tests/e2e/gameplay.spec.ts:352-455`).
- **Naming/debug constraint:** debug UX and docs are currently Remy-centric; Step 1 should avoid premature naming migration (`src/game/Game.ts:1041-1138`, `docs/features.md:44`, `docs/features.md:81`).

## Builder-ready file targets (expected)
- `src/game/Game.ts` (route lifecycle entrypoints through manager facade)
- `src/game/logic/` or `src/game/` new manager module(s) + bridge type(s)
- `tests/unit/` new manager contract/forwarding tests
- Potential regression test touchpoint around deterministic frame-step forwarding

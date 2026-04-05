# Existing Patterns

## Step 1 lifecycle entrypoints already have clear Game-side callsites
- Per-frame animation progression currently routes through `runSimulationStep(...) -> updateRemyAnimation(deltaSeconds)`, and the Remy updater no-ops for non-positive `deltaSeconds` while updating both primary + secondary mixers (`src/game/Game.ts:1260-1271`, `src/game/Game.ts:2548-2554`).
- Deterministic test stepping uses the same simulation path (`stepSimulation` loops `runSimulationStep(this.testMode.fixedStepSeconds)`), so Step 1 update-forwarding must preserve both real-time and test-mode paths (`src/game/Game.ts:3845-3858`, `src/game/logic/runtime.ts:4-23`).
- Reset teardown currently performs full Remy detach/null/reset state in `resetWorld()`, then boot-time spawn preload path happens when not in test mode (`src/game/Game.ts:1349-1368`, `src/game/Game.ts:1455-1456`).
- Refresh/reload path is centralized in `refreshRemyCharacterSelection()` (reset remy-specific runtime state + `loadRemyCharacter()`), which is triggered by ledge/suppression transitions in placement logic (`src/game/Game.ts:2617-2641`, `src/game/Game.ts:3084-3140`).
- Release semantics are effectively “detach from parent(s)” via `detachRemyCharacter()` and are invoked in anchor loss/suppression/fallback branches (`src/game/Game.ts:3095-3134`, `src/game/Game.ts:3426-3433`).

## Game still owns ledge orchestration and should continue to in Step 1
- Tentacle suppression updates currently call `syncRemyTentacleSuppression()` from distraction updates, which in turn re-runs ledge placement logic (`src/game/Game.ts:2261-2274`, `src/game/Game.ts:3239-3240`).
- Ledge anchor lookup + spawn-eligibility decisions are Game-local (`isRemySpawnEligibleLedge`, `findTopLedgeAnchor`, `findLedgeAnchorByLevelAndFace`) and feed into placement/spawn decisions (`src/game/Game.ts:3373-3423`).
- Ledge creation stamps `remySpawnEligible` using deterministic noise + `shouldSpawnRemyOnLedge(...)`, so Step 1 should not move this policy yet (`src/game/Game.ts:4691-4743`, `src/game/logic/remy.ts:73-85`).

## Existing manager/facade style to mirror
- `FeedbackManager` is a concrete class with a narrow public contract and private internals, initialized as a readonly Game field; this is the closest in-repo precedent for introducing `CharacterAnimationManager` (`src/game/FeedbackManager.ts:24-84`, `src/game/Game.ts:502-506`).
- Contract behavior for manager-style classes is tested with fakes/stubs and call-side effects (not rendering), using Vitest spies and deterministic assertions (`tests/unit/FeedbackManager.test.ts:30-207`).

## Testing conventions relevant to Step 1
- Pure deterministic logic modules live under `src/game/logic/*` with exported `initialize/step` style APIs and direct unit coverage (cloud system is a representative example) (`src/game/logic/clouds.ts:43-146`, `tests/unit/clouds.test.ts:54-220`).
- Remy policy logic is already tested as pure helpers (`tests/unit/remy.test.ts:13-140`), while `Game` itself is not directly unit-tested today (`tests/unit/*.test.ts`, `src/main.ts:10`).
- Required gameplay smoke paths (start/play/place/miss/restart/debug gating) already exist in Playwright and should remain green after routing changes (`tests/e2e/smoke.spec.ts:3-24`, `tests/e2e/gameplay.spec.ts:352-455`).

## Current Remy-centric debug/UI surface is intentionally explicit
- Debug UI has a dedicated “Remy Placement” control section with `data-remy-debug-*` hooks and a `Reset Remy Placement` action (`src/game/Game.ts:1041-1138`).
- Docs still describe dancer tuning in Remy terms; Step 1 should preserve naming and behavior until later planned renaming steps (`docs/features.md:44`, `docs/features.md:81`).

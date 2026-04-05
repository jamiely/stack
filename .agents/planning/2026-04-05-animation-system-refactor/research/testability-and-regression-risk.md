# Research: Testability and Regression Risk

## Current Test Posture

### Strong areas
- Logic modules in `src/game/logic/*.ts` are well unit-tested.
- `vitest` coverage thresholds are enforced at 90% for included non-rendering code.
- Deterministic test mode/test API already exists and is used by Playwright.

### Weak area for this refactor target
- `Game.ts` is intentionally excluded from coverage include patterns (`vitest.config.ts` includes logic modules + debugConfig + FeedbackManager only).
- The most fragile character-animation behavior currently resides in `Game.ts` (loading, selection, placement, suppression, lifecycle).
- Result: high-impact behavior has reduced regression protection.

## Why regressions happen in this area

- Mixed responsibilities in one file/class:
  - rendering + input + state machine + character loading + placement + debug UI + distraction interactions.
- Character behavior depends on mesh `userData` conventions and visibility state, increasing hidden coupling.
- Bat/UFO/Gorilla and humanoids use different runtime paths, increasing edge-case surface.

## Recommended Extraction Seams (for unit-testability)

```mermaid
flowchart TD
  Facade[CharacterAnimationManager Facade] --> Policy[SelectionPolicy (pure)]
  Facade --> Profiles[ProfileResolver (pure)]
  Facade --> Spawn[SpawnPlanner (pure)]
  Facade --> Runtime[RuntimeActorStore (stateful)]
  Facade --> Loader[AssetLoader Adapter]
  Facade --> Playback[Playback Adapter]

  Policy --> Tests1[Unit tests]
  Profiles --> Tests2[Unit tests]
  Spawn --> Tests3[Unit tests]

  Runtime --> Tests4[Deterministic unit tests]
  Facade --> Tests5[Integration tests with fakes]
```

### Prioritize pure modules for coverage
1. `SelectionPolicy`
   - round-robin character sequence
   - round-robin animation sequence
   - seed behavior
2. `TransformResolution`
   - global + character + character-animation override merge rules
3. `SpawnPolicy`
   - `spawnLedgeCharacter` internal selection behavior
   - `spawnCharacter('bat'|'ufo'|'gorilla')` explicit behavior
4. `FallbackPolicy`
   - best-effort loading failure handling
   - placeholder fallback resolution

### Keep adapters thin and fakeable
- `AssetLoader`: injectable/fakeable in tests
- `PlaybackEngine`: mixer/retarget operations behind interface
- `ActorHandle` lifecycle: deterministic IDs + explicit release/dispose

## Suggested regression test matrix additions

- deterministic round-robin sequence for ledge characters across many calls
- deterministic round-robin animation sequence independent of character sequence
- `spawnCharacter('bat'|'ufo'|'gorilla')` direct-type integrity
- placeholder fallback when ledge humanoid pool unavailable
- lifecycle:
  - double release safety
  - disposeAll cleans all active actors
- debug transform overrides:
  - profile-only
  - profile+animation precedence

## Source References
- `vitest.config.ts`
- `tests/unit/*.test.ts`
- `tests/e2e/*.spec.ts`
- `src/game/Game.ts`
- `src/game/logic/remy.ts`

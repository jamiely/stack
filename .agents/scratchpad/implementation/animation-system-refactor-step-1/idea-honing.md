# Idea Honing — animation-system-refactor-step-1

- Task: task-1775412986-0f71 (`pdd:animation-system-refactor-step-1:requirements`)
- Q1 (scope boundary): For Step 1 acceptance, which existing `Game.ts` ledge-character responsibilities must move behind `CharacterAnimationManager` immediately (preload, spawn entrypoint, per-frame animation update, release/dispose on reset), and which responsibilities are explicitly allowed to remain in `Game.ts` until later steps?
- A1: **Step 1 must move the lifecycle entrypoints behind the facade now**: `Game` should call manager methods for ledge-character preload/init, spawn request, per-frame animation tick, release/unmount, and full teardown (`preload`, `spawnLedgeCharacter`, `update`, `release`, `disposeAll`) rather than calling Remy internals directly (`loadRemyCharacter`, `updateRemyAnimation`, `detachRemyCharacter`, reset-time nulling paths).
  
  **Step 1 may leave implementation internals in place (bridge adapter) until later steps**:
  - Current selection/load/retarget internals and candidate ordering (`drawNextRemyCharacterIndex`, `drawNextRemyAnimationIndex`, clip fallback logic) can remain as-is until Step 2/6.
  - Current placement/tuning internals and Remy debug plumbing can remain until Step 3.
  - Remy-centric naming can remain temporarily until Step 4.
  - Non-ledge actor explicit branch (`bat`/`ufo`/`gorilla`) can stay outside this step until Step 5.
  - Lifecycle hardening details (idempotent release store semantics) can be finalized in Step 7.
  - Ledge-world orchestration concerns in `Game` (finding ledge anchors, tentacle suppression gating, deciding when to request/release) are allowed to stay in `Game` for Step 1.

## Requirements readiness

- Core Step 1 functionality is now unambiguous: `Game` must route ledge-character lifecycle entrypoints through `CharacterAnimationManager` (`preload`, `spawnLedgeCharacter`, `update`, `release`, `disposeAll`).
- Scope boundaries are explicit: bridge internals and non-ledge/refactor hardening work remain deferred to later plan steps (2-7).
- Success criteria are measurable via Step 1 test requirements in the implementation plan (manager contract unit coverage, per-frame update forwarding regression, Playwright gameplay smoke stability).

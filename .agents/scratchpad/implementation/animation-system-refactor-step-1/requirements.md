# Requirements — animation-system-refactor-step-1

## Context
Step 1 introduces a minimal `CharacterAnimationManager` facade and routes ledge-character lifecycle entrypoints through it without changing visible gameplay behavior.

## Consolidated Requirements

1. **Facade boundary required in Step 1**
   - `Game` must call facade lifecycle entrypoints for ledge characters instead of direct Remy lifecycle internals:
     - `preload`
     - `spawnLedgeCharacter`
     - `update`
     - `release`
     - `disposeAll`

2. **No behavior drift**
   - Existing ledge dancer behavior (spawn timing, placement behavior, animation playback cadence, suppression behavior, restart stability) must remain functionally equivalent from the player/test perspective.

3. **Bridge implementation is allowed in Step 1**
   - Step 1 may use a bridge adapter so current internals still execute from the new facade boundary.
   - Step 1 does **not** need to extract selection/loading/retarget logic out of `Game` yet.

4. **Explicit out-of-scope items deferred to later steps**
   - Deterministic round-robin extraction (Step 2)
   - Transform-profile hierarchy + debug selector migration (Step 3)
   - Remy naming cleanup (Step 4)
   - Explicit non-ledge facade branch (`bat`/`ufo`/`gorilla`) (Step 5)
   - Manager-owned preload fallback/placeholder hardening (Step 6)
   - Full lifecycle idempotence hardening and actor-store ownership (Step 7)

5. **Game orchestration remains in `Game` for Step 1**
   - Ledge-anchor discovery, tentacle suppression gating, and decisions about when to request or release ledge characters remain in `Game` during this step.

6. **Testing requirements for Step 1**
   - Add unit coverage for the new manager surface contract and forwarding semantics.
   - Add regression unit coverage proving `update(dt)` forwarding occurs exactly once per simulation frame path.
   - Run Playwright smoke/gameplay flows to confirm no gameplay regression.

## Assumptions

- `CharacterAnimationManager` in Step 1 is intentionally thin and adapter-style.
- Existing Remy internals are trusted as current baseline behavior; Step 1 only changes call routing and ownership boundary.
- Existing debug controls remain Remy-centric in this step and are not redesigned yet.

## Acceptance Criteria

- No direct `Game` calls remain for the Step 1 lifecycle entrypoints listed above; those calls route through the facade.
- Core gameplay smoke remains stable (start/play/place/miss/restart).
- Unit tests covering manager contract + update forwarding pass.
- Scope boundaries are preserved (no premature extraction from deferred steps).
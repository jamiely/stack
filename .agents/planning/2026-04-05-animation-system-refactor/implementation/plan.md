# Implementation Plan

## Checklist

- [ ] Step 1: Introduce a minimal `CharacterAnimationManager` facade and route existing ledge-character flow through it without behavior drift.
- [ ] Step 2: Implement deterministic round-robin ledge character and ledge animation selection engines (seed-aware) and wire them into facade-led ledge spawns.
- [ ] Step 3: Implement transform profile resolution (global + per-character + per-character-animation), migrate debug controls to selector-based profile tuning, and apply overrides at runtime.
- [ ] Step 4: Remove Remy-centric runtime naming and reshape internals into character-agnostic modules/interfaces while preserving behavior.
- [ ] Step 5: Add explicit non-ledge spawn branch `spawnCharacter('bat'|'ufo'|'gorilla')` in the facade, backed by current non-humanoid runtime behavior paths.
- [ ] Step 6: Add manager-owned best-effort preload and placeholder fallback spawning for unavailable character assets.
- [ ] Step 7: Harden lifecycle and determinism (`update(dt)`, `release`, `disposeAll`) with actor-store ownership and reset integration.
- [ ] Step 8: Close regression gaps with targeted unit + Playwright coverage for manager contract paths, then finalize docs and verification.

---

> Planning directive used for this breakdown: convert the design into incremental, test-driven implementation steps where each step remains integrated and demoable, avoids orphaned code, and builds directly on prior steps.

## Step 1: Introduce facade and integrate current ledge path through it

**Objective**
Create `CharacterAnimationManager` with a minimal usable surface and have `Game` call the facade for ledge-character lifecycle (`preload`, `spawnLedgeCharacter`, `update`, `release`, `disposeAll`) while preserving current visible behavior.

**Implementation guidance**
- Add new manager module(s) under `src/game/` or `src/game/logic/` with initial interfaces/types.
- Implement facade as a thin adapter over current in-Game ledge character behavior first (bridge pattern), then incrementally extract internals in later steps.
- Keep `Game` as caller/orchestrator only; manager owns character details.
- Maintain existing actor visuals and timing behavior.

**Test requirements**
- Unit tests for manager surface contract shape (method presence, basic call semantics with fakes).
- Regression unit tests that `update(dt)` forwarding occurs exactly once per frame tick path.
- Playwright smoke pass to verify gameplay remains unchanged (start/play/place/miss/restart).

**Integration with previous work**
- This is the first implementation step; no feature should be removed.
- Ensure existing dancer behavior still appears after routing through the facade.

**Demo**
- Run game with `?debug`; ledge dancers still appear and animate as before.
- Show `Game` no longer directly owns full ledge-character orchestration entrypoint logic.

---

## Step 2: Add deterministic round-robin selection engines for ledge character + animation

**Objective**
Replace ad-hoc selection with explicit deterministic selection modules:
- round-robin ledge character selection
- round-robin ledge animation selection
- optional seed-based deterministic initialization behavior

**Implementation guidance**
- Create pure modules (e.g., `characterSelection.ts`) for selection state and next-value resolution.
- Keep these modules rendering-agnostic and side-effect-free.
- Wire manager’s `spawnLedgeCharacter()` to use these modules exclusively.
- Preserve current cast/clip inventory and fallback candidate behavior where required.

**Test requirements**
- Unit tests:
  - deterministic sequence under fixed seed
  - cycle wraps correctly
  - character and animation cycles are independent
  - no runtime crash for empty/partial availability sets
- Add regression test for expected first N spawn IDs in deterministic mode.

**Integration with previous work**
- Builds on Step 1 facade path.
- Keep fallback to currently available behavior if assets are partially unavailable.

**Demo**
- In test mode with a fixed seed, repeated ledge spawn calls produce stable, predictable character+animation order across runs.

---

## Step 3: Implement transform-profile hierarchy and selector-based debug controls

**Objective**
Implement transform resolution hierarchy and move runtime tuning from Remy-specific controls to profile-based controls:
1. global defaults
2. per-character overrides
3. per-(character, animation) overrides

**Implementation guidance**
- Add pure `TransformConfigResolver` module.
- Add debug-facing profile selector and optional animation selector.
- Replace current direct Remy slider plumbing with generic profile-scoped sliders for position/rotation/scale.
- Keep session-only persistence.

**Test requirements**
- Unit tests for transform merge precedence and reset behavior.
- Unit tests for invalid override input clamping/sanitization.
- Playwright debug-panel test:
  - select profile
  - adjust sliders
  - observe runtime actor transform changes.

**Integration with previous work**
- Uses Step 2 selected character/animation IDs to resolve scoped overrides.
- Preserve existing default visual placement as baseline before user tuning.

**Demo**
- In `?debug`, switch character profile dropdown and adjust position/rotation/scale live; actor placement updates immediately.

---

## Step 4: Remove Remy-centric naming and modularize internals

**Objective**
Eliminate Remy-specific runtime naming/assumptions and restructure internals into character-agnostic modules while keeping behavior stable.

**Implementation guidance**
- Rename logic modules/types/functions/constants from Remy-specific to generic character naming.
- Keep temporary migration aliases only where unavoidable, then remove them before step completion.
- Update HUD/debug labels and docs to avoid Remy-coupled language in runtime surfaces.

**Test requirements**
- Update/port existing `tests/unit/remy.test.ts` into renamed generic test module(s).
- Add regression assertions that renamed modules preserve prior logic outcomes.
- Run full unit suite + existing e2e suite.

**Integration with previous work**
- Refactor should be internal-only from `Game` perspective due to Step 1 facade.
- No gameplay feature loss allowed.

**Demo**
- Codebase runtime character system no longer exposes Remy-specific API/config names; gameplay visuals remain equivalent.

---

## Step 5: Add explicit non-ledge branch for bat/ufo/gorilla

**Objective**
Support explicit non-ledge requests via facade:
- `spawnCharacter('bat')`
- `spawnCharacter('ufo')`
- `spawnCharacter('gorilla')`

**Implementation guidance**
- Implement non-humanoid adapter branch in manager (reuse current overlay actor/distraction behavior where practical).
- Keep unified `CharacterActorHandle` contract across humanoid and non-humanoid paths.
- Ensure this branch is explicit and separate from internal ledge selection.

**Test requirements**
- Unit tests:
  - valid type dispatch for bat/ufo/gorilla
  - invalid type handling (compile-time + runtime guard)
  - correct actor-handle kind mapping
- Playwright/integration checks that each explicit non-ledge request path remains operable with manager ownership.

**Integration with previous work**
- Extends facade from Steps 1–4; does not alter ledge round-robin behavior.
- Keep existing distraction layer behavior functioning.

**Demo**
- From game flow/debug harness, explicit requests for bat/ufo/gorilla create controllable actor handles using the non-ledge branch.

---

## Step 6: Manager-owned preload with best-effort + fallback placeholder

**Objective**
Move loading responsibility fully into manager and ensure best-effort resilience with placeholder fallback spawning.

**Implementation guidance**
- Implement `preload()` to load character/animation assets under manager ownership.
- Mark failed assets unavailable; continue with partial pool.
- Log failures to console with identifiable context.
- Ensure `spawnLedgeCharacter()` always returns an actor handle, using placeholder when needed.

**Test requirements**
- Unit tests with fake loader:
  - partial load success
  - all-fail path
  - failed entries excluded from ledge pools
- Integration tests for placeholder spawn behavior when ledge pool is empty.

**Integration with previous work**
- Builds directly on Steps 2 and 5 selection/spawn paths.
- Must not regress normal fully-loaded behavior.

**Demo**
- Simulated asset-failure scenario still yields playable run; ledge spawns return placeholder actor instead of hard fail.

---

## Step 7: Lifecycle and deterministic ownership hardening

**Objective**
Finalize ownership model for actor lifecycle and deterministic update execution.

**Implementation guidance**
- Add/solidify actor store tracking all active actor handles.
- Make `release(actor)` idempotent and safe for repeated calls.
- Make `disposeAll()` complete and reset-safe.
- Ensure `update(dt)` is single-source-of-truth for manager-driven animation progression.

**Test requirements**
- Unit tests:
  - repeated `release` does not throw or double-dispose
  - `disposeAll` clears active store and stops further updates
  - deterministic `update(dt)` with fixed-step sequence produces stable outcomes
- Playwright restart-loop test to catch leaks/duplicate updates across repeated game resets.

**Integration with previous work**
- Harden all prior behavior without changing public API.
- Align manager reset with game reset lifecycle.

**Demo**
- Repeated start/fail/restart cycles remain stable with no actor accumulation or duplicate animation updates.

---

## Step 8: Regression closure, coverage hardening, and docs finalization

**Objective**
Complete regression-proofing and documentation alignment for the refactor milestone.

**Implementation guidance**
- Add targeted unit tests for:
  - selection sequencing
  - spawn API branching (`ledge` internal + bat/ufo/gorilla explicit)
  - transform override precedence
  - fallback/placeholder behavior
- Add Playwright checks for core gameplay unaffected and non-ledge explicit paths functional.
- Update repo docs (`README.md`, `docs/features.md`) to reflect new manager contract and debug controls.

**Test requirements**
- Run and pass:
  - `npm run test:unit`
  - `npm run coverage`
  - `npm run test:e2e`
  - `npm run build`
- Maintain >=90% unit coverage for included non-rendering code.

**Integration with previous work**
- No new architecture introduced here; this step verifies and documents completed architecture.
- Ensure all previous steps remain integrated and demoable together.

**Demo**
- End-to-end: game runs with centralized manager, ledge round-robin behavior, explicit bat/ufo/gorilla spawn branch, debug profile tuning, and passing automated verification.

# Idea Honing

## Q1
**Question:** Should the new central animation class manage only character animation (humanoid + non-humanoid), or should it also own effects-style animations like fireworks particles?

**Answer:** Start with **characters only** (humanoid + non-humanoid). Fireworks/effects remain outside this refactor for now, with a possible later refactor if beneficial.

## Q2
**Question:** For humanoid characters, should any Mixamo animation be playable on any humanoid character by default (full mix-and-match), with optional per-character overrides when a specific clip needs adjustment?

**Answer:** Yes — full mix-and-match by default.

## Q3
**Question:** For non-humanoid characters (e.g., bat, UFO) with prebaked animations, should they be selected and controlled through the same public API as humanoids, while internally using a different playback path?

**Answer:** Yes — use the same public API and hide animation details internally.

## Q4
**Question:** How should placement/scale tuning be layered? Proposed default: global defaults + per-character overrides + optional per-(character, animation) overrides for edge cases. Should we adopt that hierarchy?

**Answer:** Yes — adopt that hierarchy.

## Q5
**Question:** Should the main game provide character/animation by stable IDs (e.g., `characterId`, `animationId`) and avoid direct model/clip references entirely?

**Answer:** For ledge characters, the main game should not reference characters directly at all. The central class should manage selection and composition internally, and the main game should request a complete ledge character instance.

## Q6
**Question:** When the main game requests a complete ledge character, should selection be deterministic from inputs (e.g., seed + ledge index) for reproducible tests, or non-deterministic/random during normal play?

**Answer:** The central class should accept an optional seed at initialization for deterministic behavior when needed. It should not know anything about ledges. The main game requests a character, and the class internally selects the next character.

## Q7
**Question:** What should “selects the next character” mean by default: strict round-robin through a shuffled pool, weighted random without immediate repeats, or pure random?

**Answer:** Round-robin.

## Q8
**Question:** For animation selection, should it also be round-robin (independent cycle per character type), or should animations be chosen randomly from allowed clips while characters remain round-robin?

**Answer:** Round-robin.

## Q9
**Question:** Should the system return a fully prepared runtime object (model + animation state + placement/scale already applied), or return data/config that the main game then instantiates?

**Answer:** Prefer returning a fully prepared runtime object, if feasible. There is some uncertainty about whether this will feel awkward in practice.

## Q10
**Question:** To avoid awkward ownership, should the central class also own lifecycle methods for spawned character instances (e.g., `releaseCharacter(instance)` / `disposeAll()`), while the main game only mounts/unmounts them in scene flow?

**Answer:** Yes.

## Q11
**Question:** Do you want explicit debug controls for runtime tuning of per-character placement/scale offsets (as required by repo standards), or config-file-only tuning for this refactor?

**Answer:** Prefer runtime sliders/toggles, especially if the game can dynamically re-render changes. Also interested in a dedicated tuning mode that makes it easier to tune each character.

## Q12
**Question:** Should the dedicated tuning mode be in scope for this refactor (e.g., freeze gameplay, cycle characters/animations, and live-adjust transform values), or should we only add basic runtime controls now and defer a full tuning mode?

**Answer:** Defer the full tuning mode. Add basic runtime controls now.

## Q13
**Question:** For the main-game-facing API, is this direction correct: the game asks for “next character actor” (already configured and animating) plus update hooks (`update(dt)`, `release(actor)`), with no character IDs required in normal gameplay flow?

**Answer:** Yes.

## Q14
**Question:** For testing/debugging, do you still want optional explicit selection methods (e.g., `spawnCharacterForDebug({characterId, animationId})`) even though normal gameplay won’t use IDs?

**Answer:** Not now; maybe later.

## Q15
**Question:** What are your top acceptance criteria for this refactor? For example: (1) no “Remy”-specific naming in runtime code paths, (2) game class imports only one manager/facade for character spawning/updates, (3) all existing character types still appear and animate correctly.

**Answer:** API correction: the game needs to pass a character request type of `bat | ufo | gorilla | ledge` when requesting a spawned character.

## Q16
**Question:** For `ledge` requests, should the manager continue using round-robin character + round-robin animation selection internally, while `bat` and `ufo` requests spawn those exact non-humanoid actors directly?

**Answer:** Yes. `ledge` remains internally selected by the manager (game cannot directly choose individual ledge characters). `bat` and `ufo` are explicit direct requests, because gameplay needs to control their movement/pathing around the world, while ledge characters remain at a single world position. (Later design update also adds `gorilla` to this same explicit non-ledge request path.)

## Q17
**Question:** For the single request API, should we use one method like `spawnCharacter({ type: 'ledge' | 'bat' | 'ufo', transform? ... })` or separate methods (`spawnLedgeCharacter()`, `spawnBat()`, `spawnUfo()`) with a shared internal implementation?

**Answer:** Use two methods: `spawnLedgeCharacter()` and `spawnCharacter(...)`.

## Q18
**Question:** For `spawnCharacter(...)`, should it be constrained to non-ledge types only (i.e., `bat | ufo`) so ledge spawning can only happen through `spawnLedgeCharacter()`?

**Answer:** Yes. (Later design update extends this to `bat | ufo | gorilla` in the same non-ledge branch.)

## Q19
**Question:** Should we explicitly require that all “Remy”-specific naming and assumptions be removed from runtime APIs/configs (while allowing migration aliases only if needed temporarily)?

**Answer:** Yes.

## Q20
**Question:** Should the manager own asset loading/preloading (e.g., `preload()` before gameplay starts), or should assets continue to be loaded externally and injected into the manager?

**Answer:** Manager-owned loading/preloading.

## Q21
**Question:** Should preload failures be fail-fast (block game start with clear error) or best-effort (skip failed character assets and continue with available ones)?

**Answer:** Best-effort.

## Q22
**Question:** Should the manager expose a lightweight diagnostics/status method (e.g., `getLoadStatus()` with loaded/skipped assets and warnings) so the game can surface non-fatal preload issues?

**Answer:** No. Console logging is sufficient for now.

## Q23
**Question:** Do you want this refactor to preserve current visible behavior as closely as possible (aside from removing Remy-specific coupling), or is some behavior drift acceptable if architecture becomes cleaner?

**Answer:** Preserve behavior as closely as possible.

## Q24
**Question:** Is requirements clarification complete, or do you want to answer a few more questions before we move to research/design planning?

**Answer:** Continue clarification.

## Q25
**Question:** What should the method signatures be for the two spawn methods? Proposed baseline:
- `spawnLedgeCharacter(options?: { position?: Vector3Like; rotation?: EulerLike; parent?: Object3D })`
- `spawnCharacter(type: 'bat' | 'ufo' | 'gorilla', options?: { position?: Vector3Like; rotation?: EulerLike; pathingConfig?: unknown; parent?: Object3D })`
Should we keep this shape, and if not, what should change?

**Answer:** Keep methods minimal and omit transform params. Use:
- `spawnLedgeCharacter()`
- `spawnCharacter(type: 'bat' | 'ufo' | 'gorilla')`
The game will handle world placement/pathing after spawn.

## Q26
**Question:** For update ownership, should the manager require an explicit per-frame call (`update(dt)`) from the game, or should spawned actors self-update without a manager tick?

**Answer:** Use explicit `update(dt)` from the game for determinism.

## Q27
**Question:** If `spawnLedgeCharacter()` is called but no ledge-compatible humanoid assets are available (e.g., load failures), what should happen: return `null`, throw, or spawn a fallback placeholder?

**Answer:** Spawn a fallback placeholder.

## Q28
**Question:** For runtime debug controls in this refactor, which controls are required initially: (A) scale only, (B) position + scale, or (C) position + rotation + scale per character profile?

**Answer:** C — position + rotation + scale per character profile.

## Q29
**Question:** Do you want separate debug profiles for ledge characters vs moving non-humanoids (`bat`, `ufo`), so pathing-related transforms for moving actors can be tuned independently?

**Answer:** Yes, and more specifically each individual character should have its own tuning profile. A selector-based debug UI (e.g., dropdown) is preferred.

## Q30
**Question:** For the debug UI, should we use this flow: dropdown for character profile → optional animation dropdown (for per-character+animation overrides) → sliders for position/rotation/scale with reset buttons?

**Answer:** Yes.

## Q31
**Question:** Should debug-tuned values persist across reloads during development (e.g., localStorage export/import), or remain session-only for now?

**Answer:** Session-only for now.

## Q32
**Question:** Are the acceptance criteria below correct?
1. Remove Remy-specific naming/assumptions from runtime character animation paths.
2. Introduce a central manager/facade with manager-owned preload, explicit `update(dt)`, `spawnLedgeCharacter()`, `spawnCharacter('bat'|'ufo'|'gorilla')`, and lifecycle cleanup methods.
3. Ledge spawn remains internally selected (round-robin character + round-robin animation), not directly selectable by game.
4. Bat/UFO/Gorilla are explicitly requestable for game-controlled pathing.
5. Preserve current visible behavior as closely as possible.
6. Add runtime debug controls with dropdown selectors and per-character/per-(character,animation) position/rotation/scale tuning (session-only).

**Answer:** Yes, and add an explicit criterion that the resulting architecture should be highly unit-testable to reduce regressions in this area.

## Q33
**Question:** To enforce that testability goal, do you want a target like “all selection/config logic is pure and unit-tested with deterministic seed coverage,” plus explicit regression tests for round-robin sequencing and spawn API behavior?

**Answer:** Yes.

## Q34
**Question:** Requirements clarification check: do you feel clarification is complete now, or do you want additional questions before we move to research planning?

**Answer:** Clarification is complete for now; proceed to research.

## Q35
**Question:** Design update during review: should the main game also be able to explicitly spawn a gorilla via the same non-ledge explicit method branch as bat/ufo?

**Answer:** Yes. Main game must be able to spawn gorilla explicitly, and it should be handled via the same `spawnCharacter(...)` non-ledge branch used for bat/ufo.



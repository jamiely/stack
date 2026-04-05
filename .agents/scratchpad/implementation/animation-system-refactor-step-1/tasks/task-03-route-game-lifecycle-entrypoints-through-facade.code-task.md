---
status: pending
created: 2026-04-05
started: null
completed: null
---
# Task: Route Game lifecycle entrypoints through facade

## Description
Update `Game.ts` to route Step 1 character animation lifecycle entrypoints through the new `CharacterAnimationManager` while keeping deferred internals in place.

## Background
Step 1 acceptance requires only boundary ownership changes: `preload`, `spawnLedgeCharacter`, `update`, `release`, and `disposeAll` should be facade-driven. Internals like selection/loading/retarget/debug naming remain in `Game.ts` until later steps.

## Reference Documentation
**Required:**
- Design: .agents/scratchpad/implementation/animation-system-refactor-step-1/design.md

**Additional References:**
- .agents/scratchpad/implementation/animation-system-refactor-step-1/context.md (codebase patterns)
- .agents/scratchpad/implementation/animation-system-refactor-step-1/plan.md (overall strategy)

**Note:** You MUST read the design document before beginning implementation.

## Technical Requirements
1. Instantiate and own `CharacterAnimationManager` in `src/game/Game.ts` using callback bridge wiring to existing private internals.
2. Replace direct lifecycle entrypoint callsites with manager calls in preload/spawn refresh, simulation update path, release branches, and teardown/reset disposal paths.
3. Preserve shared-path single-update invariant: both RAF tick and `stepSimulation` still flow through one simulation step that updates manager exactly once.

## Dependencies
- `.agents/scratchpad/implementation/animation-system-refactor-step-1/tasks/task-02-implement-character-animation-manager-callback-bridge.code-task.md`

## Implementation Approach
1. TDD: Keep forwarding-path tests active and make the minimal `Game.ts` routing changes to satisfy them.
2. Wire manager callbacks to existing private methods without extracting Step 2–7 internals.
3. Refactor callsite structure only as needed for readability and deterministic behavior parity.

## Acceptance Criteria

1. **Lifecycle Routing Uses Manager Boundary**
   - Given `Game.ts` processes preload, simulation updates, detach/release branches, and reset teardown
   - When those flows execute
   - Then lifecycle entrypoint calls go through `CharacterAnimationManager` and deferred internals remain unchanged.

2. **Unit Tests Pass**
   - Given the implementation is complete
   - When running the test suite
   - Then all tests for this task pass.

## Metadata
- **Complexity**: High
- **Labels**: animation,refactor,game-loop,integration,tdd
- **Required Skills**: TypeScript, Vitest, game architecture

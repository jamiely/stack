---
status: completed
created: 2026-04-05
started: 2026-04-05
completed: 2026-04-05
---
# Task: Implement character animation manager and callback bridge

## Description
Implement the Step 1 `CharacterAnimationManager` facade and callback bridge in `src/game/logic/` so lifecycle entrypoints are centralized without moving deferred internals out of `Game.ts`.

## Background
The approved design requires a private-method-safe bridge pattern because `Game` internals cannot be directly accessed externally. The manager must stay non-rendering and coverage-counted under `src/game/logic/`.

## Reference Documentation
**Required:**
- Design: .agents/scratchpad/implementation/animation-system-refactor-step-1/design.md

**Additional References:**
- .agents/scratchpad/implementation/animation-system-refactor-step-1/context.md (codebase patterns)
- .agents/scratchpad/implementation/animation-system-refactor-step-1/plan.md (overall strategy)

**Note:** You MUST read the design document before beginning implementation.

## Technical Requirements
1. Add `src/game/logic/characterAnimationManager.ts` exposing the five required facade methods and typed bridge contract.
2. Implement callback bridge factory logic that forwards calls to supplied callbacks and preserves `deltaSeconds` values unchanged.
3. Implement Step 1 guards: `update` no-op for non-positive delta and safe/idempotent release/dispose behavior compatible with repeated calls.

## Dependencies
- `.agents/scratchpad/implementation/animation-system-refactor-step-1/tasks/task-01-add-failing-facade-bridge-contract-tests.code-task.md`

## Implementation Approach
1. TDD: Run newly added Step 1 RED tests and implement only enough production code to satisfy them.
2. Add the manager + bridge in `src/game/logic/` and wire any lightweight helper seam required by tests.
3. Refactor type names and helper boundaries for clarity while keeping all tests green.

## Acceptance Criteria

1. **Facade and Bridge Behavior Is Implemented**
   - Given the manager and bridge modules are implemented
   - When unit tests invoke each lifecycle entrypoint
   - Then each facade method forwards exactly once with the expected arguments and preserves deterministic behavior.

2. **Unit Tests Pass**
   - Given the implementation is complete
   - When running the test suite
   - Then all tests for this task pass.

## Metadata
- **Complexity**: Medium
- **Labels**: animation,refactor,manager,logic,tdd
- **Required Skills**: TypeScript, Vitest, interface design

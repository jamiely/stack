---
status: completed
created: 2026-03-31
started: 2026-03-31
completed: 2026-03-31
---
# Task: Cloud simulation skeleton

## Description
Create the pure cloud simulation contract in `src/game/logic/clouds.ts` with deterministic seeded initialization and a minimal deterministic step skeleton so cloud behavior can be tested outside `Game.ts`.

## Background
Cloud behavior is currently Game-local and mixed with DOM updates. The design requires a pure deterministic simulation module as the base for lifecycle, lane, drift, and debug behavior.

## Reference Documentation
**Required:**
- Design: .agents/scratchpad/implementation/cloud-fix-plan/design.md

**Additional References:**
- .agents/scratchpad/implementation/cloud-fix-plan/context.md (codebase patterns)
- .agents/scratchpad/implementation/cloud-fix-plan/plan.md (overall strategy)

**Note:** You MUST read the design document before beginning implementation.

## Technical Requirements
1. Define cloud simulation types (entity, config, state, camera frame) in `src/game/logic/clouds.ts`.
2. Implement deterministic `initializeCloudState(...)` seeded behavior with stable IDs, finite coordinates, and unique entities.
3. Implement deterministic `stepCloudState(...)` skeleton that preserves deterministic replay guarantees needed by later steps.
4. Add unit tests in `tests/unit/clouds.test.ts` for same-seed replay and finite/unique invariants.

## Dependencies
- None (first implementation step)

## Implementation Approach
1. TDD: add failing unit tests for deterministic init replay and finite/unique invariants.
2. Implement minimal cloud state types + initializer + step skeleton to satisfy tests.
3. Refactor naming/typing while preserving deterministic test pass state.

## Acceptance Criteria

1. **Deterministic Initialization Contract**
   - Given identical seed, config, and camera frame inputs
   - When `initializeCloudState` is called multiple times
   - Then each run returns identical cloud arrays with stable IDs and finite coordinates

2. **Seed Variance Contract**
   - Given different seeds and the same config/frame
   - When initialization runs
   - Then at least one cloud entity differs across outputs

3. **Unit Tests Pass**
   - Given the implementation is complete
   - When running the test suite
   - Then all tests for this task pass

## Metadata
- **Complexity**: Medium
- **Labels**: cloud,simulation,determinism,tdd
- **Required Skills**: TypeScript, Vitest, deterministic simulation

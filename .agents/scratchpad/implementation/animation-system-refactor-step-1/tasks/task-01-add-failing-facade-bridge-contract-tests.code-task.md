---
status: completed
created: 2026-04-05
started: 2026-04-05
completed: 2026-04-05
---
# Task: Add failing facade/bridge contract tests

## Description
Create RED-first unit tests that codify Step 1 boundaries for the new character animation facade and callback bridge before implementation begins.

## Background
Step 1 of the animation-system refactor requires moving only lifecycle entrypoints behind a facade while leaving internals in `Game.ts`. Tests must lock the five-method contract and exactly-once update-forwarding behavior to prevent scope creep.

## Reference Documentation
**Required:**
- Design: .agents/scratchpad/implementation/animation-system-refactor-step-1/design.md

**Additional References:**
- .agents/scratchpad/implementation/animation-system-refactor-step-1/context.md (codebase patterns)
- .agents/scratchpad/implementation/animation-system-refactor-step-1/plan.md (overall strategy)

**Note:** You MUST read the design document before beginning implementation.

## Technical Requirements
1. Add `tests/unit/characterAnimationManager.test.ts` covering facade methods (`preload`, `spawnLedgeCharacter`, `update`, `release`, `disposeAll`) and forwarding/no-op/idempotency expectations.
2. Add `tests/unit/characterAnimationManager.bridge.test.ts` covering callback bridge behavior for all lifecycle entrypoints and deterministic/pure operation.
3. Add `tests/unit/characterAnimationForwardingPath.test.ts` to enforce single shared simulation-step forwarding invariants (RAF and `stepSimulation` path expectations).

## Dependencies
- Approved Step 1 plan/design artifacts in `.agents/scratchpad/implementation/animation-system-refactor-step-1/`

## Implementation Approach
1. TDD: Write failing tests first for facade contract, callback bridge, and forwarding path invariants.
2. Implement only the minimum test scaffolding needed for compile-time clarity (no production logic changes yet).
3. Refactor test naming/fixtures for readability while keeping tests intentionally RED.

## Acceptance Criteria

1. **Contract Tests Capture Step 1 Boundaries**
   - Given the new unit test files are added
   - When the unit suite is run before production implementation
   - Then failures explicitly indicate missing facade/bridge/forwarding contracts rather than unrelated behavior.

2. **Unit Tests Pass**
   - Given the implementation is complete
   - When running the test suite
   - Then all tests for this task pass.

## Metadata
- **Complexity**: Medium
- **Labels**: animation,refactor,tests,tdd,unit
- **Required Skills**: TypeScript, Vitest, gameplay-loop testing

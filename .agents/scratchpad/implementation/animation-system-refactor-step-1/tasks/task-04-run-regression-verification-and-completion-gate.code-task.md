---
status: pending
created: 2026-04-05
started: null
completed: null
---
# Task: Run regression verification and completion gate

## Description
Execute full regression verification for Step 1, including unit/e2e/build gates and the paused deterministic adversarial gameplay scenario, to confirm no behavior drift.

## Background
Step 1 is a boundary refactor. The release gate requires proving unchanged gameplay and stable deterministic stepping/restart behavior under repeated miss/restart cycles.

## Reference Documentation
**Required:**
- Design: .agents/scratchpad/implementation/animation-system-refactor-step-1/design.md

**Additional References:**
- .agents/scratchpad/implementation/animation-system-refactor-step-1/context.md (codebase patterns)
- .agents/scratchpad/implementation/animation-system-refactor-step-1/plan.md (overall strategy)

**Note:** You MUST read the design document before beginning implementation.

## Technical Requirements
1. Run `npm run test:unit`, `npm run test:e2e`, and `npm run build` with all passing.
2. Validate paused deterministic stepping and restart adversarial loop (multiple miss/restart cycles) using Playwright/browser test harness path from the plan.
3. Add or adjust targeted regression assertions only if needed to codify Step 1 invariants without expanding to deferred Step 2–7 work.

## Dependencies
- `.agents/scratchpad/implementation/animation-system-refactor-step-1/tasks/task-03-route-game-lifecycle-entrypoints-through-facade.code-task.md`

## Implementation Approach
1. TDD: If any regression is uncovered, write/adjust a failing test first to capture the issue.
2. Implement the minimal fix and rerun full verification gates.
3. Refactor only incidental quality issues while keeping all verification checks green.

## Acceptance Criteria

1. **Refactor Preserves Runtime Behavior**
   - Given the Step 1 facade routing changes are complete
   - When deterministic gameplay flows (step, miss, restart, repeated cycles) are exercised
   - Then behavior matches baseline with no crashes, stuck states, or double-step anomalies.

2. **Unit Tests Pass**
   - Given the implementation is complete
   - When running the test suite
   - Then all tests for this task pass.

## Metadata
- **Complexity**: Medium
- **Labels**: animation,refactor,regression,playwright,verification
- **Required Skills**: Playwright, Vitest, TypeScript

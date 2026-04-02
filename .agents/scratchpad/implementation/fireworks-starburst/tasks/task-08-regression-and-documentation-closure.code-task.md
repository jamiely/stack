---
status: completed
created: 2026-04-02
started: 2026-04-02
completed: 2026-04-02
---
# Task: Regression + documentation closure

## Description
Finalize the fireworks-starburst implementation by updating docs and running full verification gates required by repo policy.

## Background
The repository requires docs parity and green quality gates before completion. This step ensures the shipped behavior and operator workflows are accurately documented.

## Reference Documentation
**Required:**
- Design: .agents/scratchpad/implementation/fireworks-starburst/design.md

**Additional References:**
- .agents/scratchpad/implementation/fireworks-starburst/context.md (codebase patterns)
- .agents/scratchpad/implementation/fireworks-starburst/plan.md (overall strategy)

**Note:** You MUST read the design document before beginning implementation.

## Technical Requirements
1. Update `README.md` and `docs/features.md` to describe new fireworks controls and deterministic screenshot gate workflow.
2. Update any additional docs that diverge from implemented behavior.
3. Run required quality gates: unit tests, Playwright e2e, and coverage policy checks.
4. Confirm non-rendering coverage remains at or above 90% and no regressions remain.

## Dependencies
- .agents/scratchpad/implementation/fireworks-starburst/tasks/task-07-tune-default-values-to-match-chrysanthemum-reference-style.code-task.md

## Implementation Approach
1. TDD/verification-first: identify doc expectations from implementation and add/update any assertions/scripts that encode workflow contracts.
2. Implement documentation updates in README/docs.
3. Execute full regression gates and fix issues until all required checks pass.

## Acceptance Criteria

1. **Documentation and verification are complete**
   - Given the fireworks-starburst implementation is feature-complete
   - When docs and quality gates are executed
   - Then README/docs reflect shipped behavior and all required tests/coverage checks pass.

2. **Unit Tests Pass**
   - Given the implementation is complete
   - When running the relevant unit/e2e suites for this task
   - Then all tests for this task pass.

## Metadata
- **Complexity**: Low
- **Labels**: fireworks,documentation,regression,quality-gates
- **Required Skills**: Technical writing, TypeScript testing workflow, Playwright

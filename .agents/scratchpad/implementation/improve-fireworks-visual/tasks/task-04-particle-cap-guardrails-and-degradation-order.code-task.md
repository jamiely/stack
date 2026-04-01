---
status: completed
created: 2026-04-01
started: 2026-04-01
completed: 2026-04-01
---
# Task: Particle Cap Guardrails and Degradation Order

## Description
Add hard particle-cap enforcement and deterministic degradation ordering that prioritizes secondary reduction before primary reduction under stress.

## Background
The overhaul requires stress resilience: active particles must remain bounded and degradation telemetry must prove policy order for regression safety.

## Reference Documentation
**Required:**
- Design: .agents/scratchpad/implementation/improve-fireworks-visual/design.md

**Additional References:**
- .agents/scratchpad/implementation/improve-fireworks-visual/context.md (codebase patterns)
- .agents/scratchpad/implementation/improve-fireworks-visual/plan.md (overall strategy)

**Note:** You MUST read the design document before beginning implementation.

## Technical Requirements
1. Enforce `maxActiveParticles` as a hard cap in fireworks stepping.
2. Implement staged degradation policy: skip/reduce secondary emissions before reducing primary density.
3. Track deterministic drop counters (for example `droppedSecondary`, `droppedPrimary`) for assertions.
4. Add stress unit tests over long deterministic runs validating cap non-regression and degradation order.

## Dependencies
- task-03-secondary-emissions-fade-and-cleanup.code-task.md

## Implementation Approach
1. Write failing stress tests that exceed configured particle budgets and assert ordering of drops.
2. Implement cap checks and staged drop logic with telemetry counters.
3. Refactor cap/degradation helpers to keep behavior explicit and testable.

## Acceptance Criteria

1. **Hard Cap Enforcement**
   - Given adversarial burst settings with low particle cap
   - When stepping deterministic simulation under stress
   - Then active particle count never exceeds `maxActiveParticles`.

2. **Secondary-First Degradation Policy**
   - Given cap pressure events during new emissions
   - When reduction decisions are applied
   - Then secondary drops occur before any primary reductions and telemetry reflects this ordering.

3. **Unit Tests Pass**
   - Given the implementation is complete
   - When running the test suite
   - Then all tests for this task pass.

## Metadata
- **Complexity**: Medium
- **Labels**: fireworks,performance,guardrails,testing
- **Required Skills**: TypeScript, Vitest, deterministic simulation

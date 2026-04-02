---
status: completed
created: 2026-04-02
started: 2026-04-02
completed: 2026-04-02
---
# Task: Preserve cap guardrails under new morphology/count envelope

## Description
Harden cap-pressure behavior so increased configured particle counts and morphology changes still respect `maxActiveParticles` and retain secondary-first degradation ordering.

## Background
The new burst controls increase pressure on active particle limits. Existing contracts require strict cap enforcement and deterministic degradation priority.

## Reference Documentation
**Required:**
- Design: .agents/scratchpad/implementation/fireworks-starburst/design.md

**Additional References:**
- .agents/scratchpad/implementation/fireworks-starburst/context.md (codebase patterns)
- .agents/scratchpad/implementation/fireworks-starburst/plan.md (overall strategy)

**Note:** You MUST read the design document before beginning implementation.

## Technical Requirements
1. Add/extend stress-path logic to keep active particles <= `maxActiveParticles` at all times.
2. Preserve secondary-first degradation when cap pressure forces emission drops.
3. Keep deterministic behavior under coarse and fine simulation step sizes.
4. Avoid regressions in lifecycle cleanup and telemetry counters.

## Dependencies
- .agents/scratchpad/implementation/fireworks-starburst/tasks/task-03-add-morphology-shaping-controls-and-configurable-particle-counts.code-task.md

## Implementation Approach
1. TDD: add failing stress tests in `tests/unit/fireworks.test.ts` with elevated configured counts and constrained caps.
2. Implement/refine degradation scheduling in `src/game/logic/fireworks.ts` to satisfy invariants.
3. Refactor guardrail helpers for readability while keeping tests deterministic and green.

## Acceptance Criteria

1. **Cap safety and degradation ordering hold under stress**
   - Given high particle-count configs and low cap headroom
   - When stepping deterministic simulations to completion
   - Then active particle count never exceeds `maxActiveParticles` and first degradation drops secondary emissions before primary reductions.

2. **Unit Tests Pass**
   - Given the implementation is complete
   - When running the relevant unit suite
   - Then all tests for this task pass.

## Metadata
- **Complexity**: Medium
- **Labels**: fireworks,guardrails,determinism,unit-tests
- **Required Skills**: TypeScript, Vitest, deterministic stress testing

---
status: completed
created: 2026-04-01
started: 2026-04-01
completed: 2026-04-01
---
# Task: Launch Scheduler, Shell Arc, and Primary Burst

## Description
Extend fireworks logic with launch cadence scheduling, shell arc simulation, and single apex-aligned primary burst semantics.

## Background
After establishing deterministic skeleton behavior, lifecycle progression must support measurable cadence windows, shell travel timing, and exactly one primary burst per shell.

## Reference Documentation
**Required:**
- Design: .agents/scratchpad/implementation/improve-fireworks-visual/design.md

**Additional References:**
- .agents/scratchpad/implementation/improve-fireworks-visual/context.md (codebase patterns)
- .agents/scratchpad/implementation/improve-fireworks-visual/plan.md (overall strategy)

**Note:** You MUST read the design document before beginning implementation.

## Technical Requirements
1. Implement launch cooldown sampling within configured bounds (0.8s–2.4s) with gating based on enabled/start-level eligibility.
2. Add shell motion integration with deterministic apex detection and at least six pre-burst ticks.
3. Emit exactly one primary burst per shell at apex (±1 tick) and retire shell.
4. Add unit tests for cadence windows, no-starvation, gating-zero launches, arc timing, and single-burst semantics.

## Dependencies
- task-01-fireworks-logic-skeleton-and-config-sanitization.code-task.md

## Implementation Approach
1. Write failing unit tests for scheduler timing, gating behavior, arc duration, and primary burst count semantics.
2. Implement scheduler and shell/apex logic with deterministic RNG usage.
3. Refactor event bookkeeping while preserving deterministic test outputs.

## Acceptance Criteria

1. **Launch Cadence and Gating**
   - Given fireworks are enabled and level-eligible
   - When stepping 20 seconds in deterministic mode
   - Then launch intervals stay in the configured range and no starvation gap exceeds 3.0 seconds.

2. **Disabled/Below-Level Blocks Launches**
   - Given fireworks are disabled or below start level
   - When stepping simulation forward
   - Then zero launches are produced.

3. **Single Apex-Aligned Primary Burst**
   - Given launched shells in deterministic stepping
   - When shells reach apex
   - Then each shell emits exactly one primary burst within ±1 tick of apex after at least six shell ticks.

4. **Unit Tests Pass**
   - Given the implementation is complete
   - When running the test suite
   - Then all tests for this task pass.

## Metadata
- **Complexity**: Medium
- **Labels**: fireworks,lifecycle,scheduler,testing
- **Required Skills**: TypeScript, Vitest, deterministic simulation

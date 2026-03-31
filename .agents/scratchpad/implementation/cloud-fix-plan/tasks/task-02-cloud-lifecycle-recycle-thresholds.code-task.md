---
status: completed
created: 2026-03-31
started: 2026-03-31
completed: 2026-03-31
---
# Task: Cloud lifecycle recycle thresholds

## Description
Implement camera-relative despawn and recycle semantics in pure cloud logic so clouds recycle only after threshold crossing and respawn into a valid spawn-above band.

## Background
The design requires predictable lifecycle behavior that is threshold-driven and deterministic, replacing legacy interval-driven respawn behavior.

## Reference Documentation
**Required:**
- Design: .agents/scratchpad/implementation/cloud-fix-plan/design.md

**Additional References:**
- .agents/scratchpad/implementation/cloud-fix-plan/context.md (codebase patterns)
- .agents/scratchpad/implementation/cloud-fix-plan/plan.md (overall strategy)

**Note:** You MUST read the design document before beginning implementation.

## Technical Requirements
1. Add despawn threshold checks relative to camera frame.
2. Recycle entities into configured spawn-above-camera band when threshold crossing occurs.
3. Increment and persist per-cloud recycle metadata deterministically.
4. Cover lifecycle semantics in `tests/unit/clouds.test.ts` including replay across fixed steps.

## Dependencies
- task-01-cloud-simulation-skeleton.code-task.md

## Implementation Approach
1. TDD: write failing unit tests for pre-threshold no-recycle and post-threshold recycle behavior.
2. Implement lifecycle threshold evaluation and deterministic recycle updates.
3. Refactor helper functions for clarity while keeping deterministic tests green.

## Acceptance Criteria

1. **Threshold-Gated Recycle**
   - Given a cloud above despawn threshold
   - When a simulation step runs
   - Then the cloud does not recycle before crossing the effective threshold

2. **Recycle Spawn Band Correctness**
   - Given a cloud that crosses despawn threshold
   - When the next simulation step runs
   - Then it recycles into the spawn-above band and increments `recycleCount`

3. **Unit Tests Pass**
   - Given the implementation is complete
   - When running the test suite
   - Then all tests for this task pass

## Metadata
- **Complexity**: Medium
- **Labels**: cloud,lifecycle,recycle,determinism,tdd
- **Required Skills**: TypeScript, Vitest, deterministic simulation

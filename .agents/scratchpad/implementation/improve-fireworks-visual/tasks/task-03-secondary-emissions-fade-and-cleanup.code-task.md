---
status: completed
created: 2026-04-01
started: 2026-04-01
completed: 2026-04-01
---
# Task: Secondary Emissions, Fade, and Cleanup

## Description
Implement delayed secondary emissions, particle lifetime/fade behavior, and strict cleanup windows to complete the core fireworks lifecycle.

## Background
Design requirements mandate a staged lifecycle beyond primary burst, including delayed secondary sparks with downward trend and deterministic cleanup deadlines.

## Reference Documentation
**Required:**
- Design: .agents/scratchpad/implementation/improve-fireworks-visual/design.md

**Additional References:**
- .agents/scratchpad/implementation/improve-fireworks-visual/context.md (codebase patterns)
- .agents/scratchpad/implementation/improve-fireworks-visual/plan.md (overall strategy)

**Note:** You MUST read the design document before beginning implementation.

## Technical Requirements
1. Add delayed secondary emission scheduling per firework with delay in 0.05s–0.35s.
2. Implement secondary particle behavior with downward velocity trend by mid-life.
3. Implement particle age/alpha/lifetime updates and full cleanup by <=3.2s from launch.
4. Remove expired entities from active arrays and expose cleanup telemetry for deterministic assertions.

## Dependencies
- task-02-launch-scheduler-shell-arc-and-primary-burst.code-task.md

## Implementation Approach
1. Write failing tests for secondary delay window, downward trend, completion windows, and no-ghost cleanup.
2. Implement secondary scheduling, particle fade/lifetime updates, and deterministic cleanup bookkeeping.
3. Refactor lifecycle helpers while preserving deterministic replay.

## Acceptance Criteria

1. **Secondary Delay and Motion Trend**
   - Given a shell has produced a primary burst
   - When stepping simulation forward
   - Then secondary emissions begin in 0.05s–0.35s and show downward velocity trend by mid-life.

2. **Lifecycle Cleanup Deadlines**
   - Given launch through burst progression in deterministic mode
   - When stepping until lifecycle completion
   - Then primary/secondary completion windows hold and full cleanup occurs within 3.2 seconds of launch.

3. **Expired Entities Removed**
   - Given particles exceed their configured lifetimes
   - When cleanup runs during stepping
   - Then expired shells/particles are absent from active state arrays.

4. **Unit Tests Pass**
   - Given the implementation is complete
   - When running the test suite
   - Then all tests for this task pass.

## Metadata
- **Complexity**: Medium
- **Labels**: fireworks,lifecycle,cleanup,testing
- **Required Skills**: TypeScript, Vitest, deterministic simulation

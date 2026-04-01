---
status: completed
created: 2026-04-01
started: 2026-04-01
completed: 2026-04-01
---
# Task: Game Loop Integration and Public Fireworks Snapshot

## Description
Integrate deterministic fireworks simulation into the Game loop and expose minimal lifecycle telemetry in public test state.

## Background
After logic and config plumbing are complete, Game integration must preserve paused deterministic stepping semantics and provide scoped diagnostics for Playwright assertions.

## Reference Documentation
**Required:**
- Design: .agents/scratchpad/implementation/improve-fireworks-visual/design.md

**Additional References:**
- .agents/scratchpad/implementation/improve-fireworks-visual/context.md (codebase patterns)
- .agents/scratchpad/implementation/improve-fireworks-visual/plan.md (overall strategy)

**Note:** You MUST read the design document before beginning implementation.

## Technical Requirements
1. Initialize and update fireworks simulation in `Game.runSimulationStep` with deterministic fixed-step behavior.
2. Ensure paused mode does not mutate fireworks lifecycle until explicit `stepSimulation` calls.
3. Add minimal `getState().distractions.fireworks` lifecycle telemetry fields needed by tests.
4. Add `tests/e2e/fireworks.spec.ts` coverage for paused apply/step semantics and telemetry progression.

## Dependencies
- task-05-debug-controls-and-global-config-clamping.code-task.md

## Implementation Approach
1. Write failing Playwright assertions for paused semantics and lifecycle telemetry visibility.
2. Implement Game-loop hookup and public snapshot mapping.
3. Refactor snapshot field scope to stay minimal and deterministic while tests remain green.

## Acceptance Criteria

1. **Paused-Step Semantics**
   - Given test mode is paused and debug config is changed
   - When state is read before stepping
   - Then fireworks lifecycle telemetry remains unchanged until `stepSimulation` is invoked.

2. **Public Lifecycle Telemetry**
   - Given fireworks are enabled in deterministic test mode
   - When stepping through launch/apex/burst progression
   - Then `getState().distractions.fireworks` exposes the scoped counters needed for assertions.

3. **E2E Tests Pass**
   - Given the implementation is complete
   - When running the test suite
   - Then all tests for this task pass.

## Metadata
- **Complexity**: High
- **Labels**: fireworks,game-loop,e2e,telemetry
- **Required Skills**: TypeScript, Playwright, game-loop integration

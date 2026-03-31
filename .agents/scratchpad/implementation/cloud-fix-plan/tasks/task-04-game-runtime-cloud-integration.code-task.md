---
status: completed
created: 2026-03-31
started: 2026-03-31
completed: 2026-03-31
---
# Task: Game runtime cloud integration

## Description
Integrate the new cloud simulation into `Game.ts`, replacing legacy cloud update/respawn paths while preserving deterministic update cadence and cloud-toggle behavior.

## Background
Cloud logic currently mixes simulation and rendering in `Game.ts`. This step wires the new pure simulation state into runtime and retires obsolete legacy cloud lifecycle code.

## Reference Documentation
**Required:**
- Design: .agents/scratchpad/implementation/cloud-fix-plan/design.md

**Additional References:**
- .agents/scratchpad/implementation/cloud-fix-plan/context.md (codebase patterns)
- .agents/scratchpad/implementation/cloud-fix-plan/plan.md (overall strategy)

**Note:** You MUST read the design document before beginning implementation.

## Technical Requirements
1. Replace legacy cloud update path with simulation-driven state consumption.
2. Keep cloud updates aligned with existing deterministic performance/distraction cadence.
3. Remove obsolete interval-based respawn constants/logic.
4. Add integration-focused tests covering cloud toggle regression and baseline runtime mapping.

## Dependencies
- task-03-lane-drift-and-sanitization.code-task.md

## Implementation Approach
1. TDD: add failing integration/unit tests for simulation-to-runtime mapping and cloud toggle behavior.
2. Wire simulation lifecycle into game loop and retire legacy respawn logic.
3. Refactor runtime code paths for clarity while keeping tests green.

## Acceptance Criteria

1. **Simulation-Driven Runtime**
   - Given the game loop advances in deterministic mode
   - When cloud updates run
   - Then cloud transforms derive from simulation state instead of legacy interval respawn logic

2. **Cloud Toggle Regression Safety**
   - Given cloud channel is disabled and re-enabled via debug controls
   - When simulation steps
   - Then cloud rendering path gates correctly without stale updates

3. **Unit/Integration Tests Pass**
   - Given the implementation is complete
   - When running the relevant test suites
   - Then all tests for this task pass

## Metadata
- **Complexity**: High
- **Labels**: cloud,integration,game-loop,determinism,tdd
- **Required Skills**: TypeScript, integration testing, runtime wiring

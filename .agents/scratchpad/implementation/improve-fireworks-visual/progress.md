# Progress — improve-fireworks-visual

## Current Step
- Step 02: Implement launch scheduler + shell arc/apex + single primary burst
- Status: implemented, pending critic review

## Active Wave (Runtime Tasks)
1. `task-1775051127-7de2`
   - Key: `pdd:improve-fireworks-visual:step-02:launch-scheduler-shell-arc-and-primary-burst`
   - Code Task: `.agents/scratchpad/implementation/improve-fireworks-visual/tasks/task-02-launch-scheduler-shell-arc-and-primary-burst.code-task.md`
   - Status: in_progress

## TDD Evidence
- RED: Added a coarse-step adversarial unit case in `tests/unit/fireworks.test.ts` (`deltaSeconds: 0.2`, `shellGravity: 200`, `shellSpeedMin/Max: 1`, `shellTrailTicksMin/Max: 1`) that failed with `shellTicks` dropping below 6.
- GREEN: Updated `src/game/logic/fireworks.ts` to enforce `MIN_PRE_BURST_TICKS = 6` at shell creation (`trailTicksRequired = max(6, sampledTrailTicks)`), making burst timing independent from low debug trail settings.
- REFACTOR: Kept changes localized to shell construction and test coverage; existing scheduler/apex telemetry structure remained unchanged.

## Verification
- `npm run test:unit -- tests/unit/fireworks.test.ts`
- `npm run test:unit`
- `npm run test:e2e`
- `npm run build`
- Logs captured in `.agents/scratchpad/implementation/improve-fireworks-visual/logs/test.log` and `.agents/scratchpad/implementation/improve-fireworks-visual/logs/build.log`.

## Completed Steps
- Step 01: deterministic fireworks logic skeleton + config sanitization
- Step 02: launch scheduler + shell arc/apex + single primary burst semantics

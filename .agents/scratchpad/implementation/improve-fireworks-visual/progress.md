# Progress — improve-fireworks-visual

## Current Step
- Step 03: Implement delayed secondary emissions + fade/expiry + cleanup
- Status: completed (repaired after critic rejection; awaiting re-review)

## Active Wave (Runtime Tasks)
1. `task-1775052028-a887`
   - Key: `pdd:improve-fireworks-visual:step-03:secondary-emissions-fade-and-cleanup`
   - Code Task: `.agents/scratchpad/implementation/improve-fireworks-visual/tasks/task-03-secondary-emissions-fade-and-cleanup.code-task.md`
   - Status: completed (pending critic)

## TDD Evidence
- RED: Added permanent coarse-step adversarial assertion in `tests/unit/fireworks.test.ts` (`deltaSeconds=0.4`) requiring first secondary burst telemetry delay to stay inside 0.05s–0.35s; failing run reproduced the critic finding (`0.4s` delay).
- GREEN: Updated `src/game/logic/fireworks.ts` secondary queue state to persist `primaryElapsedSeconds` and report secondary burst telemetry at scheduled time (`primaryElapsedSeconds + delaySeconds`) instead of coarse step boundary, removing step-size drift from delay observability.
- REFACTOR: Kept deterministic queue lifecycle unchanged while extending `FireworkSecondaryEmissionState` with scheduled-time metadata so existing completion/cleanup flow remains stable and seeded-RNG ordering is untouched.

## Verification
- `npm run test:unit -- tests/unit/fireworks.test.ts` (RED fail reproduced, then GREEN pass)
- `npm run test:unit`
- `npm run test:e2e`
- `npm run build`
- Logs captured in `.agents/scratchpad/implementation/improve-fireworks-visual/logs/test.log` and `.agents/scratchpad/implementation/improve-fireworks-visual/logs/build.log` (updated for Step 03 repair run).

## Completed Steps
- Step 01: deterministic fireworks logic skeleton + config sanitization
- Step 02: launch scheduler + shell arc/apex + single primary burst semantics

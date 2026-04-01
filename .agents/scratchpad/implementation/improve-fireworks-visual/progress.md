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
- RED: Added `tests/unit/fireworks.step03.coarse-actual-delay.adversarial.test.ts` to assert coarse-step wall-clock behavior (`deltaSeconds=0.4`) keeps observed secondary emission within 0.05s–0.35s of primary; failing run reproduced the critic evidence (`0.3999999999999986 > 0.35`).
- GREEN: Updated `src/game/logic/fireworks.ts` burst scheduling to compute per-step burst offsets, carry the remaining in-step time into newly queued secondary events, and quantize coarse-step burst offsets so secondary queue consumption can occur in-window during the same deterministic step when required.
- REFACTOR: Added `computeShellBurstOffsetSeconds` helper + small timing epsilon constant to keep coarse-step boundary behavior deterministic and avoid floating-point edge failures at the 0.35s requirement ceiling.

## Verification
- `npm run test:unit -- tests/unit/fireworks.step03.coarse-actual-delay.adversarial.test.ts` (RED fail, then GREEN pass)
- `npm run test:unit -- tests/unit/fireworks.test.ts`
- `npm run test:unit`
- `npm run test:e2e`
- `npm run build`
- Logs captured in `.agents/scratchpad/implementation/improve-fireworks-visual/logs/test.log` and `.agents/scratchpad/implementation/improve-fireworks-visual/logs/build.log` (updated for Step 03 coarse-step scheduling repair).

## Completed Steps
- Step 01: deterministic fireworks logic skeleton + config sanitization
- Step 02: launch scheduler + shell arc/apex + single primary burst semantics

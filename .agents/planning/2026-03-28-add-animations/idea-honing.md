# Idea Honing

## Q1
Which specific animations from `docs/design.md` should be included in the first implementation slice?

### A1
Final answer: Distraction animations, specifically including the UFO.

## Q2
How should UFO distraction animations affect gameplay in this first slice: purely visual only, or do they also influence timing/difficulty/scoring?

### A2
Final answer: Visual only.

## Q3
When should the UFO appear during a run (e.g., random intervals, fixed cadence, tied to score thresholds, or manual/debug-trigger only)?

### A3
Final answer: Random intervals.

## Q4
For deterministic test mode, should UFO spawns be seed-driven (reproducible randomness), and do you want a debug control to force-spawn a UFO on demand?

### A4
Final answer: Use a debug button to force-spawn UFOs on demand for deterministic/test workflows; no automatic random UFO spawns in tests.

## Q5
What visual behavior should the UFO animation have in this first slice (entry side, movement path, speed feel, and exit behavior)?

### A5
Final answer: "Surprise me."
Assumed implementation defaults: UFO enters from a random side near the top third of the screen, follows a smooth slightly arced horizontal path with subtle bobbing, moves quickly enough to be noticeable but non-intrusive, and exits off-screen on the opposite side.

## Q6
Do you want a runtime debug control to tune UFO behavior (e.g., min/max spawn interval, speed multiplier, path arc amount), or only a single spawn button for now?

### A6
Final answer: Include runtime debug tuning controls (not just a single spawn button).

## Q7
Should UFO animations run in all game states, or only during active gameplay (e.g., pause menu, game-over screen, and attract/start screen behavior)?

### A7
Final answer: Run in all game states.

## Q8
Should players be able to disable distraction animations in settings (accessibility/performance toggle), and should tests verify both enabled and disabled modes?

### A8
Final answer: No toggle for now.

## Q9
What should be the acceptance criteria for this first slice (e.g., UFO visibly appears at random during normal play, debug panel can force-spawn + tune parameters, deterministic tests use manual spawn only, no gameplay impact)?

### A9
Final answer: Yes to all listed criteria.

Consolidated acceptance criteria for first slice:
- UFO distraction animation appears randomly during normal gameplay as a visual-only effect.
- Debug panel includes a force-spawn control for UFO.
- Debug panel includes runtime tuning controls for UFO behavior.
- Deterministic/test mode uses manual spawn only (no automatic random UFO spawns).
- UFO has no gameplay effect on timing, difficulty, scoring, or outcomes.

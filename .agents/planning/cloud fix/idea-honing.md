# Idea Honing

## Question 1
What specific cloud behavior is currently broken or undesirable (e.g., movement, spawning, layering/depth, visual style, performance, collisions), and what should it do instead?

### Answer 1
Current issues reported:
- Clouds do not consistently move downward on screen as stack height increases (they sometimes appear stuck at a fixed Y position).
- Clouds sometimes disappear abruptly/randomly instead of continuing downward and exiting past the bottom of the screen.

Desired behavior:
- As the player builds upward, clouds should visually drift downward relative to the camera/world.
- Clouds should leave the play area naturally (e.g., pass below the bottom boundary) rather than vanishing unexpectedly.

## Question 2
How should cloud vertical movement be driven—should it be tied strictly to camera/stack ascent (only moves when height increases), or should clouds also have a continuous ambient drift downward even when the player isn’t climbing?

### Answer 2
Final decision:
- Cloud vertical movement should be tied strictly to camera/stack ascent (no continuous ambient downward drift when not climbing).

Additional requirement noted:
- Clouds should be placed and tracked in world coordinates (not screen-anchored coordinates), so their on-screen motion naturally follows world/camera updates as stack height changes.

## Question 3
What should happen to clouds when they leave the visible area—do you want them to be recycled (repositioned above the view in world space) to maintain a steady cloud density, or removed and respawned as new clouds?

### Answer 3
Final decision:
- Either recycle or remove+respawn is acceptable, as long as the scene behavior remains visually consistent (stable cloud presence without random-looking pops/disappearances).

## Question 4
How should cloud horizontal behavior work going forward?

### Answer 4
Final decision:
- Clouds should have slow continuous horizontal drift (independent of stack ascent).
- Cloud spawning should cover the full current screen width mapped into world coordinates (spawn X distributed across the entire visible horizontal span in world space).

## Question 5
What does “scene consistency” mean in concrete terms for you—should we target a roughly constant visible cloud count/range (e.g., min/max clouds on screen), or just “no obvious popping/disappearing” without strict count targets?

### Answer 5
Final decision:
- No strict visible cloud count target is required.
- Priority is no obvious random popping/disappearing behavior.

## Question 6
Do you want any runtime debug controls for clouds (recommended), such as horizontal drift speed, spawn band height above camera, despawn threshold below camera, and cloud count/density, so behavior can be tuned live and used in deterministic tests?

### Answer 6
Final decision:
- Yes: add all suggested cloud debug controls:
  - horizontal drift speed
  - spawn band height above camera
  - despawn threshold below camera
  - cloud count/density

Additional issue reported:
- Clouds sometimes move vertically too quickly.
- Expected behavior is that noticeable vertical movement should mainly correspond to block placement / upward stack progress (not sudden fast motion unless the player is stacking very quickly).

## Question 7
To prevent sudden fast vertical jumps, should we enforce a per-update vertical movement cap for clouds (debug-tunable), so cloud Y can only change by up to a max amount each frame/tick even if camera/stack delta spikes?

### Answer 7
Final decision:
- Do not add an artificial per-update vertical movement cap.
- Keep cloud world coordinates consistent and camera-relative rendering behavior correct.
- As the stack rises and camera moves upward, clouds should naturally move out of view based on world/camera transforms.

Additional requirement noted:
- Cloud behavior logic should be structured for strong unit testability to prevent regressions.

## Question 8
What are your must-have acceptance checks for this fix?

### Answer 8
Must-have automated checks:
1. Verify cloud screen Y changes correctly when camera ascends.
2. Verify clouds despawn/recycle only when crossing the configured bottom threshold.
3. Verify spawn X is sampled from the visible world-width region with allowance for partial clipping at the edges (clouds do not need to be fully within screen boundaries).
4. Verify deterministic mode yields repeatable cloud positions/motion for the same seed and simulation steps.

## Question 9
Should this change keep current cloud art/layering style exactly as-is (only behavior/system fixes), or do you also want visual/layer tuning included in scope?

### Answer 9
Final decision:
- Include visual style updates in scope.
- Clouds should look more chunky/blocky in a Mario-style aesthetic.

## Question 10
For the Mario-style chunky clouds, should we procedurally render simple chunk-like shapes in code, or switch to sprite assets?

### Answer 10
Final decision:
- Use procedurally rendered simple shapes in code.
- Clouds should not be pixelized; they should feel chunky but still smooth/clean in rendering.

## Question 11
Any explicit performance or platform constraints for cloud rendering/updates, or should we proceed with a standard no-noticeable-regression target?

### Answer 11
Final decision:
- Use standard “no noticeable performance regression” as current target.
- Keep future mobile support in mind.
- Leave room for a future low-performance mode.

## Question 12
Choose the default cloud lifecycle policy: should clouds be recycled (repositioned above view when they exit below) or removed and respawned as new cloud entities?

### Answer 12
Final decision:
- Use recycling as the default lifecycle policy.
- When a cloud exits below the despawn threshold, reposition and reinitialize it above the view rather than destroying/recreating entities.

## Question 13
For chunky Mario-style clouds, should we use rounded-lobe composite shapes (smooth non-pixelized) or chunky capsule/rounded-rect composites?

### Answer 13
Final decision:
- Use rounded-lobe composite cloud shapes.
- Keep rendering smooth/clean (non-pixelized).

## Question 14
Should cloud Y lifecycle thresholds be defined relative to the camera view, or as absolute world Y values?

### Answer 14
Final decision:
- Define cloud lifecycle thresholds relative to the camera view (spawn above camera top, despawn below camera bottom using configurable offsets).

## Question 15
Should cloud depth layering be controlled so some clouds appear in front of the stack and some behind it?

### Answer 15
Final decision:
- Yes. Cloud Z/depth placement is important.
- The cloud system should intentionally maintain a mix of clouds in front of and behind the stack.

## Question 16
Should we preserve the current cloud implementation and patch it, or is a full replacement acceptable if that is simpler and more reliable?

### Answer 16
Final decision:
- A full replacement of the current cloud implementation is acceptable if it leads to a simpler, more reliable solution.


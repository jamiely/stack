# Broken Windows

### [src/game/Game.ts:1503] Per-frame DOM query in hot path
**Type**: complexity
**Risk**: Low
**Fix**: Cache the fireworks burst element once during overlay construction instead of calling `querySelector` every update tick.
**Code**:
```ts
if (snapshot.active.fireworks) {
  const burst = this.fireworksActor.querySelector<HTMLElement>(".distraction-fireworks__burst");
  // ...
}
```

### [src/game/Game.ts:1504] Fireworks behavior tuned by embedded magic numbers
**Type**: magic-values
**Risk**: Low
**Fix**: Extract launch-position and opacity/scale constants to named fireworks tuning constants (or future debug config defaults) to make behavior intent explicit.
**Code**:
```ts
const burstScale = 0.7 + snapshot.signals.fireworks * 0.9;
const burstOpacity = 0.16 + snapshot.signals.fireworks * 0.72;
const xPercent = 18 + ((this.distractionState.elapsedSeconds * 23.5) % 64);
const yPercent = 22 + ((this.distractionState.elapsedSeconds * 17.25) % 48);
```

### [src/styles.css:203] Legacy fireworks CSS transition can obscure deterministic stepping intent
**Type**: docs
**Risk**: Low
**Fix**: Remove or annotate `.distraction-fireworks` transition semantics when migrating to staged simulation rendering so test expectations are not confused by residual CSS fade behavior.
**Code**:
```css
.distraction-fireworks {
  position: absolute;
  left: 0;
  top: 0;
  opacity: 0;
  transition: opacity 100ms linear;
}
```

/**
 * Cabinet adapters, copied from Glowfall's src/rules/arcade.ts (InitialsEntry, highScores, qualifies,
 * AttractCycle, ButtonLatch) and retimed for Tower Stacker. Time is supplied in seconds; no browser
 * or storage dependencies.
 */
export class ButtonLatch {
  held = false;
  down(repeat = false) {
    if (repeat || this.held) return false;
    this.held = true;
    return true;
  }
  up() { this.held = false; }
}

/** Hold this long to lock a letter: short, so locking feels instant but a tap never locks by accident. */
export const LOCK_SECONDS = 0.35;
/** With no input for this long, the remaining letters lock as shown. */
export const INITIALS_IDLE_SECONDS = 10;

export class InitialsEntry {
  letters = [0, 0, 0];
  index = 0;
  private button = new ButtonLatch();
  private started = 0;
  private locked = false;
  private idle: number;
  constructor(now: number) { this.idle = now; }
  get text() { return this.letters.map(n => String.fromCharCode(65 + n)).join(''); }
  get done() { return this.index === 3; }
  down(now: number, repeat = false) {
    if (this.done || !this.button.down(repeat)) return;
    this.started = now; this.idle = now; this.locked = false;
  }
  up(now: number) {
    if (!this.button.held) return;
    this.tick(now);
    if (!this.done && !this.locked) this.step(1, now);
    this.button.up(); this.idle = now;
  }
  step(direction: number, now: number) {
    if (this.done) return;
    this.letters[this.index] = (this.letters[this.index]! + direction + 26) % 26;
    this.idle = now;
  }
  progress(now: number) { return this.button.held && !this.locked ? Math.min(1, (now - this.started) / LOCK_SECONDS) : 0; }
  tick(now: number) {
    if (this.done) return;
    if (this.button.held && !this.locked && now - this.started >= LOCK_SECONDS) {
      this.index++; this.locked = true; this.idle = now;
    }
    if (now - this.idle >= INITIALS_IDLE_SECONDS) this.index = 3;
  }
}

export interface HighScore { initials: string; score: number }
export function highScores(value: unknown): HighScore[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is HighScore => typeof v === 'object' && v !== null &&
    typeof v.initials === 'string' && /^[A-Z]{3}$/.test(v.initials) &&
    Number.isSafeInteger(v.score) && v.score > 0).sort((a, b) => b.score - a.score).slice(0, 10);
}
export function qualifies(table: HighScore[], score: number) {
  return score > 0 && (table.length < 10 || score > table[table.length - 1]!.score);
}
/** HI SCORE during a run: the saved best, or the live score once it beats it (a first run shows its own score). */
export function hiScore(table: HighScore[], current: number) { return Math.max(table[0]?.score ?? 0, current); }
export function addHighScore(table: HighScore[], entry: HighScore) { return highScores([...table, entry]); }

/** Tower Stacker has no demo player: the idle cabinet rotates title, high scores and how to play. */
export type AttractPage = 'title' | 'scores' | 'how';
const ATTRACT_PAGES: AttractPage[] = ['title', 'scores', 'how'];
const ATTRACT_SECONDS: Record<AttractPage, number> = { title: 6, scores: 10, how: 8 };
/** Seconds of no input on the game-over screen before the attract cycle starts. */
export const ATTRACT_IDLE_SECONDS = 20;

export class AttractCycle {
  page: AttractPage | null = null;
  private since: number;
  private changed = 0;
  constructor(now: number) { this.since = now; }
  input(now: number) { this.page = null; this.since = now; }
  tick(now: number, eligible: boolean) {
    if (!eligible) { this.input(now); return; }
    if (this.page === null) {
      if (now - this.since >= ATTRACT_IDLE_SECONDS) { this.page = 'title'; this.changed = now; }
    } else if (now - this.changed >= ATTRACT_SECONDS[this.page]) {
      this.page = ATTRACT_PAGES[(ATTRACT_PAGES.indexOf(this.page) + 1) % ATTRACT_PAGES.length]!;
      this.changed = now;
    }
  }
}

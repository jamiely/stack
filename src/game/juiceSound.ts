/**
 * Layered synthesized sound for the juice pass: drop thunk, perfect chime, overhang crunch, shard
 * shatter, milestone fanfare, tally ticks and an Ode to Joy–style choir finale. Voice helpers, the
 * voice cap and the finale scheduling are adapted from Glowfall's src/audio/sound.ts.
 */

type Timbre = {
  wave: OscillatorType; detune: number[]; filter: BiquadFilterType; bands: number[];
  q: number; vibrato: number; attack: number; volume: number;
};

/** Beethoven's Ode to Joy (public domain) in C major at 120 BPM: two phrases, then a chord. */
const FINALE = {
  tempo: 120, tonic: 261.63, finalBeats: 3, vibratoHz: 5.4,
  melody: [
    [4, 0.5], [4, 0.5], [5, 0.5], [7, 0.5], [7, 0.5], [5, 0.5], [4, 0.5], [2, 0.5],
    [0, 0.5], [0, 0.5], [2, 0.5], [4, 0.5], [4, 0.75], [2, 0.25], [2, 1],
    [4, 0.5], [4, 0.5], [5, 0.5], [7, 0.5], [7, 0.5], [5, 0.5], [4, 0.5], [2, 0.5],
    [0, 0.5], [0, 0.5], [2, 0.5], [4, 0.5], [2, 0.75], [0, 0.25], [0, 1],
  ] as [number, number][],
  chords: [[0, 4, 7], [7, 11, 14], [0, 4, 7], [7, 11, 14], [0, 4, 7], [7, 11, 14], [7, 11, 14], [0, 4, 7]],
  choir: { wave: "sawtooth", detune: [-9, 0, 9], filter: "bandpass", bands: [800, 1150], q: 3, vibrato: 14, attack: 0.045, volume: 0.12 } satisfies Timbre,
  strings: { wave: "sawtooth", detune: [-7, 7], filter: "lowpass", bands: [1800], q: 0.6, vibrato: 5, attack: 0.12, volume: 0.022 } satisfies Timbre,
  brass: { wave: "square", detune: [0], filter: "lowpass", bands: [950], q: 0.7, vibrato: 0, attack: 0.055, volume: 0.018 } satisfies Timbre,
  timpani: { wave: "sine", detune: [0], filter: "lowpass", bands: [], q: 0, vibrato: 0, attack: 0.004, volume: 0.14 } satisfies Timbre,
  drum: { from: 95, to: 42, duration: 0.28 },
};

export const FINALE_SECONDS =
  (FINALE.melody.reduce((beats, note) => beats + note[1], 0) + FINALE.finalBeats) * 60 / FINALE.tempo;

export type JuiceSoundName = "drop" | "perfect" | "crunch" | "shatter" | "nearMiss" | "milestone" | "tally" | "collapse" | "finale";

export class JuiceSound {
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private voiceEnds: number[] = [];
  private finale: { bus: GainNode; sources: Set<AudioScheduledSourceNode>; at: number; next: number; index: number; beat: number; end: number } | null = null;
  private timer: number | null = null;
  readonly played: Partial<Record<JuiceSoundName, number>> = {};

  constructor(private readonly ctx: AudioContext) {}

  private out(): GainNode {
    if (!this.master) {
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -8;
      limiter.ratio.value = 12;
      this.master.connect(limiter).connect(this.ctx.destination);
    }
    return this.master;
  }

  private reserve(end: number): boolean {
    const now = this.ctx.currentTime;
    this.voiceEnds = this.voiceEnds.filter((t) => t > now);
    if (this.voiceEnds.length >= 24) return false;
    this.voiceEnds.push(end);
    return true;
  }

  private bend(from: number, to: number, duration: number, volume: number, options: {
    delay?: number; type?: OscillatorType; formant?: [number, number]; vibrato?: number; attack?: number; fm?: boolean;
  } = {}): void {
    const ctx = this.ctx;
    const at = ctx.currentTime + (options.delay ?? 0);
    const end = at + duration;
    if (!this.reserve(end)) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = options.type ?? "sine";
    osc.frequency.setValueAtTime(from, at);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), end);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + (options.attack ?? 0.006));
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    const nodes: AudioNode[] = [osc, gain];
    if (options.formant) {
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.Q.value = 2;
      filter.frequency.setValueAtTime(options.formant[0], at);
      filter.frequency.exponentialRampToValueAtTime(options.formant[1], end);
      osc.connect(filter).connect(gain);
      nodes.push(filter);
    } else {
      osc.connect(gain);
    }
    if (options.fm) {
      const mod = ctx.createOscillator();
      const depth = ctx.createGain();
      mod.frequency.value = from * 2;
      depth.gain.setValueAtTime(from * 0.7, at);
      depth.gain.exponentialRampToValueAtTime(1, end);
      mod.connect(depth).connect(osc.frequency);
      mod.start(at);
      mod.stop(end);
      nodes.push(mod, depth);
    }
    if (options.vibrato) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = 7;
      depth.gain.value = options.vibrato;
      lfo.connect(depth).connect(osc.detune);
      lfo.start(at);
      lfo.stop(end);
      nodes.push(lfo, depth);
    }
    gain.connect(this.out());
    osc.start(at);
    osc.stop(end);
    osc.onended = () => nodes.forEach((node) => node.disconnect());
  }

  private noiseBurst(duration: number, volume: number, from: number, peak: number, to: number, delay = 0, attack = 0.004): void {
    const ctx = this.ctx;
    const at = ctx.currentTime + delay;
    const end = at + duration;
    if (!this.reserve(end)) return;
    if (!this.noise) {
      this.noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.5), ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = this.noise;
    filter.type = "bandpass";
    filter.Q.value = 0.9;
    filter.frequency.setValueAtTime(from, at);
    filter.frequency.exponentialRampToValueAtTime(peak, at + duration * 0.3);
    filter.frequency.exponentialRampToValueAtTime(to, end);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    source.connect(filter).connect(gain).connect(this.out());
    source.start(at);
    source.stop(end);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  private count(name: JuiceSoundName): void {
    this.played[name] = (this.played[name] ?? 0) + 1;
  }

  /** The core action: a heavy layered thunk — sub drop, body knock, wood click, dust hiss — pitched up the streak. */
  drop(semitones: number): void {
    this.count("drop");
    const up = 2 ** (semitones / 12);
    this.bend(150 * up, 48 * up, 0.28, 0.42, { attack: 0.003 });
    this.bend(300 * up, 120 * up, 0.12, 0.2, { type: "triangle", attack: 0.002 });
    this.noiseBurst(0.05, 0.22, 2600, 4200, 1400);
    this.noiseBurst(0.3, 0.1, 500, 1600, 220, 0.02, 0.03);
  }

  /** Sparkling major arpeggio on top of the thunk, climbing with the streak. */
  perfect(semitones: number): void {
    this.count("perfect");
    [0, 4, 7, 12].forEach((n, i) => this.bend(784 * 2 ** ((n + semitones) / 12), 784 * 2 ** ((n + semitones) / 12) * 1.01, 0.22, 0.09, { delay: 0.03 + i * 0.045, type: "triangle", fm: true }));
  }

  /** The overhang snapping off: a dry crack and a gravelly rumble. */
  crunch(): void {
    this.count("crunch");
    this.noiseBurst(0.08, 0.28, 3200, 5200, 900);
    this.noiseBurst(0.22, 0.16, 300, 900, 120, 0.03, 0.01);
    this.bend(210, 70, 0.16, 0.16, { type: "sawtooth", formant: [700, 200] });
  }

  /** The cut piece shattering where it lands: bright glassy tinkles. */
  shatter(): void {
    this.count("shatter");
    this.noiseBurst(0.14, 0.18, 4200, 7000, 2500);
    [2900, 3700, 4600].forEach((f, i) => this.bend(f, f * 0.9, 0.09, 0.04, { delay: i * 0.03, type: "triangle" }));
  }

  /** A cartoon yelp when the slab only barely made it. */
  nearMiss(): void {
    this.count("nearMiss");
    this.bend(520, 1100, 0.28, 0.08, { type: "sawtooth", formant: [900, 2400], vibrato: 60 });
  }

  /** Milestone fanfare: a rising brass-ish arpeggio over a gong. */
  milestone(): void {
    this.count("milestone");
    [1, 1.47, 2.09].forEach((ratio, i) => this.bend(98 * ratio, 96 * ratio, 1.8 - i * 0.3, 0.12 / (i + 1)));
    [0, 4, 7, 12, 16, 19, 24].forEach((n, i) => this.bend(262 * 2 ** (n / 12), 262 * 2 ** (n / 12), 0.5, 0.11, { delay: i * 0.07, type: "square", formant: [1400, 1800] }));
    for (const detune of [0.97, 1, 1.04]) this.bend(155 * detune, 230 * detune, 0.9, 0.03, { type: "sawtooth", formant: [600, 1700], vibrato: 18 });
  }

  /** Score tally tick, climbing as the number counts up. */
  tally(step: number): void {
    this.count("tally");
    const pitch = 1100 * 2 ** (Math.min(14, step) / 12);
    [1, 1.12, 1.26].forEach((ratio, i) => this.bend(pitch * ratio, pitch * ratio, 0.03, 0.05, { delay: i * 0.012, type: "triangle" }));
  }

  /** The tower coming down: a long low rumble with cracks. */
  collapse(): void {
    this.count("collapse");
    this.bend(90, 32, 1.4, 0.38, { attack: 0.01 });
    this.noiseBurst(1.2, 0.2, 200, 900, 80, 0, 0.05);
    [0, 0.18, 0.33, 0.52].forEach((delay) => this.noiseBurst(0.07, 0.16, 2600, 4000, 900, delay));
  }

  /** Ode to Joy on a synthesized choir with strings, brass and timpani, on its own bus outside the voice cap. */
  playFinale(): void {
    this.count("finale");
    this.stopFinale();
    const bus = this.ctx.createGain();
    bus.gain.value = 0.85;
    bus.connect(this.out());
    const at = this.ctx.currentTime + 0.05;
    this.finale = { bus, sources: new Set(), at, next: at, index: 0, beat: 0, end: at + FINALE_SECONDS };
    this.scheduleFinale();
    this.timer = window.setInterval(() => this.scheduleFinale(), 25);
  }

  stopFinale(): void {
    const finale = this.finale;
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    if (!finale) return;
    this.finale = null;
    const now = this.ctx.currentTime;
    finale.bus.gain.cancelScheduledValues(now);
    finale.bus.gain.setTargetAtTime(0, now, 0.015);
    finale.sources.forEach((source) => source.stop(now + 0.08));
    window.setTimeout(() => finale.bus.disconnect(), 200);
  }

  get finalePlaying(): boolean {
    return this.finale !== null;
  }

  private ensemble(frequency: number, at: number, duration: number, timbre: Timbre, to?: number): void {
    const ctx = this.ctx;
    const finale = this.finale;
    if (!finale) return;
    const end = at + duration;
    for (const cents of timbre.detune) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = timbre.wave;
      osc.detune.value = cents;
      osc.frequency.setValueAtTime(frequency, at);
      if (to) osc.frequency.exponentialRampToValueAtTime(to, end);
      const volume = timbre.volume / timbre.detune.length;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(volume, at + Math.min(duration / 3, timbre.attack));
      if (!to) gain.gain.setValueAtTime(volume, end - Math.min(0.08, duration / 3));
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      const filters = timbre.bands.map((band) => {
        const filter = ctx.createBiquadFilter();
        filter.type = timbre.filter;
        filter.frequency.value = band;
        filter.Q.value = timbre.q;
        osc.connect(filter).connect(gain);
        return filter;
      });
      if (!filters.length) osc.connect(gain);
      gain.connect(finale.bus);
      let lfo: OscillatorNode | undefined;
      let depth: GainNode | undefined;
      if (timbre.vibrato) {
        lfo = ctx.createOscillator();
        depth = ctx.createGain();
        lfo.frequency.value = FINALE.vibratoHz;
        depth.gain.value = timbre.vibrato;
        lfo.connect(depth).connect(osc.detune);
        finale.sources.add(lfo);
        lfo.start(at);
        lfo.stop(end);
      }
      finale.sources.add(osc);
      osc.start(at);
      osc.stop(end);
      osc.onended = () => {
        osc.disconnect(); gain.disconnect(); filters.forEach((f) => f.disconnect()); lfo?.disconnect(); depth?.disconnect();
        finale.sources.delete(osc);
        if (lfo) finale.sources.delete(lfo);
      };
    }
  }

  private scheduleFinale(): void {
    const ctx = this.ctx;
    const finale = this.finale;
    if (!finale || ctx.state !== "running") return;
    if (ctx.currentTime >= finale.end) {
      this.stopFinale();
      return;
    }
    const beatSeconds = 60 / FINALE.tempo;
    while (finale.next < ctx.currentTime + 0.12 && finale.index <= FINALE.melody.length) {
      const at = finale.next;
      const note = FINALE.melody[finale.index];
      const finalChord = !note;
      const duration = (finalChord ? FINALE.finalBeats : note[1]) * beatSeconds;
      if (at >= ctx.currentTime) {
        this.ensemble(FINALE.tonic * 2 ** ((note?.[0] ?? 0) / 12), at, duration, FINALE.choir);
        if (finale.beat % 2 === 0) {
          const chord = finalChord ? [0, 4, 7] : FINALE.chords[(finale.beat / 2) % FINALE.chords.length]!;
          for (const semitone of chord) {
            const f = FINALE.tonic * 2 ** (semitone / 12);
            this.ensemble(f / 2, at, finalChord ? duration : 2 * beatSeconds, FINALE.strings);
            this.ensemble(f / 4, at, finalChord ? duration : 2 * beatSeconds, FINALE.brass);
          }
        }
        if (finale.beat % 4 === 0) this.ensemble(FINALE.drum.from, at, FINALE.drum.duration, FINALE.timpani, FINALE.drum.to);
      }
      finale.beat += finalChord ? FINALE.finalBeats : note[1];
      finale.index += 1;
      finale.next = finale.at + finale.beat * beatSeconds;
    }
  }
}

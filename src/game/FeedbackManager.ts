import { JuiceSound, type JuiceSoundName } from "./juiceSound";
import { clampToneGain, type FeedbackEvent, type FeedbackPlan } from "./logic/feedback";

interface AudioContextConstructor {
  new (): AudioContext;
}

export interface FeedbackConfig {
  audioEnabled: boolean;
  hapticsEnabled: boolean;
}

export interface FeedbackSnapshot {
  audioEnabled: boolean;
  hapticsEnabled: boolean;
  audioSupported: boolean;
  hapticsSupported: boolean;
  audioUnlocked: boolean;
  eventsTriggered: number;
  audioEventsPlayed: number;
  hapticEventsPlayed: number;
  lastEvent: FeedbackEvent | null;
  /** Juice sounds requested (counted even when audio is locked or off, so tests can see the cue fired). */
  juiceCues: Partial<Record<JuiceSoundName, number>>;
}

export class FeedbackManager {
  private readonly audioContextCtor: AudioContextConstructor | null;
  private readonly hapticSupported: boolean;

  private audioContext: AudioContext | null = null;
  private juiceSound: JuiceSound | null = null;
  private audioUnlocked = false;
  private config: FeedbackConfig;
  private snapshot: FeedbackSnapshot;

  public constructor(initialConfig: FeedbackConfig) {
    this.audioContextCtor = this.resolveAudioContextCtor();
    this.hapticSupported = typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
    this.config = { ...initialConfig };
    this.snapshot = {
      audioEnabled: initialConfig.audioEnabled,
      hapticsEnabled: initialConfig.hapticsEnabled,
      audioSupported: this.audioContextCtor !== null,
      hapticsSupported: this.hapticSupported,
      audioUnlocked: false,
      eventsTriggered: 0,
      audioEventsPlayed: 0,
      hapticEventsPlayed: 0,
      lastEvent: null,
      juiceCues: {},
    };
  }

  public updateConfig(nextConfig: FeedbackConfig): void {
    this.config = { ...nextConfig };
    if (!this.config.audioEnabled) {
      this.juiceSound?.stopFinale();
    }
    this.snapshot.audioEnabled = this.config.audioEnabled;
    this.snapshot.hapticsEnabled = this.config.hapticsEnabled;
  }

  public primeFromGesture(): void {
    if (!this.config.audioEnabled) {
      return;
    }

    const context = this.ensureAudioContext();
    if (!context) {
      return;
    }

    void context.resume().then(() => {
      this.audioUnlocked = context.state === "running";
      this.snapshot.audioUnlocked = this.audioUnlocked;
    });
  }

  public play(plan: FeedbackPlan | null): void {
    if (!plan) {
      return;
    }

    this.snapshot.eventsTriggered += 1;
    this.snapshot.lastEvent = plan.event;

    this.playAudio(plan);
    this.playHaptics(plan);
  }

  public getSnapshot(): FeedbackSnapshot {
    return { ...this.snapshot, juiceCues: { ...this.snapshot.juiceCues } };
  }

  /** Run a juice sound when audio is on and unlocked; always record that the cue fired. */
  public juice(name: JuiceSoundName, play: (sound: JuiceSound) => void): void {
    this.snapshot.juiceCues[name] = (this.snapshot.juiceCues[name] ?? 0) + 1;
    if (!this.config.audioEnabled || !this.audioContext || this.audioContext.state !== "running") {
      return;
    }
    this.juiceSound ??= new JuiceSound(this.audioContext);
    play(this.juiceSound);
  }

  public stopFinale(): void {
    this.juiceSound?.stopFinale();
  }

  private playAudio(plan: FeedbackPlan): void {
    if (!this.config.audioEnabled || !this.snapshot.audioSupported || plan.audio.length === 0) {
      return;
    }

    const context = this.ensureAudioContext();
    if (!context) {
      return;
    }

    if (context.state !== "running") {
      return;
    }

    const startTime = context.currentTime;

    plan.audio.forEach((tone) => {
      const durationSeconds = Math.max(0.01, tone.durationMs / 1000);
      const offsetSeconds = Math.max(0, tone.offsetMs / 1000);
      const toneStart = startTime + offsetSeconds;
      const toneEnd = toneStart + durationSeconds;

      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.type = tone.type;
      oscillator.frequency.setValueAtTime(tone.frequency, toneStart);
      gainNode.gain.setValueAtTime(0, toneStart);
      gainNode.gain.linearRampToValueAtTime(clampToneGain(tone.gain), toneStart + 0.01);
      gainNode.gain.linearRampToValueAtTime(0.0001, toneEnd);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start(toneStart);
      oscillator.stop(toneEnd + 0.01);
    });

    this.snapshot.audioEventsPlayed += 1;
  }

  private playHaptics(plan: FeedbackPlan): void {
    if (!this.config.hapticsEnabled || !this.snapshot.hapticsSupported || plan.hapticPattern === null) {
      return;
    }

    const result = navigator.vibrate(plan.hapticPattern);
    if (result !== false) {
      this.snapshot.hapticEventsPlayed += 1;
    }
  }

  private ensureAudioContext(): AudioContext | null {
    if (!this.audioContextCtor) {
      return null;
    }

    if (this.audioContext) {
      return this.audioContext;
    }

    this.audioContext = new this.audioContextCtor();
    this.audioUnlocked = this.audioContext.state === "running";
    this.snapshot.audioUnlocked = this.audioUnlocked;
    return this.audioContext;
  }

  private resolveAudioContextCtor(): AudioContextConstructor | null {
    if (typeof window === "undefined") {
      return null;
    }

    const ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
    return ctor ?? null;
  }
}

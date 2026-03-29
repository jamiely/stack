import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedbackManager } from "../../src/game/FeedbackManager";
import { getPlacementFeedbackPlan } from "../../src/game/logic/feedback";

interface MutableGlobal {
  window?: Window & typeof globalThis;
  navigator?: Navigator;
}

type AudioEventRecord = {
  oscillatorStarts: number[];
  oscillatorStops: number[];
  gainRamps: Array<{ value: number; time: number }>;
};

function assignGlobalValue<Key extends keyof MutableGlobal>(key: Key, value: MutableGlobal[Key]): void {
  Object.defineProperty(globalThis, key, {
    value,
    configurable: true,
    writable: true,
  });
}

function flushPromises(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function createAudioContextStub(initialState: AudioContextState = "suspended"): {
  ctor: new () => AudioContext;
  resumeSpy: ReturnType<typeof vi.fn>;
  records: AudioEventRecord;
} {
  const records: AudioEventRecord = {
    oscillatorStarts: [],
    oscillatorStops: [],
    gainRamps: [],
  };

  const resumeSpy = vi.fn<() => Promise<void>>(async function resume(this: { state: AudioContextState }) {
    this.state = "running";
  });

  class FakeAudioContext {
    public state: AudioContextState = initialState;
    public currentTime = 4;
    public destination = {} as AudioDestinationNode;

    public resume = resumeSpy;

    public createOscillator(): OscillatorNode {
      return {
        type: "sine",
        frequency: {
          setValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        start: vi.fn((time: number) => {
          records.oscillatorStarts.push(time);
        }),
        stop: vi.fn((time: number) => {
          records.oscillatorStops.push(time);
        }),
      } as unknown as OscillatorNode;
    }

    public createGain(): GainNode {
      return {
        gain: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn((value: number, time: number) => {
            records.gainRamps.push({ value, time });
          }),
        },
        connect: vi.fn(),
      } as unknown as GainNode;
    }
  }

  return {
    ctor: FakeAudioContext as unknown as new () => AudioContext,
    resumeSpy,
    records,
  };
}

describe("FeedbackManager", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    assignGlobalValue("window", undefined);
    assignGlobalValue("navigator", undefined);
  });

  it("tracks events when audio/haptics are unsupported", () => {
    const manager = new FeedbackManager({
      audioEnabled: true,
      hapticsEnabled: true,
    });

    const initial = manager.getSnapshot();
    expect(initial.audioSupported).toBe(false);
    expect(initial.hapticsSupported).toBe(false);

    manager.play(getPlacementFeedbackPlan("landed"));

    const snapshot = manager.getSnapshot();
    expect(snapshot.eventsTriggered).toBe(1);
    expect(snapshot.audioEventsPlayed).toBe(0);
    expect(snapshot.hapticEventsPlayed).toBe(0);
    expect(snapshot.lastEvent).toBe("placement_landed");
  });

  it("unlocks audio on gesture and plays both audio + haptics", async () => {
    const { ctor, resumeSpy, records } = createAudioContextStub("suspended");
    const vibrate = vi.fn(() => true);

    assignGlobalValue("window", {
      AudioContext: ctor,
    } as unknown as Window & typeof globalThis);
    assignGlobalValue("navigator", {
      vibrate,
    } as unknown as Navigator);

    const manager = new FeedbackManager({
      audioEnabled: true,
      hapticsEnabled: true,
    });

    manager.primeFromGesture();
    await flushPromises();

    const primed = manager.getSnapshot();
    expect(resumeSpy).toHaveBeenCalledTimes(1);
    expect(primed.audioUnlocked).toBe(true);

    manager.play(getPlacementFeedbackPlan("perfect"));

    const snapshot = manager.getSnapshot();
    expect(snapshot.eventsTriggered).toBe(1);
    expect(snapshot.audioEventsPlayed).toBe(1);
    expect(snapshot.hapticEventsPlayed).toBe(1);
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(records.oscillatorStarts.length).toBeGreaterThan(0);
    expect(records.oscillatorStops.length).toBeGreaterThan(0);
    expect(records.gainRamps.length).toBeGreaterThan(0);
  });

  it("does not prime audio when disabled and respects config updates", async () => {
    const { ctor, resumeSpy } = createAudioContextStub("suspended");
    const vibrate = vi.fn(() => false);

    assignGlobalValue("window", {
      AudioContext: ctor,
    } as unknown as Window & typeof globalThis);
    assignGlobalValue("navigator", {
      vibrate,
    } as unknown as Navigator);

    const manager = new FeedbackManager({
      audioEnabled: false,
      hapticsEnabled: true,
    });

    manager.primeFromGesture();
    await flushPromises();
    expect(resumeSpy).not.toHaveBeenCalled();

    manager.play(getPlacementFeedbackPlan("miss"));
    let snapshot = manager.getSnapshot();
    expect(snapshot.audioEventsPlayed).toBe(0);
    expect(snapshot.hapticEventsPlayed).toBe(0);

    manager.updateConfig({ audioEnabled: true, hapticsEnabled: false });
    manager.primeFromGesture();
    await flushPromises();

    manager.play(getPlacementFeedbackPlan("miss"));
    snapshot = manager.getSnapshot();
    expect(snapshot.audioEnabled).toBe(true);
    expect(snapshot.hapticsEnabled).toBe(false);
    expect(snapshot.audioEventsPlayed).toBe(1);
    expect(snapshot.hapticEventsPlayed).toBe(0);
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  it("uses webkit audio context fallback when AudioContext is unavailable", () => {
    const { ctor } = createAudioContextStub("running");

    assignGlobalValue("window", {
      webkitAudioContext: ctor,
    } as unknown as Window & typeof globalThis);
    assignGlobalValue("navigator", {
      vibrate: vi.fn(() => true),
    } as unknown as Navigator);

    const manager = new FeedbackManager({
      audioEnabled: true,
      hapticsEnabled: false,
    });

    manager.play(getPlacementFeedbackPlan("landed"));
    const snapshot = manager.getSnapshot();
    expect(snapshot.audioSupported).toBe(true);
    expect(snapshot.audioEventsPlayed).toBe(1);
  });
});

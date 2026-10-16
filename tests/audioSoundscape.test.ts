import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MUSIC_PATTERNS,
  ProceduralSoundscape,
  RECORDED_MUSIC_LOOP_DURATIONS,
  RECORDED_MUSIC_LOOP_STARTS,
  SOUND_RECIPES,
} from "../src/audio/ProceduralSoundscape";
import type { MusicScene, SoundKind } from "../src/platform/Host";

class FakeAudioParam {
  value = 0;
  cancelScheduledValues(): void {}
  setValueAtTime(value: number): void { this.value = value; }
  exponentialRampToValueAtTime(value: number): void { this.value = value; }
}

class FakeAudioNode {
  // Mirrors WeChat real-device WebAudio, where connect() may return void.
  connect(_destination: FakeAudioNode): void {}
  disconnect = vi.fn();
}

class FakeGainNode extends FakeAudioNode {
  gain = new FakeAudioParam();
}

class FakeOscillatorNode extends FakeAudioNode {
  type: OscillatorType = "sine";
  frequency = new FakeAudioParam();
  detune = new FakeAudioParam();
  onended: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
}

class FakeBufferSourceNode extends FakeAudioNode {
  buffer: AudioBuffer | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  onended: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
}

class FakeAudioContext {
  currentTime = 2;
  state: AudioContextState = "running";
  destination = new FakeAudioNode();
  oscillators: FakeOscillatorNode[] = [];
  bufferSources: FakeBufferSourceNode[] = [];
  gains: FakeGainNode[] = [];
  createGain(): FakeGainNode {
    const gain = new FakeGainNode();
    this.gains.push(gain);
    return gain;
  }
  createOscillator(): FakeOscillatorNode {
    const oscillator = new FakeOscillatorNode();
    this.oscillators.push(oscillator);
    return oscillator;
  }
  createBufferSource(): FakeBufferSourceNode {
    const source = new FakeBufferSourceNode();
    this.bufferSources.push(source);
    return source;
  }
  suspend = vi.fn(async () => { this.state = "suspended"; });
  resume = vi.fn(async () => { this.state = "running"; });
}

const SOUND_KINDS: Exclude<SoundKind, "timeover">[] = [
  "blocked", "exit", "ice", "thaw", "win", "button", "putdown", "fail",
  "reward", "gold", "itemArrival", "booster", "unlock",
  "time", "rocket", "pulse", "mechanic", "shell", "shutter",
];

const MUSIC_SCENES: Exclude<MusicScene, "silent">[] = ["menu", "gameplay", "danger", "victory", "defeat"];

afterEach(() => vi.useRealTimers());

describe("procedural game audio", () => {
  it("defines a valid layered recipe for every synthesized gameplay sound", () => {
    expect(Object.keys(SOUND_RECIPES).sort()).toEqual([...SOUND_KINDS].sort());
    for (const kind of SOUND_KINDS) {
      expect(SOUND_RECIPES[kind].length).toBeGreaterThan(0);
      for (const layer of SOUND_RECIPES[kind]) {
        expect(layer.frequency).toBeGreaterThan(0);
        expect(layer.duration).toBeGreaterThan(0);
        expect(layer.gain).toBeGreaterThan(0);
      }
    }
  });

  it("provides audible, aligned loops for every music scene", () => {
    for (const scene of MUSIC_SCENES) {
      const pattern = MUSIC_PATTERNS[scene];
      expect(pattern.bpm).toBeGreaterThanOrEqual(60);
      expect(pattern.lead.length).toBe(pattern.bass.length);
      expect(pattern.lead.some((note) => note != null)).toBe(true);
      expect(pattern.bass.some((note) => note != null)).toBe(true);
    }
    expect(MUSIC_PATTERNS.danger.bpm).toBeGreaterThan(MUSIC_PATTERNS.gameplay.bpm);
  });

  it("starts music lazily, layers effects, and stops cleanly on suspend", () => {
    vi.useFakeTimers();
    const context = new FakeAudioContext();
    const audio = new ProceduralSoundscape(context as unknown as AudioContext);

    audio.setMusic("gameplay", true);
    const musicVoiceCount = context.oscillators.length;
    expect(musicVoiceCount).toBeGreaterThan(0);
    audio.play("exit");
    expect(context.oscillators.length - musicVoiceCount).toBe(SOUND_RECIPES.exit.length);

    audio.suspend();
    expect(context.suspend).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    const suspendedVoiceCount = context.oscillators.length;
    audio.play("button");
    expect(context.oscillators).toHaveLength(suspendedVoiceCount);

    audio.resume();
    expect(context.resume).toHaveBeenCalledOnce();
    expect(context.oscillators.length).toBeGreaterThan(suspendedVoiceCount);
  });

  it("keeps the supplied menu recording outside challenges and reuses the challenge recording for every challenge scene", () => {
    vi.useFakeTimers();
    const context = new FakeAudioContext();
    const audio = new ProceduralSoundscape(context as unknown as AudioContext);
    const menuMusic = { duration: 148.178145833 } as AudioBuffer;
    const challengeMusic = { duration: 126.016 } as AudioBuffer;
    const exit = { duration: 0.52 } as AudioBuffer;

    expect(RECORDED_MUSIC_LOOP_STARTS.menu).toBe(0);
    expect(RECORDED_MUSIC_LOOP_DURATIONS.menu).toBeCloseTo(menuMusic.duration, 8);
    expect(RECORDED_MUSIC_LOOP_STARTS.challenge).toBe(0);
    expect(RECORDED_MUSIC_LOOP_DURATIONS.challenge).toBeCloseTo(challengeMusic.duration, 8);

    audio.expectMusicBuffer("menu");
    audio.expectMusicBuffer("challenge");
    audio.setMusic("menu", true);
    expect(context.oscillators).toHaveLength(0);
    audio.setMusicBuffer("menu", menuMusic);
    expect(context.bufferSources).toHaveLength(1);
    const firstMenuSource = context.bufferSources[0];
    expect(firstMenuSource.buffer).toBe(menuMusic);
    expect(firstMenuSource.loop).toBe(true);
    expect(firstMenuSource.loopStart).toBe(RECORDED_MUSIC_LOOP_STARTS.menu);
    expect(firstMenuSource.loopEnd).toBeCloseTo(
      Math.min(
        RECORDED_MUSIC_LOOP_STARTS.menu + RECORDED_MUSIC_LOOP_DURATIONS.menu,
        menuMusic.duration,
      ),
      5,
    );

    audio.setMusicBuffer("challenge", challengeMusic);
    expect(context.bufferSources).toHaveLength(1);

    const challengeScenes = ["gameplay", "danger", "victory", "defeat"] as const;
    for (const scene of challengeScenes) {
      audio.setMusic(scene, true);
      expect(firstMenuSource.stop).toHaveBeenCalledOnce();
      expect(context.bufferSources, `${scene} must reuse the challenge recording`).toHaveLength(2);
      expect(context.bufferSources[1].buffer).toBe(challengeMusic);
      expect(context.bufferSources[1].stop).not.toHaveBeenCalled();
      expect(context.bufferSources.filter((source) => source.buffer === challengeMusic)).toHaveLength(1);
    }

    const challengeSource = context.bufferSources[1];
    expect(challengeSource.loop).toBe(true);
    expect(challengeSource.loopStart).toBe(0);
    expect(challengeSource.loopEnd).toBeCloseTo(126.016, 8);

    audio.setMusic("silent", true);
    expect(context.bufferSources).toHaveLength(2);
    expect(challengeSource.stop).toHaveBeenCalledOnce();
    expect(firstMenuSource.buffer).toBeNull();

    audio.setMusic("menu", true);
    expect(challengeSource.stop).toHaveBeenCalledOnce();
    expect(context.bufferSources).toHaveLength(3);
    expect(context.bufferSources[2].buffer).toBe(menuMusic);
    expect(context.bufferSources[2].loopStart).toBe(RECORDED_MUSIC_LOOP_STARTS.menu);
    expect(context.bufferSources[2].loopEnd).toBeCloseTo(menuMusic.duration, 5);

    audio.setSoundBuffer("exit", exit);
    const fallbackCount = context.oscillators.length;
    audio.play("exit");
    expect(context.bufferSources).toHaveLength(4);
    expect(context.bufferSources[3].buffer).toBe(exit);
    expect(context.oscillators).toHaveLength(fallbackCount);
  });

  it("uses the dedicated shell recording without replacing ice, thaw or whole-block exit", () => {
    const context = new FakeAudioContext();
    const audio = new ProceduralSoundscape(context as unknown as AudioContext);
    const recordings = Object.fromEntries(["shell", "shutter", "ice", "thaw", "exit"].map((kind) => [kind, { duration: 1 } as AudioBuffer]));
    for (const kind of ["shell", "shutter", "ice", "thaw", "exit"] as const) audio.setSoundBuffer(kind, recordings[kind]);
    for (const kind of ["shell", "shutter", "ice", "thaw", "exit"] as const) {
      audio.play(kind);
      expect(context.bufferSources.at(-1)?.buffer).toBe(recordings[kind]);
    }
    expect(context.bufferSources).toHaveLength(5);
    expect(context.oscillators).toHaveLength(0);
    audio.suspend();
    audio.play("shell");
    audio.play("shutter");
    expect(context.bufferSources).toHaveLength(5);
  });

  it.each([
    { kind: "time", frames: 92_160 }, { kind: "rocket", frames: 47_232 },
    { kind: "pulse", frames: 99_072 }, { kind: "fail", frames: 213_120 },
    { kind: "win", frames: 161_280 }, { kind: "gold", frames: 47_232 }, { kind: "itemArrival", frames: 13_824 },
  ] as const)(
    "plays the supplied $kind recording once without looping or adding synthesized effects", ({ kind, frames }) => {
    const context = new FakeAudioContext();
    const audio = new ProceduralSoundscape(context as unknown as AudioContext);
    const recording = { duration: frames / 44_100 } as AudioBuffer;
    audio.setSoundBuffer(kind, recording);
    audio.play(kind);
    expect(context.bufferSources).toHaveLength(1);
    expect(context.bufferSources[0].buffer).toBe(recording);
    expect(context.bufferSources[0].loop).toBe(false);
    expect(context.bufferSources[0].start).toHaveBeenCalledOnce();
    expect(context.oscillators).toHaveLength(0);
  });

  it("keeps reward-claim and other reward-feedback recordings independent", () => {
    const context = new FakeAudioContext();
    const audio = new ProceduralSoundscape(context as unknown as AudioContext);
    const gold = { duration: 47_232 / 44_100 } as AudioBuffer;
    const reward = { duration: 0.76 } as AudioBuffer;
    audio.setSoundBuffer("gold", gold);
    audio.setSoundBuffer("reward", reward);
    audio.play("gold");
    audio.play("reward");
    expect(context.bufferSources.map((source) => source.buffer)).toEqual([gold, reward]);
    expect(context.oscillators).toHaveLength(0);
  });

  it.each([0, 0.035])("plays every reward arrival independently at %s-second intervals", (interval) => {
    const context = new FakeAudioContext();
    const audio = new ProceduralSoundscape(context as unknown as AudioContext);
    const arrival = { duration: 13_824 / 44_100 } as AudioBuffer;
    const gold = { duration: 47_232 / 44_100 } as AudioBuffer;
    audio.setSoundBuffer("itemArrival", arrival);
    audio.setSoundBuffer("gold", gold);
    audio.play("gold");
    for (let index = 0; index < 30; index += 1) {
      context.currentTime += interval;
      audio.play("itemArrival");
      const source = context.bufferSources.at(-1)!;
      expect(context.bufferSources).toHaveLength(index + 2);
      expect(source.buffer).toBe(arrival);
      expect(source.start).toHaveBeenCalledExactlyOnceWith(context.currentTime + 0.004);
      expect(source.loop).toBe(false);
    }
    expect(new Set(context.bufferSources).size).toBe(31);
    expect(context.bufferSources[0].buffer).toBe(gold);
    for (const source of context.bufferSources) expect(source.stop).not.toHaveBeenCalled();
    expect(context.oscillators).toHaveLength(0);
  });

  it("does not reuse a released music buffer and plays a freshly supplied replacement", () => {
    vi.useFakeTimers();
    const context = new FakeAudioContext();
    const audio = new ProceduralSoundscape(context as unknown as AudioContext);
    const releasedChallengeMusic = { duration: 126.016 } as AudioBuffer;
    const replacementChallengeMusic = { duration: 126.016 } as AudioBuffer;

    audio.setMusicBuffer("challenge", releasedChallengeMusic);
    audio.setMusic("gameplay", true);
    expect(context.bufferSources).toHaveLength(1);
    expect(context.bufferSources[0].buffer).toBe(releasedChallengeMusic);

    audio.releaseMusicBuffer("challenge");
    expect(context.bufferSources[0].stop).toHaveBeenCalledOnce();
    audio.setMusic("danger", true);
    expect(context.bufferSources).toHaveLength(1);
    expect(context.bufferSources[0].buffer).toBeNull();
    expect(context.oscillators.length).toBeGreaterThan(0);

    audio.setMusicBuffer("challenge", replacementChallengeMusic);
    expect(context.bufferSources).toHaveLength(2);
    expect(context.bufferSources[1].buffer).toBe(replacementChallengeMusic);
    expect(context.bufferSources[1].loop).toBe(true);
    expect(context.bufferSources[1].loopStart).toBe(0);
    expect(context.bufferSources[1].loopEnd).toBeCloseTo(126.016, 8);
  });

  it.each(["disabled", "suspended", "paused"] as const)("uses the new scene track when music resumes after a %s scene change", (reason) => {
    vi.useFakeTimers();
    const context = new FakeAudioContext();
    const audio = new ProceduralSoundscape(context as unknown as AudioContext);
    const menuMusic = { duration: 148.178145833 } as AudioBuffer;
    const challengeMusic = { duration: 126.016 } as AudioBuffer;
    audio.setMusicBuffer("menu", menuMusic);
    audio.setMusicBuffer("challenge", challengeMusic);
    audio.setMusic("menu", true);
    const oldMenuSource = context.bufferSources[0];
    expect(oldMenuSource.buffer).toBe(menuMusic);

    if (reason === "suspended") audio.suspend();
    if (reason === "paused") audio.setMusicPaused(true);
    audio.setMusic("gameplay", reason !== "disabled");
    expect(oldMenuSource.stop).toHaveBeenCalledOnce();
    expect(context.bufferSources).toHaveLength(1);

    if (reason === "disabled") audio.setMusic("gameplay", true);
    if (reason === "suspended") audio.resume();
    if (reason === "paused") audio.setMusicPaused(false);

    expect(context.bufferSources).toHaveLength(2);
    expect(context.bufferSources[1].buffer).toBe(challengeMusic);
    expect(audio.musicTransport().track).toBe("challenge");
    expect(oldMenuSource.buffer).toBeNull();
  });

  it("plays a favorite playlist sequentially and wraps without overlapping sources", () => {
    vi.useFakeTimers();
    const context = new FakeAudioContext();
    const audio = new ProceduralSoundscape(context as unknown as AudioContext);
    const menuMusic = { duration: 1 } as AudioBuffer;
    const challengeMusic = { duration: 1 } as AudioBuffer;
    audio.setMusicBuffer("menu", menuMusic, 1);
    audio.setMusicBuffer("challenge", challengeMusic, 1);

    audio.setMusic("menu", true, "menu", ["menu", "challenge"]);
    expect(context.bufferSources).toHaveLength(1);
    expect(context.bufferSources[0].buffer).toBe(menuMusic);
    expect(context.bufferSources[0].loop).toBe(false);
    expect(audio.musicTransport().track).toBe("menu");

    vi.advanceTimersByTime(1_100);
    expect(context.bufferSources).toHaveLength(2);
    expect(context.bufferSources[0].stop).toHaveBeenCalledOnce();
    expect(context.bufferSources[1].buffer).toBe(challengeMusic);
    expect(audio.musicTransport().track).toBe("challenge");

    vi.advanceTimersByTime(1_100);
    expect(context.bufferSources).toHaveLength(3);
    expect(context.bufferSources[1].stop).toHaveBeenCalledOnce();
    expect(context.bufferSources[2].buffer).toBe(menuMusic);
    expect(audio.musicTransport().track).toBe("menu");

    audio.setMusic("menu", true, "menu", []);
    expect(context.bufferSources).toHaveLength(4);
    expect(context.bufferSources[2].stop).toHaveBeenCalledOnce();
    expect(context.bufferSources[3].loop).toBe(true);
  });
});

describe("recorded final countdown sound", () => {
  const recording = { duration: 1.2 } as AudioBuffer;

  it("stays silent until its recording is ready and never catches up missed sounds", () => {
    const context = new FakeAudioContext();
    const audio = new ProceduralSoundscape(context as unknown as AudioContext);
    audio.play("timeover");
    audio.play("timeover");
    expect(context.oscillators).toHaveLength(0);
    expect(context.bufferSources).toHaveLength(0);
    audio.setSoundBuffer("timeover", recording);
    expect(context.bufferSources).toHaveLength(0);
    audio.play("timeover");
    expect(context.bufferSources).toHaveLength(1);
    expect(context.bufferSources[0].buffer).toBe(recording);
    expect(context.bufferSources[0].loop).toBe(false);
    expect(context.oscillators).toHaveLength(0);
  });

  it("plays each of ten per-second requests independently and stops the preceding sound", () => {
    const context = new FakeAudioContext();
    const audio = new ProceduralSoundscape(context as unknown as AudioContext);
    audio.setSoundBuffer("timeover", recording);
    for (let second = 10; second >= 1; second -= 1) {
      context.currentTime += 1;
      const previous = context.bufferSources.at(-1);
      const previousGain = context.gains.at(-1);
      audio.play("timeover");
      const current = context.bufferSources.at(-1)!;
      expect(context.bufferSources).toHaveLength(11 - second);
      expect(current.buffer).toBe(recording);
      expect(current.start).toHaveBeenCalledExactlyOnceWith(context.currentTime + 0.004);
      expect(current.stop).not.toHaveBeenCalled();
      expect(context.gains.at(-1)?.gain.value).toBeCloseTo(0.68);
      if (previous) {
        expect(previous.stop).toHaveBeenCalledOnce();
        expect(previous.disconnect).toHaveBeenCalledOnce();
        expect(previousGain?.disconnect).toHaveBeenCalledOnce();
      }
    }
    expect(context.oscillators).toHaveLength(0);
  });

  it("stops just the dedicated countdown source and safely tolerates repeated stops", () => {
    const context = new FakeAudioContext();
    const audio = new ProceduralSoundscape(context as unknown as AudioContext);
    audio.setSoundBuffer("timeover", recording);
    audio.setSoundBuffer("exit", recording);
    audio.play("exit");
    audio.play("timeover");
    const [exit, countdown] = context.bufferSources;
    const countdownGain = context.gains.at(-1)!;
    audio.stopSound("exit");
    expect(exit.stop).not.toHaveBeenCalled();
    expect(countdown.stop).not.toHaveBeenCalled();
    audio.stopSound("timeover");
    audio.stopSound("timeover");
    expect(countdown.stop).toHaveBeenCalledOnce();
    expect(countdown.disconnect).toHaveBeenCalledOnce();
    expect(countdownGain.disconnect).toHaveBeenCalledOnce();
    expect(countdown.onended).toBeNull();
    expect(exit.stop).not.toHaveBeenCalled();
    expect(exit.disconnect).not.toHaveBeenCalled();
    audio.play("timeover");
    expect(context.bufferSources).toHaveLength(3);
  });

  it("drops a paused or backgrounded tail and never resumes or queues it", () => {
    const context = new FakeAudioContext();
    const audio = new ProceduralSoundscape(context as unknown as AudioContext);
    audio.setSoundBuffer("timeover", recording);
    audio.play("timeover");
    const countdown = context.bufferSources[0];
    audio.suspend();
    expect(countdown.stop).toHaveBeenCalledOnce();
    expect(countdown.disconnect).toHaveBeenCalledOnce();
    audio.play("timeover");
    audio.setSoundBuffer("timeover", recording);
    expect(context.bufferSources).toHaveLength(1);
    audio.resume();
    expect(context.bufferSources).toHaveLength(1);
    expect(countdown.start).toHaveBeenCalledOnce();
    audio.play("timeover");
    expect(context.bufferSources).toHaveLength(2);
    expect(context.bufferSources[1].start).toHaveBeenCalledOnce();
  });

  it("disconnects a naturally completed sound without stopping a newer second", () => {
    const context = new FakeAudioContext();
    const audio = new ProceduralSoundscape(context as unknown as AudioContext);
    audio.setSoundBuffer("timeover", recording);
    audio.play("timeover");
    const first = context.bufferSources[0];
    const firstGain = context.gains.at(-1)!;
    const ended = first.onended!;
    ended();
    expect(first.disconnect).toHaveBeenCalledOnce();
    expect(firstGain.disconnect).toHaveBeenCalledOnce();
    audio.stopSound("timeover");
    expect(first.stop).not.toHaveBeenCalled();
    audio.play("timeover");
    const second = context.bufferSources[1];
    ended();
    audio.stopSound("timeover");
    expect(second.stop).toHaveBeenCalledOnce();
  });

  it("stays silent and disconnects partially created nodes when recording playback fails", () => {
    const context = new FakeAudioContext();
    const createBufferSource = context.createBufferSource.bind(context);
    vi.spyOn(context, "createBufferSource").mockImplementation(() => {
      const source = createBufferSource();
      source.start.mockImplementation(() => { throw new Error("recording unavailable"); });
      return source;
    });
    const audio = new ProceduralSoundscape(context as unknown as AudioContext);
    audio.setSoundBuffer("timeover", recording);
    expect(() => audio.play("timeover")).not.toThrow();
    expect(context.bufferSources[0].disconnect).toHaveBeenCalledOnce();
    expect(context.gains.at(-1)?.disconnect).toHaveBeenCalledOnce();
    expect(context.oscillators).toHaveLength(0);
    audio.resume();
    expect(context.bufferSources).toHaveLength(1);
  });
});

describe("audio graph ownership", () => {
  it("releases every recorded effect after repeated natural completions, retaining only mixer gains", () => {
    const context = new FakeAudioContext();
    const audio = new ProceduralSoundscape(context as unknown as AudioContext);
    const recording = { duration: 0.25 } as AudioBuffer;
    for (const kind of SOUND_KINDS) audio.setSoundBuffer(kind, recording);
    for (let cycle = 0; cycle < 20; cycle++) {
      for (const kind of SOUND_KINDS) {
        audio.play(kind);
        const source = context.bufferSources.at(-1)!;
        const gain = context.gains.at(-1)!;
        source.onended!();
        expect(source.stop).not.toHaveBeenCalled();
        expect(source.disconnect).toHaveBeenCalledOnce();
        expect(gain.disconnect).toHaveBeenCalledOnce();
        expect(source.buffer).toBeNull();
        expect(source.onended).toBeNull();
      }
    }
    expect(context.bufferSources).toHaveLength(SOUND_KINDS.length * 20);
    expect(context.gains.filter(gain => gain.disconnect.mock.calls.length === 0)).toHaveLength(3);
    expect(context.oscillators).toHaveLength(0);
  });

  it("releases every completed synthesized effect and its envelope", () => {
    const context = new FakeAudioContext();
    const audio = new ProceduralSoundscape(context as unknown as AudioContext);
    for (const kind of SOUND_KINDS) audio.play(kind);
    for (const oscillator of context.oscillators) {
      oscillator.onended!();
      expect(oscillator.disconnect).toHaveBeenCalledOnce();
      expect(oscillator.onended).toBeNull();
      // Cleanup must preserve the recipe's one scheduled natural stop.
      expect(oscillator.stop).toHaveBeenCalledOnce();
    }
    expect(context.gains.filter(gain => gain.disconnect.mock.calls.length === 0)).toHaveLength(3);
  });

  it("keeps the music fade timing while releasing oscillators and envelopes when the fade ends", () => {
    vi.useFakeTimers();
    const context = new FakeAudioContext();
    const audio = new ProceduralSoundscape(context as unknown as AudioContext);
    audio.setMusic("menu", true);
    expect(context.oscillators.length).toBeGreaterThan(0);
    audio.setMusic("silent", false);
    for (const oscillator of context.oscillators) {
      expect(oscillator.stop).toHaveBeenLastCalledWith(context.currentTime + 0.065);
      expect(oscillator.disconnect).not.toHaveBeenCalled();
      oscillator.onended!();
      expect(oscillator.disconnect).toHaveBeenCalledOnce();
    }
    expect(context.gains.filter(gain => gain.disconnect.mock.calls.length === 0)).toHaveLength(3);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("disconnects a naturally ended playlist source before playing the next recording", () => {
    vi.useFakeTimers();
    const context = new FakeAudioContext();
    const audio = new ProceduralSoundscape(context as unknown as AudioContext);
    const recording = { duration: 120 } as AudioBuffer;
    audio.setMusicBuffer("menu", recording);
    audio.setMusicBuffer("challenge", recording);
    audio.setMusic("menu", true, "menu", ["menu", "challenge"]);
    const first = context.bufferSources[0];
    const ended = first.onended!;
    ended();
    expect(first.disconnect).toHaveBeenCalledOnce();
    expect(first.buffer).toBeNull();
    expect(first.onended).toBeNull();
    expect(first.stop).not.toHaveBeenCalled();
    expect(context.bufferSources).toHaveLength(2);
    expect(context.bufferSources[1].buffer).toBe(recording);
    ended();
    expect(context.bufferSources).toHaveLength(2);
    audio.setMusic("silent", false);
    expect(context.bufferSources[1].disconnect).toHaveBeenCalledOnce();
    expect(context.bufferSources[1].buffer).toBeNull();
  });

  it("releases the replaced recording source without removing its replacement", () => {
    const context = new FakeAudioContext();
    const audio = new ProceduralSoundscape(context as unknown as AudioContext);
    const firstBuffer = { duration: 100 } as AudioBuffer;
    const secondBuffer = { duration: 120 } as AudioBuffer;
    audio.setMusicBuffer("menu", firstBuffer);
    audio.setMusic("menu", true);
    const first = context.bufferSources[0];
    audio.setMusicBuffer("menu", secondBuffer);
    expect(first.stop).toHaveBeenCalledOnce();
    expect(first.disconnect).toHaveBeenCalledOnce();
    expect(first.buffer).toBeNull();
    expect(first.onended).toBeNull();
    expect(context.bufferSources[1].buffer).toBe(secondBuffer);
    expect(context.bufferSources[1].disconnect).not.toHaveBeenCalled();
    audio.setMusic("silent", false);
  });

  it("cleans failed ordinary recordings before falling back to their synthesized recipe", () => {
    const context = new FakeAudioContext();
    const create = context.createBufferSource.bind(context);
    vi.spyOn(context, "createBufferSource").mockImplementation(() => {
      const source = create();
      source.start.mockImplementation(() => { throw new Error("start failed"); });
      return source;
    });
    const audio = new ProceduralSoundscape(context as unknown as AudioContext);
    audio.setSoundBuffer("button", { duration: 0.25 } as AudioBuffer);
    audio.play("button");
    expect(context.bufferSources[0].disconnect).toHaveBeenCalledOnce();
    expect(context.bufferSources[0].buffer).toBeNull();
    expect(context.gains[3].disconnect).toHaveBeenCalledOnce();
    expect(context.oscillators).toHaveLength(SOUND_RECIPES.button.length);
    for (const oscillator of context.oscillators) oscillator.onended!();
    expect(context.gains.filter(gain => gain.disconnect.mock.calls.length === 0)).toHaveLength(3);
  });

  it("cleans partially created synthesized voices when oscillator start fails", () => {
    const context = new FakeAudioContext();
    const create = context.createOscillator.bind(context);
    vi.spyOn(context, "createOscillator").mockImplementation(() => {
      const oscillator = create();
      oscillator.start.mockImplementation(() => { throw new Error("start failed"); });
      return oscillator;
    });
    const audio = new ProceduralSoundscape(context as unknown as AudioContext);
    expect(() => audio.play("button")).not.toThrow();
    for (const oscillator of context.oscillators) {
      expect(oscillator.disconnect).toHaveBeenCalledOnce();
      expect(oscillator.onended).toBeNull();
    }
    expect(context.gains.filter(gain => gain.disconnect.mock.calls.length === 0)).toHaveLength(3);
  });
});

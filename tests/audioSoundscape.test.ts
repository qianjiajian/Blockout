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
  createGain(): FakeGainNode { return new FakeGainNode(); }
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

const SOUND_KINDS: SoundKind[] = [
  "blocked", "exit", "ice", "thaw", "win", "button", "putdown", "fail",
  "reward", "booster", "unlock",
  "time", "rocket", "pulse", "mechanic", "shell", "shutter",
];

const MUSIC_SCENES: Exclude<MusicScene, "silent">[] = ["menu", "gameplay", "danger", "victory", "defeat"];

afterEach(() => vi.useRealTimers());

describe("procedural game audio", () => {
  it("defines a valid layered recipe for every gameplay sound", () => {
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
    expect(challengeSource.stop).not.toHaveBeenCalled();
    expect(context.bufferSources.filter((source) => source.buffer === menuMusic)).toHaveLength(1);

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
    expect(context.bufferSources.filter((source) => source.buffer === releasedChallengeMusic)).toHaveLength(1);
    expect(context.oscillators.length).toBeGreaterThan(0);

    audio.setMusicBuffer("challenge", replacementChallengeMusic);
    expect(context.bufferSources).toHaveLength(2);
    expect(context.bufferSources[1].buffer).toBe(replacementChallengeMusic);
    expect(context.bufferSources[1].loop).toBe(true);
    expect(context.bufferSources[1].loopStart).toBe(0);
    expect(context.bufferSources[1].loopEnd).toBeCloseTo(126.016, 8);
  });
});

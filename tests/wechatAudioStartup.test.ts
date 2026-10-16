import { afterEach, describe, expect, it, vi } from "vitest";
import { WechatHost } from "../src/platform/WechatHost";

class AudioParamStub {
  value = 0;
  cancelScheduledValues(): void {}
  setValueAtTime(value: number): void { this.value = value; }
  exponentialRampToValueAtTime(value: number): void { this.value = value; }
}

class AudioNodeStub {
  connect(): void {}
  disconnect = vi.fn();
}

class BufferSourceStub extends AudioNodeStub {
  buffer: (AudioBuffer & { path: string }) | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  onended: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
}

class AudioContextStub {
  currentTime = 0;
  state = "suspended";
  destination = new AudioNodeStub();
  sources: BufferSourceStub[] = [];
  heldDecodes = new Map<string, () => void>();
  delayDecode = new Set<string>();
  createGain = () => Object.assign(new AudioNodeStub(), { gain: new AudioParamStub() });
  createBufferSource = () => {
    const source = new BufferSourceStub();
    this.sources.push(source);
    return source;
  };
  createOscillator = vi.fn(() => Object.assign(new BufferSourceStub(), {
    frequency: new AudioParamStub(), detune: new AudioParamStub(), type: "sine",
  }));
  resume = vi.fn(async () => { this.state = "running"; });
  suspend = vi.fn(async () => { this.state = "suspended"; });
  decodeAudioData = vi.fn((data: { path: string }, success: (buffer: AudioBuffer) => void) => {
    const finish = () => success({ duration: 150, path: data.path } as unknown as AudioBuffer);
    if (this.delayDecode.has(data.path)) this.heldDecodes.set(data.path, finish);
    else finish();
  });
}

type PackageRequest = { name: string; success(): void; fail(error: unknown): void };
type FileRequest = { filePath: string; success(value: { data: unknown }): void };
type EventCallback = (event?: unknown) => void;

function setup() {
  vi.useFakeTimers();
  const audio = new AudioContextStub();
  const packages: PackageRequest[] = [];
  const callbacks: Record<string, EventCallback> = {};
  const readFile = vi.fn((request: FileRequest) => request.success({ data: { path: request.filePath } }));
  const createWebAudioContext = vi.fn(() => audio);
  vi.stubGlobal("wx", {
    getWindowInfo: () => ({ screenWidth: 390, screenHeight: 844, pixelRatio: 1 }),
    createCanvas: () => ({ width: 0, height: 0, getContext: () => ({}) }),
    createWebAudioContext,
    getFileSystemManager: () => ({ readFile }),
    loadSubpackage: (request: PackageRequest) => packages.push(request),
    onTouchStart: (callback: EventCallback) => { callbacks.start = callback; },
    onTouchMove: (callback: EventCallback) => { callbacks.move = callback; },
    onTouchEnd: (callback: EventCallback) => { callbacks.end = callback; },
    onTouchCancel: (callback: EventCallback) => { callbacks.cancel = callback; },
    onHide: (callback: EventCallback) => { callbacks.hide = callback; },
    onShow: (callback: EventCallback) => { callbacks.show = callback; },
  });
  const host = new WechatHost();
  host.onHide(() => {});
  host.onShow(() => {});
  return { host, audio, packages, callbacks, readFile, createWebAudioContext };
}

async function flush(): Promise<void> {
  // Native readFile and decodeAudioData settle through successive promise jobs.
  for (let index = 0; index < 12; index += 1) await Promise.resolve();
}

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("WeChat first-level audio startup", () => {
  it("downloads and decodes first-level audio during startup without playing a sound", async () => {
    const { host, audio, packages, readFile, createWebAudioContext } = setup();
    audio.delayDecode.add("audio/happy-foods.mp3");
    let settled = false;
    const ready = host.prepareAudio("gameplay", { music: true, sound: true }).then(() => { settled = true; });
    expect(createWebAudioContext).toHaveBeenCalledOnce();
    expect(packages.map(request => request.name)).toEqual(["audio"]);
    expect(readFile).not.toHaveBeenCalled();
    packages[0].success();
    await flush();
    expect(readFile).toHaveBeenCalledTimes(21);
    expect(readFile.mock.calls.filter(([request]) => request.filePath.startsWith("audio/sfx/"))).toHaveLength(20);
    expect(settled).toBe(false);
    expect(audio.sources).toHaveLength(0);
    expect(audio.createOscillator).not.toHaveBeenCalled();
    expect(audio.resume).not.toHaveBeenCalled();
    audio.heldDecodes.get("audio/happy-foods.mp3")!();
    await ready;
    expect(settled).toBe(true);
    expect(audio.sources).toHaveLength(0);
  });

  it("coalesces startup loads and plays the first music and effect from ready recordings", async () => {
    const { host, audio, packages, readFile, createWebAudioContext } = setup();
    const first = host.prepareAudio("gameplay", { music: true, sound: true });
    const repeated = host.prepareAudio("gameplay", { music: true, sound: true });
    packages[0].success();
    await Promise.all([first, repeated]);
    host.music("gameplay", true);
    host.music("gameplay", true);
    host.sound("exit");
    expect(createWebAudioContext).toHaveBeenCalledOnce();
    expect(packages.map(request => request.name)).toEqual(["audio"]);
    expect(readFile).toHaveBeenCalledTimes(21);
    expect(audio.sources.map(source => source.buffer?.path)).toEqual(["audio/happy-foods.mp3", "audio/sfx/exit.mp3"]);
    expect(audio.sources.every(source => source.start.mock.calls.length === 1)).toBe(true);
    expect(audio.createOscillator).not.toHaveBeenCalled();
  });

  it.each([
    [{ music: true, sound: false }, 1],
    [{ music: false, sound: true }, 20],
  ] as const)("respects separate startup preferences %j", async (options, expectedReads) => {
    const { host, audio, packages, readFile } = setup();
    const ready = host.prepareAudio("gameplay", options);
    packages[0].success();
    await ready;
    expect(readFile).toHaveBeenCalledTimes(expectedReads);
    expect(audio.sources).toHaveLength(0);
    if (!options.music) expect(readFile.mock.calls.every(([request]) => request.filePath.includes("/sfx/"))).toBe(true);
  });

  it("does not allocate audio or fetch files when both preferences are disabled", async () => {
    const { host, createWebAudioContext, packages, readFile } = setup();
    await host.prepareAudio("gameplay", { music: false, sound: false });
    expect(createWebAudioContext).not.toHaveBeenCalled();
    expect(packages).toEqual([]);
    expect(readFile).not.toHaveBeenCalled();
  });

  it("starts music without effects and backs off repeated scene retries after failure", async () => {
    const { host, audio, packages } = setup();
    host.music("gameplay", true);
    expect(packages.map(request => request.name)).toEqual(["audio"]);
    packages[0].fail(new Error("offline"));
    await flush();
    for (let frame = 0; frame < 180; frame += 1) host.music("gameplay", true);
    expect(packages).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(2_999);
    host.music("gameplay", true);
    expect(packages).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    host.music("gameplay", true);
    expect(packages.map(request => request.name)).toEqual(["audio", "audio"]);
    packages[1].success();
    await flush();
    expect(audio.sources.map(source => source.buffer?.path)).toEqual(["audio/happy-foods.mp3"]);
  });

  it("releases the failed track's retry deadline when the selected scene changes", async () => {
    const { host, audio, packages } = setup();
    host.music("gameplay", true);
    packages[0].fail(new Error("offline"));
    await flush();
    host.music("menu", true);
    host.music("gameplay", true);
    expect(packages.map(request => request.name)).toEqual(["audio", "menu-music", "audio"]);
    packages[2].success();
    packages[1].success();
    await flush();
    expect(audio.sources.map(source => source.buffer?.path)).toEqual(["audio/happy-foods.mp3"]);
  });

  it("resumes music on first touch before routing gameplay even without effects", async () => {
    const { host, audio, packages, callbacks } = setup();
    const ready = host.prepareAudio("gameplay", { music: true, sound: false });
    packages[0].success();
    await ready;
    host.music("gameplay", true);
    audio.state = "suspended";
    audio.resume.mockClear();
    const down = vi.fn(() => {
      expect(audio.state).toBe("running");
      expect(audio.resume).toHaveBeenCalledOnce();
    });
    host.onPointer({ down, move: vi.fn(), up: vi.fn(), cancel: vi.fn() });
    callbacks.start({ changedTouches: [{ identifier: 1, clientX: 12, clientY: 34 }] });
    expect(down).toHaveBeenCalledExactlyOnceWith({ id: 1, x: 12, y: 34 });
    expect(audio.sources).toHaveLength(1);
    expect(audio.createOscillator).not.toHaveBeenCalled();
  });

  it("keeps late audio silent while hidden and resumes the loaded music on show", async () => {
    const { host, audio, packages, callbacks } = setup();
    host.music("gameplay", true);
    callbacks.hide();
    expect(host.isVisible()).toBe(false);
    packages[0].success();
    await flush();
    host.sound("exit");
    expect(audio.sources).toHaveLength(0);
    expect(audio.createOscillator).not.toHaveBeenCalled();
    callbacks.show();
    expect(host.isVisible()).toBe(true);
    expect(audio.sources.map(source => source.buffer?.path)).toEqual(["audio/happy-foods.mp3"]);
  });

  it("cannot revive disabled music when decoding finishes later", async () => {
    const { host, audio, packages } = setup();
    host.music("gameplay", true);
    host.music("gameplay", false);
    packages[0].success();
    await flush();
    expect(audio.sources).toHaveLength(0);
    expect(audio.createOscillator).not.toHaveBeenCalled();
  });

  it("drops an obsolete menu decode after switching to the first level", async () => {
    const { host, audio, packages } = setup();
    host.music("menu", true);
    host.music("gameplay", true);
    expect(packages.map(request => request.name)).toEqual(["menu-music", "audio"]);
    packages[1].success();
    await flush();
    packages[0].success();
    await flush();
    expect(audio.sources.map(source => source.buffer?.path)).toEqual(["audio/happy-foods.mp3"]);
    expect([...((host as any).retainedMusicTracks as Set<string>)]).toEqual(["challenge"]);
  });

  it("settles failed prewarming and permits a later retry without blocking game startup", async () => {
    const { host, audio, packages } = setup();
    const ready = host.prepareAudio("gameplay", { music: true, sound: true });
    packages[0].fail(new Error("offline"));
    await expect(ready).resolves.toBeUndefined();
    expect(audio.sources).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(3_000);
    const retried = host.prepareAudio("gameplay", { music: true, sound: true });
    expect(packages).toHaveLength(2);
    packages[1].success();
    await retried;
    expect(audio.sources).toHaveLength(0);
  });

  it("gracefully settles when the base library cannot create WebAudio", async () => {
    const { host, createWebAudioContext, packages } = setup();
    createWebAudioContext.mockImplementation(() => { throw new Error("unsupported"); });
    await expect(host.prepareAudio("gameplay", { music: true, sound: true })).resolves.toBeUndefined();
    expect(() => host.music("gameplay", true)).not.toThrow();
    expect(packages).toEqual([]);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { WebHost } from "../src/platform/WebHost";

const CHALLENGE = "assets/audio/happy-foods.mp3";
const MENU = "assets/audio/happy-carnival.mp3";
const EFFECT = "assets/audio/sfx/putdown.mp3";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function harness(options: { offline?: boolean; holdDecode?: boolean; failOffline?: boolean } = {}) {
  const sources: Array<{ buffer: AudioBuffer | null; loop: boolean; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }> = [];
  const bytesToPath = new Map<number, string>();
  const pathToBuffer = new Map<string, AudioBuffer>();
  const held = new Map<string, ReturnType<typeof deferred<AudioBuffer>>>();
  let audioState = "suspended";
  const makeBuffer = (path: string) => {
    const buffer = { duration: 240, path } as unknown as AudioBuffer;
    pathToBuffer.set(path, buffer);
    return buffer;
  };
  const decode = (bytes: ArrayBuffer) => makeBuffer(bytesToPath.get(new Uint8Array(bytes)[0])!);
  const param = () => ({ value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() });
  const context = {
    currentTime: 1, destination: {},
    get state() { return audioState; },
    createGain: vi.fn(() => ({ gain: param(), connect: vi.fn(), disconnect: vi.fn() })),
    createBufferSource: vi.fn(() => {
      const source = { buffer: null as AudioBuffer | null, loop: false, loopStart: 0, loopEnd: 0,
        onended: null, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      sources.push(source);
      return source;
    }),
    createOscillator: vi.fn(() => ({ frequency: param(), detune: param(), type: "sine",
      onended: null, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() })),
    decodeAudioData: vi.fn(async (bytes: ArrayBuffer) => decode(bytes)),
    resume: vi.fn(async () => { audioState = "running"; }),
    suspend: vi.fn(async () => { audioState = "suspended"; }),
    close: vi.fn(async () => { audioState = "closed"; }),
  };
  const offlineDecode = vi.fn((bytes: ArrayBuffer) => {
    const path = bytesToPath.get(new Uint8Array(bytes)[0])!;
    if (options.failOffline) return Promise.reject(new Error("offline codec unavailable"));
    if (!options.holdDecode) return Promise.resolve(makeBuffer(path));
    const result = deferred<AudioBuffer>();
    held.set(path, result);
    return result.promise;
  });
  const offlineConstruct = vi.fn();
  const liveConstruct = vi.fn();
  vi.stubGlobal("AudioContext", class { constructor() { liveConstruct(); return context; } });
  vi.stubGlobal("OfflineAudioContext", options.offline === false ? undefined : class {
    constructor() { offlineConstruct(); }
    decodeAudioData = offlineDecode;
  });
  vi.stubGlobal("webkitOfflineAudioContext", undefined);
  const canvas = Object.assign(new EventTarget(), {
    width: 0, height: 0, setAttribute: vi.fn(), getContext: () => ({}),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844 }),
    setPointerCapture: vi.fn(), releasePointerCapture: vi.fn(), remove: vi.fn(),
  });
  const doc = Object.assign(new EventTarget(), {
    hidden: false, baseURI: "http://127.0.0.1:5173/", createElement: () => canvas, body: { append: vi.fn() },
  });
  const page = Object.assign(new EventTarget(), { devicePixelRatio: 1, setTimeout, clearTimeout });
  vi.stubGlobal("window", page);
  vi.stubGlobal("document", doc);
  const fetch = vi.fn(async (url: URL, _options?: RequestInit) => {
    const path = url.pathname.slice(1), id = bytesToPath.size + 1;
    bytesToPath.set(id, path);
    return { ok: true, arrayBuffer: async () => new Uint8Array([id]).buffer };
  });
  vi.stubGlobal("fetch", fetch);
  const host = new WebHost();
  const press = (sound = true) => {
    host.onPointer({ down: () => { if (sound) host.sound("putdown"); }, move: vi.fn(), up: vi.fn(), cancel: vi.fn() });
    const event = new Event("pointerdown");
    Object.assign(event, { pointerId: 1, clientX: 20, clientY: 30 });
    canvas.dispatchEvent(event);
  };
  const hide = () => { doc.hidden = true; doc.dispatchEvent(new Event("visibilitychange")); };
  const show = () => { doc.hidden = false; doc.dispatchEvent(new Event("visibilitychange")); };
  const internals = host as unknown as {
    preparedAudioAssets: Map<string, { buffer?: AudioBuffer }>;
    musicAssetsLoading: Record<string, Promise<void> | undefined>;
    effectsAssetsLoading?: Promise<void>;
  };
  return { host, context, sources, pathToBuffer, held, makeBuffer, fetch, liveConstruct, offlineConstruct,
    offlineDecode, press, hide, show, internals };
}

const hosts: WebHost[] = [];
function setup(options?: Parameters<typeof harness>[0]) { const result = harness(options); hosts.push(result.host); return result; }
afterEach(() => { hosts.splice(0).forEach(host => host.dispose()); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("Web cold-start audio preparation", () => {
  it("predecodes only the actual gameplay music and 20 effects without opening an output device", async () => {
    const h = setup();
    await Promise.all([
      h.host.prepareAudio("gameplay", { music: true, sound: true }),
      h.host.prepareAudio("gameplay", { music: true, sound: true }),
    ]);
    const paths = h.fetch.mock.calls.map(([url]) => url.pathname.slice(1));
    expect(paths).toHaveLength(21);
    expect(paths).toContain(CHALLENGE);
    expect(paths).not.toContain(MENU);
    expect(paths.filter(path => path.startsWith("assets/audio/sfx/"))).toHaveLength(20);
    expect(h.offlineConstruct).toHaveBeenCalledOnce();
    expect(h.offlineDecode).toHaveBeenCalledTimes(21);
    expect(h.liveConstruct).not.toHaveBeenCalled();
    expect(h.sources).toHaveLength(0);
  });

  it("starts the prepared recorded music and first effect synchronously on the first real pointer", async () => {
    const h = setup();
    await h.host.prepareAudio("gameplay", { music: true, sound: true });
    h.host.music("gameplay", true);
    expect(h.liveConstruct).not.toHaveBeenCalled();
    h.press();
    expect(h.liveConstruct).toHaveBeenCalledOnce();
    expect(h.sources).toHaveLength(2);
    expect(h.sources[0].buffer).toBe(h.pathToBuffer.get(CHALLENGE));
    expect(h.sources[0].loop).toBe(true);
    expect(h.sources[0].start).toHaveBeenCalledOnce();
    expect(h.sources[1].buffer).toBe(h.pathToBuffer.get(EFFECT));
    expect(h.sources[1].start).toHaveBeenCalledOnce();
    expect(h.context.createOscillator).not.toHaveBeenCalled();
    expect(h.context.decodeAudioData).not.toHaveBeenCalled();
    await h.internals.effectsAssetsLoading;
    expect(h.fetch).toHaveBeenCalledTimes(21);
    expect(h.sources.filter(source => source.loop)).toHaveLength(1);
  });

  it.each([
    { music: false, sound: false, requests: 0 },
    { music: true, sound: false, requests: 1 },
    { music: false, sound: true, requests: 20 },
  ])("respects startup settings $music/$sound", async ({ music, sound, requests }) => {
    const h = setup();
    await h.host.prepareAudio("gameplay", { music, sound });
    expect(h.fetch).toHaveBeenCalledTimes(requests);
    expect(h.liveConstruct).not.toHaveBeenCalled();
    h.host.music("gameplay", music);
    h.press(sound);
    expect(h.sources.filter(source => source.loop)).toHaveLength(music ? 1 : 0);
    expect(h.sources.filter(source => !source.loop)).toHaveLength(sound ? 1 : 0);
    if (!music && !sound) expect(h.liveConstruct).not.toHaveBeenCalled();
  });

  it.each([{ offline: false }, { failOffline: true }])("reuses pre-fetched MP3 bytes when offline decoding is unavailable: %j", async options => {
    const h = setup(options);
    await h.host.prepareAudio("gameplay", { music: true, sound: false });
    expect(h.liveConstruct).not.toHaveBeenCalled();
    h.host.music("gameplay", true);
    h.press(false);
    await h.internals.musicAssetsLoading.challenge;
    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect(h.context.decodeAudioData).toHaveBeenCalledTimes(1);
    expect(h.sources).toHaveLength(1);
    expect(h.sources[0].buffer).toBe(h.pathToBuffer.get(CHALLENGE));
  });

  it("keeps late decoded music silent while hidden and plays it only after returning", async () => {
    const h = setup({ holdDecode: true });
    const preparation = h.host.prepareAudio("gameplay", { music: true, sound: false });
    await vi.waitFor(() => expect(h.held.has(CHALLENGE)).toBe(true));
    h.host.music("gameplay", true);
    h.press(false);
    h.hide();
    h.held.get(CHALLENGE)!.resolve(h.makeBuffer(CHALLENGE));
    await preparation;
    await h.internals.musicAssetsLoading.challenge;
    expect(h.sources).toHaveLength(0);
    expect(h.context.resume).toHaveBeenCalledOnce();
    h.show();
    expect(h.sources).toHaveLength(1);
    expect(h.sources[0].buffer).toBe(h.pathToBuffer.get(CHALLENGE));
  });

  it("drops obsolete gameplay buffers when the menu is selected while preparation is still decoding", async () => {
    const h = setup({ holdDecode: true });
    const preparation = h.host.prepareAudio("gameplay", { music: true, sound: false });
    await vi.waitFor(() => expect(h.held.has(CHALLENGE)).toBe(true));
    h.host.music("menu", true);
    h.held.get(CHALLENGE)!.resolve(h.makeBuffer(CHALLENGE));
    await preparation;
    expect(h.internals.preparedAudioAssets.has(CHALLENGE)).toBe(false);
    h.press(false);
    await h.internals.musicAssetsLoading.menu;
    expect([...h.internals.preparedAudioAssets.keys()]).toEqual([MENU]);
    expect(h.sources).toHaveLength(1);
    expect(h.sources[0].buffer).toBe(h.pathToBuffer.get(MENU));
  });

  it("releases the old long recording when switching after warm playback", async () => {
    const h = setup();
    await h.host.prepareAudio("gameplay", { music: true, sound: false });
    h.host.music("gameplay", true);
    h.press(false);
    const oldSource = h.sources[0];
    h.host.music("menu", true);
    await h.internals.musicAssetsLoading.menu;
    expect(oldSource.stop).toHaveBeenCalledOnce();
    expect(oldSource.buffer).toBeNull();
    expect([...h.internals.preparedAudioAssets.keys()]).toEqual([MENU]);
    expect(h.sources[1].buffer).toBe(h.pathToBuffer.get(MENU));
  });

  it("never recreates a disposed host from late offline decoding or another prepare request", async () => {
    const h = setup({ holdDecode: true });
    const preparation = h.host.prepareAudio("gameplay", { music: true, sound: true });
    await vi.waitFor(() => expect(h.held.size).toBe(21));
    h.host.dispose();
    for (const [path, result] of h.held) result.resolve(h.makeBuffer(path));
    await preparation;
    await h.host.prepareAudio("gameplay", { music: true, sound: true });
    expect(h.internals.preparedAudioAssets.size).toBe(0);
    expect(h.liveConstruct).not.toHaveBeenCalled();
    expect(h.sources).toHaveLength(0);
    expect(h.fetch).toHaveBeenCalledTimes(21);
    expect(h.fetch.mock.calls.every(([, init]) => init?.signal?.aborted)).toBe(true);
  });

  it("backs off a fast music failure across frequent scene updates and recovers after three seconds", async () => {
    vi.useFakeTimers({ now: 0 });
    const h = setup();
    h.fetch.mockRejectedValueOnce(new Error("offline"));
    h.host.music("gameplay", true);
    h.press(false);
    await h.internals.musicAssetsLoading.challenge;
    for (let frame = 0; frame < 180; frame += 1) {
      vi.setSystemTime(frame * 16);
      h.host.music("gameplay", true);
      await Promise.resolve();
    }
    vi.setSystemTime(2_999);
    h.host.music("gameplay", true);
    expect(h.fetch).toHaveBeenCalledTimes(1);
    vi.setSystemTime(3_000);
    h.host.music("gameplay", true);
    await h.internals.musicAssetsLoading.challenge;
    expect(h.fetch).toHaveBeenCalledTimes(2);
    expect(h.sources).toHaveLength(1);
    expect(h.sources[0].buffer).toBe(h.pathToBuffer.get(CHALLENGE));
  });

  it("keeps failure backoff local to the failed track and drops it when that track is released", async () => {
    vi.useFakeTimers({ now: 0 });
    const h = setup();
    h.fetch.mockRejectedValueOnce(new Error("offline"));
    h.host.music("gameplay", true);
    h.press(false);
    await h.internals.musicAssetsLoading.challenge;
    h.host.music("menu", true);
    await h.internals.musicAssetsLoading.menu;
    expect(h.fetch).toHaveBeenCalledTimes(2);
    expect(h.sources[0].buffer).toBe(h.pathToBuffer.get(MENU));
    h.host.music("gameplay", true);
    await h.internals.musicAssetsLoading.challenge;
    expect(h.fetch).toHaveBeenCalledTimes(3);
    expect(h.sources[1].buffer).toBe(h.pathToBuffer.get(CHALLENGE));
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { WebHost } from "../src/platform/WebHost";

function harness() {
  const frameCallbacks = new Map<number, FrameRequestCallback>();
  const timeoutCallbacks = new Map<number, () => void>();
  let nextHandle = 1;
  const canvas = Object.assign(new EventTarget(), {
    width: 0, height: 0,
    setAttribute: vi.fn(),
    getContext: vi.fn(() => ({})),
    getBoundingClientRect: () => ({ width: 360, height: 792, left: 0, top: 0 }),
    remove: vi.fn(),
  });
  const page = Object.assign(new EventTarget(), {
    devicePixelRatio: 1,
    setTimeout: vi.fn((callback: () => void) => {
      const handle = nextHandle++;
      timeoutCallbacks.set(handle, callback);
      return handle;
    }),
    clearTimeout: vi.fn(),
  });
  const document = Object.assign(new EventTarget(), {
    hidden: false,
    body: { append: vi.fn() },
    createElement: vi.fn(() => canvas),
  });
  const requestFrame = vi.fn((callback: FrameRequestCallback) => {
    const handle = nextHandle++;
    frameCallbacks.set(handle, callback);
    return handle;
  });
  const cancelFrame = vi.fn();
  const createAudio = vi.fn();
  vi.stubGlobal("window", page);
  vi.stubGlobal("document", document);
  vi.stubGlobal("requestAnimationFrame", requestFrame);
  vi.stubGlobal("cancelAnimationFrame", cancelFrame);
  vi.stubGlobal("AudioContext", createAudio);
  const host = new WebHost();
  const audio = { state: "running", close: vi.fn(async () => undefined), resume: vi.fn() };
  const soundscape = {
    setMusic: vi.fn(), stopSound: vi.fn(), suspend: vi.fn(), resume: vi.fn(),
    expectMusicBuffer: vi.fn(), setMusicBuffer: vi.fn(), useSynthMusicFallback: vi.fn(),
    setSoundBuffer: vi.fn(), play: vi.fn(), setMusicPaused: vi.fn(), seekMusic: vi.fn(),
  };
  const internals = host as unknown as {
    audio: typeof audio | undefined;
    soundscape: typeof soundscape | undefined;
    audioUnlocked: boolean;
    beginMusicAssetLoad(track: string): void;
    beginEffectsAssetLoad(): void;
    ensureAudio(): void;
    musicAssetsLoading: Record<string, Promise<void>>;
    effectsAssetsLoading?: Promise<void>;
    decodeAudioAsset: (path: string) => Promise<AudioBuffer>;
  };
  internals.audio = audio;
  internals.soundscape = soundscape;
  const dispatchPage = (type: "pagehide" | "pageshow", persisted: boolean) => {
    const event = new Event(type);
    Object.defineProperty(event, "persisted", { value: persisted });
    page.dispatchEvent(event);
  };
  return { host, internals, audio, soundscape, page, document, canvas, dispatchPage,
    frameCallbacks, timeoutCallbacks, requestFrame, cancelFrame, createAudio };
}

afterEach(() => vi.unstubAllGlobals());

describe("WebHost lifetime", () => {
  it("closes an exiting host once and blocks stale frames, timers, events and audio calls", () => {
    const h = harness();
    const onFrame = vi.fn(), onTimeout = vi.fn(), onResize = vi.fn(), onShow = vi.fn();
    const pointer = { down: vi.fn(), move: vi.fn(), up: vi.fn(), cancel: vi.fn() };
    h.host.onPointer(pointer);
    h.host.onResize(onResize);
    h.host.onShow(onShow);
    const frame = h.host.requestFrame(onFrame);
    const timeout = h.host.scheduleTimeout(onTimeout, 100);
    // A teardown callback attempting to restart the old host must already be blocked.
    h.soundscape.setMusic.mockImplementation(() => h.host.sound("button"));
    h.dispatchPage("pagehide", false);
    h.host.dispose();
    h.dispatchPage("pageshow", true);
    h.page.dispatchEvent(new Event("resize"));
    h.document.dispatchEvent(new Event("visibilitychange"));
    h.canvas.dispatchEvent(new Event("pointerdown"));
    h.frameCallbacks.get(frame)!(10);
    h.timeoutCallbacks.get(timeout)!();
    h.host.music("menu", true);
    h.host.sound("button");
    h.host.setMusicPaused(false);
    h.host.seekMusic(10);
    h.internals.ensureAudio();

    expect(h.soundscape.setMusic).toHaveBeenCalledExactlyOnceWith("silent", false);
    expect(h.soundscape.stopSound).toHaveBeenCalledExactlyOnceWith("timeover");
    expect(h.audio.close).toHaveBeenCalledTimes(1);
    expect(h.internals.audio).toBeUndefined();
    expect(h.internals.soundscape).toBeUndefined();
    expect(h.canvas.remove).toHaveBeenCalledTimes(1);
    expect(h.cancelFrame).toHaveBeenCalledWith(frame);
    expect(h.page.clearTimeout).toHaveBeenCalledWith(timeout);
    expect(onFrame).not.toHaveBeenCalled();
    expect(onTimeout).not.toHaveBeenCalled();
    expect(onResize).not.toHaveBeenCalled();
    expect(onShow).not.toHaveBeenCalled();
    expect(pointer.down).not.toHaveBeenCalled();
    expect(h.soundscape.play).not.toHaveBeenCalled();
    expect(h.soundscape.resume).not.toHaveBeenCalled();
    expect(h.soundscape.setMusicPaused).not.toHaveBeenCalled();
    expect(h.soundscape.seekMusic).not.toHaveBeenCalled();
    expect(h.createAudio).not.toHaveBeenCalled();
    expect(h.host.requestFrame(onFrame)).toBe(0);
    expect(h.host.scheduleTimeout(onTimeout, 100)).toBe(0);
    expect(h.host.isVisible()).toBe(false);
  });

  it.each(["resolved", "rejected"])("ignores a music decode %s after disposal", async (outcome) => {
    const h = harness();
    let resolve!: (buffer: AudioBuffer) => void;
    let reject!: (error: Error) => void;
    h.internals.decodeAudioAsset = vi.fn(() => new Promise<AudioBuffer>((yes, no) => { resolve = yes; reject = no; }));
    h.internals.beginMusicAssetLoad("menu");
    const pending = h.internals.musicAssetsLoading.menu;
    h.host.dispose();
    if (outcome === "resolved") resolve({} as AudioBuffer);
    else reject(new Error("late decode failure"));
    await pending;
    expect(h.soundscape.setMusicBuffer).not.toHaveBeenCalled();
    expect(h.soundscape.useSynthMusicFallback).not.toHaveBeenCalled();
    expect(h.createAudio).not.toHaveBeenCalled();
    h.internals.beginMusicAssetLoad("menu");
    expect(h.internals.decodeAudioAsset).toHaveBeenCalledTimes(1);
  });

  it("does not deliver late effect buffers to a disposed soundscape", async () => {
    const h = harness();
    let resolve!: (buffer: AudioBuffer) => void;
    const pending = new Promise<AudioBuffer>((yes) => { resolve = yes; });
    h.internals.decodeAudioAsset = vi.fn(() => pending);
    h.internals.beginEffectsAssetLoad();
    h.host.dispose();
    resolve({} as AudioBuffer);
    await h.internals.effectsAssetsLoading;
    expect(h.soundscape.setSoundBuffer).not.toHaveBeenCalled();
  });

  it("suspends a cached page and restores it once without closing or reviving while hidden", () => {
    const h = harness();
    const onHide = vi.fn(), onShow = vi.fn();
    h.host.onHide(onHide);
    h.host.onShow(onShow);
    h.dispatchPage("pagehide", true);
    h.document.dispatchEvent(new Event("visibilitychange"));
    h.host.sound("button");
    expect(h.host.isVisible()).toBe(false);
    expect(h.soundscape.suspend).toHaveBeenCalledTimes(1);
    expect(h.soundscape.resume).not.toHaveBeenCalled();
    expect(h.soundscape.play).not.toHaveBeenCalled();
    expect(onHide).toHaveBeenCalledTimes(1);
    expect(h.audio.close).not.toHaveBeenCalled();
    expect(h.canvas.remove).not.toHaveBeenCalled();
    h.dispatchPage("pageshow", true);
    h.document.dispatchEvent(new Event("visibilitychange"));
    expect(h.host.isVisible()).toBe(true);
    expect(h.soundscape.resume).toHaveBeenCalledTimes(1);
    expect(onShow).toHaveBeenCalledTimes(1);
    h.host.dispose();
  });

  it("keeps effects available while music is disabled in an active host", async () => {
    const h = harness();
    h.internals.decodeAudioAsset = vi.fn(async () => ({} as AudioBuffer));
    h.host.music("menu", false);
    h.host.sound("button");
    await h.internals.effectsAssetsLoading;
    expect(h.soundscape.play).toHaveBeenCalledExactlyOnceWith("button");
    expect(h.soundscape.setMusic).toHaveBeenLastCalledWith("menu", false, undefined, []);
    expect(h.audio.close).not.toHaveBeenCalled();
    h.host.dispose();
  });
});

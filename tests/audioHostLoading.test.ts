import { describe, expect, it, vi } from "vitest";
import { WebHost } from "../src/platform/WebHost";
import { WechatHost } from "../src/platform/WechatHost";

const sounds = [
  "blocked", "exit", "ice", "thaw", "win", "button", "putdown", "fail",
  "reward", "gold", "itemArrival", "booster", "unlock", "time", "rocket", "pulse", "mechanic", "shell", "shutter", "timeover",
];

// Exercise actual private loader methods without constructing a canvas or
// touching player storage. Real codec checks live in playtest-sfx-mp3.mjs.
function harness(platform: "web" | "wechat", failedSound?: string) {
  const prefix = platform === "web" ? "assets/audio/sfx/" : "audio/sfx/";
  const buffer = {} as AudioBuffer;
  const host = Object.assign(Object.create(platform === "web" ? WebHost.prototype : WechatHost.prototype), {
    audio: {},
    soundscape: { setSoundBuffer: vi.fn(), stopSound: vi.fn() },
    loadAssetSubpackage: vi.fn(async () => undefined),
    decodeAudioAsset: vi.fn(async (path: string) => {
      if (path === `${prefix}${failedSound}.mp3`) throw new Error("decode failed");
      return buffer;
    }),
  });
  const done = () => host.effectsAssetsLoading ?? host.effectsAssetLoading;
  return { host, prefix, buffer, done };
}

describe.each(["web", "wechat"] as const)("%s MP3 effect loading", (platform) => {
  it("loads all 20 effects from MP3 paths and coalesces repeated requests", async () => {
    const { host, prefix, buffer, done } = harness(platform);
    host.beginEffectsAssetLoad();
    host.beginEffectsAssetLoad();
    await done();
    expect(host.decodeAudioAsset.mock.calls.map(([path]: [string]) => path)).toEqual(sounds.map((kind) => `${prefix}${kind}.mp3`));
    expect(host.soundscape.setSoundBuffer).toHaveBeenCalledTimes(sounds.length);
    for (const kind of sounds) expect(host.soundscape.setSoundBuffer).toHaveBeenCalledWith(kind, buffer);
    if (platform === "wechat") expect(host.loadAssetSubpackage).toHaveBeenCalledExactlyOnceWith("audio");
    else expect(host.loadAssetSubpackage).not.toHaveBeenCalled();
  });

  it.each(["blocked", "shell", "shutter", "gold", "itemArrival"])("leaves the synthesized fallback available when %s MP3 fails", async (failedSound) => {
    const { host, done } = harness(platform, failedSound);
    host.beginEffectsAssetLoad();
    await expect(done()).resolves.toBeUndefined();
    expect(host.decodeAudioAsset).toHaveBeenCalledTimes(sounds.length);
    expect(host.soundscape.setSoundBuffer).toHaveBeenCalledTimes(sounds.length - 1);
    expect(host.soundscape.setSoundBuffer.mock.calls.some(([kind]: [string]) => kind === failedSound)).toBe(false);
  });

  it("does not load before an audio context and soundscape exist", () => {
    const { host } = harness(platform);
    host.audio = undefined;
    host.beginEffectsAssetLoad();
    expect(host.decodeAudioAsset).not.toHaveBeenCalled();
    expect(host.loadAssetSubpackage).not.toHaveBeenCalled();
  });

  it("leaves timeover unloaded on decode failure without holding any pending playback", async () => {
    const { host, done } = harness(platform, "timeover");
    host.beginEffectsAssetLoad();
    await expect(done()).resolves.toBeUndefined();
    expect(host.soundscape.setSoundBuffer).toHaveBeenCalledTimes(sounds.length - 1);
    expect(host.soundscape.setSoundBuffer.mock.calls.some(([kind]: [string]) => kind === "timeover")).toBe(false);
  });

  it("forwards timeover stop without creating or loading audio", () => {
    const { host } = harness(platform);
    host.stopSound("timeover");
    expect(host.soundscape.stopSound).toHaveBeenCalledExactlyOnceWith("timeover");
    expect(host.decodeAudioAsset).not.toHaveBeenCalled();
    expect(host.loadAssetSubpackage).not.toHaveBeenCalled();
    host.soundscape = undefined;
    host.audio = undefined;
    expect(() => host.stopSound("timeover")).not.toThrow();
    expect(host.soundscape).toBeUndefined();
    expect(host.audio).toBeUndefined();
  });
});

it("retries a failed WeChat audio subpackage without reverting to WAV", async () => {
  const { host, done } = harness("wechat");
  host.loadAssetSubpackage.mockRejectedValueOnce(new Error("offline"));
  host.beginEffectsAssetLoad();
  await done();
  expect(host.effectsAssetLoading).toBeUndefined();
  expect(host.decodeAudioAsset).not.toHaveBeenCalled();
  host.beginEffectsAssetLoad();
  await done();
  expect(host.loadAssetSubpackage).toHaveBeenCalledTimes(2);
  expect(host.decodeAudioAsset).toHaveBeenCalledTimes(sounds.length);
});

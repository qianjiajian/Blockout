import { afterEach, describe, expect, it, vi } from "vitest";
import { WechatHost } from "../src/platform/WechatHost";

const names = ["panel", "top-left", "top-right", "bottom-left", "bottom-right", "top", "bottom", "left", "right"];
const prefix = "assets/art/gameplay/mechanics/shutter-nine-slice-v1/";

type PackageRequest = { name: string; success: () => void; fail: (error: unknown) => void };

function createHost(loadSubpackage: (request: PackageRequest) => void) {
  const sources: string[] = [];
  const createImage = vi.fn(() => ({
    onload: null as (() => void) | null,
    onerror: null as ((error: unknown) => void) | null,
    set src(value: string) {
      sources.push(value);
      if (value) queueMicrotask(() => this.onload?.());
    },
  }));
  vi.stubGlobal("wx", {
    getWindowInfo: () => ({ screenWidth: 360, screenHeight: 792, pixelRatio: 2 }),
    createCanvas: () => ({ width: 0, height: 0, getContext: () => ({}), createImage }),
    loadSubpackage,
  });
  return { host: new WechatHost(), sources, createImage };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("WeChat shutter nine-slice resources", () => {
  it("loads all nine pieces from one gameplay-art package shared with existing mechanism art", async () => {
    let packageRequest: PackageRequest | undefined;
    const loadSubpackage = vi.fn((request: PackageRequest) => { packageRequest = request; });
    const { host, sources, createImage } = createHost(loadSubpackage);
    const pending = names.map((name) => host.createImage(`${prefix}${name}.png`));
    pending.push(host.createImage("assets/art/gameplay/mechanics/revised-reference-v1/shutter-strip.png"));

    expect(loadSubpackage).toHaveBeenCalledTimes(1);
    expect(packageRequest?.name).toBe("gameplay-art");
    expect(createImage).not.toHaveBeenCalled();
    packageRequest!.success();
    await Promise.all(pending);

    expect(sources).toEqual([
      ...names.map((name) => `gameplay-art/shutter-nine-slice/${name}.png`),
      "gameplay-art/revised-mechanisms/shutter-strip.png",
    ]);
    await host.createImage(`${prefix}panel.png`);
    expect(loadSubpackage).toHaveBeenCalledTimes(1);
    expect(sources.at(-1)).toBe("gameplay-art/shutter-nine-slice/panel.png");
  });

  it("does not try missing main-package copies on download failure and allows a later retry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const loadSubpackage = vi.fn((request: PackageRequest) => {
      queueMicrotask(() => {
        if (loadSubpackage.mock.calls.length === 1) request.fail({ errMsg: "offline" });
        else request.success();
      });
    });
    const { host, sources, createImage } = createHost(loadSubpackage);
    await expect(host.createImage(`${prefix}top-left.png`)).rejects.toThrow("offline");
    expect(createImage).not.toHaveBeenCalled();
    expect(sources).toEqual([]);
    await host.createImage(`${prefix}top-left.png`);
    expect(loadSubpackage).toHaveBeenCalledTimes(2);
    expect(sources).toEqual(["gameplay-art/shutter-nine-slice/top-left.png"]);
  });
});

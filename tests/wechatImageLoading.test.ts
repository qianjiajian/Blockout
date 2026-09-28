import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WechatHost } from "../src/platform/WechatHost";
import { REVISED_MECHANISM_ART_PATHS } from "../src/game/revisedMechanismArt";

type ImageCallback = ((event?: unknown) => void) | null;

class NativeImageStub {
  readonly sources: string[] = [];
  private loaded: ImageCallback = null;
  private failed: ImageCallback = null;
  private source = "";

  constructor(
    private readonly assignSource: (image: NativeImageStub, source: string) => void = () => {},
    private readonly rejectHandlerCleanup = false,
  ) {}

  get onload(): ImageCallback { return this.loaded; }
  set onload(callback: ImageCallback) {
    if (callback === null && this.rejectHandlerCleanup) throw new Error("native onload setter");
    this.loaded = callback;
  }
  get onerror(): ImageCallback { return this.failed; }
  set onerror(callback: ImageCallback) {
    if (callback === null && this.rejectHandlerCleanup) throw new Error("native onerror setter");
    this.failed = callback;
  }
  get src(): string { return this.source; }
  set src(source: string) {
    this.sources.push(source);
    this.source = source;
    this.assignSource(this, source);
  }
}

const succeed = (image: NativeImageStub, source: string): void => {
  if (source) queueMicrotask(() => image.onload?.());
};

const createHost = (images: NativeImageStub[], extraWx: Record<string, unknown> = {}) => {
  const createImage = vi.fn(() => images.shift());
  vi.stubGlobal("wx", {
    getWindowInfo: () => ({ screenWidth: 360, screenHeight: 792, pixelRatio: 2 }),
    createCanvas: () => ({ width: 0, height: 0, getContext: () => ({}), createImage }),
    ...extraWx,
  });
  return { host: new WechatHost(), createImage };
};

describe("WeChat native image failure cleanup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("retains native error details and both source paths, then retries with a fresh image", async () => {
    const failed = new NativeImageStub((image, source) => {
      if (source) queueMicrotask(() => image.onerror?.({ errMsg: "decode unsupported", message: "bad format", code: 42 }));
    });
    const recovered = new NativeImageStub(succeed);
    const source = "assets/art/gameplay/blocks/formal-v1/blue-single.png";
    const mapped = "gameplay-art/formal-v1/blue-single.png";
    const loadSubpackage = vi.fn((options: { success: () => void }) => options.success());
    const { host } = createHost([failed, recovered], { loadSubpackage });

    await expect(host.createImage(source)).rejects.toThrow("errMsg=decode unsupported; message=bad format; code=42");
    expect(failed.src).toBe("");
    expect(failed.onload).toBeNull();
    expect(failed.onerror).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    expect(console.error).toHaveBeenCalledWith("[wechat-assets]", {
      src: source,
      mappedSource: mapped,
      error: expect.stringContaining("code=42"),
    });

    await expect(host.createImage(source)).resolves.toBe(recovered);
    expect(recovered.sources).toEqual([mapped]);
    expect(recovered.onload).toBeNull();
    expect(recovered.onerror).toBeNull();
    expect(loadSubpackage).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cleans a synchronous native src setter failure immediately", async () => {
    const failed = new NativeImageStub((_image, source) => {
      if (source) throw new Error("native src assignment rejected");
    });
    const { host } = createHost([failed]);
    await expect(host.createImage("assets/art/ui/home-v3/background.jpg"))
      .rejects.toThrow("native src assignment rejected");
    expect(failed.sources).toEqual(["assets/art/ui/home-v3/background.jpg", ""]);
    expect(failed.onload).toBeNull();
    expect(failed.onerror).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reports native image creation failures without leaving a timer and can retry", async () => {
    const image = new NativeImageStub(succeed);
    const { host, createImage } = createHost([image]);
    createImage.mockImplementationOnce(() => { throw new Error("native allocation failed"); });
    const source = "assets/art/ui/home-v3/background.jpg";
    await expect(host.createImage(source)).rejects.toThrow("native allocation failed");
    expect(vi.getTimerCount()).toBe(0);
    await expect(host.createImage(source)).resolves.toBe(image);
    expect(image.src).toBe(source);
  });

  it("times out a hung image, ignores its late callback, and allows a normal retry", async () => {
    const hung = new NativeImageStub();
    const recovered = new NativeImageStub(succeed);
    const { host } = createHost([hung, recovered]);
    const source = "assets/art/ui/home-v3/background.jpg";
    const pending = host.createImage(source);
    const rejection = expect(pending).rejects.toThrow("Timed out loading image after 15000ms");
    await Promise.resolve();
    const lateOnload = hung.onload;
    await vi.advanceTimersByTimeAsync(15_000);
    await rejection;
    lateOnload?.();
    expect(hung.src).toBe("");
    expect(hung.onload).toBeNull();
    expect(hung.onerror).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    expect(console.error).toHaveBeenCalledTimes(1);
    await expect(host.createImage(source)).resolves.toBe(recovered);
    expect(recovered.src).toBe(source);
  });

  it("settles failure even if native handler cleanup throws", async () => {
    const failed = new NativeImageStub((image, source) => {
      if (source) queueMicrotask(() => image.onerror?.({ errMsg: "decoder failed" }));
    }, true);
    const { host } = createHost([failed]);
    await expect(host.createImage("assets/art/ui/home-v3/coin-icon.png"))
      .rejects.toThrow("decoder failed");
    expect(failed.src).toBe("");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("preserves the original failure if native source release also throws", async () => {
    const failed = new NativeImageStub((image, source) => {
      if (source) queueMicrotask(() => image.onerror?.({ errMsg: "original decode failure" }));
      else throw new Error("native release failure");
    });
    const { host } = createHost([failed]);
    await expect(host.createImage("assets/art/ui/home-v3/coin-icon.png"))
      .rejects.toThrow("original decode failure");
    expect(failed.sources.at(-1)).toBe("");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("settles success without clearing its source even if native handler cleanup throws", async () => {
    const image = new NativeImageStub(succeed, true);
    const { host } = createHost([image]);
    const source = "assets/art/ui/home-v3/coin-icon.png";
    await expect(host.createImage(source)).resolves.toBe(image);
    expect(image.sources).toEqual([source]);
    expect(vi.getTimerCount()).toBe(0);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("preserves a subpackage error object's details and permits a fresh package attempt", async () => {
    let attempts = 0;
    const loadSubpackage = vi.fn((options: { success: () => void; fail: (error: unknown) => void }) => {
      attempts += 1;
      if (attempts === 1) options.fail({ errMsg: "loadSubpackage:fail offline", errCode: 600009 });
      else options.success();
    });
    const image = new NativeImageStub(succeed);
    const { host, createImage } = createHost([image], { loadSubpackage });
    const source = "assets/art/ui/formal-pages/shop/reference.png";
    await expect(host.createImage(source)).rejects.toThrow("errMsg=loadSubpackage:fail offline; errCode=600009");
    expect(createImage).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith("[wechat-assets]", {
      src: source,
      mappedSource: "meta-ui/formal-pages/shop/reference.png",
      error: expect.stringContaining("errCode=600009"),
    });
    expect(vi.getTimerCount()).toBe(0);
    await expect(host.createImage(source)).resolves.toBe(image);
    expect(loadSubpackage).toHaveBeenCalledTimes(2);
  });

  it("routes revised mechanism art to gameplay-art without duplicating package loads", async () => {
    const images = REVISED_MECHANISM_ART_PATHS.map(() => new NativeImageStub(succeed));
    const loadSubpackage = vi.fn((options: { name: string; success: () => void }) => {
      expect(options.name).toBe("gameplay-art");
      queueMicrotask(options.success);
    });
    const { host } = createHost([...images], { loadSubpackage });
    await expect(Promise.all(REVISED_MECHANISM_ART_PATHS.map((source) => host.createImage(source))))
      .resolves.toEqual(images);
    for (const [index, source] of REVISED_MECHANISM_ART_PATHS.entries()) {
      expect(images[index].sources).toEqual([source.replace(
        "assets/art/gameplay/mechanics/revised-reference-v1/", "gameplay-art/revised-mechanisms/",
      )]);
    }
    expect(loadSubpackage).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});

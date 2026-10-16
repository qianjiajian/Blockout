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
  it("creates a detached effect canvas while retaining the visible canvas, context and frame owner", () => {
    const context = {};
    const requestAnimationFrame = vi.fn(() => 42);
    const visible = { width: 0, height: 0, getContext: vi.fn(() => context), requestAnimationFrame };
    const effect = { width: 0, height: 0, getContext: vi.fn(() => ({})) };
    const createCanvas = vi.fn().mockReturnValueOnce(visible).mockReturnValueOnce(effect);
    const events = {
      onTouchStart: vi.fn(), onTouchMove: vi.fn(), onTouchEnd: vi.fn(), onTouchCancel: vi.fn(),
      onWindowResize: vi.fn(), onHide: vi.fn(), onShow: vi.fn(),
    };
    const { host } = createHost([], { createCanvas, ...events });
    expect(createCanvas).toHaveBeenCalledTimes(1);
    expect([visible.width, visible.height]).toEqual([720, 1584]);

    const derived = host.createOffscreenCanvas();
    derived.width = 128; derived.height = 96;

    expect(createCanvas).toHaveBeenCalledTimes(2);
    expect(derived).toBe(effect);
    expect(host.canvas).toBe(visible);
    expect(host.context).toBe(context);
    expect([visible.width, visible.height]).toEqual([720, 1584]);
    expect(visible.getContext).toHaveBeenCalledExactlyOnceWith("2d", { alpha: false });
    for (const register of Object.values(events)) expect(register).not.toHaveBeenCalled();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    const frame = vi.fn();
    expect(host.requestFrame(frame)).toBe(42);
    expect(requestAnimationFrame).toHaveBeenCalledExactlyOnceWith(frame);
    expect(requestAnimationFrame.mock.contexts[0]).toBe(visible);
  });

  it("starts distinct image packages together without decoding, and shares them with image loads", async () => {
    const callbacks = new Map<string, () => void>();
    const loadSubpackage = vi.fn((options: { name: string; success: () => void }) => {
      callbacks.set(options.name, options.success);
    });
    const image = new NativeImageStub(succeed);
    const { host, createImage } = createHost([image], { loadSubpackage });
    const paths = [
      "assets/art/gameplay/blocks/formal-v1/blue-single.png",
      "assets/art/ui/formal-pages/collection-card-atlases-v1/level-01.jpg",
      "assets/art/ui/formal-pages/collection-card-atlases-v1/level-02.jpg",
    ];
    const prepared = host.prepareImages(paths);
    expect([...callbacks.keys()]).toEqual(["gameplay-art", "collection-art"]);
    expect(createImage).not.toHaveBeenCalled();
    const loaded = host.createImage(paths[0]);
    for (const success of callbacks.values()) success();
    await prepared;
    await expect(loaded).resolves.toBe(image);
    expect(loadSubpackage).toHaveBeenCalledTimes(2);
    expect(createImage).toHaveBeenCalledTimes(1);
  });

  it("allows a failed preparation to retry through the normal image path", async () => {
    const loadSubpackage = vi.fn()
      .mockImplementationOnce((options) => options.fail({ errMsg: "offline" }))
      .mockImplementationOnce((options) => options.success());
    const image = new NativeImageStub(succeed);
    const { host } = createHost([image], { loadSubpackage });
    const path = "assets/art/ui/formal-pages/collection-card-atlases-v1/level-01.jpg";
    await expect(host.prepareImages([path])).rejects.toThrow("offline");
    await expect(host.createImage(path)).resolves.toBe(image);
    expect(loadSubpackage).toHaveBeenCalledTimes(2);
  });

  it("opens Journey with meta-ui alone while an optional Home theme package is still loading", async () => {
    const callbacks = new Map<string, () => void>();
    const loadSubpackage = vi.fn((options: { name: string; success: () => void }) => {
      callbacks.set(options.name, options.success);
    });
    const names = [
      ...Array.from({ length: 10 }, (_, index) => `episode-${String(index + 1).padStart(2, "0")}.png`),
      "episode-locked-shade.png", "episode-range-panel.png",
      "episode-selected-button.png", "episode-action-button.png",
    ];
    const images = names.map(() => new NativeImageStub(succeed));
    const home = new NativeImageStub(succeed);
    const { host, createImage } = createHost([...images, home], { loadSubpackage });
    const prefix = "assets/art/ui/formal-pages/journey/";
    // The existing menu prefetch can prepare this whole UI dependency without
    // allocating native images or requesting the nine full-screen backgrounds.
    const prepared = host.prepareImages([`${prefix}background.jpg`, ...names.map(name => prefix + name)]);
    expect([...callbacks.keys()]).toEqual(["meta-ui"]);
    expect(createImage).not.toHaveBeenCalled();
    const journeyImages = Promise.all(names.map((name, index) => host.createImage(`${index % 2 ? "/" : ""}${prefix}${name}`)));
    const homeImage = host.createImage(`${prefix}home-02.jpg`);
    expect([...callbacks.keys()]).toEqual(["meta-ui", "journey-themes"]);

    callbacks.get("meta-ui")!();
    await prepared;
    await expect(journeyImages).resolves.toEqual(images);
    for (const [index, name] of names.entries()) {
      expect(images[index].sources).toEqual([`meta-ui/formal-pages/journey/${name}`]);
    }
    expect(home.sources).toEqual([]);
    expect(loadSubpackage).toHaveBeenCalledTimes(2);

    callbacks.get("journey-themes")!();
    await expect(homeImage).resolves.toBe(home);
    expect(home.sources).toEqual(["journey-themes/home-02.jpg"]);
    expect(vi.getTimerCount()).toBe(0);
  });
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

  it.each([
    ['assets/art/ui/league-video-v1/background.jpg', 'event-ui', 'event-ui/league-video-v1/background.jpg'],
    ['assets/art/ui/league-video-v1/score-token.png', 'league-ui', 'league-ui/league-video-v1/score-token.png'],
    ['assets/art/ui/league-video-v1/glory.png', 'league-ui', 'league-ui/league-video-v1/glory.png'],
    ['assets/art/ui/league-rank-badges-v2/bronze.png', 'league-ui', 'league-ui/league-rank-badges-v2/bronze.png'],
    ['assets/art/ui/league-supplied-v1/row-regular.png', 'league-ui', 'league-ui/league-supplied-v1/row-regular.png'],
    ['assets/art/ui/league-settlement-supplied-v1/result-panel.png', 'league-ui', 'league-ui/league-settlement-supplied-v1/result-panel.png'],
    ['assets/art/ui/daily-challenge-v2/panel-frame.png', 'event-ui', 'event-ui/daily-challenge-v2/panel-frame.png'],
    ['assets/art/ui/icons/tutorial-hand-supplied-v2.png', 'event-ui', 'event-ui/tutorial-hand-supplied-v2.png'],
    ['assets/art/ui/formal-pages/booster-purchase-reference-v1/panel.png', 'event-ui', 'event-ui/booster-purchase-reference-v1/panel.png'],
    ['assets/art/ui/daily-challenge-supplied-v1/reward-banner.png', 'event-ui', 'event-ui/daily-challenge-supplied-v1/reward-banner.png'],
    ['assets/art/ui/daily-success-supplied-v1/panel.png', 'event-ui', 'event-ui/daily-success-supplied-v1/panel.png'],
    ['assets/art/ui/profile-reference-v1/avatar-0.png', 'event-ui', 'event-ui/profile-reference-v1/avatar-0.png'],
    ['assets/art/ui/profile-unlocks-v1/avatar-5.png', 'event-ui', 'event-ui/profile-unlocks-v1/avatar-5.png'],
    ['assets/art/ui/profile-frames-supplied-v1/frame-0.png', 'event-ui', 'event-ui/profile-frames-supplied-v1/frame-0.png'],
    ['assets/art/ui/profile-frames-supplied-v1/frame-18.png', 'event-ui', 'event-ui/profile-frames-supplied-v1/frame-18.png'],
    ['assets/art/ui/icons/system-icons-v1.png', 'event-ui', 'event-ui/icons/system-icons-v1.png'],
    ['assets/art/ui/notifications/discovery-badge-v1.png', 'event-ui', 'event-ui/notifications/discovery-badge-v1.png'],
  ].flatMap(([source, packageName, mapped]) => [
    [source, packageName, mapped],
    [`/${source}`, packageName, mapped],
  ]))('loads the event package before decoding %s', async (source, packageName, mapped) => {
    let ready = false;
    const image = new NativeImageStub((image, source) => {
      if (source) { expect(ready).toBe(true); succeed(image, source); }
    });
    const loadSubpackage = vi.fn((options: { name: string; success: () => void }) => {
      expect(options.name).toBe(packageName);
      queueMicrotask(() => { ready = true; options.success(); });
    });
    const { host } = createHost([image], { loadSubpackage });
    await expect(host.createImage(source)).resolves.toBe(image);
    expect(image.sources).toEqual([mapped]);
    expect(loadSubpackage).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    ['/assets/art/ui/home-v3/coin-icon.png', 'assets/art/ui/home-v3/coin-icon.png'],
    ['https://example.test/assets/art/ui/league-video-v1/glory.png', 'https://example.test/assets/art/ui/league-video-v1/glory.png'],
    ['//example.test/assets/art/ui/league-video-v1/glory.png', '//example.test/assets/art/ui/league-video-v1/glory.png'],
  ])('normalizes only local package asset paths: %s', async (source, mapped) => {
    const image = new NativeImageStub(succeed);
    const loadSubpackage = vi.fn();
    const { host } = createHost([image], { loadSubpackage });
    await expect(host.createImage(source)).resolves.toBe(image);
    expect(image.sources).toEqual([mapped]);
    expect(loadSubpackage).not.toHaveBeenCalled();
  });

  it("does not load the menu-music subpackage for retired music-player art paths", async () => {
    const image = new NativeImageStub(succeed);
    const loadSubpackage = vi.fn((options: { name: string; success: () => void }) => {
      queueMicrotask(options.success);
    });
    const { host } = createHost([image], { loadSubpackage });
    const source = "assets/art/ui/music-player-v1/music-panel-frame.png";
    await expect(host.createImage(source)).resolves.toBe(image);
    // This stub checks routing only; the removed player assets are not shipped.
    expect(image.sources).toEqual([source]);
    expect(loadSubpackage).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});

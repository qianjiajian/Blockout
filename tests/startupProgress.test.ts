import { describe, expect, it, vi } from "vitest";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";

const image = (id: string): HTMLImageElement => ({ id } as unknown as HTMLImageElement);

type LoaderGame = {
  loadImages(
    paths: readonly string[],
    concurrency?: number,
    onImageLoaded?: (loaded: number, total: number) => void,
  ): Promise<HTMLImageElement[]>;
  artLoadedImageCount: number;
};

const loaderFixture = (createImage: (path: string) => Promise<HTMLImageElement>) => {
  const releaseImage = vi.fn();
  const game = Object.assign(Object.create(ColorEscapeGame.prototype), {
    host: { createImage, releaseImage, prepareImages: vi.fn(async () => undefined) },
    artLoadedImageCount: 0,
  }) as LoaderGame;
  return { game, releaseImage };
};

describe("startup image loading progress", () => {
  it("maps shell and gameplay batches to a monotonic startup percentage", () => {
    const { game } = loaderFixture(async (path: string) => image(path));
    Object.assign(game, { scheduleFrame: vi.fn(), dirty: false });
    const runtime = game as unknown as {
      updateStartupProgress: (phase: "shell" | "deferred", loaded: number, total: number) => void;
      startupProgressValue: number;
      startupProgressPhase: string;
    };

    runtime.updateStartupProgress("shell", 0, 10);
    expect(runtime.startupProgressValue).toBeCloseTo(0.04);
    runtime.updateStartupProgress("shell", 10, 10);
    expect(runtime.startupProgressValue).toBeCloseTo(0.38);
    runtime.updateStartupProgress("deferred", 0, 10);
    expect(runtime.startupProgressValue).toBeCloseTo(0.38);
    runtime.updateStartupProgress("deferred", 10, 10);
    expect(runtime.startupProgressValue).toBeCloseTo(0.96);
    expect(runtime.startupProgressPhase).toBe("deferred");
  });

  it("reports each successful image once with the batch total", async () => {
    const createImage = vi.fn(async (path: string) => image(path));
    const { game } = loaderFixture(createImage);
    const progress: Array<[number, number]> = [];

    const loaded = await game.loadImages(["shell-a", "shell-b", "gameplay"], 1,
      (count, total) => progress.push([count, total]));

    expect(loaded).toHaveLength(3);
    expect(createImage).toHaveBeenCalledTimes(3);
    expect(progress).toEqual([[1, 3], [2, 3], [3, 3]]);
    expect(game.artLoadedImageCount).toBe(3);
  });

  it("never reports a failed image as loaded and releases the partial batch", async () => {
    const failed = new Error("offline");
    const createImage = vi.fn()
      .mockResolvedValueOnce(image("shell-a"))
      .mockRejectedValueOnce(failed);
    const { game, releaseImage } = loaderFixture(createImage);
    const progress: Array<[number, number]> = [];

    await expect(game.loadImages(["shell-a", "shell-b", "gameplay"], 1,
      (count, total) => progress.push([count, total]))).rejects.toBe(failed);

    expect(progress).toEqual([[1, 3]]);
    expect(releaseImage).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: "shell-a" }));
    expect(game.artLoadedImageCount).toBe(0);
  });
});

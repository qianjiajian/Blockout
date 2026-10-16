import { ProceduralSoundscape, RECORDED_MUSIC_LOOP_DURATIONS } from "../audio/ProceduralSoundscape";
import type { MusicTrack } from "../audio/ProceduralSoundscape";
import { MUSIC_CATALOG, musicTrackForScene } from "../audio/musicCatalog";
import type { GameHost, MusicScene, MusicTransport, PointerHandlers, PointerSample, SoundKind, StorageReadResult, Viewport } from "./Host";
import { filteredRawLocales } from "./preferredLocales";
import { readWechatWindowInfo } from "./wechatRuntime";
import { WechatRewardedVideoAdapter } from "./rewardedVideoAd";
import { WECHAT_REWARDED_AD_UNIT_ID } from "./rewardedAdConfig";
import { requestWechatProvince } from "./leaderboardRegion";

declare const wx: any;

// A cold device has to download the roughly 3-4 MiB art subpackages before an
// image can be created from them. Five seconds was short enough to reject a
// healthy mobile download and leave startup on the retry screen. Keep the
// network/package budget separate from the local image decode budget.
const WECHAT_SUBPACKAGE_TIMEOUT_MS = 60_000;
const WECHAT_IMAGE_TIMEOUT_MS = 15_000;
const WECHAT_MUSIC_RETRY_DELAY_MS = 3_000;

const wechatAssetErrorDetail = (error: unknown): string => {
  if (error == null) return "";
  if (typeof error === "object") {
    const details: string[] = [];
    for (const key of ["errMsg", "message", "code", "errCode"]) {
      try {
        const value = (error as Record<string, unknown>)[key];
        if (typeof value === "string" || typeof value === "number") details.push(`${key}=${value}`);
      } catch { /* native error properties may be inaccessible */ }
    }
    if (details.length) return details.join("; ");
    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== "{}") return serialized;
    } catch { /* native events can contain circular references */ }
  }
  return String(error);
};

const reportWechatAssetFailure = (src: string, mappedSource: string, error: unknown): void => {
  try {
    console.error("[wechat-assets]", { src, mappedSource, error: wechatAssetErrorDetail(error) });
  } catch { /* diagnostic output must not prevent a failed request settling */ }
};

const detachWechatImageHandlers = (image: HTMLImageElement): void => {
  try { image.onload = null; } catch { /* best-effort native handler cleanup */ }
  try { image.onerror = null; } catch { /* clean the other handler independently */ }
};
type AssetSubpackage = "meta-ui" | "gameplay-art" | "journey-themes" | "collection-art" | "audio" | "menu-music" | "league-ui" | "event-ui";
type MusicAssetSubpackage = Extract<AssetSubpackage, "audio" | "menu-music">;
const WECHAT_MUSIC_ASSETS: Partial<Record<MusicTrack, { path: string; subpackage: MusicAssetSubpackage }>> = Object.fromEntries(
  MUSIC_CATALOG.filter((entry) => entry.wechatPath && entry.wechatSubpackage)
    .map((entry) => [entry.id, { path: entry.wechatPath!, subpackage: entry.wechatSubpackage! }]),
) as Partial<Record<MusicTrack, { path: string; subpackage: MusicAssetSubpackage }>>;
const RECORDED_SOUND_KINDS = [
  "blocked", "exit", "ice", "thaw", "win", "button", "putdown", "fail",
  "reward", "gold", "itemArrival", "booster", "unlock",
  "time", "rocket", "pulse", "mechanic", "shell", "shutter", "timeover",
] as const satisfies readonly SoundKind[];


interface WechatTouchLike {
  identifier?: unknown;
  clientX?: unknown;
  clientY?: unknown;
  pageX?: unknown;
  pageY?: unknown;
  x?: unknown;
  y?: unknown;
}

const touchArray = (value: unknown): WechatTouchLike[] => {
  if (!value || typeof value !== "object") return [];
  try { return Array.from(value as ArrayLike<WechatTouchLike>); } catch { return []; }
};

const touchSample = (touch: WechatTouchLike | undefined): PointerSample | undefined => {
  if (!touch) return undefined;
  const x = Number(touch.clientX ?? touch.pageX ?? touch.x);
  const y = Number(touch.clientY ?? touch.pageY ?? touch.y);
  const id = Number(touch.identifier ?? 0);
  if (!Number.isFinite(id) || !Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  return { id, x, y };
};

/** Keeps one primary WeChat touch stable even when changedTouches is reordered. */
export class WechatTouchRouter {
  private activeId?: number;
  private lastSample?: PointerSample;

  constructor(private readonly handlers: PointerHandlers) {}

  start(event: any): void {
    if (this.activeId !== undefined) return;
    const touch = touchArray(event?.changedTouches)[0] ?? touchArray(event?.touches)[0];
    const sample = touchSample(touch);
    if (!sample) return;
    this.activeId = sample.id;
    this.lastSample = sample;
    this.handlers.down(sample);
  }

  move(event: any): void {
    if (this.activeId === undefined) return;
    const changed = touchArray(event?.changedTouches);
    const activeTouches = touchArray(event?.touches);
    const changedOwner = changed.find((touch) => Number(touch.identifier ?? 0) === this.activeId);
    const owner = changedOwner
      ?? activeTouches.find((touch) => Number(touch.identifier ?? 0) === this.activeId);
    const sample = touchSample(owner);
    if (!sample) return;
    if (!changedOwner && this.lastSample
      && sample.x === this.lastSample.x && sample.y === this.lastSample.y) return;
    this.lastSample = sample;
    this.handlers.move(sample);
  }

  end(event: any): void { this.finish(event, "up"); }
  cancel(event: any): void { this.finish(event, "cancel"); }

  reset(): void {
    this.activeId = undefined;
    this.lastSample = undefined;
  }

  private finish(event: any, kind: "up" | "cancel"): void {
    if (this.activeId === undefined) return;
    const changed = touchArray(event?.changedTouches);
    let sample = touchSample(changed.find((touch) => Number(touch.identifier ?? 0) === this.activeId));
    if (!sample) {
      const activeStillPresent = touchArray(event?.touches)
        .some((touch) => Number(touch.identifier ?? 0) === this.activeId);
      if (!activeStillPresent) sample = this.lastSample;
    }
    if (!sample) return;
    this.handlers[kind](sample);
    this.reset();
  }
}

export class WechatHost implements GameHost {
  private rewardedVideo?: WechatRewardedVideoAdapter;
  private rewardedVideoAdapter(): WechatRewardedVideoAdapter {
    return this.rewardedVideo ??= new WechatRewardedVideoAdapter(wx, WECHAT_REWARDED_AD_UNIT_ID);
  }
  isRewardedAdAvailable(): boolean { return this.rewardedVideoAdapter().isAvailable(); }
  showRewardedAd(requestId: string) { return this.rewardedVideoAdapter().show(requestId); }
  resolveLeaderboardProvince() { return requestWechatProvince(wx); }
  openTextInput(options: { value: string; maxLength: number; rect: { x: number; y: number; width: number; height: number }; onChange(value: string): void }): () => void {
    const change = (event: { value: string }) => options.onChange(event.value);
    wx.onKeyboardInput?.(change); wx.showKeyboard?.({defaultValue:options.value,maxLength:options.maxLength,multiple:false,confirmHold:false,confirmType:"done"});
    return () => {wx.offKeyboardInput?.(change);wx.hideKeyboard?.();};
  }
  copyText(value: string): Promise<boolean> { return new Promise(resolve => wx.setClipboardData({data:value,success:()=>resolve(true),fail:()=>resolve(false)})); }
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
  private system: any;
  private audio?: any;
  private soundscape?: ProceduralSoundscape;
  private musicScene: MusicScene = "menu";
  private musicEnabled = false;
  private selectedMusicTrack?: MusicTrack;
  private musicPlaylist: MusicTrack[] = [];
  private retainedMusicTrack: MusicTrack = "menu";
  private readonly retainedMusicTracks = new Set<MusicTrack>(["menu"]);
  private readonly musicAssetLoads: Partial<Record<MusicTrack, Promise<void>>> = {};
  private readonly musicRetryAfter: Partial<Record<MusicTrack, number>> = {};
  private effectsAssetLoading?: Promise<void>;
  private visible = true;
  private touchRouter?: WechatTouchRouter;
  private assetSubpackages: Partial<Record<AssetSubpackage, Promise<void>>> = {};

  constructor() {
    this.system = readWechatWindowInfo(wx);
    this.canvas = wx.createCanvas() as HTMLCanvasElement;
    const pixelRatio = Math.min(this.system.pixelRatio || 1, 2);
    this.canvas.width = Math.round(this.system.screenWidth * pixelRatio);
    this.canvas.height = Math.round(this.system.screenHeight * pixelRatio);
    this.context = this.canvas.getContext("2d", { alpha: false })!;
    this.rewardedVideoAdapter().preload();
  }

  createOffscreenCanvas(): HTMLCanvasElement { return wx.createCanvas() as HTMLCanvasElement; }

  viewport(): Viewport {
    const info = this.system;
    const safe = info.safeArea ?? { top: 0, bottom: info.screenHeight };
    return {
      width: info.screenWidth,
      height: info.screenHeight,
      pixelRatio: Math.min(info.pixelRatio || 1, 2),
      safeTop: safe.top ?? 0,
      safeBottom: Math.max(0, info.screenHeight - (safe.bottom ?? info.screenHeight)),
    };
  }

  preferredLocales(): readonly string[] {
    try {
      if (typeof wx.getAppBaseInfo === "function") {
        const preferred = filteredRawLocales([wx.getAppBaseInfo()?.language]);
        if (preferred.length > 0) return preferred;
      }
    } catch { /* older or restricted clients fall back to cached system info */ }
    return filteredRawLocales([this.system?.language]);
  }

  onPointer(handlers: PointerHandlers): void {
    const router = new WechatTouchRouter(handlers);
    this.touchRouter = router;
    wx.onTouchStart((event: any) => {
      // A music-only player still needs the first native gesture to resume
      // audio. Do this before gameplay handles the gesture or emits an effect.
      if (this.visible && (this.audio || this.musicEnabled)) {
        this.ensureAudio(true);
        this.music(this.musicScene, this.musicEnabled, this.selectedMusicTrack, this.musicPlaylist);
      }
      router.start(event);
    });
    wx.onTouchMove((event: any) => router.move(event));
    wx.onTouchEnd((event: any) => router.end(event));
    wx.onTouchCancel((event: any) => router.cancel(event));
  }

  onHide(callback: () => void): void {
    wx.onHide(() => {
      this.visible = false;
      this.rewardedVideoAdapter().setVisible(false);
      this.soundscape?.suspend();
      this.touchRouter?.reset();
      callback();
    });
  }
  onShow(callback: () => void): void {
    wx.onShow(() => {
      this.visible = true;
      this.rewardedVideoAdapter().setVisible(true);
      this.soundscape?.resume();
      callback();
    });
  }
  isVisible(): boolean { return this.visible; }
  onResize(callback: () => void): void {
    wx.onWindowResize?.(() => {
      this.system = readWechatWindowInfo(wx);
      const pixelRatio = Math.min(this.system.pixelRatio || 1, 2);
      this.canvas.width = Math.round(this.system.screenWidth * pixelRatio);
      this.canvas.height = Math.round(this.system.screenHeight * pixelRatio);
      callback();
    });
  }
  requestFrame(callback: FrameRequestCallback): number {
    const request = (this.canvas as any).requestAnimationFrame ?? requestAnimationFrame;
    return request.call(this.canvas, callback);
  }
  scheduleTimeout(callback: () => void, delayMs: number): number { return setTimeout(callback, delayMs); }
  cancelTimeout(handle: number): void { clearTimeout(handle); }

  private loadAssetSubpackage(name: AssetSubpackage): Promise<void> {
    if (typeof wx.loadSubpackage !== "function") {
      return Promise.reject(new Error(`WeChat base library is too old for the ${name} subpackage; please upgrade WeChat`));
    }
    if (!this.assetSubpackages[name]) {
      const timeoutMs = WECHAT_SUBPACKAGE_TIMEOUT_MS;
      const pending = new Promise<void>((resolve, reject) => {
        let settled = false;
        const finish = (callback: () => void) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          callback();
        };
        const timeout = setTimeout(() => finish(() => reject(new Error(
          `Timed out loading ${name} subpackage after ${timeoutMs}ms`,
        ))), timeoutMs);
        try {
          wx.loadSubpackage({
            name,
            success: () => finish(resolve),
            fail: (error: unknown) => finish(() => reject(new Error(`Could not load ${name} subpackage: ${wechatAssetErrorDetail(error)}`))),
          });
        } catch (error) {
          finish(() => reject(new Error(`Could not start ${name} subpackage load: ${wechatAssetErrorDetail(error)}`)));
        }
      });
      const guarded = pending.catch((error: unknown) => {
        if (this.assetSubpackages[name] === guarded) delete this.assetSubpackages[name];
        throw error;
      });
      this.assetSubpackages[name] = guarded;
    }
    return this.assetSubpackages[name]!;
  }

  private prepareImageSource(src: string): Promise<string> {
    // Some shared loaders use web-root asset paths. Native package paths are
    // relative; normalize only local assets and leave remote URLs untouched.
    const localSource = src.startsWith("/assets/") ? src.slice(1) : src;
    const routes = [
      {
        prefix: "assets/art/ui/league-video-v1/background.",
        packageName: "event-ui" as const,
        outputRoot: "event-ui/league-video-v1/background.",
      },
      {
        prefix: "assets/art/ui/league-video-v1/",
        packageName: "league-ui" as const,
        outputRoot: "league-ui/league-video-v1/",
      },
      {
        prefix: "assets/art/ui/league-rank-badges-v2/",
        packageName: "league-ui" as const,
        outputRoot: "league-ui/league-rank-badges-v2/",
      },
      {
        prefix: "assets/art/ui/league-supplied-v1/",
        packageName: "league-ui" as const,
        outputRoot: "league-ui/league-supplied-v1/",
      },
      {
        prefix: "assets/art/ui/league-settlement-supplied-v1/",
        packageName: "league-ui" as const,
        outputRoot: "league-ui/league-settlement-supplied-v1/",
      },
      {
        prefix: "assets/art/ui/daily-challenge-v2/",
        packageName: "event-ui" as const,
        outputRoot: "event-ui/daily-challenge-v2/",
      },
      {
        prefix: "assets/art/ui/icons/tutorial-hand-supplied-v2.png",
        packageName: "event-ui" as const,
        outputRoot: "event-ui/tutorial-hand-supplied-v2.png",
      },
      ...["daily-challenge-supplied-v1", "daily-success-supplied-v1", "profile-reference-v1",
        "profile-unlocks-v1", "profile-supplied-v2", "profile-frames-supplied-v1", "icons", "notifications"].map(group => ({
        prefix: `assets/art/ui/${group}/`,
        packageName: "event-ui" as const,
        outputRoot: `event-ui/${group}/`,
      })),
      {
        prefix: "assets/art/ui/formal-pages/booster-purchase-reference-v1/",
        packageName: "event-ui" as const,
        outputRoot: "event-ui/booster-purchase-reference-v1/",
      },
      {
        prefix: "assets/art/ui/formal-pages/journey/home-",
        packageName: "journey-themes" as const,
        outputRoot: "journey-themes/home-",
      },
      {
        prefix: "assets/art/ui/formal-pages/collection-card-atlases-v1/",
        packageName: "collection-art" as const,
        outputRoot: "collection-art/atlases/",
      },
      {
        prefix: "assets/art/ui/formal-pages/",
        packageName: "meta-ui" as const,
        outputRoot: "meta-ui/formal-pages/",
      },
      {
        prefix: "assets/art/gameplay/blocks/formal-v1/",
        packageName: "gameplay-art" as const,
        outputRoot: "gameplay-art/formal-v1/",
      },
      {
        prefix: "assets/art/gameplay/mechanics/revised-reference-v1/",
        packageName: "gameplay-art" as const,
        outputRoot: "gameplay-art/revised-mechanisms/",
      },
      {
        prefix: "assets/art/gameplay/mechanics/shutter-nine-slice-v1/",
        packageName: "gameplay-art" as const,
        outputRoot: "gameplay-art/shutter-nine-slice/",
      },
    ];
    const route = routes.find((candidate) => localSource.startsWith(candidate.prefix));
    if (!route) return Promise.resolve(localSource);
    const mappedSource = `${route.outputRoot}${localSource.slice(route.prefix.length)}`;
    return this.loadAssetSubpackage(route.packageName)
      .then(() => mappedSource)
      .catch((error: unknown) => {
        reportWechatAssetFailure(src, mappedSource, error);
        throw error;
      });
  }

  async prepareImages(paths: readonly string[]): Promise<void> {
    await Promise.all(paths.map((path) => this.prepareImageSource(path)));
  }

  async createImage(src: string): Promise<HTMLImageElement> {
    const preparedSource = await this.prepareImageSource(src);
    return new Promise((resolve, reject) => {
      let image: HTMLImageElement | undefined;
      let settled = false;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (image) {
          if (error) this.releaseImage(image);
          else detachWechatImageHandlers(image);
        }
        if (error) {
          reportWechatAssetFailure(src, preparedSource, error);
          reject(error);
        } else {
          resolve(image!);
        }
      };
      const fail = (error: unknown) => {
        const detail = wechatAssetErrorDetail(error);
        finish(new Error(`Could not load image: ${preparedSource}${detail ? `; ${detail}` : ""}`));
      };
      try {
        image = ((this.canvas as any).createImage?.() ?? wx.createImage()) as HTMLImageElement;
        timeout = setTimeout(() => finish(new Error(
          `Timed out loading image after ${WECHAT_IMAGE_TIMEOUT_MS}ms: ${preparedSource}`,
        )), WECHAT_IMAGE_TIMEOUT_MS);
        image.onload = () => finish();
        image.onerror = (error) => fail(error);
        image.src = preparedSource;
      } catch (error) {
        fail(error);
      }
    });
  }

  releaseImage(image: HTMLImageElement): void {
    detachWechatImageHandlers(image);
    try { image.src = ""; } catch { /* best-effort decoded-image release */ }
  }

  storageRead<T>(key: string): StorageReadResult<T> {
    try {
      const value = wx.getStorageSync(key);
      return value === "" || value == null
        ? { status: "missing" }
        : { status: "ok", value: value as T };
    } catch {
      return { status: "unavailable" };
    }
  }

  storageGet<T>(key: string, fallback: T): T {
    const result = this.storageRead<T>(key);
    return result.status === "ok" ? result.value : fallback;
  }

  storageSet<T>(key: string, value: T): boolean {
    try {
      wx.setStorageSync(key, value);
      return true;
    } catch {
      return false;
    }
  }

  async prepareAudio(scene: MusicScene, options: { music: boolean; sound: boolean }): Promise<void> {
    if (!options.music && !options.sound) return;
    // Decode while the startup art is loading, without playing a synthetic
    // effect or beginning the soundtrack before the game selects its scene.
    this.ensureAudio(false);
    if (!this.audio || !this.soundscape) return;
    const pending: Promise<void>[] = [];
    const track = options.music ? musicTrackForScene(scene) : undefined;
    if (track) {
      this.retainMusicTracks(new Set([track]));
      const load = this.beginMusicAssetLoad(track);
      if (load) pending.push(load);
    }
    if (options.sound) {
      const load = this.beginEffectsAssetLoad();
      if (load) pending.push(load);
    }
    await Promise.allSettled(pending);
  }

  private ensureAudio(resume: boolean): void {
    try {
      this.audio ??= wx.createWebAudioContext?.();
      if (!this.audio) return;
      if (!this.soundscape) {
        this.soundscape = new ProceduralSoundscape(this.audio as AudioContext);
        if (!this.visible) this.soundscape.suspend();
      }
      if (resume && this.visible && this.audio.state === "suspended") {
        const resumed = this.audio.resume?.();
        if (typeof resumed?.catch === "function") void resumed.catch(() => undefined);
      }
    } catch { /* sound remains optional on older base libraries */ }
  }

  private retainMusicTracks(retained: ReadonlySet<MusicTrack>): void {
    for (const retainedTrack of this.retainedMusicTracks) {
      if (retained.has(retainedTrack)) continue;
      this.soundscape?.releaseMusicBuffer(retainedTrack);
      delete this.musicAssetLoads[retainedTrack];
      delete this.musicRetryAfter[retainedTrack];
      this.retainedMusicTracks.delete(retainedTrack);
    }
    retained.forEach((retainedTrack) => this.retainedMusicTracks.add(retainedTrack));
  }

  music(scene: MusicScene, enabled: boolean, selectedTrack?: MusicTrack, playlist?: readonly MusicTrack[]): void {
    this.musicScene = scene;
    this.musicEnabled = enabled;
    this.selectedMusicTrack = selectedTrack;
    this.musicPlaylist = this.normalizeMusicPlaylist(playlist);
    const track = musicTrackForScene(scene, selectedTrack);
    const retained = new Set<MusicTrack>(this.musicPlaylist);
    if (track) retained.add(track);
    this.retainMusicTracks(retained);
    if (track) this.retainedMusicTrack = track;
    if (enabled && this.visible) {
      this.ensureAudio(true);
      for (const candidate of retained) this.beginMusicAssetLoad(candidate);
    }
    this.soundscape?.setMusic(scene, enabled, selectedTrack, this.musicPlaylist);
  }

  musicTransport(): MusicTransport { return this.soundscape?.musicTransport() ?? { positionSeconds: 0, durationSeconds: 0, playing: false }; }
  setMusicPaused(paused: boolean): void { this.soundscape?.setMusicPaused(paused); }
  seekMusic(positionSeconds: number): void { this.soundscape?.seekMusic(positionSeconds); }

  private decodeAudioAsset(path: string): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      const fileSystem = wx.getFileSystemManager?.();
      if (!fileSystem || typeof this.audio?.decodeAudioData !== "function") {
        reject(new Error("Recorded WebAudio is unavailable"));
        return;
      }
      fileSystem.readFile({
        filePath: path,
        success: ({ data }: { data: ArrayBuffer }) => {
          let settled = false;
          const succeed = (buffer: AudioBuffer) => {
            if (settled) return;
            settled = true;
            resolve(buffer);
          };
          const fail = (error: unknown) => {
            if (settled) return;
            settled = true;
            reject(error instanceof Error ? error : new Error(String(error)));
          };
          try {
            const decoded = this.audio.decodeAudioData(data, succeed, fail);
            if (decoded?.then) void decoded.then(succeed, fail);
          } catch (error) {
            fail(error);
          }
        },
        fail: (error: unknown) => reject(new Error(`Could not read audio asset ${path}: ${String(error)}`)),
      });
    });
  }

  private beginMusicAssetLoad(track: MusicTrack): Promise<void> | undefined {
    if (this.musicAssetLoads[track]) return this.musicAssetLoads[track];
    // Scene synchronization also runs each animation frame. A quick native
    // download/decode failure must not become a new request on every frame.
    if (Date.now() < (this.musicRetryAfter[track] ?? 0)) return;
    if (!this.audio || !this.soundscape) return;
    const soundscape = this.soundscape;
    const asset = WECHAT_MUSIC_ASSETS[track];
    // New library tracks stay outside the current WeChat package budget until
    // a CDN/subpackage is assigned. The player remains usable through the
    // synth fallback and WebHost still loads the compressed local asset.
    if (!asset) {
      soundscape.useSynthMusicFallback(track);
      return;
    }
    soundscape.expectMusicBuffer(track);
    let guarded: Promise<void>;
    guarded = this.loadAssetSubpackage(asset.subpackage)
      .then(() => this.decodeAudioAsset(asset.path))
      .then((buffer) => {
        if (this.musicAssetLoads[track] !== guarded || !this.retainedMusicTracks.has(track)) return;
        delete this.musicRetryAfter[track];
        soundscape.setMusicBuffer(track, buffer, RECORDED_MUSIC_LOOP_DURATIONS[track]);
      })
      .catch(() => {
        if (this.musicAssetLoads[track] === guarded) {
          this.musicRetryAfter[track] = Date.now() + WECHAT_MUSIC_RETRY_DELAY_MS;
          soundscape.useSynthMusicFallback(track);
          delete this.musicAssetLoads[track];
        }
      });
    this.musicAssetLoads[track] = guarded;
    return guarded;
  }

  private beginEffectsAssetLoad(): Promise<void> | undefined {
    if (this.effectsAssetLoading) return this.effectsAssetLoading;
    if (!this.audio || !this.soundscape) return;
    const soundscape = this.soundscape;
    let guarded: Promise<void>;
    guarded = this.loadAssetSubpackage("audio")
      .then(async () => {
        await Promise.all(RECORDED_SOUND_KINDS.map(async (kind) => {
          try { soundscape.setSoundBuffer(kind, await this.decodeAudioAsset(`audio/sfx/${kind}.mp3`)); } catch { /* timeover stays silent; other effects retain their fallback */ }
        }));
      })
      .catch(() => {
        if (this.effectsAssetLoading === guarded) this.effectsAssetLoading = undefined;
      });
    this.effectsAssetLoading = guarded;
    return guarded;
  }

  sound(kind: SoundKind): void {
    if (!this.visible) return;
    try {
      this.ensureAudio(true);
      if (!this.soundscape) return;
      this.beginEffectsAssetLoad();
      const track = this.musicEnabled ? musicTrackForScene(this.musicScene, this.selectedMusicTrack) : undefined;
      if (track) {
        for (const candidate of new Set([track, ...this.musicPlaylist])) this.beginMusicAssetLoad(candidate);
      }
      this.soundscape.setMusic(this.musicScene, this.musicEnabled, this.selectedMusicTrack, this.musicPlaylist);
      this.soundscape.play(kind);
    } catch { /* sound is optional on older base libraries */ }
  }

  stopSound(kind: SoundKind): void {
    this.soundscape?.stopSound(kind);
  }

  vibrate(kind: "light" | "medium"): void {
    try { wx.vibrateShort({ type: kind === "medium" ? "heavy" : "light" }); } catch { /* optional */ }
  }

  private normalizeMusicPlaylist(playlist?: readonly MusicTrack[]): MusicTrack[] {
    if (!playlist) return [];
    const normalized: MusicTrack[] = [];
    for (const track of playlist) {
      if (!MUSIC_CATALOG.some((entry) => entry.id === track) || normalized.includes(track)) continue;
      normalized.push(track);
    }
    return normalized;
  }
}

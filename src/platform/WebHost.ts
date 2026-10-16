import { ProceduralSoundscape, RECORDED_MUSIC_LOOP_DURATIONS } from "../audio/ProceduralSoundscape";
import type { MusicTrack } from "../audio/ProceduralSoundscape";
import { MUSIC_CATALOG, musicTrackForScene } from "../audio/musicCatalog";
import type { GameHost, MusicScene, MusicTransport, PointerHandlers, SoundKind, StorageReadResult, Viewport } from "./Host";
import { filteredRawLocales } from "./preferredLocales";
import { requestWebProvince } from "./leaderboardRegion";
import { IdleImageCache } from "./IdleImageCache";

const IMAGE_LOAD_TIMEOUT_MS = 5_000;
const MUSIC_ASSET_RETRY_DELAY_MS = 3_000;
// These page loaders surrender complete ownership when closed. Collection and
// journey stores keep their own image-identity ledgers and are not pooled here.
const REUSABLE_PAGE_IMAGE = /^assets\/art\/ui\/(?:formal-pages\/(?:shop-supplied-v1|leaderboard)\/|profile-(?:supplied-v2|reference-v1|unlocks-v1|frames-supplied-v1)\/)/;
const MUSIC_ASSETS: Record<MusicTrack, string> = Object.fromEntries(
  MUSIC_CATALOG.map((entry) => [entry.id, entry.assetPath]),
) as Record<MusicTrack, string>;
const RECORDED_SOUND_KINDS = [
  "blocked", "exit", "ice", "thaw", "win", "button", "putdown", "fail",
  "reward", "gold", "itemArrival", "booster", "unlock",
  "time", "rocket", "pulse", "mechanic", "shell", "shutter", "timeover",
] as const satisfies readonly SoundKind[];

interface PreparedAudioAsset {
  controller: AbortController;
  bytes?: ArrayBuffer;
  buffer?: AudioBuffer;
  fetching?: Promise<void>;
  decoding?: Promise<AudioBuffer>;
}

export class WebHost implements GameHost {
  createOffscreenCanvas(): HTMLCanvasElement { return document.createElement("canvas"); }
  resolveLeaderboardProvince() { return requestWebProvince(); }
  private profileInput?: HTMLInputElement;
  openTextInput(options: { value: string; maxLength: number; rect: { x: number; y: number; width: number; height: number }; onChange(value: string): void }): () => void {
    this.profileInput?.remove();
    const input = document.createElement("input"), r = options.rect;
    this.profileInput = input; input.value = options.value; input.maxLength = options.maxLength;
    input.setAttribute("aria-label", "Profile name"); input.autocomplete = "off";
    // Keep the supplied profile field's border visible around the editable text.
    const insetX = r.width * 4 / 458, insetY = r.height * 4 / 84;
    Object.assign(input.style, { position: "fixed", left: `${r.x + insetX}px`, top: `${r.y + insetY}px`,
      width: `${r.width - insetX * 2}px`, height: `${r.height - insetY * 2}px`,
      boxSizing: "border-box", border: "none", borderRadius: `${r.height * 12 / 84}px`, background: "#eee2d6", color: "#582dd8",
      font: `900 ${Math.max(12, r.height * 36 / 84)}px Arial, "Microsoft YaHei", sans-serif`,
      padding: `0 ${r.width * 19 / 458}px`, zIndex: "10", outline: "none" });
    input.addEventListener("input", () => options.onChange(input.value));
    input.addEventListener("keydown", event => { if(event.key === "Enter" || event.key === "Escape") input.blur(); });
    document.body.append(input); input.focus(); input.select();
    return () => { input.remove(); if(this.profileInput===input)this.profileInput=undefined; };
  }
  async copyText(value: string): Promise<boolean> { try { await navigator.clipboard.writeText(value);return true; } catch {return false;} }
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
  private audio?: AudioContext;
  private soundscape?: ProceduralSoundscape;
  private disposed = false;
  private imageReuseCache?: IdleImageCache;
  private pageHidden = false;
  private visible = true;
  private readonly eventController = new AbortController();
  private readonly frameHandles = new Set<number>();
  private readonly timeoutHandles = new Set<number>();
  private audioUnlocked = false;
  private musicScene: MusicScene = "menu";
  private musicEnabled = false;
  private selectedMusicTrack?: MusicTrack;
  private musicPlaylist: MusicTrack[] = [];
  private retainedMusicTrack: MusicTrack = "menu";
  private readonly retainedMusicTracks = new Set<MusicTrack>(["menu"]);
  private readonly loadedMusicAssets = new Set<MusicTrack>();
  private readonly musicAssetsLoading: Partial<Record<MusicTrack, Promise<void>>> = {};
  private readonly musicAssetRetryAfter = new Map<MusicTrack, number>();
  private effectsAssetsLoading?: Promise<void>;
  private readonly preparedAudioAssets = new Map<string, PreparedAudioAsset>();
  private offlineAudio?: OfflineAudioContext;
  private offlineAudioUnavailable = false;
  private hiddenCallbacks: Array<() => void> = [];
  private shownCallbacks: Array<() => void> = [];
  private resizeCallbacks: Array<() => void> = [];

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("aria-label", "方块出逃游戏画布");
    this.context = this.canvas.getContext("2d", { alpha: false })!;
    document.body.append(this.canvas);
    this.resize();
    this.visible = !document.hidden;
    window.addEventListener("resize", () => {
      if (this.disposed) return;
      this.resize();
      this.resizeCallbacks.forEach((callback) => callback());
    }, { passive: true, signal: this.eventController.signal });
    document.addEventListener("visibilitychange", () => this.updateVisibility(), { signal: this.eventController.signal });
    window.addEventListener("pagehide", (event) => {
      if (!event.persisted) {
        this.dispose();
        return;
      }
      this.pageHidden = true;
      this.updateVisibility();
    }, { signal: this.eventController.signal });
    window.addEventListener("pageshow", () => {
      if (this.disposed) return;
      this.pageHidden = false;
      this.updateVisibility();
    }, { signal: this.eventController.signal });
  }

  private updateVisibility(): void {
    if (this.disposed) return;
    const visible = this.isVisible();
    if (visible === this.visible) return;
    this.visible = visible;
    this.imageReuseCache?.setPaused(!visible);
    if (visible) this.soundscape?.resume();
    else this.soundscape?.suspend();
    (visible ? this.shownCallbacks : this.hiddenCallbacks).forEach((callback) => callback());
  }

  /** End this host's ownership before closing its audio graph. Late decoding,
   * old animation frames and hot-reload callbacks must not recreate it. */
  dispose(): void {
    this.profileInput?.remove();
    if (this.disposed) return;
    this.disposed = true;
    this.imageReuseCache?.dispose();
    this.musicEnabled = false;
    this.audioUnlocked = false;
    this.eventController.abort();
    for (const handle of this.frameHandles) cancelAnimationFrame(handle);
    for (const handle of this.timeoutHandles) window.clearTimeout(handle);
    this.frameHandles.clear();
    this.timeoutHandles.clear();
    this.hiddenCallbacks = [];
    this.shownCallbacks = [];
    this.resizeCallbacks = [];
    const soundscape = this.soundscape;
    const audio = this.audio;
    this.soundscape = undefined;
    this.audio = undefined;
    soundscape?.setMusic("silent", false);
    soundscape?.stopSound("timeover");
    if (audio && audio.state !== "closed") {
      try { void audio.close().catch(() => undefined); } catch { /* optional audio teardown */ }
    }
    this.loadedMusicAssets.clear();
    this.musicAssetRetryAfter.clear();
    for (const asset of this.preparedAudioAssets.values()) asset.controller.abort();
    this.preparedAudioAssets.clear();
    this.offlineAudio = undefined;
    this.canvas.remove?.();
  }

  private resize(): void {
    const bounds = this.canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
    this.canvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
  }

  viewport(): Viewport {
    const bounds = this.canvas.getBoundingClientRect();
    const params = new URLSearchParams(window.location.search);
    const rootStyle = getComputedStyle(document.documentElement);
    const cssInset = (name: string): number => {
      const value = Number.parseFloat(rootStyle.getPropertyValue(name));
      return Number.isFinite(value) ? Math.max(0, value) : 0;
    };
    const requestedInset = (queryName: string, cssName: string): number => (
      params.has(queryName)
        ? Math.max(0, Number(params.get(queryName)) || 0)
        : cssInset(cssName)
    );
    return {
      width: bounds.width,
      height: bounds.height,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      safeTop: requestedInset("safeTop", "--color-escape-safe-top"),
      safeBottom: requestedInset("safeBottom", "--color-escape-safe-bottom"),
    };
  }

  prefersReducedMotion(): boolean {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }

  preferredLocales(): readonly string[] {
    const candidates: unknown[] = [];
    if (typeof navigator !== "object" || navigator === null) return [];
    try {
      if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages);
    } catch { /* an embedded browser may deny access to locale preferences */ }
    try { candidates.push(navigator.language); } catch { /* use any collected language list */ }
    return filteredRawLocales(candidates);
  }

  onPointer(handlers: PointerHandlers): void {
    if (this.disposed) return;
    const activePointers = new Set<number>();
    const sample = (event: PointerEvent) => {
      const bounds = this.canvas.getBoundingClientRect();
      return { id: event.pointerId, x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    };
    this.canvas.addEventListener("pointerdown", (event) => {
      if (!this.isVisible()) return;
      event.preventDefault();
      // A gesture unlocks music independently of the sound-effect setting.
      // No AudioContext is created during page construction/autoplay.
      this.audioUnlocked = true;
      this.music(this.musicScene, this.musicEnabled, this.selectedMusicTrack, this.musicPlaylist);
      activePointers.add(event.pointerId);
      this.canvas.setPointerCapture(event.pointerId);
      handlers.down(sample(event));
    }, { signal: this.eventController.signal });
    this.canvas.addEventListener("pointermove", (event) => {
      if (this.disposed || this.pageHidden) return;
      if (!activePointers.has(event.pointerId)) return;
      event.preventDefault();
      const coalesced = event.getCoalescedEvents?.() ?? [];
      let lastX = Number.NaN;
      let lastY = Number.NaN;
      for (const candidate of coalesced) {
        if (candidate.pointerId !== event.pointerId) continue;
        handlers.move(sample(candidate));
        lastX = candidate.clientX;
        lastY = candidate.clientY;
      }
      if (event.clientX !== lastX || event.clientY !== lastY) handlers.move(sample(event));
    }, { signal: this.eventController.signal });
    this.canvas.addEventListener("pointerup", (event) => {
      if (this.disposed || this.pageHidden) return;
      if (!activePointers.delete(event.pointerId)) return;
      event.preventDefault();
      handlers.up(sample(event));
      try { this.canvas.releasePointerCapture(event.pointerId); } catch { /* capture may already be gone */ }
    }, { signal: this.eventController.signal });
    this.canvas.addEventListener("pointercancel", (event) => {
      if (this.disposed) return;
      if (!activePointers.delete(event.pointerId)) return;
      event.preventDefault();
      handlers.cancel(sample(event));
    }, { signal: this.eventController.signal });
    this.canvas.addEventListener("lostpointercapture", (event) => {
      if (this.disposed) return;
      if (!activePointers.delete(event.pointerId)) return;
      handlers.cancel(sample(event));
    }, { signal: this.eventController.signal });
  }

  onHide(callback: () => void): void { this.hiddenCallbacks.push(callback); }
  onShow(callback: () => void): void { this.shownCallbacks.push(callback); }
  isVisible(): boolean { return !this.disposed && !this.pageHidden && !document.hidden; }
  onResize(callback: () => void): void { this.resizeCallbacks.push(callback); }
  requestFrame(callback: FrameRequestCallback): number {
    if (this.disposed) return 0;
    const handle = requestAnimationFrame((time) => {
      this.frameHandles.delete(handle);
      if (!this.disposed) callback(time);
    });
    this.frameHandles.add(handle);
    return handle;
  }
  scheduleTimeout(callback: () => void, delayMs: number): number {
    if (this.disposed) return 0;
    const handle = window.setTimeout(() => {
      this.timeoutHandles.delete(handle);
      if (!this.disposed) callback();
    }, delayMs);
    this.timeoutHandles.add(handle);
    return handle;
  }
  cancelTimeout(handle: number): void {
    this.timeoutHandles.delete(handle);
    window.clearTimeout(handle);
  }

  createImage(src: string): Promise<HTMLImageElement> {
    if (this.disposed) return Promise.reject(new Error("Web host disposed"));
    if (!REUSABLE_PAGE_IMAGE.test(src)) return this.loadImage(src);
    if (!this.imageReuseCache) {
      this.imageReuseCache = new IdleImageCache({ release: image => this.discardImage(image) });
      this.imageReuseCache.setPaused(!this.isVisible());
    }
    return this.imageReuseCache.acquire(src, () => this.loadImage(src));
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      let settled = false;
      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        image.onload = null;
        image.onerror = null;
        callback();
      };
      const timeout = window.setTimeout(() => {
        finish(() => {
          try { image.src = ""; } catch { /* best-effort request cancellation */ }
          reject(new Error(`Timed out loading image after ${IMAGE_LOAD_TIMEOUT_MS}ms: ${src}`));
        });
      }, IMAGE_LOAD_TIMEOUT_MS);
      image.onload = () => finish(() => resolve(image));
      image.onerror = () => finish(() => reject(new Error(`Could not load image: ${src}`)));
      image.src = src;
    });
  }

  releaseImage(image: HTMLImageElement): void {
    if (this.imageReuseCache) this.imageReuseCache.release(image);
    else this.discardImage(image);
  }

  private discardImage(image: HTMLImageElement): void {
    image.onload = null;
    image.onerror = null;
    image.src = "";
  }

  storageRead<T>(key: string): StorageReadResult<T> {
    let raw: string | null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      return { status: "unavailable" };
    }
    if (raw === null) return { status: "missing" };
    try {
      return { status: "ok", value: JSON.parse(raw) as T };
    } catch {
      return { status: "corrupt" };
    }
  }

  storageGet<T>(key: string, fallback: T): T {
    const result = this.storageRead<T>(key);
    return result.status === "ok" ? result.value : fallback;
  }

  storageSet<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  music(scene: MusicScene, enabled: boolean, selectedTrack?: MusicTrack, playlist?: readonly MusicTrack[]): void {
    if (this.disposed) return;
    this.musicScene = scene;
    this.musicEnabled = enabled;
    this.selectedMusicTrack = selectedTrack;
    this.musicPlaylist = this.normalizeMusicPlaylist(playlist);
    const track = musicTrackForScene(scene, selectedTrack);
    const retained = new Set<MusicTrack>(this.musicPlaylist);
    if (track) retained.add(track);
    this.retainMusicAssets(retained);
    if (track) this.retainedMusicTrack = track;
    if (enabled) {
      if (this.audioUnlocked) this.ensureAudio();
      for (const candidate of retained) this.beginMusicAssetLoad(candidate);
    }
    this.soundscape?.setMusic(scene, enabled, selectedTrack, this.musicPlaylist);
  }

  private retainMusicAssets(retained: ReadonlySet<MusicTrack>): void {
    for (const retainedTrack of this.retainedMusicTracks) {
      if (retained.has(retainedTrack)) continue;
      this.soundscape?.releaseMusicBuffer(retainedTrack);
      this.loadedMusicAssets.delete(retainedTrack);
      this.retainedMusicTracks.delete(retainedTrack);
      delete this.musicAssetsLoading[retainedTrack];
      this.musicAssetRetryAfter.delete(retainedTrack);
      const path = MUSIC_ASSETS[retainedTrack];
      this.preparedAudioAssets.get(path)?.controller.abort();
      this.preparedAudioAssets.delete(path);
    }
    retained.forEach((retainedTrack) => this.retainedMusicTracks.add(retainedTrack));
  }

  /** Prepare recordings while the first board's art loads. Offline decoding
   * never opens an output device; the first genuine gesture still owns audio
   * activation. Older browsers can at least reuse the fetched MP3 bytes. */
  async prepareAudio(scene: MusicScene, options: { music: boolean; sound: boolean }): Promise<void> {
    if (!this.isVisible() || (!options.music && !options.sound)) return;
    const track = options.music ? musicTrackForScene(scene) : undefined;
    if (track) this.retainMusicAssets(new Set([track]));
    const paths = [
      ...(track ? [MUSIC_ASSETS[track]] : []),
      ...(options.sound ? RECORDED_SOUND_KINDS.map(kind => `assets/audio/sfx/${kind}.mp3`) : []),
    ];
    await Promise.all(paths.map(async path => {
      try {
        const asset = await this.fetchAudioAsset(path);
        if (this.disposed || asset.buffer) return;
        if (!this.offlineAudio && !this.offlineAudioUnavailable) {
          try {
            const Constructor = globalThis.OfflineAudioContext
              ?? (globalThis as typeof globalThis & { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
            this.offlineAudio = new Constructor(2, 1, 48_000);
          } catch { this.offlineAudioUnavailable = true; }
        }
        if (this.offlineAudio) await this.decodePreparedAsset(path, asset, this.offlineAudio);
      } catch { /* failed preparation must not block the first level */ }
    }));
    this.installPreparedAudio();
  }

  musicTransport(): MusicTransport { return this.soundscape?.musicTransport() ?? { positionSeconds: 0, durationSeconds: 0, playing: false }; }
  setMusicPaused(paused: boolean): void { if (!this.disposed) this.soundscape?.setMusicPaused(paused); }
  seekMusic(positionSeconds: number): void { if (!this.disposed) this.soundscape?.seekMusic(positionSeconds); }

  private async fetchAudioAsset(path: string): Promise<PreparedAudioAsset> {
    if (this.disposed || typeof fetch !== "function") throw new Error("Recorded WebAudio is unavailable");
    let asset = this.preparedAudioAssets.get(path);
    if (!asset) {
      asset = { controller: new AbortController() };
      this.preparedAudioAssets.set(path, asset);
      const ownedAsset = asset;
      asset.fetching = (async () => {
        const response = await fetch(new URL(path, document.baseURI), { signal: ownedAsset.controller.signal });
        if (!response.ok) throw new Error(`Could not load audio asset: ${path}`);
        const bytes = await response.arrayBuffer();
        if (this.disposed || this.preparedAudioAssets.get(path) !== ownedAsset) throw new Error("Audio asset released");
        ownedAsset.bytes = bytes;
      })().catch(error => {
        if (this.preparedAudioAssets.get(path) === ownedAsset) this.preparedAudioAssets.delete(path);
        throw error;
      });
    }
    await asset.fetching;
    if (this.disposed || this.preparedAudioAssets.get(path) !== asset) throw new Error("Audio asset released");
    return asset;
  }

  private decodePreparedAsset(path: string, asset: PreparedAudioAsset, context: BaseAudioContext): Promise<AudioBuffer> {
    if (asset.buffer) return Promise.resolve(asset.buffer);
    if (asset.decoding) return asset.decoding;
    // decodeAudioData may detach its input. Keep the fetched bytes until a
    // successful decode so an offline codec failure can retry after a gesture.
    const pending = Promise.resolve().then(() => context.decodeAudioData(asset.bytes!.slice(0)))
      .then(buffer => {
        if (this.disposed || this.preparedAudioAssets.get(path) !== asset) throw new Error("Audio asset released");
        asset.buffer = buffer;
        asset.bytes = undefined;
        return buffer;
      }).finally(() => { if (asset.decoding === pending) asset.decoding = undefined; });
    asset.decoding = pending;
    return pending;
  }

  private async decodeAudioAsset(path: string): Promise<AudioBuffer> {
    if (!this.audio || typeof this.audio.decodeAudioData !== "function") throw new Error("Recorded WebAudio is unavailable");
    const context = this.audio;
    const asset = await this.fetchAudioAsset(path);
    // If offline preparation is still finishing, share it. A failed offline
    // decode gets one normal live-context attempt using the same download.
    if (asset.decoding) await asset.decoding.catch(() => undefined);
    if (this.disposed || this.preparedAudioAssets.get(path) !== asset) throw new Error("Audio asset released");
    return this.decodePreparedAsset(path, asset, context);
  }

  private installPreparedAudio(): void {
    if (this.disposed || !this.soundscape) return;
    for (const track of this.retainedMusicTracks) {
      const buffer = this.preparedAudioAssets.get(MUSIC_ASSETS[track])?.buffer;
      if (!buffer || this.loadedMusicAssets.has(track)) continue;
      this.loadedMusicAssets.add(track);
      this.soundscape.setMusicBuffer(track, buffer, RECORDED_MUSIC_LOOP_DURATIONS[track]);
    }
    for (const kind of RECORDED_SOUND_KINDS) {
      const buffer = this.preparedAudioAssets.get(`assets/audio/sfx/${kind}.mp3`)?.buffer;
      if (buffer) this.soundscape.setSoundBuffer(kind, buffer);
    }
  }

  private beginMusicAssetLoad(track: MusicTrack): void {
    if (this.disposed || !this.audio || !this.soundscape || this.loadedMusicAssets.has(track) || this.musicAssetsLoading[track]) return;
    // Scene synchronization happens every frame. An immediate network/codec
    // failure must not turn that render loop into repeated audio downloads.
    if ((this.musicAssetRetryAfter.get(track) ?? 0) > Date.now()) return;
    const soundscape = this.soundscape;
    soundscape.expectMusicBuffer(track);
    const pending = this.decodeAudioAsset(MUSIC_ASSETS[track])
      .then((buffer) => {
        if (this.disposed || this.musicAssetsLoading[track] !== pending || !this.retainedMusicTracks.has(track) || this.loadedMusicAssets.has(track)) return;
        this.musicAssetRetryAfter.delete(track);
        this.loadedMusicAssets.add(track);
        soundscape.setMusicBuffer(track, buffer, RECORDED_MUSIC_LOOP_DURATIONS[track]);
      })
      .catch(() => {
        if (!this.disposed && this.musicAssetsLoading[track] === pending && this.retainedMusicTracks.has(track)) {
          this.musicAssetRetryAfter.set(track, Date.now() + MUSIC_ASSET_RETRY_DELAY_MS);
          soundscape.useSynthMusicFallback(track);
        }
      })
      .finally(() => {
        if (this.musicAssetsLoading[track] === pending) delete this.musicAssetsLoading[track];
      });
    this.musicAssetsLoading[track] = pending;
  }

  private beginEffectsAssetLoad(): void {
    if (this.disposed || this.effectsAssetsLoading || !this.audio || !this.soundscape) return;
    const soundscape = this.soundscape;
    this.effectsAssetsLoading = Promise.all(RECORDED_SOUND_KINDS.map(async (kind) => {
      try {
        const buffer = await this.decodeAudioAsset(`assets/audio/sfx/${kind}.mp3`);
        if (!this.disposed) soundscape.setSoundBuffer(kind, buffer);
      } catch { /* timeover stays silent; other effects retain their fallback */ }
    })).then(() => undefined);
  }

  sound(kind: SoundKind): void {
    if (!this.isVisible()) return;
    try {
      this.ensureAudio();
      if (!this.soundscape) return;
      const track = musicTrackForScene(this.musicScene, this.selectedMusicTrack);
      if (this.musicEnabled && track) {
        for (const candidate of new Set([track, ...this.musicPlaylist])) this.beginMusicAssetLoad(candidate);
      }
      this.beginEffectsAssetLoad();
      this.soundscape.setMusic(this.musicScene, this.musicEnabled, this.selectedMusicTrack, this.musicPlaylist);
      this.soundscape.play(kind);
    } catch { /* sound is a progressive enhancement */ }
  }

  private ensureAudio(): void {
    if (!this.isVisible()) return;
    try {
      this.audio ??= new AudioContext();
      if (!this.soundscape) {
        this.soundscape = new ProceduralSoundscape(this.audio);
        this.installPreparedAudio();
      }
      if (this.audio.state === "suspended") void this.audio.resume().catch(() => undefined);
    } catch { /* audio is optional on unsupported/blocked browsers */ }
  }

  stopSound(kind: SoundKind): void {
    this.soundscape?.stopSound(kind);
  }

  vibrate(kind: "light" | "medium"): void {
    try { navigator.vibrate?.(kind === "medium" ? 28 : 10); } catch { /* optional */ }
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

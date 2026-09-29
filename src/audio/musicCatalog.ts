export type MusicTrackId =
  | "menu"
  | "challenge"
  | "tides-smiles"
  | "dreamscape"
  | "do-you-see-me"
  | "smile"
  | "splash";

export interface MusicCatalogEntry {
  readonly id: MusicTrackId;
  readonly title: string;
  readonly artist: string;
  readonly unlockLevel: number;
  readonly scene: "menu" | "challenge";
  /** Web asset path. The music player loads this only after selection. */
  readonly assetPath: string;
  /** WeChat local path is intentionally optional until a CDN/subpackage budget is assigned. */
  readonly wechatPath?: string;
  readonly wechatSubpackage?: "audio" | "menu-music";
  readonly loopStartSeconds: number;
  readonly loopEndSeconds: number;
  readonly rights: "PROJECT_AUDIO" | "USER_PROVIDED_NEEDS_COMMERCIAL_LICENSE_CONFIRMATION";
}

export const MUSIC_CATALOG: readonly MusicCatalogEntry[] = Object.freeze([
  {
    id: "menu", title: "沙漠晨曦", artist: "关卡音乐", unlockLevel: 1, scene: "menu",
    assetPath: "assets/audio/happy-carnival.mp3", wechatPath: "menu-music/happy-carnival.mp3", wechatSubpackage: "menu-music",
    loopStartSeconds: 0, loopEndSeconds: 7_112_551 / 48_000, rights: "PROJECT_AUDIO",
  },
  {
    id: "challenge", title: "海湾灯塔", artist: "关卡音乐", unlockLevel: 1, scene: "challenge",
    assetPath: "assets/audio/happy-foods.mp3", wechatPath: "audio/happy-foods.mp3", wechatSubpackage: "audio",
    loopStartSeconds: 0, loopEndSeconds: 6_048_768 / 48_000, rights: "PROJECT_AUDIO",
  },
  {
    id: "tides-smiles", title: "星空旅途", artist: "关卡音乐", unlockLevel: 15, scene: "menu",
    assetPath: "assets/audio/music-library/tides-smiles.mp3", loopStartSeconds: 0, loopEndSeconds: 78.73,
    rights: "USER_PROVIDED_NEEDS_COMMERCIAL_LICENSE_CONFIRMATION",
  },
  {
    id: "dreamscape", title: "森林溪流", artist: "关卡音乐", unlockLevel: 30, scene: "menu",
    assetPath: "assets/audio/music-library/dreamscape.mp3", loopStartSeconds: 0, loopEndSeconds: 191.43,
    rights: "USER_PROVIDED_NEEDS_COMMERCIAL_LICENSE_CONFIRMATION",
  },
  {
    id: "do-you-see-me", title: "霓虹节拍", artist: "Bass Rebels", unlockLevel: 45, scene: "menu",
    assetPath: "assets/audio/music-library/do-you-see-me.mp3", loopStartSeconds: 0, loopEndSeconds: 166.66,
    rights: "USER_PROVIDED_NEEDS_COMMERCIAL_LICENSE_CONFIRMATION",
  },
  {
    id: "smile", title: "欢乐漫步", artist: "Scandinavianz", unlockLevel: 60, scene: "menu",
    assetPath: "assets/audio/music-library/smile.mp3", loopStartSeconds: 0, loopEndSeconds: 148.19,
    rights: "USER_PROVIDED_NEEDS_COMMERCIAL_LICENSE_CONFIRMATION",
  },
  {
    id: "splash", title: "海湾水花", artist: "Roa", unlockLevel: 75, scene: "menu",
    assetPath: "assets/audio/music-library/splash.mp3", loopStartSeconds: 0, loopEndSeconds: 195.29,
    rights: "USER_PROVIDED_NEEDS_COMMERCIAL_LICENSE_CONFIRMATION",
  },
]);

export const DEFAULT_MUSIC_TRACK: MusicTrackId = "menu";

export const isMusicTrack = (value: unknown): value is MusicTrackId => (
  typeof value === "string" && MUSIC_CATALOG.some((entry) => entry.id === value)
);

export const musicCatalogEntry = (id: MusicTrackId): MusicCatalogEntry => (
  MUSIC_CATALOG.find((entry) => entry.id === id) ?? MUSIC_CATALOG[0]
);

export const musicTrackForScene = (scene: "menu" | "gameplay" | "danger" | "victory" | "defeat" | "silent", selected?: MusicTrackId): MusicTrackId | undefined => (
  scene === "silent" ? undefined : selected ?? (scene === "menu" ? "menu" : "challenge")
);

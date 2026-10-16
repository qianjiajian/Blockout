export const PROFILE_RENAME_PRICE = 100;
export const PROFILE_BASE_AVATAR_COUNT = 15;
export const PROFILE_BASE_FRAME_COUNT = 9;
export const PROFILE_AVATAR_COUNT = 25;
export const PROFILE_FRAME_COUNT = 19;
export const PROFILE_FRAME_COLORS = ["#d4d5c9", "#1cc9d2", "#cc10c8", "#54bd22", "#fb292a", "#00d68a", "#fa278c", "#1abe88", "#a236f0"] as const;
export type ProfileAppearanceKind = "avatar" | "frame";
export function profileUnlockLevel(kind: ProfileAppearanceKind, index: number): number {
  const base = kind === "avatar" ? PROFILE_BASE_AVATAR_COUNT : PROFILE_BASE_FRAME_COUNT;
  return index < base ? 0 : (index - base) * 20 + (kind === "avatar" ? 10 : 20);
}
export function profileAppearanceUnlocked(kind: ProfileAppearanceKind, index: number, progress: { highestLevel: number; rewardedLevels: readonly number[] }): boolean {
  const count = kind === "avatar" ? PROFILE_AVATAR_COUNT : PROFILE_FRAME_COUNT;
  if(!Number.isInteger(index) || index < 0 || index >= count)return false;
  const level = profileUnlockLevel(kind, index);
  return level === 0 || progress.highestLevel > level || progress.rewardedLevels.includes(level);
}
export const profileAvatarPath = (i: number): string => `assets/art/ui/${i < 20 ? "profile-supplied-v2" : "profile-unlocks-v1"}/avatar-${i}.png`;
export const profileFramePath = (i: number): string => `assets/art/ui/profile-frames-supplied-v1/frame-${i}.png`;
export interface PlayerProfile {
  id: string; name: string; avatar: number; frame: number; joinedAt: number;
  firstTryWins: number; longestStreak: number; currentStreak: number;
  attempts: Record<string, number>; lastAttemptWon: boolean;
  seenAvatars?: number[]; seenFrames?: number[];
}
const profileSeenKey = (kind: ProfileAppearanceKind): "seenAvatars" | "seenFrames" => kind === "avatar" ? "seenAvatars" : "seenFrames";
const normalizeSeenAppearances = (raw: unknown, kind: ProfileAppearanceKind): number[] => {
  const base = kind === "avatar" ? PROFILE_BASE_AVATAR_COUNT : PROFILE_BASE_FRAME_COUNT;
  const maximum = kind === "avatar" ? PROFILE_AVATAR_COUNT : PROFILE_FRAME_COUNT;
  return Array.isArray(raw) ? [...new Set(raw.filter((index): index is number =>
    typeof index === "number" && Number.isInteger(index) && index >= base && index < maximum,
  ))].sort((a, b) => a - b) : [];
};
export function profileAppearanceUnread(kind: ProfileAppearanceKind, index: number, profile: PlayerProfile,
  progress: { highestLevel: number; rewardedLevels: readonly number[] }): boolean {
  return profileUnlockLevel(kind, index) > 0 && profileAppearanceUnlocked(kind, index, progress)
    && profile[kind] !== index && !profile[profileSeenKey(kind)]?.includes(index);
}
export function markProfileAppearanceSeen(profile: PlayerProfile, kind: ProfileAppearanceKind, index: number,
  progress: { highestLevel: number; rewardedLevels: readonly number[] }): boolean {
  if (profileUnlockLevel(kind, index) === 0 || !profileAppearanceUnlocked(kind, index, progress)) return false;
  const key = profileSeenKey(kind);
  if (profile[key]?.includes(index)) return false;
  profile[key] = normalizeSeenAppearances([...(profile[key] ?? []), index], kind);
  return true;
}
export function normalizePlayerProfile(raw: unknown, now = Date.now()): PlayerProfile {
  const p = raw && typeof raw === "object" ? raw as Partial<PlayerProfile> : {};
  const count = (n: unknown, max = 999999) => typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.min(max, Math.floor(n))) : 0;
  const id = typeof p.id === "string" && /^\d{7,12}$/.test(p.id) ? p.id : String(Math.floor(1000000 + Math.random() * 9000000));
  const attempts: Record<string, number> = {};
  if (p.attempts && typeof p.attempts === "object") for (const [key, n] of Object.entries(p.attempts)) {
    if (/^[1-9]\d*$/.test(key) && Number(key) <= 200) attempts[key] = count(n);
  }
  const avatar = count(p.avatar, PROFILE_AVATAR_COUNT - 1), frame = count(p.frame, PROFILE_FRAME_COUNT - 1);
  return { id, name: cleanProfileName(p.name) || `Player#${id.slice(-6)}`, avatar, frame,
    seenAvatars: normalizeSeenAppearances(Array.isArray(p.seenAvatars) ? p.seenAvatars : [avatar], "avatar"),
    seenFrames: normalizeSeenAppearances(Array.isArray(p.seenFrames) ? p.seenFrames : [frame], "frame"),
    joinedAt: typeof p.joinedAt === "number" && p.joinedAt > 0 && p.joinedAt <= now ? p.joinedAt : now,
    firstTryWins: count(p.firstTryWins, 200), longestStreak: count(p.longestStreak), currentStreak: count(p.currentStreak), attempts,
    lastAttemptWon: p.lastAttemptWon === true };
}
export function cleanProfileName(raw: unknown): string {
  return typeof raw === "string" ? Array.from(raw.replace(/[\u0000-\u001f\u007f]/g, "").trim().replace(/\s+/g, " ")).slice(0, 16).join("") : "";
}
export function startProfileAttempt(p: PlayerProfile, level: number): void {
  if (Object.keys(p.attempts).length && !p.lastAttemptWon) p.currentStreak = 0;
  p.attempts[String(level)] = (p.attempts[String(level)] ?? 0) + 1;
  p.lastAttemptWon = false;
}
export function completeProfileAttempt(p: PlayerProfile, level: number, firstClear: boolean): void {
  if (p.lastAttemptWon) return;
  if (firstClear && p.attempts[String(level)] === 1) p.firstTryWins += 1;
  p.currentStreak += 1;
  p.longestStreak = Math.max(p.longestStreak, p.currentStreak);
  p.lastAttemptWon = true;
}

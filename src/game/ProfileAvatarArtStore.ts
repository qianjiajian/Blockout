import { PROFILE_AVATAR_COUNT, PROFILE_FRAME_COUNT, profileAvatarPath, profileFramePath } from "../core/playerProfile";
import type { ProfileArt } from "./playerProfileUi";

export const PROFILE_AVATAR_PATHS = Array.from({ length: PROFILE_AVATAR_COUNT }, (_, i) => profileAvatarPath(i));
export const PROFILE_FRAME_PATHS = Array.from({ length: PROFILE_FRAME_COUNT }, (_, i) => profileFramePath(i));
export type ProfileAvatarArt = Pick<ProfileArt, "avatars" | "frames">;

/** Small portraits survive a league challenge; full leaderboard panels do not. */
export class ProfileAvatarArtStore {
  art?: ProfileAvatarArt;
  error = false;
  private loading = false;
  private revision = 0;

  constructor(
    private readonly load: (paths: string[]) => Promise<HTMLImageElement[]>,
    private readonly release: (image: HTMLImageElement) => void,
    private readonly changed: () => void,
  ) {}

  request(): void {
    if (this.art || this.loading) return;
    this.loading = true;
    this.error = false;
    const revision = ++this.revision;
    void this.load([...PROFILE_AVATAR_PATHS, ...PROFILE_FRAME_PATHS]).then(images => {
      if (revision !== this.revision) { images.forEach(this.release); return; }
      this.art = { avatars: images.slice(0, PROFILE_AVATAR_COUNT), frames: images.slice(PROFILE_AVATAR_COUNT) };
    }).catch(() => {
      if (revision === this.revision) this.error = true;
    }).finally(() => {
      if (revision !== this.revision) return;
      this.loading = false;
      this.changed();
    });
  }

  dispose(): void {
    this.revision++;
    if (this.art) [...this.art.avatars, ...this.art.frames].forEach(this.release);
    this.art = undefined;
    this.loading = false;
    this.error = false;
  }
}

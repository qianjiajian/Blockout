import { SUPPLIED_REVEAL_ART } from "./artManifest";
export { SUPPLIED_REVEAL_ART };

type RevealGroup = keyof typeof SUPPLIED_REVEAL_ART;
type RevealImages = Readonly<Record<string, HTMLImageElement>>;
interface RevealSlot { token: number; loading: boolean; failed: boolean; art?: RevealImages }

/** Independent groups avoid loading a scene just to show a painting. */
export class SuppliedRevealArtStore {
  private readonly slots: Record<RevealGroup, RevealSlot> = {
    painting: { token: 0, loading: false, failed: false },
    scene: { token: 0, loading: false, failed: false },
  };

  constructor(
    private readonly load: (path: string) => Promise<HTMLImageElement>,
    private readonly release: (image: HTMLImageElement) => void,
    private readonly changed: () => void,
  ) {}

  imageGroup(group: RevealGroup): RevealImages | undefined { return this.slots[group].art; }
  failed(group: RevealGroup): boolean { return this.slots[group].failed; }

  request(group: RevealGroup, retry = false): void {
    const slot = this.slots[group];
    if (slot.art || slot.loading || (slot.failed && !retry)) return;
    const token = ++slot.token;
    slot.loading = true;
    slot.failed = false;
    const entries = Object.entries(SUPPLIED_REVEAL_ART[group]);
    void Promise.allSettled(entries.map(([, path]) => this.load(path))).then((results) => {
      const loaded = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
      if (token !== slot.token) { loaded.forEach(this.release); return; }
      slot.loading = false;
      if (loaded.length !== entries.length) {
        loaded.forEach(this.release);
        slot.failed = true;
      } else {
        slot.art = Object.fromEntries(entries.map(([key], index) => [key, loaded[index]]));
      }
      this.changed();
    });
  }

  dispose(group: RevealGroup): void {
    const slot = this.slots[group];
    slot.token += 1;
    if (slot.art) Object.values(slot.art).forEach(this.release);
    slot.art = undefined;
    slot.loading = false;
    slot.failed = false;
  }
}

/** Logical 496px board coordinates derived from the supplied 720px reference. */
export const SUPPLIED_COLLECTION_INTRO_LAYOUT = {
  banner: { x: 62, y: 193, width: 383, height: 143 },
  titleZh: { x: 126, y: 211, width: 245, height: 68 },
  titleEn: { x: 123, y: 207, width: 250, height: 72 },
  artwork: { x: 124, y: 356, width: 248, height: 248 },
  retry: { x: 114, y: 346, width: 268, height: 309 },
  title: { x: 248, y: 250, size: 32, maxWidth: 288 },
  name: { x: 248, y: 637, size: 27, maxWidth: 366 },
  hint: { x: 248, y: 685, size: 19, maxWidth: 382 },
  primary: { x: 137, y: 717, width: 222, height: 86 },
  later: { x: 408, y: 245, width: 65, height: 68 },
} as const;

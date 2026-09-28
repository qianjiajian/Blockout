import { MECHANISM_GUIDE } from "../core/mechanismCatalog";
import type { FeatureIntroKind } from "./featureIntroPolicy";
import type { GameHost } from "../platform/Host";
import { GAME_ART } from "./artManifest";

export type { FeatureIntroKind } from "./featureIntroPolicy";

// Compatibility names select artwork only; they do not change mechanism rules.
const GUIDE_IDS: Record<FeatureIntroKind, string> = {
  "ice-door": "frozen-exit",
  "ice-block": "numeric-ice",
  layer: "multilayer-shell",
  shutter: "shutter",
  generator: "generator",
  "arrow-block": "axis-block",
  "key-lock": "key-lock",
  lift: "layered-lift",
  "timed-generator": "generator",
  "staged-frame": "layered-lift",
  elevator: "layered-lift",
  conveyor: "axis-block",
  star: "star",
  bomb: "bomb",
  "flip-door": "flip-door",
  "colored-grid": "colored-grid",
};

export function featureIntroIconPath(kind: FeatureIntroKind): string {
  const entry = MECHANISM_GUIDE.find(({ id }) => id === GUIDE_IDS[kind]);
  if (!entry) throw new Error(`Missing mechanism guide icon: ${kind}`);
  return GAME_ART.ui.formalPages.collection.itemImages[entry.atlasIndex];
}

/** Only the open card's icon is resident, independently of the guide page. */
export class FeatureIntroIconArt {
  image?: HTMLImageElement;
  error = false;
  private path?: string;
  private requestToken = 0;

  constructor(
    private readonly host: Pick<GameHost, "createImage" | "releaseImage">,
    private readonly changed: () => void,
  ) {}

  sync(kind?: FeatureIntroKind): void {
    const path = kind === undefined ? undefined : featureIntroIconPath(kind);
    if (path === this.path) return;
    this.clear();
    this.path = path;
    if (!path) return;
    const token = this.requestToken;
    void this.host.createImage(path).then((image) => {
      if (token !== this.requestToken) {
        this.host.releaseImage?.(image);
        return;
      }
      this.image = image;
      this.changed();
    }).catch(() => {
      if (token !== this.requestToken) return;
      this.error = true;
      this.changed();
    });
  }

  retry(kind: FeatureIntroKind): void {
    this.clear();
    this.sync(kind);
  }

  clear(): void {
    this.requestToken += 1;
    if (this.image) this.host.releaseImage?.(this.image);
    this.image = undefined;
    this.path = undefined;
    this.error = false;
  }
}

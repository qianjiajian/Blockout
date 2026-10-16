import { LEAGUE_SETTLEMENT_ART } from "./artManifest";

export type LeagueSettlementArt = Record<keyof typeof LEAGUE_SETTLEMENT_ART, HTMLImageElement>;
export const LEAGUE_SETTLEMENT_ART_NAMES = Object.keys(LEAGUE_SETTLEMENT_ART) as Array<keyof typeof LEAGUE_SETTLEMENT_ART>;
export const LEAGUE_SETTLEMENT_ART_PATHS = LEAGUE_SETTLEMENT_ART_NAMES.map(name => `/${LEAGUE_SETTLEMENT_ART[name]}`);

/** Settlement art owns one image reference for every successful load. */
export class LeagueSettlementArtStore {
  art?: LeagueSettlementArt;
  loading = false;
  error = false;
  private token = 0;

  constructor(
    private readonly load: (path: string) => Promise<HTMLImageElement>,
    private readonly release: (image: HTMLImageElement) => void,
    private readonly changed: () => void,
  ) {}

  request(): void {
    if (this.art || this.loading) return;
    const token = ++this.token;
    this.loading = true;
    this.error = false;
    void Promise.allSettled(LEAGUE_SETTLEMENT_ART_PATHS.map(async path => this.load(path))).then(results => {
      const images = results.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
      if (token !== this.token) {
        images.forEach(this.release);
        return;
      }
      this.loading = false;
      if (images.length !== LEAGUE_SETTLEMENT_ART_NAMES.length) {
        images.forEach(this.release);
        this.error = true;
      } else {
        this.art = Object.fromEntries(LEAGUE_SETTLEMENT_ART_NAMES.map((name, index) => [name, images[index]])) as LeagueSettlementArt;
      }
      this.changed();
    });
  }

  dispose(): void {
    this.token++;
    if (this.art) Object.values(this.art).forEach(this.release);
    this.art = undefined;
    this.loading = false;
    this.error = false;
  }
}

import { SUPPLIED_SETTLEMENT_ART, SUPPLIED_RANK_ART } from "./artManifest";
export { SUPPLIED_SETTLEMENT_ART, SUPPLIED_RANK_ART };

export type SuppliedSettlementArt = { [Key in keyof typeof SUPPLIED_SETTLEMENT_ART]: HTMLImageElement };
export type SuppliedRankArt = { [Key in keyof typeof SUPPLIED_RANK_ART]: HTMLImageElement };

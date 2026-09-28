import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");

export const JOURNEY_EPISODE_WEBP_TRANSFORM = "webp-q75";
export const JOURNEY_EPISODE_WEBP_OPTIONS = Object.freeze({
  quality: 75,
  alphaQuality: 100,
  effort: 6,
  smartSubsample: true,
});

export const encodeJourneyEpisodeWebp = async (source) => sharp(source)
  .webp(JOURNEY_EPISODE_WEBP_OPTIONS)
  .toBuffer();

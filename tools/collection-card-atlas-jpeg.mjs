import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");

export const COLLECTION_CARD_ATLAS_JPEG_TRANSFORM = "jpeg-1000-q60";
export const COLLECTION_CARD_ATLAS_SIZE = 1000;
export const COLLECTION_CARD_ATLAS_GRID_SIZE = 5;

export const COLLECTION_CARD_ATLAS_JPEG_OPTIONS = Object.freeze({
  quality: 60,
  progressive: true,
  chromaSubsampling: "4:2:0",
  optimiseCoding: true,
});

/**
 * Keeps the high-resolution ImageGen masters replaceable while producing a
 * compact, exactly divisible 5x5 runtime atlas. A white matte preserves the
 * deliberately narrow cell gutters when a generated PNG contains alpha.
 */
export const encodeCollectionCardAtlasJpeg = async (source) => sharp(source)
  .flatten({ background: "#ffffff" })
  .resize(COLLECTION_CARD_ATLAS_SIZE, COLLECTION_CARD_ATLAS_SIZE, {
    fit: "fill",
    kernel: "lanczos3",
  })
  .jpeg(COLLECTION_CARD_ATLAS_JPEG_OPTIONS)
  .toBuffer();

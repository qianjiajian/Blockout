import { readFile } from "node:fs/promises";
import sharp from "sharp";

// Explicit, reviewed assets only. This is lossy colour encoding, not resizing
// or a blanket rewrite of the game's image library. Masters stay in art-source.
export const LARGE_IMAGE_TRANSFORM = "large-image-encoding-v1";
export const LARGE_IMAGE_POLICIES = [
  {
    source: "ui/formal-pages/journey/background.png",
    runtime: "ui/formal-pages/journey/background.jpg",
    previousRuntime: "ui/formal-pages/journey/background.png",
    width: 720, height: 1584, alpha: false, format: "jpeg", quality: 90, chromaSubsampling: "4:4:4",
  },
  {
    source: "ui/formal-pages/shop/reference.png",
    runtime: "ui/formal-pages/shop/reference.png",
    width: 720, height: 1584, alpha: false, format: "palette-png", quality: 95,
  },
  ...["journey/presentation-panel.png", "overlays/win/panel.png"].map((file) => ({
    source: `ui/formal-pages/${file}`, runtime: `ui/formal-pages/${file}`,
    width: 671, height: 867, alpha: true, format: "rgb-palette-exact-alpha-png", quality: 95,
  })),
  {
    source: "ui/home-v3/background.png", runtime: "ui/home-v3/background.jpg",
    width: 720, height: 1584, alpha: false, format: "jpeg", quality: 90,
    chromaSubsampling: "4:2:0", existingRemoveAlpha: true,
  },
  ...[2, 3, 4, 5, 6, 9, 10].map((number) => {
    const name = `home-${String(number).padStart(2, "0")}`;
    return {
      source: `ui/formal-pages/journey/${name}.png`, runtime: `ui/formal-pages/journey/${name}.jpg`,
      width: 720, height: 1584, alpha: false, format: "jpeg", quality: 90,
      chromaSubsampling: "4:2:0", existingCoverResize: true,
    };
  }),
];

export const findLargeImagePolicy = (source) => LARGE_IMAGE_POLICIES.find((policy) => policy.source === source);

export async function largeImageSourcePixels(input, policy) {
  const bytes = typeof input === "string" ? await readFile(input) : Buffer.from(input);
  const metadata = await sharp(bytes).metadata();
  let pipeline = sharp(bytes);
  if (policy.existingCoverResize) {
    // Retain the established source-to-runtime crop, never shrink the existing
    // 720 x 1584 runtime canvas as a package-size optimization.
    pipeline = pipeline.resize(policy.width, policy.height, {
      fit: "cover", position: "centre", kernel: "lanczos3",
    }).removeAlpha();
  } else if (metadata.width !== policy.width || metadata.height !== policy.height) {
    throw new Error(`Large image source dimensions changed: ${policy.source}`);
  }
  if (policy.existingRemoveAlpha) pipeline = pipeline.removeAlpha();
  return pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

export async function assertLargeImageGeometry(sourcePixels, encoded, policy) {
  const decoded = await sharp(encoded).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (decoded.info.width !== policy.width || decoded.info.height !== policy.height) {
    throw new Error(`Large image runtime dimensions changed: ${policy.source}`);
  }
  for (let offset = 3; offset < sourcePixels.data.length; offset += 4) {
    if (sourcePixels.data[offset] !== decoded.data[offset]) {
      throw new Error(`Large image alpha changed: ${policy.source} pixel ${Math.floor(offset / 4)}`);
    }
  }
  return decoded;
}

export async function encodeLargeImage(input, policy) {
  if (!policy || !["jpeg", "palette-png", "rgb-palette-exact-alpha-png"].includes(policy.format)) {
    throw new Error("Missing or unknown large image encoding policy");
  }
  const original = await largeImageSourcePixels(input, policy);
  let encoded;
  if (policy.format === "jpeg") {
    for (let offset = 3; offset < original.data.length; offset += 4) {
      if (original.data[offset] !== 255) throw new Error(`Cannot encode transparent source as JPEG: ${policy.source}`);
    }
    encoded = await sharp(original.data, { raw: original.info }).removeAlpha().jpeg({
      quality: policy.quality, mozjpeg: true, chromaSubsampling: policy.chromaSubsampling,
    }).toBuffer();
  } else {
    let colorPipeline = sharp(original.data, { raw: original.info });
    if (policy.format === "rgb-palette-exact-alpha-png") colorPipeline = colorPipeline.removeAlpha();
    encoded = await colorPipeline.png({
      palette: true, colours: 256, quality: policy.quality, effort: 10, compressionLevel: 9, dither: 1,
    }).toBuffer();
    if (policy.format === "rgb-palette-exact-alpha-png") {
      const quantized = await sharp(encoded).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      for (let offset = 0; offset < original.data.length; offset += 4) {
        // Preserve alpha at every pixel, including antialiasing and glow edges.
        // Fully transparent RGB is preserved too, avoiding matte replacement.
        if (original.data[offset + 3] === 0) original.data.copy(quantized.data, offset, offset, offset + 3);
        quantized.data[offset + 3] = original.data[offset + 3];
      }
      encoded = await sharp(quantized.data, { raw: quantized.info }).png({
        palette: false, compressionLevel: 9, adaptiveFiltering: true,
      }).toBuffer();
    }
  }
  await assertLargeImageGeometry(original, encoded, policy);
  return encoded;
}

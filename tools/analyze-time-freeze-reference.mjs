import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import sharp from "sharp";

// Extract exact decoded source frames, with no synthesized/interpolated artwork.
// Usage: node tools/analyze-time-freeze-reference.mjs [start end step label]
const input = resolve(process.env.TIME_FREEZE_REFERENCE ?? "C:/Users/Administrator/Downloads/QQ20261008-180212.mp4");
const output = resolve(process.env.TIME_FREEZE_REFERENCE_OUTPUT ?? "playtest-results/time-freeze-reference-latest-20261008");
const ffmpeg = "F:/GameDev/Tools/Krita/5.3.3/bin/ffmpeg.exe";
const ffprobe = "F:/GameDev/Tools/Krita/5.3.3/bin/ffprobe.exe";
const probe = (args) => JSON.parse(execFileSync(ffprobe, ["-v", "error", ...args, "-of", "json", input], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }));
await mkdir(output, { recursive: true });
const metadata = probe(["-show_streams", "-show_format"]);
const frames = probe(["-select_streams", "v:0", "-show_frames", "-show_entries", "frame=best_effort_timestamp_time,pkt_duration_time"])
  .frames.map((frame, index) => ({ index, pts: Number(frame.best_effort_timestamp_time), duration: Number(frame.pkt_duration_time) }));
const video = metadata.streams.find((stream) => stream.codec_type === "video");
const [start = 0, end = Math.floor(Number(video.duration)), step = 1] = process.argv.slice(2, 5).map(Number);
const label = process.argv[5] ?? "overview-1s";
if (![start, end, step].every(Number.isFinite) || start < 0 || end < start || step <= 0) throw new Error("Invalid frame interval");
if (!/^[a-zA-Z0-9_-]+$/.test(label)) throw new Error("Invalid contact-sheet label");
const selected = [];
for (let requested = start; requested <= end + step / 10; requested += step) {
  const frame = frames.reduce((best, candidate) => Math.abs(candidate.pts - requested) < Math.abs(best.pts - requested) ? candidate : best);
  if (selected.some((candidate) => candidate.index === frame.index)) continue;
  const filename = `frame-${String(frame.index).padStart(4, "0")}-${frame.pts.toFixed(5)}.png`;
  const path = resolve(output, filename);
  execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-i", input,
    "-vf", `select=eq(n\\,${frame.index})`, "-fps_mode", "vfr", "-frames:v", "1", path], { maxBuffer: 16 * 1024 * 1024 });
  selected.push({ ...frame, requested, file: filename, path });
}
const columns = Math.min(7, selected.length), thumbWidth = 224, thumbHeight = Math.round(video.height * thumbWidth / video.width), footer = 25;
const contact = sharp({ create: { width: columns * thumbWidth, height: Math.ceil(selected.length / columns) * (thumbHeight + footer),
  channels: 3, background: "#131725" } });
const overlays = [];
for (let index = 0; index < selected.length; index++) {
  const frame = selected[index], left = (index % columns) * thumbWidth, top = Math.floor(index / columns) * (thumbHeight + footer);
  overlays.push({ input: await sharp(frame.path).resize(thumbWidth, thumbHeight).toBuffer(), left, top });
  const caption = `<svg width="${thumbWidth}" height="${footer}"><rect width="100%" height="100%" fill="#131725"/><text x="9" y="18" fill="white" font-family="Arial" font-size="14">${frame.pts.toFixed(3)}s / frame ${frame.index}</text></svg>`;
  overlays.push({ input: Buffer.from(caption), left, top: top + thumbHeight });
}
const contactPath = resolve(output, `${label}.jpg`);
await contact.composite(overlays).jpeg({ quality: 94 }).toFile(contactPath);
const report = { input, sourceSha256: createHash("sha256").update(await readFile(input)).digest("hex"),
  metadata, extraction: "Exact decoded original video frame selected by decoded index; contact sheet resizes those frames and adds separate timestamps only.",
  ffmpeg, ffprobe, frames: selected, contactPath };
await writeFile(resolve(output, `${label}.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ videoDuration: video.duration, containerDuration: metadata.format.duration,
  frames: video.nb_frames, dimensions: [video.width, video.height], averageFps: video.avg_frame_rate,
  extracted: selected.length, contactPath, report: resolve(output, `${label}.json`) }, null, 2));

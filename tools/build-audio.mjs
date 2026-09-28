import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const bundledPython = resolve(
  homedir(),
  ".cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe",
);
const candidates = [
  ...(process.env.BLOCK_OUT_PYTHON ? [{ command: process.env.BLOCK_OUT_PYTHON, prefix: [] }] : []),
  { command: "python", prefix: [] },
  ...(process.platform === "win32" ? [{ command: "py", prefix: ["-3"] }, { command: bundledPython, prefix: [] }] : []),
  { command: "python3", prefix: [] },
];

let python;
for (const candidate of candidates) {
  const probe = spawnSync(candidate.command, [...candidate.prefix, "-c", "import numpy; print('block-out-audio-python-ready')"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  if (!probe.error && probe.status === 0 && probe.stdout.includes("block-out-audio-python-ready")) {
    python = candidate;
    break;
  }
}
if (!python) {
  throw new Error("Audio generation requires Python 3 with NumPy. Set BLOCK_OUT_PYTHON to a compatible interpreter.");
}

for (const script of ["tools/generate_original_sfx.py"]) {
  const result = spawnSync(python.command, [...python.prefix, script], {
    cwd: root,
    encoding: "utf8",
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${script} failed with exit code ${result.status}`);
}

for (const script of ["tools/encode-original-sfx-mp3.mjs", "tools/encode_soundtrack_mp3.mjs"]) {
  const encoded = spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: "utf8",
    stdio: "inherit",
    windowsHide: true,
  });
  if (encoded.error) throw encoded.error;
  if (encoded.status !== 0) throw new Error(`${script} failed with exit code ${encoded.status}`);
}

# Original interaction sound masters

These 11 stereo PCM WAV files are the byte-identical originals previously served
from `public/assets/audio/sfx`. They are preserved outside the web/WeChat runtime
assets; `manifest.json` records their SHA-256, size and sample count.

`tools/generate_original_sfx.py` reproduces the unchanged sound recipes in memory.
It checks existing masters byte-for-byte and refuses to overwrite a differing
master. It creates missing WAV masters here, never in `public`.

`node tools/encode-original-sfx-mp3.mjs` writes only the 11 runtime MP3 derivatives
and their manifest: libmp3lame, 96 kbps, 44.1 kHz, two channels, retained Xing/Info
gapless metadata. No trim, normalization or mono conversion is applied. Each MP3
is decoded and its sample count checked against the source before adoption.

`pnpm audio:build` runs the source verification, SFX encoding and the existing
supplied soundtrack copy step. FFmpeg must expose `libmp3lame`; set
`BLOCK_OUT_FFMPEG` if it is not on PATH (the existing Windows workspace bundle is
also detected). Python 3 with NumPy is required; use `BLOCK_OUT_PYTHON` if needed.
The four user-provided MP3 effects are not re-encoded.

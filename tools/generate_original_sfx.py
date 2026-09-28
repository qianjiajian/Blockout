"""Reproduce and preserve source WAV masters; runtime MP3s are encoded separately."""

from __future__ import annotations

import json
import hashlib
import io
import math
import wave
from pathlib import Path

import numpy as np


SR = 44_100
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "art-source" / "audio" / "sfx"
RNG = np.random.default_rng(0x5F0B10C)


def midi(note: float) -> float:
    return 440 * 2 ** ((note - 69) / 12)


def pan(mono: np.ndarray, start: float, end: float) -> np.ndarray:
    position = np.linspace(start, end, len(mono), dtype=np.float32)
    angle = (position + 1) * math.pi / 4
    return np.column_stack((mono * np.cos(angle), mono * np.sin(angle))).astype(np.float32)


def tone(duration: float, f0: float, f1: float, amplitude: float, decay: float,
         harmonics: tuple[float, ...], pan_start: float, pan_end: float) -> np.ndarray:
    length = round(duration * SR)
    t = np.arange(length, dtype=np.float64) / SR
    frequency = f0 * (f1 / f0) ** np.minimum(1, t / duration)
    phase = 2 * np.pi * np.cumsum(frequency) / SR
    mono = sum(strength * np.sin(phase * index + 0.19 * index)
               for index, strength in enumerate(harmonics, 1))
    envelope = np.minimum(1, t / 0.004) * np.exp(-t * decay)
    return pan((mono * envelope * amplitude).astype(np.float32), pan_start, pan_end)


def noise(duration: float, amplitude: float, decay: float, highpass: int,
          pan_start: float, pan_end: float) -> np.ndarray:
    length = round(duration * SR)
    t = np.arange(length, dtype=np.float32) / SR
    source = RNG.normal(0, 1, length).astype(np.float32)
    delayed = np.concatenate((np.zeros(highpass, dtype=np.float32), source[:-highpass]))
    mono = (source - delayed * 0.92) * (1 - np.exp(-t * 260)) * np.exp(-t * decay) * amplitude
    return pan(mono, pan_start, pan_end)


def place(track: np.ndarray, signal: np.ndarray, offset_seconds: float) -> None:
    offset = round(offset_seconds * SR)
    end = min(len(track), offset + len(signal))
    if end > offset:
        track[offset:end] += signal[:end - offset]


def room(track: np.ndarray, wet: float) -> np.ndarray:
    result = track.copy()
    for seconds, gain, cross in ((0.031, 0.48, True), (0.057, 0.31, False),
                                 (0.089, 0.2, True), (0.131, 0.12, False)):
        offset = round(seconds * SR)
        if offset < len(track):
            source = track[:-offset, ::-1] if cross else track[:-offset]
            result[offset:] += source * gain * wet
    return result


# tone: offset, duration, start Hz, end Hz, amplitude, decay, harmonics, pan start, pan end
# noise: offset, duration, amplitude, decay, high-pass spacing, pan start, pan end
RECIPES = {
    "blocked": (.23, .06, [
        (0, .19, 140, 84, .86, 14, (1, .32, .1), 0, 0),
        (.025, .12, 76, 64, .38, 12, (1,), 0, 0)],
        [(.004, .09, .11, 32, 7, -.1, .1)]),
    "ice": (.46, .24, [
        (.018, .25, 1180, 1510, .27, 10, (1,), -.5, -.38),
        (.05, .25, 1770, 1450, .24, 12, (1,), .46, .32),
        (.082, .25, 2430, 3110, .21, 14, (1,), -.2, -.08),
        (.114, .25, 3110, 2550, .18, 16, (1,), .32, .2)],
        [(0, .19, .12, 17, 1, -.5, .5)]),
    "booster": (.62, .2, [
        (0, .46, 118, 660, .44, 4.2, (1, .32, .14), -.5, .5),
        (.13, .24, midi(62), midi(62)*1.04, .22, 8, (1,), -.45, -.35),
        (.202, .24, midi(69), midi(69)*1.04, .22, 8, (1,), -.15, -.05),
        (.274, .24, midi(74), midi(74)*1.04, .22, 8, (1,), .15, .25),
        (.346, .24, midi(81), midi(81)*1.04, .22, 8, (1,), .45, .55)],
        [(.035, .42, .07, 7, 2, -.75, .75)]),
    "time": (.58, .24, [
        (0, .12, 880, 850, .42, 22, (1, .18), -.32, -.22),
        (.105, .13, 1120, 1090, .44, 21, (1, .18), .22, .32),
        (.18, .3, 1420, 1960, .3, 7.5, (1, .2, .06), -.18, .38)],
        [(.17, .22, .026, 11, 1, -.45, .45)]),
    "rocket": (.72, .22, [
        (0, .48, 88, 610, .5, 4.1, (1, .34, .13), -.18, .22),
        (.035, .5, 240, 1320, .42, 4.8, (1, .22, .08), -.52, .58),
        (.18, .31, 1380, 2280, .2, 7, (1,), .18, .7)],
        [(0, .56, .105, 5.8, 2, -.72, .76)]),
    "pulse": (.7, .28, [
        (0, .52, 122, 68, .48, 4.8, (1, .26), 0, 0),
        (.04, .44, 390, 1260, .38, 5.5, (1, .2, .06), -.78, .78),
        (.15, .35, 1820, 1240, .2, 7.5, (1,), .72, -.62)],
        [(.03, .46, .075, 6.2, 1, -.86, .86)]),
    "mechanic": (.38, .16, [
        (0, .24, 310, 520, .48, 9, (1, .27), -.26, .2),
        (.06, .25, 760, 980, .25, 8.5, (1, .16), .2, .36)],
        [(.015, .16, .045, 16, 4, -.18, .18)]),
    "reward": (.76, .31, [
        (0, .34, midi(74), midi(74)*1.012, .38, 7.2, (1, .26, .09), -.42, -.32),
        (.095, .34, midi(78), midi(78)*1.012, .38, 7.2, (1, .26, .09), -.14, -.04),
        (.19, .34, midi(81), midi(81)*1.012, .38, 7.2, (1, .26, .09), .14, .24),
        (.285, .34, midi(86), midi(86)*1.012, .38, 7.2, (1, .26, .09), .42, .52)],
        [(.18, .28, .035, 10, 1, -.6, .6)]),
    "unlock": (1.02, .38, [
        (0, .46, 150, 760, .24, 5.2, (1, .2), -.75, .75),
        *[(.08+i*.105, .42, midi(note), midi(note)*1.018, .31, 6.1, (1, .22, .07), -.58+i*.23, -.5+i*.23)
          for i, note in enumerate((62, 65, 69, 74, 77, 81))]], []),
    "win": (1.48, .42, [
        *[(i*.11, .52, midi(note), midi(note)*1.006, .34, 4.8, (1, .25, .08), -.62+i*.2, -.54+i*.2)
          for i, note in enumerate((62, 66, 69, 74, 78, 81, 86))],
        (.31, .74, midi(50), midi(50), .24, 3.5, (1, .22), 0, 0)],
        [(.35, .62, .038, 5.3, 1, -.8, .8)]),
    "fail": (.96, .17, [
        *[(i*.13, .42, midi(note), midi(note-1.4), .42, 5.2, (1, .25, .08), .18-i*.12, .12-i*.12)
          for i, note in enumerate((62, 59, 55, 50))],
        (.29, .58, 96, 48, .38, 5.1, (1, .28), 0, 0)],
        [(.34, .4, .045, 7.5, 5, -.1, .1)]),
}


OUTPUT.mkdir(parents=True, exist_ok=True)
manifest = {"title": "Block Out! Original Interaction Sound Set", "sampleRate": SR,
            "channels": 2, "composition": "Original sound design created for this project", "sounds": {}}
for name, (duration, room_wet, tones, noises) in RECIPES.items():
    track = np.zeros((round(duration * SR), 2), dtype=np.float32)
    for offset, seconds, f0, f1, amp, decay, harmonics, left, right in tones:
        place(track, tone(seconds, f0, f1, amp, decay, harmonics, left, right), offset)
    for offset, seconds, amp, decay, spacing, left, right in noises:
        place(track, noise(seconds, amp, decay, spacing, left, right), offset)
    track = room(track, room_wet)
    track -= np.mean(track, axis=0, keepdims=True)
    edge = min(round(.002 * SR), len(track)//4)
    track[:edge] *= np.linspace(0, 1, edge, endpoint=False, dtype=np.float32)[:, None]
    track[-edge:] *= np.linspace(1, 0, edge, dtype=np.float32)[:, None]
    track = np.tanh(track*1.12) / np.tanh(1.12)
    peak = float(np.max(np.abs(track)))
    if peak:
        track *= .78/peak
    pcm = np.round(np.clip(track, -1, 1)*32767).astype("<i2")
    path = OUTPUT / f"{name}.wav"
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(2); wav.setsampwidth(2); wav.setframerate(SR); wav.writeframes(pcm.tobytes())
    source_bytes = buffer.getvalue()
    if path.exists():
        if path.read_bytes() != source_bytes:
            raise RuntimeError(f"Source master differs from the original recipe; refusing to overwrite {path}")
    else:
        path.write_bytes(source_bytes)
    manifest["sounds"][name] = {"file": path.name, "durationSeconds": duration,
        "peak": float(np.max(np.abs(track))), "rms": float(np.sqrt(np.mean(np.square(track, dtype=np.float64)))),
        "bytes": len(source_bytes), "sha256": hashlib.sha256(source_bytes).hexdigest(), "frames": len(pcm)}
(OUTPUT/"manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
print(f"Verified/rendered {len(RECIPES)} original source WAV masters in {OUTPUT}")

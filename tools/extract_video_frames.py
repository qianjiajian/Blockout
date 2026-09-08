from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract evenly spaced video frames and contact sheets.")
    parser.add_argument("video", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--count", type=int, default=30)
    parser.add_argument("--interval", type=float, help="Extract one frame every N seconds.")
    parser.add_argument("--start", type=float, default=0.0)
    parser.add_argument("--end", type=float, help="Stop before this timestamp in seconds.")
    parser.add_argument("--columns", type=int, default=5)
    parser.add_argument("--sheet-size", type=int, default=60, help="Frames per contact sheet.")
    parser.add_argument("--quiet", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    args.output.mkdir(parents=True, exist_ok=True)

    capture = cv2.VideoCapture(str(args.video))
    if not capture.isOpened():
        raise SystemExit(f"Could not open video: {args.video}")

    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = float(capture.get(cv2.CAP_PROP_FPS))
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = frame_count / fps if fps else 0.0
    end = min(args.end if args.end is not None else duration, duration)
    if args.interval:
        timestamps = np.arange(args.start, end, args.interval)
    else:
        timestamps = np.linspace(args.start, max(end - 0.05, args.start), args.count)

    extracted: list[dict[str, object]] = []
    frames: list[np.ndarray] = []
    for index, timestamp in enumerate(timestamps):
        capture.set(cv2.CAP_PROP_POS_MSEC, float(timestamp * 1000))
        ok, frame = capture.read()
        if not ok:
            continue
        filename = f"frame-{index:03d}-{timestamp:07.2f}s.jpg"
        cv2.imwrite(str(args.output / filename), frame, [cv2.IMWRITE_JPEG_QUALITY, 92])
        frames.append(frame)
        extracted.append({"index": index, "seconds": round(float(timestamp), 3), "file": filename})
    capture.release()

    thumb_height = 360
    thumb_width = round(width * thumb_height / height)
    for sheet_start in range(0, len(frames), args.sheet_size):
        sheet_frames = frames[sheet_start : sheet_start + args.sheet_size]
        rows = (len(sheet_frames) + args.columns - 1) // args.columns
        canvas = np.full((rows * thumb_height, args.columns * thumb_width, 3), 244, dtype=np.uint8)
        for local_index, frame in enumerate(sheet_frames):
            global_index = sheet_start + local_index
            thumb = cv2.resize(frame, (thumb_width, thumb_height), interpolation=cv2.INTER_AREA)
            row, column = divmod(local_index, args.columns)
            canvas[row * thumb_height : (row + 1) * thumb_height, column * thumb_width : (column + 1) * thumb_width] = thumb
            label = f"{extracted[global_index]['seconds']:.1f}s"
            cv2.putText(
                canvas,
                label,
                (column * thumb_width + 12, row * thumb_height + 32),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (15, 15, 15),
                4,
                cv2.LINE_AA,
            )
            cv2.putText(
                canvas,
                label,
                (column * thumb_width + 12, row * thumb_height + 32),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (255, 255, 255),
                2,
                cv2.LINE_AA,
            )
        sheet_end = sheet_start + len(sheet_frames) - 1
        filename = f"contact-sheet-{sheet_start:04d}-{sheet_end:04d}.jpg"
        cv2.imwrite(str(args.output / filename), canvas, [cv2.IMWRITE_JPEG_QUALITY, 92])

    metadata = {
        "source": str(args.video),
        "frame_count": frame_count,
        "fps": fps,
        "width": width,
        "height": height,
        "duration_seconds": round(duration, 3),
        "frames": extracted,
    }
    (args.output / "metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    if not args.quiet:
        print(json.dumps(metadata, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

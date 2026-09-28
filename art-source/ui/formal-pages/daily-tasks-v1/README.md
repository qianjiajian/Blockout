# Daily Tasks V1 split art

## Replacement status — 2026-09-22

The popup's active supplied art is now documented in `../daily-tasks-v2/README.md`.
Only this V1 directory's task-row shell remains active because the supplied set
has no independent row-background cutout. All original source PNGs are preserved;
the other nine runtime WebPs were moved recoverably to
`.codex-temp/daily-task-formal-art-2026-09-22/legacy-runtime/` and are no longer
exported by the optimizer. The table below is historical for those retired assets.

This directory contains the editable, independently replaceable sources for the Daily Tasks feature. Runtime text, numbers, progress bars, and button labels are drawn by code so one art set serves all ten languages.

| Runtime role | Editable source | Runtime asset |
| --- | --- | --- |
| Home shortcut (replaced 2026-09-22) | `../../home-v3/daily-tasks-entry.png` | `public/assets/art/ui/home-v3/daily-tasks-entry.png` |
| Popup title | `title-plaque.png` | `public/assets/art/ui/formal-pages/daily-tasks-v1/title-plaque.webp` |
| Task row shell | `task-row.png` | `public/assets/art/ui/formal-pages/daily-tasks-v1/task-row.webp` |
| Clear-level icon | `flag.png` | `task-flag.webp` |
| Star icon | `star.png` | `task-star.webp` |
| Perfect-clear icon | `crown.png` | `task-crown.webp` |
| Booster-free icon | `shield.png` | `task-shield.webp` |
| Booster icon | `booster.png` | `task-booster.webp` |
| Locked chest | `chest-locked.png` | `chest-locked.webp` |
| Ready chest | `chest-ready.png` | `chest-ready.webp` |
| Opened chest | `chest-open.png` | `chest-open.webp` |

`task-icons-source.png` and `reward-chests-source.png` preserve the original ImageGen sheets. The individual PNGs are the preferred replacement boundary: replace one file without changing layout or code, then export to its stable runtime WebP path at the dimensions declared in `art-source/manifest.json`.

All assets must retain transparent alpha and contain no baked-in language text.

`home-entry.png` is retained as the previous source. The active Home shortcut is
the supplied native-size `meiri.png`, documented in `../../home-v3/README.md`.

# Achievements V2 — supplied formal cutouts

Imported 2026-09-22 from `C:/Users/Administrator/Desktop/block out/新/成就/`.
All twelve source cutouts are original bytes. Runtime uses ten unique files in
`public/assets/art/ui/formal-pages/achievements-v2/` and two byte-identical
files already present in `daily-tasks-v2/`. No source is resized, repainted,
cropped, or recompressed by this import. UI data/text is not baked into images.

| Supplied file | Local source | Runtime folder | Native size | Original SHA-256 |
| --- | --- | --- | --- | --- |
| 2.png | close.png | daily-tasks-v2 | 94×98 | fd6df9c51e81220161239dd0e405ce5ab8080827c22b7bd703650150659167ec |
| 3.png | medal-inactive.png | achievements-v2 | 82×79 | e055beddce86ada2f630abf0fca19669594078ebb2511eae591952382ae6f2cb |
| 4.png | medal-active.png | achievements-v2 | 82×79 | 06a29a26a706be271e0071386dec60ea2e841011ad288fb35675c375130f9772 |
| 5.png | summary-panel.png | achievements-v2 | 476×66 | b7b1a2f089d38769084f4a7ad439c45ce34b776dfdeaf0480a853741d3957e45 |
| 6.png | button-green.png | achievements-v2 | 120×53 | 1e3624ff9498f0e58db442d39539a5b084a279e3e8a438660a3dd47efce7b1e7 |
| 7.png | button-grey.png | daily-tasks-v2 | 120×53 | 4bc204e9eb1ec7d8aa7249404de2b6f77254e75cf5ecea03f01e81b3c14db865 |
| 8.png | progress-track.png | achievements-v2 | 229×21 | 184aac13a2bea48e9b4def2ff2163c6390bb658290f957f99b3156bd440249fe |
| 9.png | progress-fill-green.png | achievements-v2 | 223×15 | 17924d572123fdc7521aca8d780dfca08ff2ce7640ce9cf432a25a86195eaf08 |
| 10.png | progress-fill-blue.png | achievements-v2 | 223×15 | b4e085e27280f75b4bd8b459297818f9c264ed4e8ffb6c68304d1a899a5ee6bd |
| 11.png | panel.png | achievements-v2 | 594×889 | bc76f958332d5aed3c166267f2a485a1512ffcf42e3aebe2fc0a3cb68d70a327 |
| Supplemental di1.png | row-active.png | achievements-v2 | 519×115 | 796a9c11421c3ce038987281ecb37aabb4e42e6d4642a0dd374044b32bef2dd2 |
| Supplemental di2.png | row-inactive.png | achievements-v2 | 517×114 | c23339c141f3ecc8e5eb6a8d76cced3ea869cb59e4ae0fce94efd3a0d5a1172a |

The close button (`2.png`) and grey button (`7.png`) exactly match the active
Daily Tasks assets, including all original file bytes. Their existing global
manifest entries are reused; duplicate runtime-path declarations are not added.
The other ten cutouts have distinct hashes and remain independent, including
the similarly sized green button, summary strip, and panel.

Current runtime assets: **103,918 B** (ten PNGs; original eight 90,636 B plus
two supplied row frames 13,282 B). Without deduplication the twelve cutouts
would total 119,253 B. This is raw asset size, not a claim that the complete
WeChat build passes its package budget; final build verification is separate.

## Reference, not runtime

`1.png` is the annotated 720×1584 composition reference. The unmodified source
copy `reference-layout.png` has SHA-256
`41d5028fdac076e9d8747faf9d716b23b6c702ee1d2ea7bed44d7c38b3326194`.
It is not exported or listed in the runtime manifest. Red numbers in it are
layout/font annotations, not part of game content.

## Supplied row-shell cutouts

On 2026-09-22 the missing row frames were supplied at
`C:/Users/Administrator/Desktop/block out/00补充/00补充/成就/`.
`di1.png` is the gold active row, imported as `row-active.png` (7,383 B);
`di2.png` is the grey inactive row, imported as `row-inactive.png` (5,899 B).
Source and runtime preserve all original bytes and their different native
dimensions. No row is generated, resized, or extracted from the annotated reference.

The legacy blue medal is no longer used by any draw path after the V2 replacement.
Its 23,081 B runtime file was moved recoverably to
`.codex-temp/achievement-formal-art-2026-09-22/legacy-runtime/achievement-medal-blue-v1.png`;
its original `art-source/ui/achievements/achievement-medal-blue-v1.png` is preserved.
The retired runtime path is absent from the global manifest and optimizer.
Together with the ten new PNGs this yields a net runtime asset increase of
80,837 B. The home achievement shortcut is the separate native 118×118 asset
documented in `../../home-v3/README.md` and remains unchanged.

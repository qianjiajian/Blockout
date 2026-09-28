# Daily Tasks V2 — supplied formal cutouts

Imported 2026-09-22 from `C:/Users/Administrator/Desktop/block out/新/每日任务/`.
Every PNG below is copied byte-for-byte to this source directory and
`public/assets/art/ui/formal-pages/daily-tasks-v2/`: no resize, repaint, crop,
recompression, or generated replacement. Individual files remain replaceable.
The main manifest uses `transform: copy` and `loadGroup: formal-daily-tasks`.

| Supplied file | Source/runtime filename | Manifest suffix | Native size | Source SHA-256 |
| --- | --- | --- | --- | --- |
| 2.png | close.png | close | 94×98 | fd6df9c51e81220161239dd0e405ce5ab8080827c22b7bd703650150659167ec |
| 3.png | task-booster.png | taskBooster | 71×77 | 982d0874fb569e12fea4ab005d73c8c94fd167352bc0b170dd37bf47bc09ab8f |
| 4.png | task-trophy.png | taskTrophy | 70×90 | e472aa044a3bef26409932042ca4f33db5ff14d8726e6f2a54d9548bd394b442 |
| 5.png | task-shield.png | taskShield | 59×68 | 277c92c5613d7f311f8350490d1572249e6347d95f229d0b073042ff2550c138 |
| 6.png | chest.png | chest | 85×75 | 3236baa86717db91d336da2fd15db8d1ecd58191f3b26ebb76c35fb41c11d1a7 |
| 7.png | calendar.png | calendar | 53×54 | 32b75d6be1e55965de813a421447e98168241efd827b12c492c82a195b1fa326 |
| 8.png | summary-panel.png | summaryPanel | 476×66 | 3ea5e64a6288e358d5a018bffc4f65052db1d47d6ca1849fa7c18a7774550be5 |
| 9.png | button-green.png | buttonGreen | 120×53 | afe3bd7bfa73e9db46bb26b0179efa643cb3b7807d1c4c5a734694ac1861c5ea |
| 10.png | button-grey.png | buttonGrey | 120×53 | 4bc204e9eb1ec7d8aa7249404de2b6f77254e75cf5ecea03f01e81b3c14db865 |
| 11.png | button-yellow.png | buttonYellow | 120×53 | 256a1c8d31c2499d44fa47d5ca04493e91b39a240f10a7d6d5b06a9df11022e2 |
| 12.png | progress-track.png | progressTrack | 189×27 | ae9f2884d6e1d65af059abbe322609515316e7cf764ce7176e9c7d59c4d99f9f |
| 13.png | progress-fill.png | progressFill | 182×19 | ecf284b307bf36637eeedaec2c268594f763c88cbef74da37b7138ad2d6d685c |
| 14.png | bonus-panel.png | bonusPanel | 524×113 | c938e269f99affc354e0b6e844960ebb0d428aec98389cece065578a855eb132 |
| 15.png | panel.png | panel | 594×889 | b5cc9b255865bb96acd3a6104abd710befd12bbbd3d393fc38e88f4b3821c700 |
| Supplemental ca16c960007a7f71f088ac2928a79b1a.png | task-row.png | taskRow | 458×115 | 980954593cc91da9b8390ea80b0f91ff61f2c59c26248ffbdd173e198d9ad302 |

## Reference, not runtime

`1.png` is the annotated 720×1584 composition reference. Its unmodified source
copy is `reference-layout.png`, SHA-256
`919e9e75e70648110ed12c0c453cb766147bf6ae30f0a702ec9a3229f78ee8d8`.
It is intentionally absent from the runtime directory and asset manifest.

## Supplied task-row shell

On 2026-09-22 the missing row was supplied at
`C:/Users/Administrator/Desktop/block out/00补充/00补充/每日任务/ca16c960007a7f71f088ac2928a79b1a.png`.
Its exact 46,032 B PNG is now `task-row.png` in both source and runtime.
The native 458×115 image is neither synthesized nor extracted from the reference.
It replaces the 484×112 V1 runtime `task-row.webp` (7,058 B), which is preserved at
`.codex-temp/supplied-row-frames-2026-09-22/legacy-runtime/task-row.webp` for recovery.
The old `../daily-tasks-v1/task-row.png` source remains untouched.

The other nine V1 runtime WebPs were moved recoverably to
`.codex-temp/daily-task-formal-art-2026-09-22/legacy-runtime/`.
Their source PNGs remain untouched. The asset optimizer now exports all 15
exact V2 PNGs and does not restore any retired V1 runtime files.

Home task and achievement shortcuts remain the separately supplied 118×118
PNG assets documented in `../../home-v3/README.md`; this popup batch does not
replace those shortcuts. Gameplay, task progress, rewards, and transactions
are not asset-layer concerns and are unchanged here.

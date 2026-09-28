# Mechanism Guide V2 — supplied modal artwork

Imported 2026-09-22 from
`C:/Users/Administrator/Desktop/block out/玩法图鉴弹窗/玩法图鉴弹窗/`.
All 25 supplied cutouts and the annotated layout are archived here with their
original bytes. The user's originals are untouched. No image is generated,
cropped, resized, recolored, or synthesized.

The current catalogue follows the user's workbook A1:B16 (15 mechanisms,
confirmed 2026-09-22), superseding the earlier 14 legacy mechanisms plus a basic
block card. Flip door, colored grid and bomb are now runtime icons. Their three
original `unused-*` archival filenames remain untouched, with byte-identical
copies under their canonical runtime source names. Toggle block is not in the
workbook and remains source-only. No new gameplay implementation is implied by
this UI catalogue/resource alignment.

## Native source mapping

| Supplied file | Archived name | Native dimensions | New runtime | Source SHA-256 |
| --- | --- | --- | --- | --- |
| di0.png | card.png | 158×198 | 18678 B | b2f854a41796592f3698716c84fbc9f1df7ad9460361bb7004e64c49b4750772 |
| guan.png | close.png | 94×98 | source only | fd6df9c51e81220161239dd0e405ce5ab8080827c22b7bd703650150659167ec |
| di4.png | detail-body.png | 484×157 | 8088 B | 8b5d65b013d4f74042ea34bb475e6133e0463afd8556f8af23450588dd24ea91 |
| di3.png | detail-panel.png | 571×294 | 7369 B | 50c31aa1988e58c660bb85ecd92377e4e61a05bc22c670bfe240cc6fbd6fe260 |
| di2.png | detail-title.png | 281×49 | 634 B | fe4c49c4bf13b9f390ab3e4dfda8968245e8bc08e5574d5bcbef93c5b1ca3217 |
| 轴向块.png | icon-axis-block.png | 135×98 | 19078 B | 8327a8fc284d49c1331a21d6fddeb4ab2fe3b23c502fb95a1cc287c5de2ee5c6 |
| 普通出口.png | icon-color-exit.png | 84×100 | 16463 B | 315826489e476bd1f3bca474fcf63f5264784e0b5af57abbc9414ce9a7a5adc9 |
| 冰冻出口.png | icon-frozen-exit.png | 107×95 | 17212 B | 0ee4ca7668bc9eccbb5e64812bc9a1317f36af9179a7298420dbc99bec612cb7 |
| 色块生成器.png | icon-generator.png | 81×92 | 12510 B | 53501a1fb9c64122289a62eab802b53e02190f7cf14c0ecbc6090e77337de5c3 |
| 异形色块.png | icon-irregular-block.png | 82×83 | 10846 B | f76dcd79ed7194ddd58737176e19edf76a40f153ef7846c507ec492ccef0af8c |
| 异形棋盘.png | icon-irregular-board.png | 93×97 | 15093 B | a96b397b2007b245e891c83079f863be62de8dea71cb5205de4a732747a10d20 |
| 钥匙与锁.png | icon-key-lock.png | 109×108 | 19026 B | 385a65baae0982d982db0c3643fa2edd144601cdc51f695913b39973afcbb45f |
| 电梯.png | icon-layered-lift.png | 91×107 | 18006 B | ccdad207f3634a5231a6ff3fffb9a8cbd073646bbd642155905d065f88de0a1e |
| 外壳块.png | icon-multilayer-shell.png | 94×98 | 15444 B | d053e6e3cb30e4f9afd602f02146c292b06f09398deda1533aa508288cd0b51f |
| 数字冰块.png | icon-numeric-ice.png | 98×106 | 17099 B | 4bdd196c517ac927a4662c1142b5f04352af457db0764acc4796c0d86faa2106 |
| 卷帘门.png | icon-shutter.png | 98×97 | 16690 B | 3072822a38363fe857dff3e795a231c82d022863199155a7da21eb1e661d594d |
| 星标块与星门.png | icon-star.png | 115×109 | 20984 B | bf6288286f091988a76604f67563f951033f4adfaea348f702d13724deaed906 |
| suo.png | lock.png | 64×77 | 7277 B | 8a8a42b5bb1c3fb54ba4c148151fb40b697538e9bf99a15d37f835f3cd6b0d9d |
| mengban.png | locked-overlay.png | 159×197 | 3163 B | e0dba8883d6199f4f6ead3493d244acd2edce00aa5304bac246dacbcc2a3408f |
| di.png | panel.png | 677×1152 | 49845 B | 4465063b7dd8cfc689286eeb1c37af01409e2ef9e826dc20acd3547d640b883d |
| 示意.png | reference-layout.png | 720×1584 | source only | df2a20aa26d55963c0e2dbf92adc8b45eb15027a6756deafbcc5b7bd03e4f710 |
| xuanzhong.png | selected.png | 174×212 | 12360 B | ebba1a4e6cef55c6d5f2bec73abf46fda64bfc7c6e19f39ae442f73f5e6251c2 |
| 炸弹.png | unused-icon-bomb.png | 97×117 | source only | 66b79ba16ef4684757a90f6b695e1e36bcc9c4d60197166a0d72f579c1840663 |
| 彩色地格.png | unused-icon-color-floor.png | 136×95 | source only | 9a605ba3c9f6b71ad38f71a004772ac680391347e8063645b681f0265c4c358f |
| 翻转门.png | unused-icon-flip-gate.png | 101×106 | source only | ce0555ef225387b0a964fe2a3fef6106b702a1fa9b6f7097f9361a7b14ddef5b |
| 开闭方块.png | unused-icon-toggle-block.png | 110×108 | source only | 8a28f73b12edc141e1c5a80aa67e447645baa1a24c69887d9823c210829fc906 |

Additional canonical runtime sources (the older `unused-*` source copies above
remain as historical archives, not additional runtime exports):

| Supplied file | Canonical PNG | Native size | Runtime bytes | Source SHA-256 |
| --- | --- | --- | ---: | --- |
| 翻转门.png | icon-flip-door.png | 101×106 | 17,474 | ce0555ef225387b0a964fe2a3fef6106b702a1fa9b6f7097f9361a7b14ddef5b |
| 彩色地格.png | icon-colored-grid.png | 136×95 | 20,331 | 9a605ba3c9f6b71ad38f71a004772ac680391347e8063645b681f0265c4c358f |
| 炸弹.png | icon-bomb.png | 97×117 | 21,761 | 66b79ba16ef4684757a90f6b695e1e36bcc9c4d60197166a0d72f579c1840663 |

The 23 runtime PNGs live in
`public/assets/art/ui/formal-pages/mechanism-guide-v2/` and total **365,431 B**.
They retain all source dimensions and every decoded RGBA byte, including RGB
under transparent pixels. The existing `optimizeWechatPng` helper accepts a
smaller encoded PNG only after an exact pixel comparison; original bytes are
retained when no smaller exact encoding exists. The manifest transform is
`png-lossless-no-resize`. All native alpha is preserved.

## UI contract and catalogue boundary

`GAME_ART.ui.formalPages.collection` maps modal chrome as follows:

- `panel` → panel, `card` → card, `titleShadow` → detail-title.
- `detailPanel` → detail-panel, `detailBody` → detail-body.
- `lockedOverlay` → locked-overlay, `lock` → lock, `selected` → selected.
- `close` reuses `daily-tasks-v2/close.png`, which is byte-identical to
  the new supplied `guan.png`. Its source proof is retained here as close.png;
  there is no duplicate runtime file or manifest entry.
- The obsolete `colorImage` property and basic color-block placeholder are
  removed. The supplied building-block picture belongs to irregular-block.
- `background`, `topHeader`, `titlePanel` remain registered at their original
  collection paths because the collection album shares them. The new modal
  loader does not need them. The old title bitmap key is removed; title is
  localized Canvas text. `retiredItemImages` is empty.

The current fifteen atlas slots follow the confirmed workbook order. Catalogue
text and discovery-state migration are handled by the separate UI/catalogue
batch; this asset batch does not edit core logic or player data:

1. generator / 色块生成器 → icon-generator
2. axis-block / 轴向块 → icon-axis-block
3. key-lock / 钥匙与锁 → icon-key-lock
4. star / 星标块、星门 → icon-star
5. flip-door / 翻转门 → icon-flip-door
6. colored-grid / 彩色地格 → icon-colored-grid
7. bomb / 炸弹 → icon-bomb
8. shutter / 卷帘门 → icon-shutter
9. layered-lift / 升降台 → icon-layered-lift (supplied 电梯.png)
10. color-exit / 普通出口 → icon-color-exit
11. irregular-block / 异形色块 → icon-irregular-block
12. irregular-board / 异形棋盘 → icon-irregular-board
13. frozen-exit / 冰冻出口 → icon-frozen-exit
14. numeric-ice / 数字冰块 → icon-numeric-ice
15. multilayer-shell / 外壳块 → icon-multilayer-shell

The supplied toggle block is **source-only**, because it is absent from the
workbook. The annotated layout is source-only, not a runtime image or a new
gameplay instruction. Previous timed-generator and staged-frame catalogue
references are removed; their global gameplay image files remain untouched.

The modal contract loads 24 independent image instances / 24 unique URLs:
9 chrome entries plus 15 ordered icons. Shared background keys are not part
of that load. No basic-block placeholder is added to the fifteen cards.

## Retired runtime inventory and recovery

Nineteen old guide-only PNGs were moved, not deleted, to:

`.codex-temp/mechanism-guide-supplied-art-2026-09-22/legacy-runtime/collection/`

Exact files: title-shadow.png, title.png, detail-panel.png, detail-body.png,
card.png, locked-overlay.png, lock.png, selected.png, mechanism-01.png through
mechanism-11.png. All original PNGs remain in
`art-source/ui/formal-pages/collection/`. Their obsolete manifest entries and
optimizer exports are retired. A rollback requires restoring the matching
prior UI contract as well as the archived runtime files.

The shared background.png, top-header.png and title-panel.png are untouched.
All gameplay assets, including the two formerly referenced legacy icons and
other globally used mechanism art, are untouched.

Retired bytes are **310,678 B Web / 302,450 B WeChat** (actual deterministic
native PNG encoding). Current bytes are 365,431 B on both platforms. Relative
to the original pre-modal guide, delta is **+54,753 B Web / +62,981 B WeChat**.
The workbook-alignment sub-batch adds **59,566 B** on both platforms relative
to the preceding 20-PNG guide. These numbers
are scoped asset accounting, not a whole-package or subpackage build approval.
No full optimizer or unrelated resource rewrite was run for this import.

Validation: `tests/mechanismGuideArt.test.ts` pins source hashes, native size,
alpha presence, full RGBA equality, source-only files, manifest uniqueness,
shared close/background paths, old runtime retirement and workbook icon order.

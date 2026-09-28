# Collection Album V3 — latest supplied native-size cutouts

Imported 2026-09-22 from
`C:/Users/Administrator/Desktop/block out/收藏新/收藏新/`.
All supplied PNGs are preserved byte-for-byte in this source directory;
the user's files are untouched. The numbered `1.png`–`10.png` illustrations were
not imported. Existing 200 level and 40 masterpiece atlas illustrations remain
unchanged. This resource batch does not modify gameplay, saved progress, or
restoration transactions.

## Source mapping and native dimensions

| Original | Archived source filename | Property/use | Native size | Original SHA-256 |
| --- | --- | --- | --- | --- |
| anniu4.png | tab-blue.png | suppliedTabBlue | 204×77 | fc05e9f1bd68bb15be649a41ae3d4d54abec70f85dbd4eddbfe911d1174068ea |
| anniu3.png | tab-purple.png | suppliedTabPurple | 203×80 | 3ae5969273a25cf40349af7836aa72c3113387c7f5f79d9aa031e28495a05820 |
| di4.png | card-blue.png | suppliedCardBlue | 194×242 | c2e1099cd2efe97a957d83dc0e74728ca0ffc270365e813d2832de0325fab2d6 |
| di3.png | card-purple.png | suppliedCardPurple | 194×242 | 364c85468fab330d43ae8657b6ff27032a86442fdcd65b7024c672eaeb01bfd2 |
| hui.png | card-gray.png | suppliedCardGray | 215×269 | 2609542bbc87c6f1fed8db634e9bcfad3fd3de4148db770247ce5042e9aa6d00 |
| jin.png | card-gold.png | suppliedCardGold | 215×269 | 2244127e87c12bb2174296cf5a7f5a49c768a78becc57ac4e3160e10cec78af5 |
| jindutubiao.png | progress-icon.png | suppliedProgressIcon | 45×46 | 4339eb5b45017c11f9f9ec1cc34b63985a3c2e9986d4ede6a882527bffe3683b |
| di1.png | progress-panel.png | reuse V2 suppliedProgressPanel | 320×60 | d3be39c04f5c1f01bc0d08bc934c146b6b2a39c81828411fed2420b6f4f69dc7 |
| suo.png | lock.png | suppliedLock | 64×75 | a1d10feded4186e7c44eb99d59f4db984729eb79a7818956de63481aa9d37073 |
| mengban.png | mask.png | suppliedMask | 159×157 | 274aa4c18a610e7637f9636d09251836b45497acf2e6907de7e272a49a06ba3a |
| guan.png | detail-close.png | reuse Daily V2 close | 94×98 | fd6df9c51e81220161239dd0e405ce5ab8080827c22b7bd703650150659167ec |
| anniu1.png | page-previous.png | pagePrevious | 50×58 | f079863c3a96769542422b8c5a3f03427d4a226cf20ef37d1608a2fc4a74f61e |
| anniu2.png | page-next.png | pageNext | 49×57 | d495645dfa1c8a42fc679391ca61b50b0160105bd1fde074b8521cff2d54591d |
| di2.png | page-indicator.png | pageIndicator | 116×45 | cf165b542181c314eac5f43348cfd19c9a9e7db82d0749374b46b64bd6ef72b0 |
| xing2.png | star-filled.png | starFilled | 36×35 | 2673706b163039dad1f2d709a4a7e52c5ebf754e8c0ed358df4d1f6da2eb0c19 |
| kong2.png | star-empty.png | starEmpty | 38×37 | 8369faa8366e75d26634d8431940cc2a82f1d5913f676095482bb3d36c9267d5 |
| shoucang.png | guide-book.png | guideBook | 96×103 | 151e6212cc9eb9323dd7009a944888b79539eaa0cb36bebb20ebb4a51951c350 |
| di0.png | unused-panel-di0.png | explicitly unused, source only | 677×1152 | 4465063b7dd8cfc689286eeb1c37af01409e2ef9e826dc20acd3547d640b883d |

The separate 679×960 detail panel remains the existing V2 `detail-panel.png`.
The new `guan.png` is **not** identical to V2's old 93×98 detail close, but it is
byte-identical to `daily-tasks-v2/close.png`. The runtime `detailClose` URL reuses
that existing file without a second manifest entry or duplicate PNG. Likewise,
new `di1.png` exactly matches V2 `progress-panel.png` and reuses its current URL.
Background, top header, and title panel continue to reuse formal collection
assets; `newBadge` alone remains from the V1 runtime set.

All native alpha is retained, including fully transparent RGB. The supplied
mask has alpha 0–161; the progress panel alpha is 0–99. Both star images keep
their original transparent border and original, differing dimensions. Do not
double-fade the mask or crop/resize these source files to match a layout.

## Exact-pixel runtime encoding

Fifteen PNGs are exported to
`public/assets/art/ui/formal-pages/collection-album-v3/`.
They total **184,262 B**. `tools/optimize-assets.mjs` uses the existing
`optimizeWechatPng` helper and accepts compression only when every decoded RGBA
byte matches, including RGB under zero alpha. Dimensions and geometry stay
unchanged; there is no lossy palette, WebP conversion, or generated substitute.
`di0`, duplicate `di1`, duplicate `guan`, and the annotated reference are never
exported in V3. The full collection URL contract has 22 keys, plus 10 unchanged
card atlases.

| Runtime PNG | Bytes | Runtime SHA-256 |
| --- | ---: | --- |
| tab-blue.png | 16,862 | 058a0a12f08d558413cdc7c3def24e7d418c9b6ea3c8c69152d9f59085eb77d4 |
| tab-purple.png | 16,035 | fa404e3ab9b3a65c7b5ad2557a861455571a99db33e680b859cf9ab685c5f127 |
| card-blue.png | 25,567 | ca425259a4d983e0c6153d9776b4eb48f0aef1844081de9d9a78b836badf6259 |
| card-purple.png | 23,399 | 88133bd777eb70b1b96f0983b9bc544f2771d3d8a163a78a23e471c583ac4da3 |
| progress-icon.png | 4,069 | 4339eb5b45017c11f9f9ec1cc34b63985a3c2e9986d4ede6a882527bffe3683b |
| lock.png | 7,178 | a4f4f4a381c6cc4176eba1eaf27b7f0b2b2588ca6d43579e5c6a0a641d2c9503 |
| mask.png | 824 | 93e317fecca4e7b21bd8df0adeb6e853660977576dea7d07c1d7ae0fe7819b81 |
| page-previous.png | 6,551 | f079863c3a96769542422b8c5a3f03427d4a226cf20ef37d1608a2fc4a74f61e |
| page-next.png | 6,560 | 52c75759aa9e512d223a29f7cc959560aa80693a9f95686557c16894d6921e90 |
| page-indicator.png | 585 | 8e9c4b554b9b91531f1eab3c472abe34eda8d94ca8236462eeeabb49b9cf80d3 |
| star-filled.png | 2,530 | 2673706b163039dad1f2d709a4a7e52c5ebf754e8c0ed358df4d1f6da2eb0c19 |
| star-empty.png | 2,431 | 32b086dd114a68dfcaa1b0f8f7bf65adbcf47dc69eae3d45c5d9f5b331f41f9d |
| guide-book.png | 16,963 | b745b8f3cdc34b0ac567a0f2bf223a9e9a9c5d8a5909892172d0a895e31f14fc |

## Recoverable retirement

Only explicitly authorized old runtime files were moved to
`.codex-temp/collection-new-supplied-v3-2026-09-22/legacy-runtime/`:

- `collection-album-v2/`: tab-blue, tab-purple, card-blue, card-purple,
  progress-icon, lock, mask, detail-close (all PNG).
- `collection-album-v1/`: page-button, inspiration, guide-book (all WebP).

Their source files are untouched. The optimizer and manifest no longer export
these retired paths. Recovering them requires restoring the matching prior
URL/interface contract, not simply putting obsolete files back into public.
V2 keeps two runtimes and V1 keeps only NEW badge. This changes resource bytes
by **−14,598 B Web / −20,066 B WeChat** relative to the immediately prior set.
The WeChat delta uses actual deterministic native encodings for the retired
three WebPs; it does not claim the full package or subpackage budgets pass.

`reference-album-layout.png` is the supplied `示意.png` kept for layout review
only (SHA-256 `0da0263fb8967756d7a0b716b99dfefd4f70108950b540c6b797611234bd613f`).
It and unused di0 have no runtime URLs or asset-manifest entries. Text in
reference images is not treated as new gameplay or storage instructions.

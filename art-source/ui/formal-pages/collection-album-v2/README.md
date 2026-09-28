# Collection Album V2 — supplied page and detail cutouts

## Superseded runtime parts, 2026-09-22

The latest `collection-album-v3` set supersedes the tabs, card frames, progress
icon, lock, mask, and close button below. Only `progress-panel.png` and
`detail-panel.png` remain in the V2 runtime directory. All ten original source
PNGs and both references are preserved; the historical mapping and hashes below
describe the original V2 import, not the current shipping inventory.

Eight obsolete V2 runtime PNGs are recoverably archived under
`.codex-temp/collection-new-supplied-v3-2026-09-22/legacy-runtime/collection-album-v2/`.
The former V1 page button, inspiration icon, and book are similarly archived
under that batch's `collection-album-v1/` subdirectory. V1 runtime now retains
only `new-badge.webp`. The latest close reuses byte-identical Daily Tasks V2 art.
See `../collection-album-v3/README.md` for the current contract.

Imported 2026-09-22. Eight page PNGs originate from
`C:/Users/Administrator/Desktop/block out/新/收藏新/名画收藏/`.
The detail panel and close button originate from
`C:/Users/Administrator/Desktop/block out/收藏新/收藏新/详情/`.
All source PNGs retain the original file bytes; the user's files are untouched.
The ten numbered illustration PNGs in each input folder were **not imported**.
The existing 200 level cards and 40 masterpiece atlas illustrations remain unchanged.

## Replaceable asset mapping

| Original | Source/runtime filename | Runtime property | Native size | Original SHA-256 |
| --- | --- | --- | --- | --- |
| anniu1.png | tab-blue.png | suppliedTabBlue | 242×90 | 0e5a5d9814d7b41917184294e8be5f629d5ff6bba315399d6be7157ceb747726 |
| anniu2.png | tab-purple.png | suppliedTabPurple | 241×94 | 3657b3edd6106e68d78acbd7f1f25b0cb8d3f43c3d79f309eca5dadccdfbad7e |
| di1.png | card-blue.png | suppliedCardBlue | 225×281 | 0224225cffab9aaa8f44a5ec159942287a946c8adfaad928f458c2611ba641b2 |
| di2.png | card-purple.png | suppliedCardPurple | 225×281 | e50f0efca9a0c26a04d05ff750b00e1e61ea789d18c23c51b9c1df127f30a0e9 |
| jindutubiao.png | progress-icon.png | suppliedProgressIcon | 45×46 | d363f9749cf6957cc1ba944df960434bc644e6f8e0e909122a8ed43cb0fe3208 |
| di 拷贝 2.png | progress-panel.png | suppliedProgressPanel | 320×60 | d3be39c04f5c1f01bc0d08bc934c146b6b2a39c81828411fed2420b6f4f69dc7 |
| suo 拷贝.png | lock.png | suppliedLock | 74×87 | c4ac16345e55c8caa8b3ae228e8ef37223a7ddb6a11b3ccc3ea9aaa4deb1f28d |
| mengban.png | mask.png | suppliedMask | 190×196 | 2808cfd14c73420cf5820827fd77e978b040b2791056b2e9b7f4aff22104dd21 |
| 底.png (detail) | detail-panel.png | detailPanel | 679×960 | cb440b93e5139b55f28a69f9ffd3d46e7e2e34e4b1de8d4beed3e97f463f6541 |
| guan.png (detail) | detail-close.png | detailClose | 93×98 | 036546e6d34e195498bcb4593c471a67e31ce5d43135cdec95df584d9053fe4f |

The runtime directory is `public/assets/art/ui/formal-pages/collection-album-v2/`.
Every image has an alpha channel. The supplied mask already has alpha 0–176;
the progress panel has alpha 0–99. These native alpha values are retained.
No crops, geometry changes, resized images, tinting, or generated replacements
are introduced by this asset import.

## Exact-pixel runtime optimization

The source ten images total **159,853 B**. Runtime PNGs total **150,769 B**.
`tools/optimize-assets.mjs` exports them through the existing
`optimizeWechatPng` helper. PNG compression candidates are accepted only when
their decoded width, height, channels, and **every RGBA byte** match the source,
including RGB values under fully transparent pixels. If no smaller exact
encoding exists, the original file is retained. The manifest records
`png-lossless-no-resize`; no palette approximation or lossy WebP is accepted.
This is an asset-size result, not a claim that the full WeChat package passes.

| Runtime filename | Bytes | Runtime SHA-256 |
| --- | ---: | --- |
| tab-blue.png | 20,742 | 5904ed19289ebf363b36d6eef17e02ff1d182cb499cf4588b9de2cc5a921e13a |
| tab-purple.png | 20,031 | 254bef6bac99c7e158f03a84bb0555a3b11663b156e63de1b54088f6f1531a82 |
| card-blue.png | 36,400 | c826188d7f6436a2ac537e84efe3e33131cec25cf22cf8c3777cfb113cf5b86d |
| card-purple.png | 32,249 | 16d0f4f3cb4992300d6d5eac15188de6eb2c9744c58859ae134bdca31d09b689 |
| progress-icon.png | 3,980 | d363f9749cf6957cc1ba944df960434bc644e6f8e0e909122a8ed43cb0fe3208 |
| progress-panel.png | 1,562 | 9750b97cfd71475fcd6315b94f4e5c4e28340e99e2b0fc38a23e805535bd579e |
| lock.png | 8,700 | e8caeb674a2e8743ae6336c138ccda17444ce94004a17016d01e95f695b719e3 |
| mask.png | 1,796 | 2438eac2a316fe2ea806e9dfe32c3a49b2c6009e4757285e3aa43d5fb7b5305a |
| detail-panel.png | 15,001 | ba0f7f19a5a4e84448d9ad2b19c2d59208a49d33d549cc0c61a04d3191235806 |
| detail-close.png | 10,308 | 89020f697c91b9ab2a0e6eec50e7f2d61d2bd778a7ca012ded28b88250a22da2 |

## Reused and retained assets

`background`, `topHeader`, and `titlePanel` reuse the already supplied PNGs
in `formal-pages/collection/`; no duplicate files or duplicate manifest paths
are created. The older `collection-album-v1` runtime retains four assets:
`page-button.webp`, `inspiration.webp`, `guide-book.webp`, and `new-badge.webp`.
The guide book is explicitly retained for the user's latest bottom-left
mechanism-guide entry. The other thirteen old runtime images, including the
star, are moved recoverably to
`.codex-temp/collection-supplied-art-2026-09-22/legacy-runtime/`.
All seventeen original V1 source PNGs remain untouched. The obsolete runtime
keys are removed from the manifest and optimizer; no auto-export restores them.
Inventory and restoration transactions are not replaced with image content.

## Source-only references

- Page `示意.png` is retained as `reference-album-layout.png`, SHA-256
  `92742460e914af395f3024508bf2299e184de1366a19b4088a42097552ba0dde`.
- Detail `示意.png` is retained as `reference-detail-layout.png`, SHA-256
  `0a6fdffc20f45f7024a6707154d85955d584564fd052d1db89fbe04093fe9b29`.

Neither reference enters the runtime directory or global asset manifest.
Annotated text in them is not treated as a new gameplay or storage rule.

# Collection Album V1 — ImageGen source and replacement map

Generated with the built-in ImageGen tool on 2026-09-17. Runtime text is
intentionally excluded from every bitmap so all ten game languages continue to
use the same art package.

## Shared final prompt

> Create one isolated, production-ready 2D casual mobile-game UI component for
> a bright fantasy collection album. Match the polished purple, cream, cyan,
> gold and coral visual language of the supplied collection mockup: rounded
> bevels, glossy highlights, soft depth, clean readable silhouette, subtle
> magical sparkle, no photorealism. Transparent background. Do not include any
> words, letters, numbers, logos, watermarks, sample cards or screenshots. Keep
> the component centered with complete uncropped edges and enough transparent
> padding for export.

Each generation appended one component-specific instruction: album panel,
book-and-star title plaque, blue selected tab, gold selected tab, inactive tab,
progress pill, common/rare/epic/locked card frame, red close button, gold lock,
gold page button, inspiration palette, NEW badge shell, star, or the independent
Home collection shortcut.

## Replaceable files

| Source file | Authored size | Runtime role |
| --- | ---: | --- |
| `panel.png` | 144×216 | Nine-sliced main and detail panel |
| `title-plaque.png` | 192×64 | Three-sliced title with protected book/star |
| `tab-blue.png` | 96×36 | Selected level tab |
| `tab-gold.png` | 96×36 | Selected masterpiece tab and active action |
| `tab-inactive.png` | 96×36 | Inactive tab/action |
| `progress-pill.png` | 128×40 | Progress and page indicator |
| `card-common.png` | 80×104 | Common collected card frame |
| `card-rare.png` | 80×104 | Rare collected card frame |
| `card-epic.png` | 80×104 | Epic/legendary collected card frame |
| `card-locked.png` | 80×104 | Locked card frame |
| `close.png` | 48×48 | Album/detail close button |
| `lock.png` | 48×48 | Locked card icon |
| `page-button.png` | 48×48 | Previous/next button shell |
| `inspiration.png` | 48×48 | Inspiration currency icon |
| `new-badge.png` | 72×30 | Localized NEW badge shell |
| `star.png` | 32×32 | Collected level star |
| `../home-v3/collection-album-entry.png` | 72×72 | Independent Home entry |

Replace a source PNG at the same dimensions and rerun `pnpm art:optimize` then
`pnpm art:verify`. The Home entry stays PNG for WeChat cold-start compatibility;
the 16 modal components are converted deterministically to q72 WebP and loaded
only while the album is open.

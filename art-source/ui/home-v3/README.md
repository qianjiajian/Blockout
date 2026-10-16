# Home V3 artwork

## Right shortcut column (2026-10-07)

Daily Tasks, Daily Challenge, Achievements and Glory League now share a right column on
the 720×1584 artboard: x=576, y=226/398/570/742, each 118×118, with proportional
drawing and matching hit bounds. The user's follow-up moves the complete column
from the left to the right while retaining a 26px edge inset. This supersedes the
historical entry positions below. Existing task/achievement artwork is unchanged.
Each icon has a centered name below it (24px, center 18px below its bottom).
The league countdown sits on a separate line 43px below the last icon's bottom.

The project did not contain a matching standalone purple rounded-square blank
base. The existing orange/gold circular league button was a different design.
Built-in ImageGen extracted a matching blank base using the achievement shortcut
as reference, and generated two separate transparent foreground emblems:

| Asset | Source/runtime dimensions | Role |
| --- | ---: | --- |
| [side-entry-base.png](side-entry-base.png) | 118×118 | Shared purple/gold blank base |
| [league-entry.png](league-entry.png) | 256×256 | Crown, shield and ribbon foreground |
| [daily-challenge-entry.png](daily-challenge-entry.png) | 256×256 | Calendar, lightning and coins foreground |

Runtime copies live at `public/assets/art/ui/home-v3/` and are byte-identical to
the optimized source files. Foregrounds fit into a centered 90×90 rectangle over
the base; they have no baked-in frame, label or notification dot. Generated
originals are retained under `generated-originals/`. Import uses only uniform
downsampling with transparent padding, preserving the generated alpha channel.
Prompts, tool provenance and extraction instructions are recorded in
[side-entry-prompts.json](side-entry-prompts.json). Replace each file independently
without editing the other shortcut or the original task/achievement assets.

This folder preserves the supplied 720×1584 home-screen slices at their authored pixel dimensions.
`reference-layout.png` is a composition reference only and is not shipped at runtime.

| Runtime name | Supplied file | Native size | Purpose |
| --- | --- | ---: | --- |
| `background.png` | `切图3/主界面替换1.png` | 720×1584 | Episode 1 Home scene and default background |
| `top-header.png` | `切图3/主界面顶.png` | 720×201 | Fixed Home resource/header strip |
| `resource-panel.png` | `di2.png` | 170×48 | Coin/life value panel |
| `coin-icon.png` | `jinbi.png` | 62×64 | Coin icon |
| `heart-icon.png` | `xin.png` | 75×67 | Life icon |
| `add-button.png` | `jia.png` | 36×36 | Resource add button |
| `settings-icon.png` | `shezhi.png` | 82×85 | Settings button |
| `daily-tasks-entry.png` | `新/主界面新加两入口/meiri.png` | 118×118 | Daily Tasks at (582,226) |
| `achievements-entry.png` | `新/主界面新加两入口/chengjiu.png` | 118×118 | Achievements at (580,360) |
| `level-plate.png` | `di1.png` | 257×91 | Level label plate |
| `arrow-left.png` | `anniu1.png` | 76×89 | Previous level |
| `arrow-right.png` | `anniu2.png` | 75×87 | Next level |
| `star-left.png` | `xing1.png` | 55×55 | Left rating star |
| `star-center.png` | `xing2.png` | 60×59 | Centre rating star |
| `star-right.png` | `xing3.png` | 53×55 | Right rating star |
| `star-empty-left.png` | `主界面空的星/kong1.png` | 54×54 | Left unearned rating star |
| `star-empty-center.png` | `主界面空的星/kong2.png` | 58×56 | Centre unearned rating star |
| `star-empty-right.png` | `主界面空的星/kong3.png` | 54×55 | Right unearned rating star |
| `start-button.png` | `kaishi.png` | 338×155 | Start button plate |
| `navigation-bar.png` | `ban2.png` | 720×136 | Five-tab footer bar |
| `navigation-selected.png` | `ban1.png` | 204×164 | Selected-tab plate |
| `navigation-divider.png` | `fengexian.png` | 9×125 | Footer divider |
| `shop-icon.png` | `shangdian.png` | 96×93 | Shop tab |
| `leaderboard-icon.png` | `paihang.png` | 111×104 | Leaderboard tab |
| `home-icon.png` | `zhuye.png` | 146×162 | Home tab |
| `journey-icon.png` | `lvtu.png` | 94×97 | Journey tab |
| `collection-icon.png` | `shoucang.png` | 90×96 | Collection tab |

The 26 transparent PNG runtime slices are copied byte-for-byte. The runtime background is encoded as a
same-dimension 720×1584 JPEG to stay within the WeChat 4 MiB main-package limit; the original PNG remains here.

The two right-side shortcuts match the supplied `新/主界面新加两入口/示意.png`
composition (Daily Tasks above Achievements), with no extra label or painted shadow.
Source and runtime SHA-256:
- Daily Tasks: `E3F7D32AD15C1F0DFAF33B7CB173E4B6A6371B67A962080A78FD42242B52B5A5`.
- Achievements: `67C917464F8326525BB71CE15C562EF501EA5FCB605E6234E30ECD78EA60512B`.
The popup's separate achievement medal remains its own asset.
Runtime draw calls keep each image at its natural source dimensions. The selected/unselected footer emphasis is
applied with a uniform Canvas state transform, so the original files and aspect ratios remain unchanged; the
complete 720×1584 artboard then receives one uniform responsive transform and no asset is stretched non-uniformly.

Journey Episode 1 reuses `public/assets/art/ui/home-v3/background.jpg` directly. It is intentionally not duplicated
under the Journey directory or its WeChat subpackage.

Dynamic text is fixed against the same 720×1584 reference: coins `(127, 80)`, 27px, max width 82px; full lives `(334, 80)`, 27px, max width 36px; recovering/unlimited-life status uses a separate legible 17px/68px-width state; level `(356, 1180)`, 34px; start `(354, 1315)`, 43px; all five selected navigation labels use 26px at y=1567. These are visible-glyph-calibrated Canvas `middle`-baseline anchors, not Photoshop alphabetic-baseline coordinates. The user-requested uniform 26px navigation size (2026-09-22) supersedes the historical per-label sizes 26/15/26/19/15px; other typography and artwork geometry are unchanged.

Navigation text has a 184px maximum width inside the 204px selected panel. Only overlong translations are fitted horizontally by Canvas; all five retain the 26px font size and the short Chinese labels are not compressed.

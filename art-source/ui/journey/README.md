# Journey 路线

`journey-track-v1.png` 是 ImageGen 高分辨率 10 节点路线源稿，运行版为 `public/assets/art/ui/journey/journey-track-v1.png`（384×576 RGBA）。

节点从底部到顶部依次对应当前航段的第 1–10 关；关卡号、锁定状态和星级由运行时叠加，不要写进图片。替换时必须保留 10 个清晰、互不重叠的圆形节点以及由底向上的视觉方向，随后运行 `pnpm art:optimize` 与 `pnpm art:verify`。

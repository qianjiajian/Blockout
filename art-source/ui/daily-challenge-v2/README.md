# 每日挑战参考布局 v2

2026-10-07，使用内置 `image_gen.imagegen`，参考用户提供的难度选择截图。主体按白底弹窗、蓝色标题条、金币场景横幅、三行票券与奖励卡分层；保留正式三档与金币/灵感；当前规则v1.152：每日5次，北京时间00:00重置，当日已成功难度不再开放挑战。

每个文件都是可独立替换的位图，运行副本位于 `public/assets/art/ui/daily-challenge-v2/`：

| 文件 | 用途 | 来源 |
| --- | --- | --- |
| panel-frame.png | 白底弹窗 | ImageGen；另做透明外缘编辑，中心保持不透明 |
| header-bar.png | 蓝色标题条 | ImageGen |
| close-button.png | 独立关闭 X | ImageGen |
| reward-banner.png | 石墙金币横幅 | ImageGen |
| row-frame.png | 难度行底板与分隔线 | ImageGen |
| reward-card.png | 单个奖励底板 | ImageGen |
| first-clear-tag.png | 首通标签底板 | ImageGen |
| challenge-button.png | 可挑战按钮底板 | ImageGen |
| locked-button.png | 不可挑战按钮底板 | ImageGen |
| attempt-badge.png | 剩余次数底板 | 复用 v1 ImageGen 图，去除透明留白 |
| difficulty-diamond.png | 难度菱形底板 | 复用 v1 ImageGen 图，去除透明留白 |

标题、奖励数字、首通文字、次数、倒计时和按钮文案由游戏绘制，未烘焙到图片。金币复用 `home-v3/coin-icon.png`；灵感复用 `formal-pages/collection-album-v1/inspiration.webp`。没有引入竞品钻石货币或第四难度。

成功行隐藏按钮，等比显示每日任务同款 ImageGen 绿色勾选 `formal-pages/daily-tasks-v2/claimed-check.png`；每日挑战单独加载图片实例并随页面释放，布局为 `dailyChallengeRowCompletedRect`，不会共享每日任务页面的图片生命周期。成功结算奖励卡与难度行共用 `DAILY_CHALLENGE_REWARDS` 数值配置。

生成提示词和原始输出路径见 `prompts.json`；最终白板透明编辑见 `panel-transparency-edit.json`。`generated-originals/` 保留选用原图。`asset-preparation.json` 记录透明边界裁剪及等比缩小；不做非等比缩放或代码绘图替代。绘制与命中坐标在 `src/game/dailyChallengeLayout.ts`，所有贴图使用 contain。

替换时保留文件名和透明模式；若长宽比或有效留白变化，同时调整布局与 `art-source/manifest.json` 尺寸。运行 `node tools/verify-art-assets.mjs` 检查。已退役 v1 运行图可恢复归档于 `.codex-temp/daily-reference-layout-20261007/legacy-runtime/`，原始 art-source 图片完整保留，元数据见 `retired-v1-manifest.json`。

隔离合成存档双屏试玩、素材比例与三档真实 Pointer 进入记录：`playtest-results/daily-reference-layout-20261007/report.json`；截图同目录。未操作用户真实存档，未打微信包或发布。

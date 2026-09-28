# 上架截图

当前目录保存 10 张 720×1584 PNG：

1. `01-home.png`：全新存档首页。
2. `02-gameplay.png`：第 58 关异形棋盘与生成器玩法。
3. `03-level-select.png`：正式 Journey 三卡纵向滚动区域与章节段进度（无左右翻页箭头）。
4. `04-achievements.png`：8 种色块与 11 种现役机制合并后的 Collection 纵向列表首屏；已解锁项排在上方，无顶部分类和翻页。
5. `05-result.png`：自然通关、三星与首通奖励。
6. `06-onboarding.png`：与真实路线同步的首关手势。
7. `07-home-progress.png`：完成多关后的首页；已删除每日任务入口。
8. `08-mechanic-ice.png`：冰封出口教学。
9. `09-mechanic-layer.png`：双色外壳教学。
10. `10-mechanic-generator.png`：方块生成器教学。

运行 `pnpm release:screenshots` 可从当前游戏和固定存档状态重新抓取整套截图。旧版素材保存在 `archive/2026-08-31`，不应提交为当前商店截图。

截图直接来自真实 Canvas 运行画面；Shop、Leaderboard、Journey、Collection 使用项目方正式切图，其余背景、方块、出口、机关与特效使用项目中已登记的 ImageGen 位图，不额外添加无法在游戏中看到的营销合成内容。

# 主界面 V2 资源映射（720×1584）

本目录保存已接入主界面的可替换源素材；运行时同名文件位于 `public/assets/art/ui/home-v2/`。替换同名文件即可保持代码映射不变，随后运行 `pnpm art:optimize`、`pnpm art:verify` 和 `pnpm build:wechat`。

| 文件 | 主界面位置 |
|---|---|
| `coin-icon.png` / `coin-panel.png` | 左上金币入口与动态金币数背景 |
| `settings-button.png` | 右上设置入口 |
| `level-pill.png` | 顶部动态关卡号 |
| `level-card.png` | 中部动态关卡号与关卡名 |
| `arrow-left.png` / `arrow-right.png` | 已解锁关卡切换 |
| `start-button.png` | 开始挑战主按钮 |
| `daily-ribbon.png` / `daily-calendar.png` | 每日挑战状态与入口 |
| `navigation-bar.png` / `navigation-selected.png` | 底部导航底板与主页选中态 |
| `navigation-levels.png` / `navigation-home.png` / `navigation-achievements.png` | 底部三个导航图标 |

`reference-layout.png` 是项目方提供的720×1584排版示意，仅用于视觉比对，不进入运行包。首页背景源稿位于 `art-source/backgrounds/home-lab-v2.png`，运行时由资源工具生成同尺寸高质量 JPEG，以控制微信主包体积。

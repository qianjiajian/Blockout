# 五栏底部导航 V3

| 源稿 | 运行文件 | 用途 |
|---|---|---|
| `five-tab-icons-atlas-v1.png` | `public/assets/art/ui/navigation-v3/five-tab-icons-atlas-v1.png`（384×256） | 3×2 图集：商店 / 排行 / 主页；旅程 / 收藏 / 空白。 |
| `five-tab-chrome-kit-v1.png` | `five-tab-bar-v1.png`（496×96） | 源稿上半部裁出的五槽底栏。 |
| `five-tab-chrome-kit-v1.png` | `five-tab-selected-v1.png`（120×98） | 源稿下半部裁出的单槽选中态，运行时移动到当前页签。 |

替换时保持图标格数、顺序、透明背景以及两个 Chrome 元素的相对位置；运行 `pnpm art:optimize` 会执行固定裁切和缩放，再用 `pnpm art:verify` 检查。

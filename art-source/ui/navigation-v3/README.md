# 五栏底部导航 V3

| 源稿 | 运行文件 | 用途 |
|---|---|---|
| `five-tab-icons-atlas-v1.png` | `public/assets/art/ui/navigation-v3/five-tab-icons-atlas-v1.png`（384×256） | 3×2 图集：商店 / 排行 / 主页；旅程 / 收藏 / 空白。 |
| `five-tab-chrome-kit-v1.png` | 不进入当前运行包 | 旧版五槽底栏/选中态母版，仅供回退。 |

当前底栏底板、选中态和五枚独立图标来自 `art-source/ui/home-v3/`。这里只保留仍被非首页界面复用的 3×2 图标图集；替换时保持格数、顺序和透明背景，再运行 `pnpm art:optimize` 与 `pnpm art:verify`。

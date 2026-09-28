# Formal board border V2

本目录包含项目方 `方块-空心-边框-冰-改/方块-空心-边框-冰-改/` 提供的
正式三维棋盘边框与八色出口。`tools/optimize-assets.mjs` 将运行时所需 PNG
逐字节复制到 `public/assets/art/gameplay/board/formal-border-v2/`；禁止重着色、
缩放或重新编码。

## Authored grid contract

- The gameplay renderer uses a 95 px logical cell.
- 中性边框和出口均提供横向、纵向各 1/2/3 格整图。文件名统一为
  `neutral-{orientation}-{span}.png` 与
  `gate-{color}-{orientation}-{span}.png`。
- 素材保留原始斜面与阴影外溢，不能根据名义 `95×span` 格尺寸裁切。
- 所有直边只允许 `drawImage(image,x,y)` 自然尺寸绘制。1/2/3 格直接取同长度
  素材；4 格及以上按 3/2/1 格确定性分段，禁止把任意一张母版拉伸到目标长度。
- 上/下边只取横向素材，左/右边只取纵向素材，不旋转一套母版冒充另一方向。
- Corners stay at their natural dimensions and explicit direction. Do not
  rotate or resize the source files during asset preparation.
- `reference.png` is source-only visual guidance. It is intentionally excluded
  from the runtime manifest and public assets.

## 清单

- 6 张中性边框：横/竖 × 1/2/3 格。
- 4 张定向角块：`corner-south-west/east`、`corner-north-west/east`。
- 48 张正式出口：八色 × 横/竖 × 1/2/3 格。
- `reference.png` 仅作视觉参考，不进入 manifest 与 public。

因此 manifest/public 各包含 58 张运行时切片。`prepare-formal-board-v2.mjs`
只执行 art-source → public 的白名单复制与哈希核对，不再读取外部目录、
派生颜色或回写正式源图。

## 来稿映射与尺寸

| 来稿 | 目标 | 原始尺寸 |
|---|---|---:|
| `边框横1/2/3.png` | `neutral-horizontal-1/2/3.png` | 95×67 / 190×67 / 286×67 |
| `边框竖1/2/3.png` | `neutral-vertical-1/2/3.png` | 57×109 / 57×204 / 58×299 |
| `出口{色}1/2/3.png` | `gate-{color}-horizontal-1/2/3.png` | 95×67 / 190×67 / 286×67 |
| `出口{色}4/5/6.png` | `gate-{color}-vertical-1/2/3.png` | 57×109 / 57×204 / 58×299 |
| `四角1/2/3/4.png` | south-west / south-east / north-west / north-east | 60×68 / 60×68 / 61×69 / 60×69 |

颜色映射为红 red、蓝 blue、绿 green、黄 yellow、紫 purple、橙 orange、
粉 pink、浅蓝 cyan。紫色纵向两/三格来稿误写为 `出口紫8.png`、`出口紫9.png`，
分别按编号 5、6 的语义登记。north-west / north-east 使用项目方最新提供的
61×69 / 60×69 真透明原图；south-west / south-east 保持原始资源。四张角件
仍属于本次 58 张完整正式资源清单。

绘制顺序统一按资源视觉底边从上到下稳定排序；相同深度保持布局顺序，屏幕位置
更靠下的直边、出口或角件最后绘制并盖住靠上的资源。

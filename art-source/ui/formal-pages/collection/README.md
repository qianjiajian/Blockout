# Collection 正式切图替换表

本目录来自“切图2/收藏”。运行切片由 `tools/optimize-assets.mjs` 逐字节复制，保持原始像素尺寸和 Alpha；渲染时只允许整张 720×1584 画板做统一等比适配，禁止单图拉伸、非等比缩放或重新编码。

| 文件 | 原始尺寸 | 用途 |
|---|---:|---|
| `background.png` | 720×1584 | 页面背景 |
| `top-header.png` | 720×201 | 顶部紫色标题区 |
| `title-panel.png` / `title-shadow.png` | 324×56 | 标题底板 / 阴影 |
| `title.png` | 239×48 | Collection 标题 |
| `card.png` | 183×227 | 未选中的收藏卡片 |
| `selected.png` | 199×243 | 当前选中卡片外框 |
| `locked-overlay.png` / `lock.png` | 183×227 / 74×87 | 未解锁遮罩 / 锁图标 |
| `detail-panel.png` / `detail-body.png` | 655×336 / 558×181 | 详情外框 / 正文底板 |
| `mechanism-01.png` | 99×117 | 颜色出口 |
| `mechanism-02.png` | 110×113 | 异形棋盘 |
| `mechanism-03.png` | 96×97 | 异形方块 |
| `mechanism-04.png` | 115×124 | 数字冰块 |
| `mechanism-05.png` | 126×111 | 冰封出口 |
| `mechanism-06.png` | 111×115 | 单层外壳 |
| `mechanism-07.png` | 95×108 | 方块生成器 |
| `mechanism-08.png` | 107×125 | 移动升降台 |
| `mechanism-09.png` | 116×114 | 卷帘 |
| `mechanism-10.png` | 150×80 | 传送带 |
| `mechanism-11.png` | 126×121 | 星标块与星门 |

运行时将八种颜色的基础色块汇总为一个“色块”条目，并保留以上11种现役机制，共12项；两类内容放入同一个三列纵向滑动列表，顶部不显示分类标签，也没有上一页/下一页。排序先按是否解锁分组，再按真实解锁关卡排列，保证已解锁内容始终位于未解锁内容上方。汇总色块继续复用全局加载的红色正式单格图，不新增 Collection 专用资源；正式玩法已经移除的钥匙锁和方向限制块不进入收藏；参考图中重复出现的“颜色出口”只属于排版占位文字。

`typography-reference.png` 标注的720宽逻辑画板字号为：卡片标题31px、详情标题35px、详情正文30px。Canvas 使用 `middle` 基线后，像素校准锚点分别为卡片顶部+202px、详情 `(360, 1107)`、正文左上锚点 `(96, 1195)`；正文左对齐、最大宽524px、51px行距。运行时必须使用这些固定参数，不因标题长度自动缩小；长名称仍显示真实机制名称。

`reference.png` 和 `typography-reference.png` 是完整示意与字号标注，只用于视觉核对，永不进入 `public/` 或微信发行包。

替换运行切片时保留文件名、原尺寸、透明通道及图标顺序；随后运行 `pnpm art:optimize` 与 `pnpm art:verify`。

# 游戏美术资源替换说明

`art-source/` 保存当前启用的 ImageGen 高分辨率源素材，并额外保留可随时回退的旧版本；`public/assets/art/` 只保存游戏实际加载的规格化运行版。Canvas 只负责状态、坐标、动态文字、贴图合成、旋转和瞬态交互反馈，不再程序绘制最终美术主体。

## 目录映射

- `backgrounds/`：首页与玩法全屏背景；源 PNG，运行时 JPEG。
- `gameplay/blocks/`：红、蓝、绿、黄、紫、橙、粉、青各一张带固定符号的标记块与一张无符号底块，共 16 个独立文件。
- `gameplay/connectors/`：与八色块一一对应的连续块体连接件；母版水平放置，运行时旋转适配纵向连接。
- `gameplay/gates/`：与八色块一一对应的独立顶部出口母版，运行时旋转适配四边。
- `gameplay/board/`：空格凹槽、异形棋盘旧式拼接底座、当前连续外沿直边和凸角；旧式固定矩形九宫格外框仅保留为回退源稿，不进入运行包。
- `gameplay/mechanics/`：卷帘、冰层、2×2 递进机关图集、4×3 完整机制图鉴图标，以及 4×2 八色夹层预告徽章图集。
- `ui/chrome/`：通用九宫格框体、三态按钮、开关开/关。
- `ui/home-v2/`：720×1584 主界面拆分资源；金币、设置、关卡卡片、切关箭头、开始按钮和每日横幅为当前资源，旧三栏底部导航只保留为可回退源稿。
- `ui/navigation-v3/`：当前五栏底部导航；3×2 图标图集、五槽底栏母版和可移动选中态均可独立替换。
- `ui/journey/`：10 节点竖向旅程路线，运行时覆盖 10 个航段共 100 关。
- `ui/notifications/`：一次性道具解锁提示框与新内容发现徽章；框体、徽章和动态图标/文字相互独立，便于单独替换。
- `ui/icons/`：道具、成就、引导、系统与设置图标。
- `ui/illustrations/`：补给站插画。
- `fx/`：机关反馈图集、粒子精灵、通关光环，以及抓取、受阻、碰撞阻挡与无进展探索焦点光圈。

每个目录在 `public/assets/art/` 下都有同用途运行目录；精确源/运行路径、尺寸、Alpha 和图集顺序以 `manifest.json` 为准。

## 最常用的替换方式

1. 只替换某一种颜色时，同时覆盖 `gameplay/blocks/` 下该色的“带符号块 + `-plain-v1` 无符号底块”，或单独替换 `gameplay/connectors/`、`gameplay/gates/` 下对应同名 PNG；八色全部为独立文件，不需要重做整张图集。两张块体必须保持同尺寸、同边框、同材质与同 Alpha 轮廓；连接件必须保留水平母版、透明背景和无符号中心。
2. 替换界面框体时覆盖当前启用的 `ui/chrome/universal-panel-v2.png`；弹窗、卡片、胶囊、底栏和圆形按钮会共同使用这张九宫格素材。
3. 替换主/次/危险按钮时保持当前启用的 `buttons-v2.png` 的 3×1 顺序；替换开关时保持 `toggles-v1.png` 的 2×1 顺序。
4. 替换背景后运行 `pnpm art:optimize` 生成 JPEG；替换透明 PNG 后同一命令会完成裁边、缩放和发布级调色板压缩。
5. 运行 `pnpm art:verify` 校验路径、尺寸、Alpha、图集网格、顺序和漏登记文件，再运行 `pnpm verify` 做完整回归。

若只覆盖同名源文件且规格不变，无需修改代码。若改文件名、尺寸或格数，必须同步更新 `src/game/artManifest.ts`、`art-source/manifest.json` 和 `tools/optimize-assets.mjs`。新设计建议使用 `-v2`、`-v3` 后缀，确认切换后再更新清单。

## 关键运行规格

| 资源组 | 运行规格 | 文件/顺序 |
|---|---:|---|
| 首页/玩法背景 | 720×1572、852×1846 RGB JPEG | `backgrounds/home-lab-v2.jpg`、`backgrounds/gameplay-lab-v2.jpg`；源稿均保留 PNG |
| 主界面拆分资源 | 原始尺寸 RGBA PNG，共 10 份 | `ui/home-v2/`；精确用途见目录内 `README.md` |
| 五栏导航 | 384×256、496×96、120×98 RGBA | 图标 3×2：商店 / 排行 / 主页；旅程 / 收藏 / 空；底栏与选中态独立文件 |
| 旅程路线 | 384×576 RGBA | `ui/journey/journey-track-v1.png`，固定 10 个节点，运行时叠加关卡号/锁/星级 |
| 道具解锁提示 | 420×128 RGBA | `ui/notifications/booster-unlock-banner-v1.png`；不含文字/图标，运行时复用道具图集并叠加名称与作用 |
| 新内容发现徽章 | 128×128 RGBA | `ui/notifications/discovery-badge-v1.png`；用于收藏与每日挑战首次解锁提醒，不含文字或数字 |
| 八色标记块 + 八色底块 | 每张 256×256 RGBA | red-circle / red-plain、blue-diamond / blue-plain、green-triangle / green-plain、yellow-square / yellow-plain、purple-sparkle / purple-plain、orange-hexagon / orange-plain、pink-heart / pink-plain、cyan-plus / cyan-plain |
| 八色连接件 | 每张 384×128 RGBA | red、blue、green、yellow、purple、orange、pink、cyan；水平母版，纵向运行时旋转 |
| 八色出口 | 每张 512×128 RGBA | 与块体同色同符号，母版箭头朝上 |
| 棋盘 | 192×192、192×192、384×128、192×192 RGBA | 空格、旧式逐格底座、连续外沿直边、可旋转凸角 |
| 机关/图鉴/夹层预告 | 768×600、512×512、1024×1024、768×576、512×256 RGBA | `shutter-v1.png`、`ice-cover-v1.png`、`progression-mechanics-atlas-v1.png`（2×2：生成器 / 升降台 / 传送带 / 星星）、`mechanism-guide-icons-atlas-v1.png`（4×3：颜色出口 / 异形棋盘 / 异形方块 / 数字冰块；冰封出口 / 多层外壳 / 生成器 / 升降台；卷帘 / 传送带 / 星标 / 空白）、`layer-preview-badges-v1.png`（4×2：红 / 蓝 / 绿 / 黄；紫 / 橙 / 粉 / 青） |
| 通用框体 | 512×512 RGBA | `universal-panel-v2.png`，九宫格 |
| 按钮/开关 | 900×300、800×400 RGBA | 主/次/危险；关/开 |
| 系统图标 | 800×600 RGBA，4×3 | 金币、星星、时钟、撤销 / 暂停、返回、主页、网格 / 成就、补给、设置、锁 |
| 设置图标 | 900×300 RGBA，3×1 | 声音、触觉、简化动效 |
| 其他 UI 图集 | 见 `manifest.json` | 道具 3×1、成就 3×1、引导/每日 2×1、机关反馈 3×1 |
| 粒子/通关/拖拽 | 128×128、768×768、256×256、256×256、256×256、512×512 RGBA | `particle-spark-v1.png`、`victory-halo-v1.png`、`block-grab-halo-v1.png`、`block-blocked-halo-v1.png`、`blocker-focus-corners-v1.png`、`exit-suction-trail-v1.png` |

## 美术约束

- 所有透明素材必须是真实 RGBA，不能把棋盘格、白底或渐变背景烘进像素。
- 不要把关卡、时间、金币、库存、按钮文字或机关计数写进图片；这些实时内容由游戏排版。
- 块体和出口必须继续使用“颜色 + 固定符号”双编码；多格方块只在一个中心优先单元显示当前活动层的大符号，其余单元使用同色无符号底块。夹层预告不再逐格重复：整个连通块只在右下角显示一至两枚 ImageGen 小徽章，按由近到远的剥离顺序叠放。
- 高分辨率源图不要手工压缩覆盖；运行版由 `pnpm art:optimize` 统一生成；旧 `board-frame-v1.png` 与三栏导航不再加载。当前运行美术均登记到清单；导航 V3、旅程路线、道具解锁提示、新内容发现徽章、完整机制图鉴、出口吸入轨迹、挡路焦点框、机关因果光点和策略焦点角框会按清单尺寸生成调色板 PNG，背景单独生成高质量 4:4:4 JPEG 以满足微信主包体积。

九宫格边界和图集切片契约见 `atlas-specs.md`；ImageGen 提示词、原始输出和筛选记录见 `docs/art-generation.md`。

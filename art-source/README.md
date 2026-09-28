# 游戏美术资源替换说明

`art-source/` 保存当前启用的 ImageGen 高分辨率源素材、项目方正式切图，并额外保留可随时回退的旧版本；`public/assets/art/` 只保存游戏实际加载的规格化运行版。Canvas 只负责状态、坐标、动态文字、贴图合成、旋转和瞬态交互反馈，不再程序绘制最终美术主体。

## 目录映射

- `backgrounds/`：当前玩法背景为项目方 720×1584 正式 PNG，按源文件逐字节进入运行包；当前 Home V3 背景已替换为切图3的 720×1584 `ui/home-v3/background.png`，运行时仅做同尺寸 JPEG 编码。
- `gameplay/blocks/formal-v1/`：共 159 张原尺寸 PNG，其中 120 张为项目方正式八色积木，39 张为当前关卡缺失轮廓的 ImageGen 临时整块图（含八色 3×3、十字五格、横4、T5、L5 与 T6 整块图）。一格外壳是透明叠加层，必须覆盖在内层颜色的实心一格图之上。运行时只旋转整图，不镜像、不拉伸，任何多格色块都禁止使用一格图拼接。
- `gameplay/connectors/`：上一版连续块连接件源稿，仅供回退；正式玩法不再加载。
- `gameplay/gates/`：上一版八色出口母版，仅供回退；当前正式出口已与外框一起整理到 `gameplay/board/formal-border-v2/`。
- `gameplay/board/`：`formal-floor-v1/` 的 190×190 四格底面，以及当前生产版 `formal-border-v2/` 的横/竖 1/2/3 格中性直边、四向角件和八色横/竖 1/2/3 格出口；`formal-border-v1/` 只供编辑器与运行回退。V2 的完整逐图与绘制契约见 `gameplay/board/formal-border-v2/README.md`。
- `gameplay/mechanics/`：卷帘、`formal-gameplay-v1/` 的 9 张整形数字冰（单格、横/竖2与3格、L3、S4、T4、2×2）、`formal-ice-v1/` 的横/竖 1/2/3 格冰冻出口条、旧九宫格冰层回退图、2×2 递进机关图集、4×3 完整机制图鉴图标，以及 4×2 八色夹层预告徽章图集。
- `ui/chrome/`：通用九宫格框体与三态按钮；旧图集开关仅保留源稿供回退，不进入运行包。
- `ui/home-v3/`：当前 720×1584 主界面画板；包含切图3的 1 张 720×1584 背景源 PNG、1 张 720×201 顶部切片和23张透明切片（含三张独立空星），另有不进入运行包的合成参考图。
- `ui/gameplay-v1/`：项目方正式玩法 HUD，共 11 张原尺寸 PNG：返回、暂停、关卡牌、计时器、三套道具底座/图标/数量徽章与加号。
- `ui/home-v2/`：上一版主界面源稿，仅供回退，不进入当前运行包。
- `ui/navigation-v3/`：保留供非首页页面标题等位置复用的 3×2 五图标图集；当前五栏底板、选中态与页签图标来自 `ui/home-v3/`。
- `ui/formal-pages/`：项目方提供的 Shop、Leaderboard、Journey、Collection 正式页面切片，以及暂停/设置、通关、状态弹层切片；Journey 已接入切图3的十章圆图、九张追加首页主题、锁定态及解锁/奖励展示拆件。完整示意图与字号图只作核对，不进入运行包。
- `ui/journey/`：旧版十节点路线源稿，仅供回退，不进入当前运行包。
- `ui/notifications/`：一次性道具解锁提示框与新内容发现徽章；框体、徽章和动态图标/文字相互独立，便于单独替换。
- `ui/achievements/`：成就系统入口与列表徽章；图片不含文字，所有标题与进度由运行时本地化绘制。
- `ui/icons/`：道具、成就、引导和系统图标；旧设置图标图集仅保留源稿供回退。
- `ui/illustrations/`：补给站插画。
- `fx/`：项目方 107×107 正式选中特效，以及机关反馈图集、粒子精灵、通关光环、受阻、碰撞阻挡与无进展探索焦点光圈。
- `references/gameplay-v1/`：项目方四张 720×1584 玩法示意/规格图，仅用于核对排版、字号和棋盘拼接，不进入运行包；最新 HUD 标注为 `screen-reference-2026-09-15-annotated.png`。

每个目录在 `public/assets/art/` 下都有同用途运行目录；精确源/运行路径、尺寸、Alpha 和图集顺序以 `manifest.json` 为准。

## 最常用的替换方式

1. 只替换某一种颜色时，覆盖 `gameplay/blocks/formal-v1/` 下该色的 15 张正式 PNG；来稿实心编号 1–9 依次映射一格、纵2、纵3、横3、横2、L三连、S四连、T四连、2×2，外壳编号为 1/2/3/4/5/9。其中 `*-shell-single.png` 是带透明开孔的叠加层，不能作为完整双色图单独绘制。出口在 `gameplay/board/formal-border-v2/` 下按颜色成套替换 `gate-*-{horizontal,vertical}-{1,2,3}.png`；运行时直接选择对应方向与长度的整图，不拉伸、不再叠加 V1 独立箭头。必须保留源文件原始像素尺寸、透明边界、95px 名义格和同一颜色/方向语义；完整契约见该目录的 `README.md`。
2. 替换界面框体时覆盖当前启用的 `ui/chrome/universal-panel-v2.png`；弹窗、卡片、胶囊、底栏和圆形按钮会共同使用这张九宫格素材。
3. 替换主/次/危险按钮时保持当前启用的 `buttons-v2.png` 的 3×1 顺序；暂停/设置的独立开关与设置图标改在 `ui/formal-pages/overlays/pause-settings/` 下逐图替换。
4. Home V3 是例外：24 张透明 PNG 必须保持文件字节与原始像素尺寸不变，由 `pnpm art:optimize` 原样复制；`background.png` 只编码为同尺寸 720×1584 JPEG，不执行裁切或缩放。Journey 第1章直接复用这张运行背景。
5. 玩法背景、HUD、底面、9 张整形数字冰、6 张冰冻出口、选中特效和 159 张积木，与 Shop / Leaderboard / Journey / Collection、暂停/设置和通关弹窗一样，必须覆盖同名文件并保持清单登记尺寸。`pnpm art:optimize` 对大部分切图逐字节复制；9 张数字冰保留源图并生成 128 色高保真透明运行图，少量大图仅做像素不变的无损重压缩，均不裁切、不缩放。`references/` 与各目录中的 `reference.png`、`*-reference.png`、`*-typography-reference.png` 只作设计核对，永不进入运行包。
6. 运行 `pnpm art:verify` 校验路径、尺寸、Alpha、图集网格、顺序、加载组和漏登记文件；项目方正式切图会同时校验源/运行 SHA-256 字节级一致。随后运行 `pnpm verify` 做完整回归。

若只覆盖同名源文件且规格不变，无需修改代码。若改文件名、尺寸或格数，必须同步更新 `src/game/artManifest.ts`、`art-source/manifest.json` 和 `tools/optimize-assets.mjs`。新设计建议使用 `-v2`、`-v3` 后缀，确认切换后再更新清单。

## 关键运行规格

| 资源组 | 运行规格 | 文件/顺序 |
|---|---:|---|
| Home V3 背景 | 720×1584 RGB JPEG | `ui/home-v3/background.png` → `public/assets/art/ui/home-v3/background.jpg`；只转码，不裁切、不缩放 |
| Home V3 透明切图 | 原始尺寸 RGBA PNG，共 24 份 | `ui/home-v3/`；含720×201顶部切片与三张独立空星，源/运行文件字节级一致，精确用途与尺寸见目录内 `README.md` |
| 玩法背景 | 720×1584 RGBA PNG | `backgrounds/gameplay-formal-v1.png`；源/运行字节级一致，整张画板只做一次等比适配 |
| 玩法 HUD | 原始尺寸 RGBA PNG，共 11 份 | `ui/gameplay-v1/`；按 `screen-reference-2026-09-15-annotated.png` 的 720×1584 坐标自然尺寸合成，未覆盖区域沿用 `screen-reference.png` |
| 五栏导航共享图集 | 384×256 RGBA | `ui/navigation-v3/five-tab-icons-atlas-v1.png`，3×2：商店 / 排行 / 主页；旅程 / 收藏 / 空；Home V3 底栏本体和独立页签图标另见上一行 |
| Shop 正式页 | 原始尺寸 PNG，共 7 份 | `ui/formal-pages/shop/`：完整示意、购买按钮、道具底板、金币和三枚道具；互斥按需加载 |
| Leaderboard 正式页 | 原始尺寸 PNG，共 7 份 | `ui/formal-pages/leaderboard/`：完整示意、页签状态、玩家行/头像/等级胶囊/星星；互斥按需加载 |
| Journey 正式页 | 299×288章节PNG、720×1584主题JPG及原尺寸UI切片 | `ui/formal-pages/journey/`：十章圆图、九张追加首页主题、锁定遮罩、范围底板、选中/操作按钮、关卡/奖励卡与两种展示弹层；第1章主题复用Home V3背景 |
| Collection 正式页 | 原始尺寸 RGBA PNG，共 22 份 | `ui/formal-pages/collection/`：独立背景/顶部/标题、卡片、选中态、锁、详情框和 11 枚机制图；`formal-collection` 互斥按需加载 |
| 暂停 / 设置弹窗 | 原始尺寸 RGBA PNG，共 10 份 | `ui/formal-pages/overlays/pause-settings/`：共用面板、关闭、声音/震动/特效、开关和操作按钮；常驻切片 |
| 通关弹窗 | 原始尺寸 RGBA PNG，共 7 份 | `ui/formal-pages/overlays/win/`：面板、PERFECT、光芒、金币、奖励胶囊、继续和关闭；`formal-win` 互斥按需加载 |
| 旧旅程路线 | 384×576 RGBA | `ui/journey/journey-track-v1.png`，只保留源稿供回退，当前不进入运行包 |
| 道具解锁提示 | 420×128 RGBA | `ui/notifications/booster-unlock-banner-v1.png`；不含文字/图标，运行时复用道具图集并叠加名称与作用 |
| 通知红点 | 39×39 RGBA | `ui/notifications/discovery-badge-v1.png`；项目方原图逐字节复制，用于 Journey 可领取奖励与 Collection 新解锁内容 |
| 八色积木 | 原始尺寸 RGBA PNG，共 159 份 | `gameplay/blocks/formal-v1/`；120 张项目方正式图 + 39 张待替换临时整块图（含八色 3×3、十字五格、横4、T5、L5 与 T6），95px 名义格；一格外壳透明叠加在内层实心一格图上，其余整块图按当前关卡互斥懒加载 |
| 八色出口 | 每色横/竖 1/2/3 格，共 48 张 RGBA | `gameplay/board/formal-border-v2/gate-{color}-{orientation}-{span}.png`；按屏幕方向和长度选择自然尺寸整图，4 格以上只组合 3/2/1 格切片，绝不拉伸 |
| 棋盘 | 底面190×190；V2 中性边框横/竖 1/2/3 格共6张；SW/SE角件60×68、NW角件61×69、NE角件60×69 RGBA | `formal-floor-v1/` 四格底面按95px名义格平铺；`formal-border-v2/neutral-{orientation}-{span}.png` 按原生切片分段，四向角件自然尺寸绘制；V1仅供编辑器/回退 |
| 冰冻覆盖 | 数字冰9张 RGBA：95×104、95×199、95×294、190×104、285×104、191×199、285×199、285×199、192×199；冰冻出口横/竖 1/2/3 格共6张 RGBA | 数字冰优先选择 `formal-gameplay-v1/ice-{shape}.png` 同形整图；缺失形状才按占格逐格回退 `ice-cell.png`。冰冻出口继续选择 `formal-ice-v1/ice-{orientation}-{span}.png` 原生整图，4格以上分段且不旋转、不拉伸 |
| 选中特效 | 107×107 RGBA | `fx/formal-gameplay-v1/selection-frame.png`；按块体外轮廓逐边裁显，不拉伸素材 |
| 机关/图鉴/夹层预告 | 768×600、1024×1024、768×576、512×256 RGBA | `shutter-v1.png`、`progression-mechanics-atlas-v1.png`（2×2：生成器 / 升降台 / 传送带 / 星星）、`mechanism-guide-icons-atlas-v1.png`（4×3：颜色出口 / 异形棋盘 / 异形方块 / 数字冰块；冰封出口 / 多层外壳 / 生成器 / 升降台；卷帘 / 传送带 / 星标 / 空白）、`layer-preview-badges-v1.png`（4×2：红 / 蓝 / 绿 / 黄；紫 / 橙 / 粉 / 青） |
| 通用框体 | 512×512 RGBA | `universal-panel-v2.png`，九宫格 |
| 通用按钮 | 900×300 RGBA | 主/次/危险；弹窗按钮改用上方独立正式切片 |
| 系统图标 | 800×600 RGBA，4×3 | 金币、星星、时钟、撤销 / 暂停、返回、主页、网格 / 成就、补给、设置、锁 |
| 其他 UI 图集 | 见 `manifest.json` | 道具 3×1、成就 3×1、引导/每日 2×1、机关反馈 3×1 |
| 粒子/通关/拖拽 | 128×128、768×768、256×256、256×256、256×256 RGBA | `particle-spark-v1.png`、`victory-halo-v1.png`、`block-grab-halo-v1.png`、`block-blocked-halo-v1.png`、`blocker-focus-corners-v1.png` |

`fx/exit-suction-trail-v1.png` 仅保留为历史源稿，不登记到运行清单、不复制到运行包，也不参与消除动画。

## 美术约束

- 所有透明素材必须是真实 RGBA，不能把棋盘格、白底或渐变背景烘进像素。
- 不要把关卡、时间、金币、库存、按钮文字或机关计数写进图片；这些实时内容由游戏排版。
- 块体继续使用“颜色 + 星形压纹”双编码；V2 出口使用自带白色方向箭头的同色横/竖边框条，不再叠加独立箭头。每个多格轮廓必须命中同形整块图，只允许四向旋转，不允许镜像或一格图拼接；缺图必须补同轮廓资源。夹层优先用同轮廓的正式外壳覆盖内层；没有外壳图时显示整块外层图和右下角夹层徽章。
- 高分辨率源图不要手工压缩覆盖；运行版由 `pnpm art:optimize` 统一生成。旧玩法色块、连接件、`board-frame-v1.png`、三栏导航、Home V2、旧十节点 Journey、`toggles-v1.png` 和 `settings-icons-v1.png` 不再加载。项目方正式玩法切图、页面与弹窗必须字节级原样复制；V2 直边、出口和冰门均按 1/2/3 格自然尺寸切片选择或分段，禁止显式目标尺寸拉伸。整张 720×1584 玩法画板、720×1584 主界面画板和按钮按压反馈仍只使用统一 X/Y 比例的 Canvas 变换。

九宫格边界和图集切片契约见 `atlas-specs.md`；ImageGen 提示词、原始输出和筛选记录见 `docs/art-generation.md`。

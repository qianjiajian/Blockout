# ImageGen 美术生成记录

## 生成模式

使用内置 ImageGen，模式为 `stylized-concept`。参考视频画面只用于判断竖屏信息密度、饱和度和中央视觉重心，没有复刻原作名称、Logo、具体机器、UI 或关卡布局。

## 首页场景

### 720×1584 主界面 V2（当前启用）

- 项目方批准示意：`art-source/ui/home-v2/reference-layout.png`。
- 当前背景：`art-source/backgrounds/home-lab-v2.png` → `public/assets/art/backgrounds/home-lab-v2.jpg`（同尺寸高质量 4:4:4 JPEG）。
- 15 份独立界面资源：`art-source/ui/home-v2/` → `public/assets/art/ui/home-v2/`。
- 布局基准：720×1584；金币、关卡号、关卡名和每日挑战状态不烘焙进图片，由运行时动态排版。
- 为方便后续替换，15份透明组件在 `pnpm art:optimize` 中按同名文件直拷，不做二次裁切或缩放；背景仅做发布级JPEG压缩，源PNG不变。

### 首页场景 V1（已停用，源稿保留）

最终提示词：

> Create an original stylized-concept portrait mobile-game home environment for a color-sorting block puzzle. Use the supplied gameplay reference only loosely for visual density, saturated arcade energy, and a strong central rhythm. Design a new neon logistics sorting laboratory with a central pneumatic capsule machine, rounded toy-like materials, deep navy and violet space, cyan light, orange accents, and clear empty zones for title, currency, level card, main play button, and bottom navigation. No text, no logo, no trademark, no recognizable copied UI, and no copyrighted characters. 496:1078 portrait composition, polished casual-game key art.

- ImageGen 原始输出：`C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\exec-ec5fb824-aea2-449a-b7e4-97e410f16a6b.png`
- 项目源素材：`art-source/backgrounds/home-lab-v1.png`
- 旧运行时素材已移至：`art-source/backgrounds/home-lab-v1-runtime-backup.jpg`
- 尺寸/色彩：852×1846，RGB。

## 游戏棋盘场景背景

生成模式：内置 ImageGen，`stylized-concept`。首页实验室只作为材质、色板和灯光参考，游戏场景改成另一个以中央工作台为核心的房间，并把中央 78% 保持低细节，避免与棋盘、HUD 和底部道具争夺对比度。

最终提示词：

> Use case: stylized-concept. Asset type: full-screen in-game gameplay backdrop for a 496×1078 portrait mobile puzzle game. Create an original dark neon logistics-laboratory gameplay backdrop that visually belongs to the supplied home scene but is a different room focused on a central puzzle workbench. Deep navy-violet laboratory interior, subtle cyan energy conduits and restrained orange-gold hardware around the far outer edges. The central 78% must remain calm, dark, low-detail and high-contrast, with clear top and bottom HUD zones. Polished cheerful 3D casual-game render, rounded toy-like machinery, glossy molded plastic and luminous glass. No puzzle board, blocks, exits, buttons, HUD, icons, text, logo, characters, checkerboard or watermark.

- ImageGen 原始输出：`C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\exec-58a3dd03-2e5b-4cb0-8a76-00372c2d62cc.png`
- 项目源素材：`art-source/backgrounds/gameplay-lab-v1.png`
- 首版运行时素材（已停用，源稿保留）：`public/assets/art/backgrounds/gameplay-lab-v1.jpg`
- 尺寸/色彩：851×1848，RGB；运行时以高质量 JPEG 保存，源 PNG 保留在项目内便于重新压缩或替换。
- 运行状态：该首版在第 36 轮由低噪 v2 替换；v2 继续用于所有非首页页面与玩法画面，并取代程序径向渐变和随机星点的正常渲染路径。

## 道具图标

最终提示词：

> Create an original stylized-concept horizontal sprite sheet with exactly three polished casual-game booster icons: a cyan stopwatch with a small gold plus, a red-orange toy rocket with a cyan porthole, and a violet-cyan pulse emitter with a sparkling star. Match the rounded glossy neon logistics-lab material language of the home scene. Each icon must be fully separated, centered in an equal-width cell, readable at 64 px, and placed on genuine transparent alpha. No checkerboard, no background, no text, no numbers, no button frames, no logos, and no copyrighted characters.

第一次输出把棋盘格烘焙进图像，因此又执行一次只改背景的编辑：

> Change only the checkerboard background into genuine transparent alpha. Preserve all three icons, proportions, colors, highlights, spacing and edges unchanged. Do not add a shadow plate, border, text or new objects.

- 被淘汰的棋盘格版本：`C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\exec-e47f9f4c-968e-404e-b6ce-16060942d0fd.png`
- 最终透明输出：`C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\exec-24f9e418-add9-4423-9093-eb1fc91fde92.png`
- 项目源素材：`art-source/ui/icons/booster-icons-v1.png`
- 项目最终素材：`public/assets/art/ui/icons/booster-icons-v1.png`
- 尺寸/色彩：1774×887，RGBA，包含真实透明通道。

高分辨率透明源稿和运行时 PNG 均已保存在项目内；`.codex/generated_images` 路径只作为原始生成追溯记录。

## 成就徽章

生成模式：内置 ImageGen，`stylized-concept`，以项目内道具图标作为材质风格参考，不复制其主体。

最终生成提示词：

> Create exactly three original achievement badges for a portrait casual puzzle game: an icy cyan shield with a cracked ice-door symbol, a violet layered-cube mastery medal, and a prestigious gold-orange command-core crown crest with a cyan energy gem. Use polished rounded 3D casual-game UI materials, glossy toy-like enamel and metal, and match the neon logistics-laboratory material language of the supplied style reference. Three fully separated equal-width cells, identical visual scale, readable at 72 px, genuine transparent alpha. No text, numbers, logos, watermark, checkerboard or extra objects.

第一次输出把棋盘格烘焙进背景，因此执行 `background-extraction` 精确编辑：仅把背景改为真实透明 Alpha，三枚徽章的形状、颜色、高光、间距和边缘保持不变。

- 首次棋盘格输出：`C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\exec-015cad10-e216-4229-b349-10a40bea5e7e.png`
- 最终透明输出：`C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\exec-caf60153-e891-44a4-8965-2865e7c1d28d.png`
- 项目源素材：`art-source/ui/icons/achievement-badges-v1.png`
- 项目最终素材：`public/assets/art/ui/icons/achievement-badges-v1.png`
- 上线优化：由项目源稿生成 900×450 RGBA 运行版；原始高分辨率版本同时保存在 `art-source`。

## 上架应用图标

生成模式：内置 ImageGen，`stylized-concept`，以首页实验室场景作为材质与配色参考。

最终提示词：

> Create an original square WeChat mini-game app icon for a color-block escape puzzle: one glossy magenta rounded toy cube moving outward through a compact cyan energy gate, with smaller blue and yellow cubes behind it. Full-bleed deep navy-to-violet laboratory glow, premium polished 3D casual-game icon, large centered symbol occupying about 72% of the canvas, safe margin for rounded icon crop, readable at 64 px. No text, letters, numbers, logos, watermark, border, UI buttons, copied machine or copyrighted characters.

- ImageGen 原始输出：`C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\exec-50b4ef01-5f11-41ee-8516-18ca5bd7d1e3.png`
- ImageGen 原始尺寸保留：`release-assets/app-icon-v1.png`
- 1024×1024 压缩版：`release-assets/app-icon-1024.png`，447,661 字节
- 512×512 压缩版：`release-assets/app-icon-512.png`，124,365 字节

精灵表与图标规格化由 `tools/optimize-assets.mjs` 执行，只调整像素尺寸和 PNG 压缩，不改变设计内容。最终上传时按微信公众平台当期字段要求选择对应尺寸。

## 首局引导与每日挑战图标

生成模式：内置 ImageGen，`stylized-concept`。项目道具精灵表仅作为材质、高光和配色参考；主体全部重新生成。

最终提示词：

> Create exactly two original polished casual-game UI icons in a horizontal transparent sprite sheet. Cell 1 is a friendly white glove fingertip pointing downward with a short cyan-to-violet motion trail for drag onboarding. Cell 2 is a compact golden daily-challenge medal combining a calendar tab and a five-point star with a cyan gem accent. Match the glossy rounded neon logistics-laboratory material language of the supplied reference. Exactly two equal-width separated cells, same scale, readable at 48–72 px, genuine transparent alpha. No checkerboard, background plate, text, letters, numbers, logos, watermark, extra objects, or copied reference subjects.

- ImageGen 原始输出：`C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\exec-fe9a9817-bae4-4830-9540-551c07225ad5.png`
- 项目源素材：`art-source/ui/icons/onboarding-daily-icons-v1.png`
- 项目最终素材：`public/assets/art/ui/icons/onboarding-daily-icons-v1.png`
- 上线优化：由项目源稿生成 640×320 RGBA 运行版；左右两格分别供首局动态手势和每日挑战入口/档案使用。

## 机关因果反馈图集

生成模式：内置 ImageGen，`stylized-concept`；项目道具图集只作为高饱和 3D 玩具材质参考。最终三格分别用于冰层碎裂、卷帘开启和外层剥离。

首稿提示词（结构化摘要）：

> Create exactly three centered mechanism-feedback effects in one horizontal transparent sprite sheet: a cyan ice shell shattering into crystals, an orange-gold shutter lock core springing open with bolts and gears, and purple-cyan-magenta block layers peeling apart. Match the polished chunky 3D casual-game style of the supplied booster reference. Three equal cells, generous margin, readable at 64–120 px, no text, numbers, UI frames, logos or watermark, and genuine alpha transparency.

首稿把棋盘格烘焙进 RGB，随后执行一次 `background-extraction`，只移除背景并保留三格主体；第二稿通过像素级校验（32-bit RGBA，四角 alpha=0）。

- 首次棋盘格输出：`C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\exec-d8b59b4e-2e59-4e7d-a6e4-66ce1fc7e02a.png`
- 最终透明原图：`C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\exec-639d2d58-cbaa-4e49-8f7f-2b0a68006e6b.png`
- 项目源素材：`art-source/fx/mechanic-fx-v1.png`
- 项目最终素材：`public/assets/art/fx/mechanic-fx-v1.png`
- 上线优化：由项目源稿生成 600×300 RGBA 运行版。

独立视觉评审认为初版第三格与脉冲道具语义接近，因此又让 ImageGen 将第三格定向改为中空、向外飞散的彩色外壳；该修订稿及后续两次抠图都没有产生真实 alpha，均被淘汰且未进入项目。运行时最终采用已验证透明原图，并只裁切第三格外围四片，使中心的新颜色在首帧即可见；文案改为“外层剥离”。

- 语义修订但背景不合格：`C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\exec-e98c6f9a-786d-432a-94ce-8a8eba14f409.png`
- 淘汰的抠图输出：`exec-1b6d3d7e-5125-4225-8ebe-26ffaeb55c80.png`、`exec-f6137129-2873-4799-8d37-fe367be5c08e.png`

## 补给站三舱设备

生成模式：内置 ImageGen，`stylized-concept`；首页实验室与道具图集只作为材质、灯光和配色参考，不复制构图或主体。补给设备只承担世界观氛围，三种实际商品仍使用既有道具图标，避免把背景误认为可点击按钮。

最终生成提示词：

> Use case: stylized-concept. Asset type: transparent header illustration for a portrait mobile puzzle game's in-game supply screen. Create one original compact neon sci-fi supply capsule / vending pod, front-facing and horizontally composed, with three empty glowing docking bays suggesting time, propulsion, and energy supplies without depicting the existing booster icons themselves. Image 1 is a style/material/lighting reference only; Image 2 is a style/material/palette reference only. Do not copy their composition or subjects. Genuinely transparent background, isolated object, no room, no floor, no rectangular backdrop. Polished cheerful 3D toy-game render, rounded purple machinery, cyan emissive glass, restrained orange-gold hardware, thick clean silhouette. Centered, near-symmetrical, wide 2.2:1 silhouette, full object visible with generous transparent margin, readable when displayed about 300 px wide. Bright friendly lab lighting; deep violet, electric cyan, warm orange-gold and tiny lime status lights; glossy molded plastic, brushed gold trim, luminous glass and crisp bevels. No text, letters, numbers, logos, watermark, coins, characters, hands, existing booster icons, separately tappable-looking buttons, busy pipes, background scenery, loose objects or UI panels; one coherent object only.

首稿造型通过，但把棋盘格烘进了完全不透明的 RGBA 图像（alpha extrema 255/255）。透明编辑提示词：

> Use case: background-extraction. Remove only the entire checkerboard/background from Image 1 and output the supply capsule on a genuinely transparent alpha background. Preserve the supply capsule's exact shape, proportions, colors, three empty cyan chambers, lighting, reflections, gold trim, framing and full visible edges; change only the background. Retain soft semitransparent cyan glow immediately around the machine where natural. No new objects, text, logo, watermark or crop. Avoid painted checkerboard, white or gray background, halo box, changing the machine, or adding icons and products.

- 被淘汰的不透明棋盘格输出：`C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\exec-739b61e4-fef5-41d0-bc2c-3b688ec4e6a0.png`
- 最终透明原图：`C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\exec-d983fa12-0612-40cc-b1da-dc8c572f63e7.png`
- 项目源素材：`art-source/ui/illustrations/supply-station-v1.png`
- 项目最终素材：`public/assets/art/ui/illustrations/supply-station-v1.png`
- 上线优化：由项目源稿等比缩放并透明居中为 768×384 RGBA 运行版；透明像素、半透明辉光与四周安全边距均已验证。

## 全量 UI 框体与图标

最初的 3×2 面板图集两次产生不透明渐变或烘焙棋盘格，因此改用单张通用九宫格框体，并把按钮、开关、系统图标和设置图标分别生成。所有最终文件均通过真实 Alpha 校验。

统一提示约束：正视、圆润玩具科幻材质、紫色树脂/青色光边/克制金色五金、中心低细节、无文字数字、透明 RGBA；图集必须严格等格且主体不跨格。

| 资源 | ImageGen 原始输出 | 项目源稿 | 运行规格 |
|---|---|---|---:|
| 通用九宫格框体 | `exec-d8db6184-aba6-4934-942c-f9fffd9986f0.png` | `art-source/ui/chrome/universal-panel-v1.png` | 512×512 |
| 主/次/危险按钮 | `exec-2022635e-f76e-4f6d-a351-b91556218296.png` | `art-source/ui/chrome/buttons-v1.png` | 900×300，3×1 |
| 开关关/开 | `exec-e56f366d-780e-41e2-9add-8e7983819f18.png` | `art-source/ui/chrome/toggles-v1.png` | 800×400，2×1 |
| 系统图标 | `exec-370bf8da-92a9-4718-affa-ef953e2254dd.png` | `art-source/ui/icons/system-icons-v1.png` | 800×600，4×3 |
| 设置图标 | `exec-c17b6e1a-e75b-46ae-9355-94444822d8b8.png` | `art-source/ui/icons/settings-icons-v1.png` | 900×300，3×1 |

被淘汰的面板图集为 `exec-569ace9a-f515-479c-ac38-14dafd97d890.png` 与 `exec-3ddf47fa-cebe-48c9-94cd-dc95216b2bf1.png`；它们没有进入项目。通用框体现在覆盖弹窗、卡片、胶囊、底栏和圆形按钮，实时文字和数值继续由 Canvas 排版。

## 八色块体独立素材

生成模板：

> Create exactly one standalone [COLOR] rounded-square toy block for a polished vertical mobile color-sort puzzle, front-facing orthographic, chunky glossy resin rim, subtle inner recess, one large pale cream embossed [SYMBOL], readable at small mobile size, genuine transparent RGBA, no scene, board, text, numbers or extra objects.

采用“一色一文件”而非图集，方便单独替换；编辑红块改色会丢失 Alpha，因此其余颜色全部独立纯生成。8 张均为 1254×1254 RGBA，运行时裁安全边并压缩为 256×256。

| 颜色/符号 | ImageGen 原始输出 | 项目源稿 |
|---|---|---|
| 红/圆 | `exec-773526f5-57a9-4a41-b745-075733943a7d.png` | `gameplay/blocks/red-circle-v1.png` |
| 蓝/菱形 | `exec-b7cdf811-664c-4598-a3c7-22a804e66f2d.png` | `gameplay/blocks/blue-diamond-v1.png` |
| 绿/三角 | `exec-7f53a3dc-29ed-4ae9-bcaa-8c35b679bf14.png` | `gameplay/blocks/green-triangle-v1.png` |
| 黄/方形 | `exec-cf94afd3-0e3c-4c6d-ab02-a932d61a3a08.png` | `gameplay/blocks/yellow-square-v1.png` |
| 紫/四芒星 | `exec-f873296e-8f81-445b-9de6-16d4e41d5f23.png` | `gameplay/blocks/purple-sparkle-v1.png` |
| 橙/六边形 | `exec-dda51335-f7a9-4254-bf54-35d3991a3a3c.png` | `gameplay/blocks/orange-hexagon-v1.png` |
| 粉/心形 | `exec-705cf95a-6680-4d19-ad0b-308112cee876.png` | `gameplay/blocks/pink-heart-v1.png` |
| 青/十字 | `exec-3537bb0d-abfc-4bd2-9579-725e0a0e3136.png` | `gameplay/blocks/cyan-plus-v1.png` |

## 八色出口独立素材

生成模板：

> Create exactly one standalone horizontal [COLOR] exit-gate rail, long low 4:1 glossy toy hardware, matching pale cream [SYMBOL] on the left and upward arrow on the right, top-edge gate master asset, genuine transparent RGBA, no text, number, scene or board.

运行时透明裁边并归一为 512×128；顶部母版按 0°、180°、-90°、90°适配上、下、左、右。

| 颜色 | ImageGen 原始输出 | 项目源稿 |
|---|---|---|
| 红 | `exec-bdcbdaae-6836-4ad6-954f-981459b7eb7e.png` | `gameplay/gates/red-circle-gate-v1.png` |
| 蓝 | `exec-41cd0266-9ecf-4cf1-bda3-74a4335c17d4.png` | `gameplay/gates/blue-diamond-gate-v1.png` |
| 绿 | `exec-6dddc42a-4de4-431c-a4de-2153ed41f797.png` | `gameplay/gates/green-triangle-gate-v1.png` |
| 黄 | `exec-2d8217ae-18db-42ba-83c2-5ad4a2e70729.png` | `gameplay/gates/yellow-square-gate-v1.png` |
| 紫 | `exec-76550148-663d-408e-9f3b-99782fe0dcd5.png` | `gameplay/gates/purple-sparkle-gate-v1.png` |
| 橙 | `exec-28388916-c13e-434d-90ef-0852da7d8337.png` | `gameplay/gates/orange-hexagon-gate-v1.png` |
| 粉 | `exec-8131fa92-e615-4d5a-a944-10dddb99b82f.png` | `gameplay/gates/pink-heart-gate-v1.png` |
| 青 | `exec-30ec521f-07cf-4eab-aff4-55bde1763dfd.png` | `gameplay/gates/cyan-plus-gate-v1.png` |

## 棋盘、机关与最终特效

棋盘提示要求“细节集中外 20%、中央无网格”，空格提示要求“中心至少占可见面积 88%、极细紫边”；卷帘要求紫色横向百叶与金色框、中央留数字；冰层要求中心透明、角部霜裂；粒子和通关光环都要求透明独立素材。

| 资源 | ImageGen 原始输出 | 项目源稿 | 运行规格 |
|---|---|---|---:|
| 棋盘框 | `exec-e5fcd5b7-dacd-43eb-85d2-a14a8883055a.png` | `gameplay/board/board-frame-v1.png` | 768×768 |
| 空格凹槽 | `exec-0f7b7dd2-4f34-4083-be1d-a85552d6a4de.png` | `gameplay/board/empty-cell-v1.png` | 192×192 |
| 异形棋盘拼接底座 | `exec-aa831477-7167-4cad-8a84-99348a24fb3d.png` | `gameplay/board/irregular-cell-v1.png` | 192×192 |
| 卷帘 | `exec-c1629ab4-99b5-49c7-b1cd-ea1e7d87223e.png` | `gameplay/mechanics/shutter-v1.png` | 768×600 |
| 冰层覆盖 | `exec-08f82eef-2d0e-4907-9416-97bb1a7c405b.png` | `gameplay/mechanics/ice-cover-v1.png` | 512×512 |
| 粒子星芒 | `exec-ba26dee9-dc67-4e71-adbc-ee802c7f2d55.png` | `fx/particle-spark-v1.png` | 128×128 |
| 通关光环 | `exec-74b2a55b-6a68-47d2-a956-4d197d244225.png` | `fx/victory-halo-v1.png` | 768×768 |

第一版空格 `exec-bacc67ea-00b0-48b4-ae77-f12458687d34.png` 因边框过厚被淘汰。最终 34 份运行美术均由 `pnpm art:optimize` 规格化和高质量调色板压缩；高分辨率源稿不覆盖。

## 正式上线减噪 v2：玩法背景、通用框体与三态按钮

生成模式：内置 ImageGen，`precise-object-edit`。本轮不改变首页世界观、方块、出口与机关识别编码，只降低非交互背景和 UI 框体的竞争性细节。三份 v1 高分辨率源稿均保留用于回退，运行清单切换到 v2。

玩法背景最终提示词：

> Simplify this existing sci-fi toy laboratory background while preserving its original world and vertical composition. Remove about 65 percent of pipes, machines, glowing lamps, tanks and foreground consoles. Keep only slim low-contrast structural hints at the extreme edges. Make the central 82 percent a calm deep-indigo to navy gradient so the colorful grid board, HUD, exits and drag trails dominate immediately. No text, UI, grid, blocks, buttons, characters, logos or bright central hotspot.

通用框体最终提示词：

> Simplify the square sci-fi toy panel for a polished casual mobile puzzle game. Preserve the centered square silhouette, genuine transparency and stretch-safe structure. Replace the thick multi-layer neon frame and large gold clamps with one slim indigo-violet frame, a restrained cyan inner rim and four very small gold corner accents. Keep a clean deep-indigo uninterrupted center with no text, icons or decoration.

三态按钮最终提示词：

> Redesign the three-button atlas into a calmer casual puzzle-game style. Preserve exactly three equal separated pill buttons ordered vivid lime-green primary, muted indigo-violet secondary and warm coral-orange danger. Reduce metallic ornament, cyan trim, glare and gold framing by about 60 percent; keep each center quiet for large white Chinese labels. No text, icons, cropping or detached decoration.

按钮首稿把棋盘格烘进 RGB，因此再执行一次 `background-extraction`，只移除背景并保持按钮形状、颜色、顺序、间距和边缘不变。最终文件已验证为真实 RGBA，Alpha 范围 0–255。

| 资源 | ImageGen 最终输出 | 当前项目源稿 | 当前运行素材 |
|---|---|---|---|
| 减噪玩法背景 | `exec-5c5f06e7-0923-45f8-b520-051b6b45d404.png` | `art-source/backgrounds/gameplay-lab-v2.png` | `public/assets/art/backgrounds/gameplay-lab-v2.jpg` |
| 减噪通用框体 | `exec-98966e10-9fd9-4604-9aea-e8e6e6119453.png` | `art-source/ui/chrome/universal-panel-v2.png` | `public/assets/art/ui/chrome/universal-panel-v2.png` |
| 减噪三态按钮 | `exec-b234140e-0d06-4b21-80ba-7fe16fdd6756.png` | `art-source/ui/chrome/buttons-v2.png` | `public/assets/art/ui/chrome/buttons-v2.png` |

`pnpm art:verify` 已通过 34/34，运行时美术从 2,694,014 字节降为 2,554,044 字节；`pnpm art:audit --strict` 仍为 0 个程序绘制美术调用。标准竖屏和 320×568 下的首页、玩法、教学、关卡选择、补给、设置、结算与清档弹窗均已完成截图复核。

## 异形棋盘可拼接底座

最终提示词：

> Generate a single square modular active-cell bitmap tile for a polished vertical mobile color-sort block puzzle. Straight-on orthographic view, transparent background. Deep indigo recessed square floor cell; slim glossy violet-blue sci-fi metal rim on all four sides; subtle magenta and cyan edge glow; rounded micro-bevels; clear but quiet cell boundary. The tile must join edge-to-edge in a grid and make any connected cluster read as one premium irregular board silhouette. No perspective, no text, no icons, no arrows, no blocks, no gates, no gold ornaments. Keep the center dark and low contrast so bright colored puzzle pieces remain readable. One isolated centered tile only, 1:1 PNG, true transparency outside its square footprint.

- ImageGen 原始输出：`C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\exec-aa831477-7167-4cad-8a84-99348a24fb3d.png`
- 项目源稿：`art-source/gameplay/board/irregular-cell-v1.png`
- 运行版：`public/assets/art/gameplay/board/irregular-cell-v1.png`（192×192 RGBA）
- 使用方式：底座按可通行格向外扩 9% 拼贴，再叠加 `empty-cell-v1.png`；不使用 Canvas 路径绘制异形边框。

接入后固定矩形 `board-frame-v1.png` 从运行清单移除，只保留高分辨率回退源稿。最终仍为 34/34 启用素材，合计 2,330,246 字节；程序绘制美术审计为 0。

## 连续异形托盘外沿

生成模式：内置 ImageGen，`stylized-concept`；以 `irregular-cell-v1.png` 为首要材质参考、`board-frame-v1.png` 为次要材质参考。目标不是替换逻辑网格，而是为任意 `playable` 掩码生成连续厚壁，使玩家先读到整体轮廓，再读到内部小格。

直边最终提示词：

> Create one perfectly straight horizontal modular outer-wall rail for an irregular grid puzzle board. It will be rotated for all four directions and repeated along exposed grid edges. Genuinely transparent background; one continuous horizontal sci-fi rail; thick molded indigo/violet body, dark inner bevel, restrained thin cyan and magenta accents, subtle plastic/metal texture; orthographic front view; no floor, frame, corner, text, arrows, logo or watermark.

凸角最终提示词：

> Create one compact universal connector cap for modular outer-wall rails around an irregular grid puzzle board. Genuinely transparent background; centered four-way-symmetric beveled indigo/violet mechanical connector with restrained cyan/magenta edge accents; orthographic front view; no rail, floor, text, symbols, arrows, logo or watermark.

ImageGen 的直边输出包含装饰端帽，因此运行管线只裁取中央 760×234 的可重复安静段；连接件输出形成完整四向框体，因此裁取左上 340×340 凸角作为母版，运行时旋转 0/90/180/270 度。两项都属于对 ImageGen 原图的确定性裁边、缩放和旋转，没有程序绘制替代美术。

- 直边原始输出：`C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\exec-c5f2193a-7c8a-4ff0-923b-1cfb9830a23e.png`
- 凸角原始输出：`C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\exec-d1f4c2c9-725d-4935-a0ea-0d1cf71bfcbf.png`
- 项目源稿：`art-source/gameplay/board/board-rim-rail-v1.png`、`board-rim-corner-v1.png`
- 运行版：`public/assets/art/gameplay/board/board-rim-rail-v1.png`（384×128）、`board-rim-corner-v1.png`（192×192）
- 使用方式：每个暴露边绘制一段直边，仅在四邻域恰有一个有效格的顶点绘制凸角；固定障碍按虚空处理。内部继续使用 `empty-cell-v1.png`，出口、方块和机关绘制在外沿之上。
- 编辑器同步使用同一套运行素材，因此创作预览与游戏结果一致。

接入后为 36/36 启用 ImageGen 运行素材，合计 2,393,982 字节；程序美术仍只允许 `drawImage` 合成、裁切、旋转和实时文字，不使用路径或渐变绘制棋盘外沿。

## 八色连续多格方块连接件

生成模式：内置 ImageGen，`stylized-concept`。逐帧对照参考视频后确认，竞品的多格方块首先读成一整块连续注塑件；项目原先每个格子的完整圆角边框都可见，玩家容易把一个 2×3 方块误读成六个独立小块。为保留八种颜色各自的材质，同时避免运行时程序调色，本轮按“一色一文件”独立生成八张水平连接母版。

统一提示词模板：

> Use case: stylized-concept. Asset type: transparent modular connector for a multi-cell mobile puzzle block. Image 1 is the exact [COLOR] block-cell style, material, lighting, and color reference. Create one horizontal [COLOR] bridge insert that visually joins two adjacent square cells of the same movable puzzle piece into one continuous molded toy block. Genuinely transparent background. One short wide glossy [COLOR] resin connector plate, no symbol; continuous raised outer lip along the top and bottom, quiet flat center, straight flush-cut left and right ends designed to slide underneath the two referenced cells. Front-facing orthographic lighting, actual alpha, one object only. No icon, text, number, arrow, logo, watermark, studs, center seam, background rectangle or baked checkerboard.

| 颜色 | ImageGen 原始输出 | 项目源稿 | 运行版 |
|---|---|---|---|
| 红 | `exec-74713712-7b0b-4b8d-9a78-7d971e0de58f.png` | `art-source/gameplay/connectors/red-connector-v1.png` | `public/assets/art/gameplay/connectors/red-connector-v1.png` |
| 蓝 | `exec-abc4ae92-b8df-41f2-aacf-06abc16bafd7.png` | `art-source/gameplay/connectors/blue-connector-v1.png` | `public/assets/art/gameplay/connectors/blue-connector-v1.png` |
| 绿 | `exec-10baae37-601b-4da9-916c-f4abef9d1058.png` | `art-source/gameplay/connectors/green-connector-v1.png` | `public/assets/art/gameplay/connectors/green-connector-v1.png` |
| 黄 | `exec-6ce17538-8377-4f51-beb8-11e19f2fd4f5.png` | `art-source/gameplay/connectors/yellow-connector-v1.png` | `public/assets/art/gameplay/connectors/yellow-connector-v1.png` |
| 紫 | `exec-6c4b8c92-3f68-4bc7-8764-a49ca7da708a.png` | `art-source/gameplay/connectors/purple-connector-v1.png` | `public/assets/art/gameplay/connectors/purple-connector-v1.png` |
| 橙 | `exec-4c53c29e-d230-4560-90f2-8a983e4f85ea.png` | `art-source/gameplay/connectors/orange-connector-v1.png` | `public/assets/art/gameplay/connectors/orange-connector-v1.png` |
| 粉 | `exec-5d0689f3-4189-488b-83be-90481950d9e1.png` | `art-source/gameplay/connectors/pink-connector-v1.png` | `public/assets/art/gameplay/connectors/pink-connector-v1.png` |
| 青 | `exec-1f03bb54-7352-4576-9e70-d0184d5127fc.png` | `art-source/gameplay/connectors/cyan-connector-v1.png` | `public/assets/art/gameplay/connectors/cyan-connector-v1.png` |

八张运行版均为 384×128 RGBA。`buildBlockConnectorLayout` 只为同一方块内部的水平/垂直相邻格生成一次桥接，纵向由水平母版旋转 90 度；对角格不连接。连接件位于外层格子之上、下一层颜色与冰层覆盖之下，因此不会遮住每格的固定符号、层色或冻结计数。选中与阻塞反馈作用于整个块体，出口残影也复用相同连续结构。

接入后为 44/44 启用 ImageGen 运行素材，合计 2,601,840 字节。第 3/7/12/16/24/100 关、真实拖拽选中态和 320×568 小屏均完成截图复核；八色符号、双层内色和冰层数字保持清晰。

## 方块抓取与受阻反馈光圈

生成模式：内置 ImageGen，`stylized-concept`。第 41 轮视觉审计发现旧选中态只有约 4px 抬升和阴影，按下前后几乎无法一眼区分；本轮使用两张真正透明的中空光圈分别编码“已抓住”和“不能再移动”，不把程序描边或渐变当作美术素材。

抓取光圈最终提示词：

> Use case: stylized-concept. Asset type: production game FX sprite, transparent square PNG. Input images: Image 1 is the project's glossy blue puzzle-block material/style reference; Image 2 is the project's cyan/violet reward-lighting reference. Use them only for finish, lighting language, and polish. Primary request: create one centered hollow rounded-square GRAB / SELECTED aura for a casual mobile color-sort puzzle. Subject: a continuous cool cyan-white luminous rim surrounding a large fully transparent center, with soft electric-blue outer bloom, restrained violet undershadow along the lower edge, and four tiny white corner glints. The aura must read as a block being lifted and held, not as a button, frame, gate, portal, ice, or explosion. Composition/framing: perfectly front-facing, square, centered, generous transparent padding; the transparent center occupies about 68% of the image; all glow stays inside the canvas. Style/medium: polished glossy 3D casual-game FX matching the references, clean and compact. Lighting/mood: crisp white grab confirmation with cyan energy, confident and readable rather than celebratory. Constraints: genuinely transparent background and genuinely transparent hollow center; no puzzle block body; no icon; no symbol; no text; no arrows; no checkerboard; no colored backdrop; no watermark; strong silhouette when downscaled to roughly 44 px. Avoid: gold, orange, red, confetti, radial portal rings, circular geometry, busy particles, large lens flares.

受阻光圈最终提示词：

> Use case: stylized-concept. Asset type: production game FX sprite, transparent square PNG. Input images: Image 1 is the approved cool grab-aura geometry and finish reference; Image 2 is the project's glossy puzzle-block material/style reference. Primary request: create one centered hollow rounded-square BLOCKED / COLLISION aura using the same front-facing geometry, thickness, padding, transparency, and casual-game polish as Image 1, but communicate a short resisted movement. Subject: a continuous warm white-to-lemon-gold luminous rim surrounding a large fully transparent center, with restrained amber outer bloom, a slightly stronger golden lower edge, and four compact white-yellow corner glints. The aura should read as tactile resistance and “cannot move farther,” not danger or failure. Composition/framing: perfectly front-facing, square, centered, generous transparent padding; the transparent center occupies about 68% of the image; all glow stays inside the canvas. Style/medium: polished glossy 3D casual-game FX exactly coordinated with Image 1. Lighting/mood: clear warm collision confirmation, brief and readable. Constraints: genuinely transparent background and genuinely transparent hollow center; no puzzle block body; no icon; no symbol; no text; no arrows; no checkerboard; no colored backdrop; no watermark; strong silhouette when downscaled to roughly 44 px. Avoid: cyan as the dominant color, red alarm styling, orange explosion, confetti, circular portal geometry, busy particles, large lens flares.

| 资源 | ImageGen 最终输出 | 项目源稿 | 运行版 |
|---|---|---|---|
| 抓取光圈 | `exec-a77abc21-31fd-48ef-8fa9-e22e5a13ecda.png` | `art-source/fx/block-grab-halo-v1.png` | `public/assets/art/fx/block-grab-halo-v1.png`（256×256） |
| 受阻光圈 | `exec-ad9ff344-9b98-492b-ba3d-99b326d51022.png` | `art-source/fx/block-blocked-halo-v1.png` | `public/assets/art/fx/block-blocked-halo-v1.png`（256×256） |

两份原始输出均位于 `C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\`，尺寸 1254×1254 RGBA，并已验证背景和中空中心包含真实 Alpha。运行时光圈先于块体逐格合成，内部重叠由块体覆盖，因此任意多格组会形成连续外轮廓；抓取还使用轻微整组抬升与 120ms 回弹，受阻改为 0.18 秒短压缩，简化动效下保留静态语义但取消弹性放大。

接入后为 46/46 启用 ImageGen 运行素材，合计 2,649,131 字节。第 3 关静止/按下/拖动/碰撞、第 16 关双层、第 11 关冰冻、第 1 关手势叠加，以及第 100 关 320×568 简化动效均完成真实 Pointer 与截图复核。

## 出口成功同色碎片与门下吸入

生成模式：内置 ImageGen，先用 `stylized-concept` 生成八色定向爆发图集，再用 `background-extraction` 尝试真实透明化。参考视频 8.4–8.8 秒的 10fps 连续帧显示：方块先被出口遮挡吸入，随后同色注塑碎片从门外侧爆开；项目旧版则把完整方块滑到门外，并在原位置显示与颜色无关的黄白星芒。

八色图集最终生成提示词：

> Use case: stylized-concept. Asset type: production directional exit-burst sprite atlas for a portrait casual mobile puzzle game; square transparent PNG divided into an exact 4-column by 2-row grid. Input images: Image 1 is the project's eight-color gameplay/style overview. Images 2–5 are exact close references for the glossy molded red, blue, green, and purple block materials. Use them only for material finish, lighting, color language, and polish. Primary request: create eight separate upward-emission burst sprites, one centered inside each equal atlas cell, in this exact row-major order: red, blue, green, yellow / purple, orange, pink, cyan. Subject: in every cell, a compact fan of 12–18 chunky glossy molded-resin fragments and short luminous speed streaks erupting upward from a narrow base at the bottom-center. Fragments should look like small beveled chips broken from the corresponding colored puzzle block, with a few larger pieces near the base and smaller pieces spreading upward. Each burst must stay one dominant color: vivid red, electric blue, emerald green, lemon yellow / rich violet, warm orange, candy pink, bright cyan. Use restrained white highlights only. Composition/framing: exact clean 4×2 atlas; eight equal tall cells; every sprite faces upward; each burst stays completely inside its own cell with generous transparent side margins; narrow origin at the bottom, widest spread in the upper-middle, clear separation between cells, no element crosses a cell boundary. Style/medium: polished cheerful 3D casual-game FX, crisp silhouettes, matching the referenced blocks. Lighting/mood: energetic successful release, tactile and satisfying, not dangerous. Constraints: genuinely transparent background across the entire atlas; no baked checkerboard; no visible grid lines, frames, labels, text, numbers, arrows, logos, watermark, smoke, fire, stars, coins, confetti, whole puzzle blocks, UI panels, or background scenery. Preserve exact color order. Strong readability when each atlas cell is displayed about 70 px wide by 130 px tall. Avoid: photoreal debris, dust clouds, circular explosions, multicolor mixing within a cell, excessive bloom, tiny noisy particles, cropped fragments, overlap between cells.

透明喷流备选最终提示词：

> Use case: stylized-concept. Asset type: production directional exit-energy FX sprite for a portrait casual mobile puzzle game; transparent square PNG. Input images: Image 1 is the project's small white-gold particle finish reference. Image 2 is the project's approved cyan-white luminous edge and transparency reference. Use them only for lighting language, polish, and material finish. Primary request: create one isolated upward-facing release jet that appears exactly where a colored puzzle block passes through its matching exit. Subject: a narrow brilliant white-cyan origin at the bottom-center, opening upward into 7–11 crisp tapered energy streaks and two subtle curved side wisps. The center remains mostly open so separately rendered colored block fragments stay readable. The sprite communicates quick suction-through followed by successful outward release, not an explosion. Composition/framing: perfectly front-facing, vertical and centered; narrow base at 82% canvas height; energy rises to about 18% canvas height; generous transparent margin on all sides; all glow stays inside the canvas. Style/medium: polished glossy 3D casual-game FX, clean and compact, coordinated with the project references. Lighting/mood: bright successful release, tactile and energetic, restrained rather than celebratory. Color palette: white core, pale cyan edges, very small restrained violet undershadow near the base. Constraints: genuinely transparent RGBA background; preserve semitransparent glow; one effect only; no colored fragments, no blocks, no symbols, no text, no arrows, no circles, no portal, no checkerboard, no backdrop, no frame, no logo, no watermark. Strong readability when displayed roughly 80 px wide by 130 px tall. Avoid: gold dominance, smoke, fire, confetti, stars, coins, radial explosion, busy tiny particles, large lens flare, cropped glow.

四份候选均未进入项目：`exec-fcfb98b6-fddf-4206-a5aa-fa00456467a1.png`、`exec-f5d30c65-3834-469b-a0c4-252af99f89b3.png` 和 `exec-e7ac830e-ac5d-4bda-871b-11fe469fd9b6.png` 实测为 RGB、无 Alpha；`exec-44a5a2de-1a82-4c26-916b-838df992f85c.png` 还错误加入整格彩色背景。它们只保留在 `C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\` 作为筛选记录，不复制到 `art-source`，避免以后误用伪透明稿。

最终上线实现复用已通过 Alpha/尺寸门禁的八张 ImageGen 方块与八张出口素材：出口成功时，完整块在 0.28 秒内从门素材下方被吸入并快速淡出；门素材自身做同色短脉冲；24 片碎片从对应方块运行图的四个象限裁切后沿出口外方向散开。双层块只用被剥离的外层颜色且不生成整块残影，简化动效缩为 6 片并压短寿命。Canvas 只执行 `drawImage` 裁切、旋转、缩放、层级和 Alpha 合成，不调色、不画路径、不生成渐变。

本轮不新增运行美术，仍为 46/46、2,649,131 字节。八色、上/右/下/左、双层剥离、机制反馈重叠与 320×568 简化动效均完成真实 Pointer 和截图复核；关键证据位于 `playtest-results/round43-exit-*.png`。

## 第 44 轮：既有 ImageGen 特效的因果时序编排

本轮不生成、不新增、不改写任何位图。第 43 轮截图显示，同一次出门同时触发解冻、双层剥离或卷帘时，出口碎片与机关 ImageGen 图标在同帧争抢注意力；这属于时间层级问题，而不是素材缺口。最终继续复用已归档的八色方块/出口、`mechanic-fx-atlas-v1.png` 与现有粒子素材，保持单文件替换结构不变。

运行时把机关图标、机关粒子和震屏统一封装为可排队事件：标准模式在出门后延迟 0.20 秒，简化动效延迟 0.14 秒；脉冲道具主动触发机关时仍即时播放。Canvas 只调整既有 `drawImage` 素材的播放时点、Alpha 和变换，不新增程序绘制形状、渐变或调色。46/46 ImageGen 素材仍为 2,649,131 字节，`pnpm art:audit --strict` 仍为 0。

成对视觉证据位于 `playtest-results/round44-{ice,layer,shutter}-{exit-first,mechanic-second}.png`，简化动效与最小视口证据位于 `round44-reduced-small-*-320x568.png`。

## 第 45 轮：八色无符号底块与“一块一主符号”

生成模式：内置 ImageGen，`precise-object-edit`。第 40 轮连接件已经消除多格块内部的几何断缝，但每个单元仍重复同一辅助符号，例如 2×2 块会出现四个星形或四个三角，视觉上又把一个完整块切回多个按钮。本轮为八色各生成一张与原标记块同材质、同边框、同光照、同轮廓的无符号底块；运行时每个完整块只保留一个主符号，其余单元使用无符号版本。

统一提示词模板：

> Use case: precise-object-edit. Asset type: transparent square production game block tile. Image 1 is the exact approved [COLOR] block tile and must remain the material, border, silhouette, alignment, camera and lighting reference. Remove only the centered [SYMBOL] accessibility symbol. Reconstruct the removed area as one continuous quiet glossy [COLOR] inner panel matching the surrounding molded resin. Preserve the exact raised rim, bevels, corner radius, highlights, shadows, canvas size, object scale and placement. Genuine transparent RGBA background. One tile only. No replacement symbol, icon, text, number, arrow, logo, watermark, studs, seam, background rectangle, scene or baked checkerboard.

| 颜色 | ImageGen 原始输出 | 项目源稿 | 运行版 |
|---|---|---|---|
| 红 | `exec-8cf34c43-e42a-4990-860a-a0ad8cbacd04.png` | `art-source/gameplay/blocks/red-plain-v1.png` | `public/assets/art/gameplay/blocks/red-plain-v1.png` |
| 蓝 | `exec-5c5fe712-ad06-45fa-904a-a2e28a62fb98.png` | `art-source/gameplay/blocks/blue-plain-v1.png` | `public/assets/art/gameplay/blocks/blue-plain-v1.png` |
| 绿 | `exec-2a4e0f53-1bfc-4555-9870-ac277558baa8.png` | `art-source/gameplay/blocks/green-plain-v1.png` | `public/assets/art/gameplay/blocks/green-plain-v1.png` |
| 黄 | `exec-9eaff024-fc6e-4e90-a74d-29fcde11e60d.png` | `art-source/gameplay/blocks/yellow-plain-v1.png` | `public/assets/art/gameplay/blocks/yellow-plain-v1.png` |
| 紫 | `exec-4b0ba802-7d34-4e26-9145-63cc74da5070.png` | `art-source/gameplay/blocks/purple-plain-v1.png` | `public/assets/art/gameplay/blocks/purple-plain-v1.png` |
| 橙 | `exec-95da8bfa-81fc-447a-9b2d-b9e064706818.png` | `art-source/gameplay/blocks/orange-plain-v1.png` | `public/assets/art/gameplay/blocks/orange-plain-v1.png` |
| 粉 | `exec-2a81f628-74cd-4800-9b9f-1cdecae92daa.png` | `art-source/gameplay/blocks/pink-plain-v1.png` | `public/assets/art/gameplay/blocks/pink-plain-v1.png` |
| 青 | `exec-eeb51784-4c42-492e-963e-934606d2aa66.png` | `art-source/gameplay/blocks/cyan-plain-v1.png` | `public/assets/art/gameplay/blocks/cyan-plain-v1.png` |

原始输出统一位于 `C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\`，尺寸 1254×1254。ImageGen 的七张输出把透明预览棋盘格烘进 RGB，绿色虽带 Alpha，但为避免八色轮廓产生细微差异，最终全部采用一致的确定性透明归一：保留新生成图的每一个 RGB 可见像素，只提取对应已批准标记块的 Alpha 通道并逐像素合并。这个步骤不绘制、调色或替换任何可见像素，只恢复与成对标记块完全一致的透明轮廓；最终八张源稿与 256×256 运行版均已验证为真实 RGBA。

运行规则：中心选格先取最接近块体质心的单元，距离相同时优先四邻接度更高的单元，再按上到下、左到右稳定决胜，因此直条、矩形、L/T/S 等形状的主符号不会随机跳动。普通块仅该单元使用标记块；夹层块仅显示当前活动外层的唯一符号，下一层只以无符号颜色小面板预告，真实剥离后符号切换到新活动层。连接件继续覆盖内部拼缝，出口仍显示同色同符号。

接入后为 54/54 启用 ImageGen 运行素材，合计 2,918,873 字节。第 1 关矩形、第 2 关 L/T 凹形与选中态、第 16 关夹层/灰阶/真实剥离，以及第 100 关 320×568 均完成截图复核；关键证据位于 `playtest-results/round45-single-badge-*.png`。

## 第 48 轮：连续拖拽只调整既有 ImageGen 素材的运行时变换

本轮解决的是输入采样、连续碰撞和落格时序，不存在新的美术语义，因此没有生成或新增位图。拖拽中的方块、无符号底块、连接件、抓取光圈和受阻光圈继续逐文件复用既有 ImageGen 资产；Canvas 只对整组执行连续平移、抬起缩放和 90/120ms 吸附变换，不绘制轮廓、路径、渐变或替代图形。

专项截图覆盖非整数斜向位姿、左墙滑动、落格完成和 320×568/DPR2；`pnpm art:verify` 仍为 54/54、2,918,873 字节，`pnpm art:audit` 为 0 个程序绘制美术调用。素材目录和一文件一替换关系均未改变。

## 第 49 轮：文档递进机关图集

生成模式：内置 ImageGen，先用 `stylized-concept` 生成 2×2 机关图集，再进行仅背景提取的精确编辑。四格固定顺序为：左上生成器、右上升降台、左下传送带、右下星标。首稿 `exec-0ffba1c5-3c16-4008-903e-9a0c292d6eaa.png` 把棋盘格烘进 RGB，因此没有进入项目；最终稿 `exec-56a2c02f-a10a-482b-aea1-e5989de4a2b8.png` 已验证为 1254×1254 RGBA，左上角像素 `(0,0,0,0)`，Alpha 覆盖 0–255。

生成提示词摘要：

> Production 2D game mechanics sprite atlas for a portrait mobile color-sort sliding puzzle. Exact 2×2 atlas: compact purple/gold block generator with an empty output slot; slim moving elevator platform; horizontal conveyor belt; purple/gold star badge plate. Premium glossy injection-molded finish, deep violet and gold with restrained cyan/magenta neon. Transparent background, no text, numbers, logos, blocks or scenery, generous crop-safe margins.

透明修正提示词：

> Edit only the background of this existing 2×2 mobile-game mechanic sprite atlas. Remove the visible checkerboard pattern completely and replace it with genuine alpha transparency. Preserve the four objects exactly in their current quadrants, including shapes, proportions, highlights, colors, spacing, and full margins. No shadows extending into the transparent background; no text, numbers, logos, frames, panels, checkerboard, colored backdrop, or extra objects. Output a clean RGBA PNG sprite atlas.

| ImageGen 最终输出 | 项目源稿 | 运行版 | 图集顺序 |
|---|---|---|---|
| `C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\exec-56a2c02f-a10a-482b-aea1-e5989de4a2b8.png` | `art-source/gameplay/mechanics/progression-mechanics-atlas-v1.png` | `public/assets/art/gameplay/mechanics/progression-mechanics-atlas-v1.png`（1024×1024 RGBA） | generator / elevator / conveyor / star |

接入后为 55/55 启用 ImageGen 运行素材，合计 3,105,310 字节；资源尺寸、Alpha、2×2 网格和清单覆盖均通过门禁，程序绘制美术审计仍为 0。

## 第 66 轮：出口吸入轨迹与五页导航

生成模式：内置 ImageGen，`stylized-concept`。本轮没有复刻参考视频的角色、商标或原始 UI；只抽象“五个固定页签、纵向旅程、列表/收藏层级”的信息架构，并延续项目既有霓虹实验室美术语言。

### 出口吸入轨迹

提示词摘要：

> Reusable 2D portal-suction success VFX, transparent background. Horizontal left-to-right white/electric-cyan energy stream converging into a bright portal point, restrained violet/magenta accents, premium neon sci-fi casual style, no text, arrows, gate, block, UI or watermark.

| ImageGen 原始输出 | 项目源稿 | 运行版 |
|---|---|---|
| `C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\exec-65039086-c683-4ce7-9588-2a4622143454.png` | `art-source/fx/exit-suction-trail-v1.png` | `public/assets/art/fx/exit-suction-trail-v1.png`（512×512 RGBA） |

运行时以出口为收束点旋转适配上/右/下/左四边；标准模式显示完整轨迹，简化动效缩短并降低 Alpha。色块、门体和轨迹全部为 ImageGen 位图，Canvas 只做旋转、缩放和透明合成。

### 五页图标与底栏 Chrome

图标提示词摘要：

> Production 3×2 transparent mobile-game icon atlas. Shop supply crate and coin; Leaderboard trophy and podium; Home laboratory portal; Journey rocket and star trail; Collection card album and gem; final cell empty. Chunky premium neon sci-fi toy style, crisp at 64px, no text, labels, buttons or background.

Chrome 提示词摘要：

> Transparent UI chrome kit with two separated components: a long five-slot unselected bottom navigation tray, and one reusable selected-tab plate. Cobalt/electric-blue glossy sci-fi metal, violet bevel, cyan inner light, restrained gold accent, no icons or text.

| ImageGen 原始输出 | 项目源稿 | 运行版 |
|---|---|---|
| `C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\exec-0f3eef03-0894-42bd-ac64-77ccf1d318f4.png` | `art-source/ui/navigation-v3/five-tab-icons-atlas-v1.png` | `public/assets/art/ui/navigation-v3/five-tab-icons-atlas-v1.png`（384×256，3×2） |
| `C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\exec-f4f4bc95-5f53-4152-86ac-c8e64d4ccba5.png` | `art-source/ui/navigation-v3/five-tab-chrome-kit-v1.png` | `five-tab-bar-v1.png`（496×96）与 `five-tab-selected-v1.png`（120×98） |

旧三栏底栏的五个运行文件已经退出发布包，原稿仍保存在 `art-source/ui/home-v2/` 可恢复；新的底栏、选中态和图标分离，后续可单独替换。

### Journey 十节点路线

提示词摘要：

> One transparent vertical Journey map track with exactly ten evenly spaced empty circular checkpoint sockets on a gentle zigzag energy rail, bottom-to-top progression, cobalt metal, cyan/violet light and gold milestones at checkpoints 5 and 10, no numbers, icons, panels, text or scenery.

| ImageGen 原始输出 | 项目源稿 | 运行版 |
|---|---|---|
| `C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\exec-fe1eb275-117d-4124-a258-bb93a71c82ca.png` | `art-source/ui/journey/journey-track-v1.png` | `public/assets/art/ui/journey/journey-track-v1.png`（384×576 RGBA） |

关卡号、锁、星级和当前选择为实时数据，不写死进图；同一路线复用到 10 个航段，共覆盖 100 关。全部新资源已纳入 `pnpm art:optimize` 固定裁切/缩放流程和资源清单。

## 第 76 轮：道具解锁提示框

生成模式：内置 ImageGen，输入 `universal-panel-v2.png`、`booster-icons-v1.png` 与 `five-tab-chrome-kit-v1.png` 仅作为材质、配色和高光参考。最终框体不写死任何文字或图标，运行时复用现有道具图集并叠加实时名称与作用，因此三类解锁共用一张资源。

首次生成提示词：

> Create a production-ready transparent mobile game UI asset, using the input images only as visual style and material references. ASSET TYPE: one compact horizontal booster-unlock notification frame / toast banner, no contents. COMPOSITION: a single centered wide rounded rectangular frame, approximately 3.6:1 aspect ratio. Deep indigo and violet beveled sci-fi metal shell, cyan inner energy glow, two restrained gold accent clasps near the upper corners, a dark navy low-detail center panel with ample clean space for a 64px icon on the left and two short lines of text on the right. Readable at small phone scale. Symmetrical, clean, polished casual puzzle-game quality. Genuine transparent pixels outside the one object. Keep the entire object inside the canvas with generous transparent margin and no cropped glow. STYLE: match the references' glossy purple-blue metal, saturated cyan edge light, smooth rounded bevels, subtle depth, bright but controlled highlights. Premium friendly arcade puzzle UI, not realistic industrial hardware. DO NOT INCLUDE: any words, letters, numbers, symbols, icons, boosters, locks, characters, coins, buttons, tabs, background scene, floor, texture outside the object, checkerboard pattern, mockup phone, drop shadow touching the canvas edge, or multiple variants. One coherent empty frame only.

透明修正提示词：

> Edit the supplied booster-unlock frame asset. Preserve the frame design, colors, proportions, metal bevels, cyan inner glow, gold accents, and empty navy center exactly. Remove the entire checkerboard/background and replace it with genuine alpha transparency. Export as RGBA PNG with transparent pixels everywhere outside the frame. Do not add any text, icons, symbols, shadows, background color, checkerboard, mockup, or extra objects. Keep the single full frame centered with safe transparent margin and no crop.

两次 ImageGen 输出均给出了合格框体，但文件通道实测仍为 RGB，棋盘格被烘入像素。项目保留第二次输出作为生成原稿，并用 `tools/prepare-booster-unlock-source.mjs` 只剥离低饱和高亮背景、补真 Alpha 和透明安全边；该步骤不重绘框体。处理后源稿为 1608×573 RGBA，运行版由统一管线缩放为 420×128 RGBA，Alpha 最小/最大值为 0/255。

| ImageGen 输出 | 项目生成原稿 | 可替换源稿 | 运行版 |
|---|---|---|---|
| `C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\exec-5b7df867-c3aa-4d21-a441-243c190b28e3.png` | `art-source/ui/notifications/booster-unlock-banner-v1-raw.png` | `art-source/ui/notifications/booster-unlock-banner-v1.png` | `public/assets/art/ui/notifications/booster-unlock-banner-v1.png`（420×128 RGBA，18,943 字节） |

首个造型候选保留在 `C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\exec-9b107188-773a-480b-bbca-b456a851c3c4.png`，未复制到项目。当前启用 ImageGen 运行素材为 72 份，合计 3,309,403 字节；路径、尺寸、Alpha、清单覆盖和程序绘制美术审计均通过。

## 第 50 轮：八色夹层预告徽章图集

生成模式：内置 ImageGen，先生成精确 4×2 八色徽章图集，再执行仅背景提取的精确编辑。此前把下一层颜色缩小后重复画在每一个单元里，会把一个连通块重新切成多个视觉按钮，也无法在灰度下可靠表达剥离顺序。本轮改为“当前层一个大符号 + 整块一至两枚内层徽章”：徽章固定放在连通块右下角，下一层在前，第三层稍小后置。

生成提示词摘要：

> Production 2D game layer-preview badge atlas for a portrait mobile color-sort sliding puzzle. Exact 4×2 transparent atlas in this order: red circle, blue diamond, green triangle, yellow square / purple sparkle, orange hexagon, pink heart, cyan plus. Eight separate compact circular badges, glossy injection-molded casual-game materials, restrained deep-violet/gold rim, strong color-and-symbol double coding, consistent front-facing scale, generous crop-safe margins. No text, numbers, arrows, blocks, scenery, logos, watermark, grid lines or baked background.

透明修正提示词：

> Edit only the background of this existing 4×2 badge sprite atlas. Remove the visible checkerboard or colored backdrop completely and replace it with genuine alpha transparency. Preserve all eight badges exactly in their current cells, including shape, symbol, material, highlights, spacing and margins. No added objects, text, frames, scenery or shadows extending into the transparent background. Output a clean RGBA PNG atlas.

| ImageGen 最终输出 | 项目源稿 | 运行版 | 图集顺序 |
|---|---|---|---|
| `C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\exec-edaf80b7-6499-43b3-9883-ed2b7d5a4aa7.png` | `art-source/gameplay/mechanics/layer-preview-badges-v1.png`（1536×1024 RGBA） | `public/assets/art/gameplay/mechanics/layer-preview-badges-v1.png`（512×256 RGBA） | red / blue / green / yellow；purple / orange / pink / cyan |

运行优化按每个 384×512 源格纵向居中裁取 384×384，再统一缩放为 128×128；这是确定性裁边与缩放，不生成替代图形。720×1584、DPR 2 下最大实际显示向上取整为 88 px，仍有约 45% 采样余量；彩色、灰度和 320×568 小屏均需目视复核，当前层大符号和内层徽章不能互相遮挡。

## 第 90 轮：实际挡路色块焦点角框

生成模式：内置 ImageGen。用途是玩家拖动色块发生真实块体碰撞时，短暂指出“哪一块正在挡路”；素材本身不包含箭头、方向、路线、钥匙、锁或文字，也不负责求解。中心保持完全透明，避免遮住色块颜色、主符号、数字或夹层徽章。

完整提示词：

> Use case: stylized-concept. Asset type: transparent gameplay feedback overlay for a polished vertical casual puzzle game. Primary request: create one hollow square blocker-focus halo that briefly frames a puzzle block which is physically obstructing the block the player is dragging. Scene/backdrop: genuinely transparent background. Subject: a clean rounded-square frame made from four separated corner brackets and a very subtle outer energy bloom; the center must stay fully open and transparent so the colored block remains readable. Style/medium: premium glossy 3D mobile-game VFX, friendly sci-fi toy aesthetic, crisp beveled light, compatible with saturated blue-purple neon puzzle art. Composition/framing: perfectly centered square, symmetrical, generous transparent center, effects contained inside the canvas with safe padding. Lighting/mood: warm amber-to-coral glow with tiny white contact sparks, informative rather than alarming. Color palette: amber, coral orange, restrained warm white; no blue fill. Materials/textures: luminous glass and polished energy tubing, sharp clean alpha edges. Constraints: no text, no icons, no arrows, no keys, no locks, no directional marks, no objects, no background, no shadow plate, no opaque center, no watermark; true RGBA transparency; one standalone square overlay only; readable when scaled down to about 50 pixels.

| ImageGen 原始输出 | 项目源稿 | 运行版 |
|---|---|---|
| `C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\exec-ff8b54f9-8305-484b-8264-c7f33bebedc8.png`（1254×1254 RGBA） | `art-source/fx/blocker-focus-corners-v1.png`（998,706 字节） | `public/assets/art/fx/blocker-focus-corners-v1.png`（256×256 RGBA，21,193 字节） |

运行时把 256×256 资源等分为四个 128×128 角区，按实际阻挡块包围盒分别贴到四角，因此异形、多格块不会被拉伸成一张实心盖板。标准动效显示 0.62 秒，简化动效显示 0.34 秒且不脉冲。`pnpm art:verify` 已确认源稿/运行版路径、尺寸与 Alpha，当前 73 份 ImageGen 运行素材合计 3,330,596 字节；`pnpm art:audit` 继续保持 0 个程序绘制美术调用。

## 第 91 轮：机关因果信号光点

生成模式：内置 ImageGen。该素材只在玩家已经成功送出色块、且该次消除确实改变生成器、卷帘或传送带后使用；它从刚使用的出口移动到实际变化目标，不预测下一步、不显示路线或答案。简化动效模式不播放位移，只保留变化目标的静态确认。

完整提示词：

> Use case: stylized-concept. Asset type: transparent real-time gameplay VFX for a polished portrait casual puzzle game. Primary request: create one compact causal relay signal mote that travels from a just-used color exit to a mechanism that has already changed. Scene/backdrop: genuinely transparent background. Subject: a single small round energy pearl with a bright white-gold core, cyan-violet glass halo, and two or three very short soft luminous echo droplets clustered closely behind it; no long trail. Style/medium: premium glossy 3D mobile-game VFX, friendly sci-fi toy aesthetic, crisp beveled glow, compatible with saturated blue-purple neon puzzle art. Composition/framing: centered, circular overall silhouette, effects fully contained with generous transparent margin, readable at 18 to 36 pixels. Lighting/mood: clear celebratory information signal, restrained and non-alarming. Color palette: warm white-gold core, cyan edge light, subtle violet accent. Materials/textures: luminous glass bead and polished energy bloom, clean alpha edges. Constraints: exactly one standalone signal mote; true RGBA transparency; no text, numbers, icons, arrows, chevrons, keys, locks, direction symbols, path line, UI plate, background, checkerboard, objects, watermark, or cropped glow; do not imply a future move or solution.

| ImageGen 原始输出 | 项目源稿 | 运行版 |
|---|---|---|
| `C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\exec-bb318633-1e6b-4dd6-8b64-572f298e0c04.png`（1254×1254 RGBA） | `art-source/fx/mechanic-relay-mote-v1.png`（357,376 字节） | `public/assets/art/fx/mechanic-relay-mote-v1.png`（128×128 RGBA，3,263 字节） |

Alpha 实测范围为 0–255，原稿含 1,403,930 个全透明像素。运行时只做位移、旋转、缩放与透明度合成；同次触发多个机关时最多显示三枚光点，文字提示只保留“传送推进／载荷放出／卷帘开启／外层剥离／已解冻”中优先级最高的一条。当前 74 份 ImageGen 运行素材合计 3,333,859 字节，`pnpm art:verify` 与程序美术 0 绘制审计通过。

## 第 92 轮：高压关策略焦点角框

生成模式：内置 ImageGen，`stylized-concept`。素材只在玩家连续多次移动仍未完成消除时标出一个值得观察的色块；第一阶段不包含方向、路线或答案。若继续两次无进展且预设局部动作在当前局面仍真实可行，才叠加既有手势动画演示一次让路。中心保持完全透明，不遮挡色块颜色、符号、数字或夹层徽章。

完整提示词：

> Use case: stylized-concept. Asset type: transparent adaptive gameplay focus overlay for a polished portrait casual puzzle game. Primary request: create one hollow strategy-focus frame that softly draws attention to a puzzle block only after the player has made many moves without clearing anything. Scene/backdrop: genuinely transparent background. Subject: four separated rounded corner brackets forming one centered square focus frame, with a restrained cyan-to-warm-gold luminous edge and three or four tiny soft scan motes close to the corners; the entire center must stay completely open and transparent. Style/medium: premium glossy 3D mobile-game VFX, friendly sci-fi toy aesthetic, crisp beveled glass light, compatible with saturated blue-purple neon puzzle art. Composition/framing: perfectly centered square, symmetrical, generous transparent center, all glow contained inside safe canvas margins, readable at 45 to 80 pixels; each corner must remain visually useful when the image is divided into four equal quadrants and the quadrants are placed around a rectangular block. Lighting/mood: calm, curious, encouraging, low-pressure assistance rather than warning or success celebration. Color palette: cyan and soft electric blue with small restrained warm-gold accents; visually distinct from amber-coral collision warning effects. Materials/textures: luminous glass tubing and polished energy brackets, sharp clean alpha edges. Constraints: one standalone hollow overlay only; true RGBA transparency; no text, numbers, icons, arrows, chevrons, hands, fingers, keys, locks, direction symbols, route, path line, object, block fill, opaque center, background, checkerboard, watermark, or cropped glow; must not imply a movement direction or solution.

| ImageGen 原始输出 | 项目源稿 | 运行版 |
|---|---|---|
| `C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\exec-cd10355a-3ad3-41c4-9c70-b4bacb71444b.png`（1254×1254 RGBA） | `art-source/fx/strategy-focus-corners-v1.png`（781,789 字节，Alpha 0–254） | `public/assets/art/fx/strategy-focus-corners-v1.png`（256×256 调色板 PNG，14,837 字节，透明度 0–254） |

运行时把资源四等分后贴到实际块体包围盒四角，异形和多格块不会被整图拉伸。标准模式使用克制的 3.5% 慢脉冲，简化动效保持静止；720×1584 DPR2、320×568、路径中途续接和当前路径被堵时的安全退化均已通过真实 Pointer 专项。当前 75 份 ImageGen 运行素材合计 3,348,696 字节，`pnpm art:verify` 与程序美术 0 绘制审计通过。

## 第 93 轮：自适应挡路提示复用既有 ImageGen 语义

本轮没有生成新位图。视觉复核确认“预设目标路径被当前棋盘中的活动色块挡住”与第 90 轮“拖拽发生真实块体碰撞”都表示同一种物理挡路关系，因此复用琥珀色 `blocker-focus-corners-v1.png`，不创建外观相近、含义重复的第三套角框。

- 青色 `strategy-focus-corners-v1.png`：只表示“值得观察的目标块”，不包含方向。
- 琥珀色 `blocker-focus-corners-v1.png`：只表示“当前需要先挪开的真实挡路块”。自适应局部手势出现时角框持续显示，中心保持透明；常规碰撞仍按原 0.62/0.34 秒短暂显示。
- ImageGen 手势与琥珀角框均绑定同一动态块 ID；Lv80 扰动场景截图位于 `playtest-results/strategy-focus/07-lv80-adaptive-blocker-720x1584.png`。视觉检查确认手势、角框、色块和出口没有错位，HUD 与棋盘主体无遮挡。

当前仍为 75 份 ImageGen 运行素材、3,348,696 字节；`pnpm art:verify` 验证尺寸、Alpha、清单与显示密度，`pnpm art:audit` 保持 0 个程序绘制美术调用。

## 第 95 轮：分步通路提示复用现有 ImageGen 手势

本轮先试验了“让路后只追加青色观察角框”，但无求解器首玩代理仍为 0/4 首消，Lv78 还从 29 手停滞退化到 45 手上限；该方案已撤回，截图和报告仅保存在 `playtest-results/experiments/round95-rejected-handoff/`，不进入运行包。

最终方案没有生成新位图。第二段帮助与既有局部手势具有相同语义，继续复用 ImageGen 的引导手、青色策略角框和琥珀挡路角框；新增相似素材会增加视觉词汇但不能增加信息，因此依据 imagegen skill 的去重原则选择复用。720×1584 的 `08-lv80-corridor-followup-720x1584.png` 和 320×568 简化动效的 `11-lv80-followup-reduced-320x568.png` 证明手势、文字、异形棋盘和出口无遮挡。提示只展示当前腾挪路径，运行时动作契约不包含随后消除方块或出口，通路打开后立即停止。

当前仍为 75 份 ImageGen 运行素材、3,348,696 字节；没有程序绘制或新增包体图片。

## 第 96 轮：活动空间因果结（试验后撤回）

生成模式：内置 ImageGen。试验目标是在玩家完成一次局部让路后，用一个青白与琥珀色互扣的圆润发光环说明“刚才的移动让另一块恢复可移动”。提示词要求真透明背景、中心清晰、适配 24–48 像素霓虹棋盘；不含文字、数字、手、路线、方向符号、钥匙、挂锁、方块底板或背景。

| ImageGen 原始输出 | 优化候选 | 最终状态 |
|---|---|---|
| `playtest-results/experiments/round96-rejected-mobility-relay/dependency-link-knot-source.png`（891,934 字节） | `playtest-results/experiments/round96-rejected-mobility-relay/dependency-link-knot-runtime.png`（256×256，16,649 字节） | 撤回；不在素材清单、Web 或微信包中 |

首版反馈触发 17 次，首玩代理 45 手仍无首消；收敛为一次后，40 手停滞且剩余仍为 21/21。该素材只增加局部因果信息，没有改善“同色块送往同色出口”的目标理解，因此未通过质量门。完整负面证据和截图保存在同目录 README 与 JSON 报告中；正式运行素材仍为 75 份、3,348,696 字节。

## 第 97 轮：Lv98 结构优化复用既有 ImageGen 反馈

本轮没有新增位图。第 96 轮已经证明增加近义特效无法改善 Lv98 首次消除，因此改为调整关卡初始空间关系，并继续复用 `strategy-focus-corners-v1.png`、`blocker-focus-corners-v1.png` 与既有 ImageGen 引导手。三者仍分别表达“观察目标”“真实挡路块”和“一次局部拖拽”，没有新增视觉词汇。

360×792/DPR2 与 320×568 简化动效截图位于 `playtest-results/strategy-focus/`；提示中心保持透明，不遮挡色块颜色、符号、数字、出口或夹层。当前仍为 75 份 ImageGen 运行素材、3,348,696 字节，程序美术审计保持 0。

## 第 98 轮：排行榜完整分页复用既有 ImageGen 系统框体

本轮不新增位图。排行榜前后翻页与旅程分页属于相同的系统导航语义，继续复用 `public/assets/art/ui/chrome/buttons-v2.png` 的 ImageGen 次级按钮框体；“上一页 / 下一页”、页码、总条数和禁用透明度均为实时界面数据。没有用 Canvas 绘制新的按钮外形、箭头素材或弹窗框体。

章节榜第 2 页、效率榜第 2 页、安全区第 2 页和小屏空记录截图位于 `playtest-results/five-tab-navigation/`。720×1584、320×568 与 44/34 安全区均确认框体无拉伸、底栏无遮挡、禁用态清楚；当前仍为 75 份 ImageGen 运行素材、3,348,696 字节，程序美术审计保持 0。

## 第 99 轮：商店存档失败反馈复用既有 ImageGen 框体

本轮不新增位图。存储异常属于商店现有状态反馈，继续复用 `public/assets/art/ui/chrome/panels-v2.png` 与 `buttons-v2.png` 的 ImageGen 面板/按钮框体，只把实时反馈文字切换为“保存失败 · 请重试”；没有新增代码绘制框体、图标或近义素材。

失败态截图为 `playtest-results/round99-supply-save-failed.png`。现有 75 份 ImageGen 运行素材仍为 3,348,696 字节，尺寸、Alpha、图集、发布密度与清单检查全部通过，程序美术审计保持 0。

## 第 100 轮：每日挑战跨午夜状态复用既有 ImageGen 资源

本轮不新增位图。每日挑战开始日、跨午夜归属、重开、超时、奖励及异常日期提示继续复用 `public/assets/art/ui/home-v2/daily-ribbon.png`、`daily-calendar.png` 与现有 ImageGen 弹窗框体；日期、连胜、奖励和错误说明均为运行时动态文字，没有把日期烘焙进图片，也没有新增代码绘制框体或近义图标。

跨午夜系统专项、100 关全季回归与微信构建通过。当前仍为 75 份 ImageGen 运行素材、3,348,696 字节，尺寸、Alpha、图集、发布密度与清单检查全部通过，程序美术审计保持 0。

## 第 101 轮：结算保存失败复用既有 ImageGen 弹窗与按钮

本轮不新增位图。“进度未保存”状态直接复用 `public/assets/art/ui/chrome/universal-panel-v2.png` 和 `buttons-v2.png`：面板承载实时错误说明，绿色按钮用于“重试保存”，紫色按钮用于“放弃并返回”。保存成功后才恢复现有 ImageGen 胜利光环、星级、金币与庆祝反馈；失败状态不新增图标、不绘制代码框体，也不展示会被误解为资产到账的奖励视觉。

Lv3、Lv4、Lv100 赛季结算、每日挑战、放弃返还和 320×568 失败态在 10 张 `playtest-results/round101-*` 截图中完成复核；Lv100 保存失败不显示终章庆祝，恢复成功后才展示既有 ImageGen 赛季完成反馈。写盘落地但回执丢失的恢复只改变存储判定，不产生新视觉语义或素材。当前仍为 75 份 ImageGen 运行素材、3,348,696 字节，尺寸、Alpha、图集、发布密度与清单检查全部通过，程序美术审计保持 0。

## 第 102 轮：每日挑战前台跨午夜刷新复用既有 ImageGen 资源

本轮不生成新位图。首页持续前台跨过午夜后，只更新运行时日期、完成状态、奖励文案和当日选关，继续复用 `public/assets/art/ui/home-v2/daily-ribbon.png` 与 `daily-calendar.png`；已经开始的旧日挑战保持开始日、当日模型和结算归属，不替换棋盘或引入新的视觉语义。

496×1078 与 320×568 的旧日首页、新日首页、旧日进行中挑战和返回新日首页共 8 张 `playtest-results/round102-daily-foreground-*.png` 已完成真实交互与人工视觉复核；无拉伸、缺图、遮挡或文字溢出。`onHide` 取消监视、`onShow` 核对日期并重建监视只改变生命周期行为，不需要新增图标、面板或提示素材。最终仍为 75 份 ImageGen 运行素材、3,348,696 字节，程序绘制美术调用为 0；微信生产包为 78 个文件、3,612,477 字节且无 sourcemap。

## 第 108 轮：收藏与每日挑战发现徽章

生成模式：内置 ImageGen，透明 UI 素材。用途是在收藏页签或每日挑战横幅首次出现新内容时做一次非阻塞提醒；玩家真正打开对应内容后消失。徽章不承担点击热区、不表示奖励已经领取，也不使用程序绘制替代图形。

生成提示：

> Small transparent glossy coral-magenta jewel notification badge with a polished gold rim and a restrained cyan-white sparkle, matching a premium neon purple-blue sci-fi toy laboratory mobile puzzle game. Centered standalone object with generous transparent safe padding, crisp readable silhouette at small size. No text, number, logo, button plate, background, checkerboard, watermark, arrow, key or lock. True RGBA transparency.

| ImageGen 原始输出 | 项目源稿 | 运行版 |
|---|---|---|
| `C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\exec-01431318-ec96-49bf-9f20-2e99e34bbcd2.png`（1254×1254 RGBA） | `art-source/ui/notifications/discovery-badge-v1.png`（1254×1254 RGBA，1,136,998 字节） | `public/assets/art/ui/notifications/discovery-badge-v1.png`（128×128 RGBA，7,306 字节） |

项目源稿直接保留 ImageGen 输出的可见像素与真实 Alpha；统一美术管线只将运行版等比缩放为 128×128 并执行发布级 PNG 优化。720×1584 与 320×568 的空存档真实流程均确认徽章清楚但不遮挡入口文字、每日状态或底栏选中态。当前 76 份 ImageGen 运行素材共 3,356,002 字节，`pnpm art:verify` 与程序美术严格审计通过。

## 第 110 轮：完整机制图鉴图标

生成模式：内置 ImageGen，透明 4×3 游戏 UI 图集。用途是让收藏页逐项展示当前赛季真实存在的 11 种机制；文字、解锁等级和效果说明继续由运行时排版，不烘焙进位图。第 12 格明确留空，便于按固定图集契约切片。

生成提示：

> Create one transparent 4-by-3 sprite atlas for a premium neon purple-blue sci-fi toy laboratory mobile puzzle game. Use twelve equal cells with generous transparent padding and one centered glossy icon per cell. Left-to-right, top-to-bottom: colored directional exit gate; irregular playable board silhouette; connected irregular block shape; numbered frozen block; numbered frozen exit; multi-layer nested block shell; block generator; moving elevator platform; numbered shutter door; conveyor belt carrying a block; star-marked block and star gate; final cell completely empty and transparent. Match polished purple, blue, cyan and gold toy-like UI materials with bright colored blocks. No text, digits, labels, logo, watermark, key, lock, standalone direction-restricted block, background, card frame or checkerboard. True RGBA transparency, crisp silhouettes readable at small mobile UI size, consistent scale and lighting across all cells.

| ImageGen 原始输出 | 项目源稿 | 运行版 |
|---|---|---|
| `C:\Users\Administrator\.codex\generated_images\01a056d6-beb1-7673-97a2-708344d089f6\exec-2ea33bcf-bf4e-4d38-8f16-b5faae258324.png` | `art-source/gameplay/mechanics/mechanism-guide-icons-atlas-v1.png`（1448×1086 RGBA，1,606,782 字节） | `public/assets/art/gameplay/mechanics/mechanism-guide-icons-atlas-v1.png`（768×576 RGBA，137,896 字节） |

运行图集为 4×3，每格 192×192，顺序固定为：颜色出口 / 异形棋盘 / 异形方块 / 数字冰块；冰封出口 / 多层外壳 / 生成器 / 升降台；卷帘 / 传送带 / 星标 / 空白。原始输出只经过等比缩放和发布级 PNG 优化，未重绘图标。最终 77 份 ImageGen 运行素材共 3,493,898 字节；`pnpm art:verify` 和程序美术严格审计均通过。

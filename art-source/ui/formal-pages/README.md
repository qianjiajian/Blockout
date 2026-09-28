# Shop / Leaderboard / Journey / Collection / 弹窗正式切图

此目录保存项目方提供的正式 720×1584 页面示意图和原尺寸切片。运行版由 `pnpm art:optimize` 字节级复制到 `public/assets/art/ui/formal-pages/`，源文件禁止裁切、拉伸或重新编码；运行时仅允许按示意图测量框等比缩放，不能改变素材宽高比。

## Shop

- `shop/reference.png`：完整页面底图。
- `shop/buy-button.png`、`booster-tile.png`、`price-coin.png`：购买区域切片。
- `shop/time.png`、`rocket.png`、`pulse.png`：三种道具图。
- 运行时在原图位置叠加真实金币、库存、价格和购买状态；三个购买按钮均在同一指针于按钮内松手时生效。
- 动态字号按参考图可见字形校准：效果说明30px、库存31px、道具名39px、价格32px；效果与库存分别限制为363px/218px宽，三个重复卡片使用各自测量的 y 锚点。

## Leaderboard

- `background.png`、`top-header.png`、`title-panel.png`、`title.png`、`tabs-frame.png`：页面结构切片。
- `tab-active.png`、`tab-inactive.png`：Weekly / World / Country 三种页签状态。
- `podium.png`、三种 `podium-nameplate-*`、三种 `podium-medal-*`：前三名领奖台。
- 五种 `avatar-*`：榜单角色头像；运行时按排名动态组合，不使用示意图里烘焙的玩家数据。前三张为领奖台原尺寸，复用于普通榜单行时等比收进约 80×79px 的逐行测量框，后两张本身即为榜单行尺寸；所有头像均保持原始宽高比。
- `row.png`、`level-pill.png`、三种 `rank-medal-*`：普通名次行及右侧总星数底框。
- `player-row.png`、`player-level-pill.png`、`star.png`：底部固定的绿色本人排名条、本人总星数底框及星标。
- Weekly、World、Country 三种玩家榜共用 `MetaLeaderboardSource` 取数边界；当前源提供稳定假玩家数据，后续正式玩家数据接入时替换该接口实现，不改页面布局与绘制契约。
- 榜单列表在固定窗口内上下滑动，绿色本人排名条始终固定在底栏上方且不参与滚动；每行由左至右显示名次、头像、玩家名称和总星数，本人不会重复出现在可滚动列表中。
- 动态字号与位置：页签23px、领奖台玩家名35px（108px最大宽）、榜单玩家名30px、总星数29px；前六行使用示意图逐行测量的独立文字、头像和徽章坐标，继续滑动后的行才按130px节距延展。

## Journey

- `background.png`、`top-header.png`、`title-panel.png`、`title.png`：页面结构切片。
- `track.png`、`track-progress.png`、`destination.png`、`current-marker.png`：章节轨道、动态进度和章节终点。
- `episode-01.png` … `episode-10.png`：切图3提供的十章 299×288 圆形章节图；未解锁态叠加 `locked-frame.png` 与 `lock.png`。
- 第1章首页复用 Home V3 正式背景；`home-02.png` … `home-10.png` 生成对应 720×1584 JPG 首页主题。
- `level-card-left.png` / `level-card-active-left.png`：普通与当前关卡卡面。
- `reward-card-right.png` / `reward-card-active-right.png`：普通与当前奖励卡面。
- `reward-time.png`、`reward-rocket.png`、`reward-pulse.png`、`reward-coins.png`、`reward-heart.png`、`reward-complete.png`：里程碑奖励与领取状态。
- `presentation-*`、`title-episode-unlocked.png`、`title-journey-rewards.png`：切图3章节解锁和旅途奖励弹层；两种弹层共用面板和关闭键，但分别使用像素不同的 `presentation-episode-button.png` / `presentation-reward-button.png`，动态数字与说明文字由运行时叠加。
- 运行时按当前关定位初始三卡位置，全部 100 关与奖励沿轨道连续纵向排列；左右箭头不进入 Journey，玩家直接在标题与底栏之间的完整区域上下滑动浏览。海岛背景、海水纹理、轨道、绿色进度、城堡、Segment、卡片与当前标记共用同一刚性滚动位移；背景保持原尺寸纵向循环，轨道按每个 Segment 场景以原尺寸重复，远距离滚动不会露出空白或在城堡下方续接多余轨道。顶部标题与五栏底部导航不参与滚动。滑动越过 7 CSS px 后取消点选；左侧关卡卡在同一卡片内松手后选关，右侧奖励卡或奖励道具图标则打开对应的 `Journey Rewards` 弹层。已通过且未领取时显示可领取按钮并在成功写入存档后发奖；已领取时只显示“已领取”，未解锁时只显示“通过第x关后领取”，后两种状态均不显示按钮。首次进入新章节仍先播放轨道推进与章节解锁。
- `reference.png` 仅作设计核对，不进入运行包，也不承载任何动态文字或示例玩家数据。
- 动态字号为 Level 27px、关卡号47px、PLAY 24px、奖励数量47px；三张可见卡片使用示意图的365/554/736px非等距 y 坐标，并通过连续坐标映射保持上下滑动流畅。

## Collection

- `collection/` 现在完全使用“切图2”的独立正式资源：背景、顶部、标题、卡片、锁定层、选中框、详情框和 11 枚机关图标均不再复用其他页面素材。
- 图鉴将八种颜色的基础色块汇总为一个“色块”条目，并保留11种现役机制；两类内容合并到同一个三列纵向列表，已解锁项在前、未解锁项在后，不使用顶部分类或翻页按钮。机制图包括颜色出口、异形棋盘、异形方块、数字冰块、冰封出口、单层外壳、方块生成器、移动升降台、卷帘、传送带、星标块与星门；卡名、详情标题、正文分别固定为31/35/30px。
- `reference.png` 与 `typography-reference.png` 只用于坐标/字号核对，永不复制到 `public/` 或微信包。
- 逐图尺寸、用途和替换契约见 `collection/README.md`。

## 暂停 / 设置 / 通关 / 状态层

- `overlays/pause-settings/` 保存暂停与设置共用面板、关闭按钮、三个设置图标、开关及底部操作按钮。
- `overlays/win/` 保存通关面板、PERFECT 标题、光芒、金币奖励和继续按钮。
- `overlays/status/` 保存切图3新增的剩余色块底框、超时钟表与数字冰门提示图；面板和按钮继续复用暂停/设置资源，不重复复制。
- 所有运行切片均按源文件原始尺寸逐字节复制；各目录中的 `*-reference.png`、`*-typography-reference.png` 只作设计核对，永不打包。
- 逐图用途与替换契约见两个子目录各自的 `README.md`。

修改同名文件后依次运行 `pnpm art:optimize`、`pnpm art:verify` 和对应页面回归。若需要改变像素尺寸，必须同步修改 `src/game/formalPageLayout.ts`、`art-source/manifest.json` 与测试基准。

字号与位置统一回归命令为 `pnpm test:e2e:formal-typography`：先生成9类界面的720×1584真实截图，再把29个文字区域与仓库内的原始示意图做像素包围框对照，并同时核对 Canvas 字号、锚点、对齐、行距和整画板变换。

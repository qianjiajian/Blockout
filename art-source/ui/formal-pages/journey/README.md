# Journey 正式切图3映射

此目录保存 Journey 运行切片。`pnpm art:optimize` 会把透明 PNG 原尺寸逐字节复制，只有首页主题背景转为 720×1584 的不透明 JPEG。切图3中的完整示意 `解锁/a1.png` 与 `旅途获取/1.png` 未导入，避免把示例文字或完整页面烘入运行时。

## 章节与首页主题

- `episode-01.png` … `episode-10.png`：来自 `切图3/解锁/1.png` … `10.png`，全部保持 299×288 原尺寸和 Alpha，不缩放、不重新编码。
- Journey 第 1 章首页主题直接复用 `ui/home-v3/background.jpg`。
- `home-02.png` … `home-10.png`：来自切图3根目录 `2.png` … `10.png`。运行版为同名 JPG，统一输出 720×1584；其中原始 `2.png` 为 719×1584，仅它会补齐 1px 宽度。
- 上一版 `episode-mission-prep` / `star-voyage` / `penguin-chase` / `ice-rescue` 及同名 Home ImageGen 源稿仅保留回退，不再生成到 `public/`。

## 锁定态与展示弹层

| 运行名 | 切图3来源 | 原尺寸 | 用途 |
| --- | --- | ---: | --- |
| `locked-frame.png` | `旅途/kuang.png` | 299×288 | 未解锁章节统一暗框 |
| `episode-locked-shade.png` | `旅途补充/di.png` | 299×288 | 叠在章节圆图上的未解锁暗色遮罩 |
| `episode-range-panel.png` | `旅途补充/di2.png` | 208×36 | 章节关卡范围文字的独立底板 |
| `episode-selected-button.png` | `旅途补充/anniu1.png` | 155×58 | 当前章节已选中状态按钮 |
| `episode-action-button.png` | `旅途补充/anniu2.png` | 157×58 | 可切换章节的操作按钮 |
| `lock.png` | `旅途/suo.png` | 60×77 | 锁图标 |
| `presentation-panel.png` | `解锁/a3.png` | 671×867 | 章节解锁、旅途奖励共用面板 |
| `presentation-close.png` | `解锁/a2.png` | 94×98 | 展示弹层关闭按钮 |
| `presentation-episode-button.png` | `解锁/a4.png` | 322×125 | 章节解锁弹层主按钮 |
| `presentation-reward-button.png` | `旅途获取/4.png` | 322×125 | 旅途奖励弹层主按钮 |
| `title-episode-unlocked.png` | `解锁/a5.png` | 510×95 | 章节解锁标题 |
| `title-journey-rewards.png` | `旅途获取/5.png` | 518×98 | 旅途奖励标题 |
| `presentation-reward-pulse.png` | `旅途获取/6.png` | 150×148 | 脉冲奖励大图 |
| `presentation-reward-time.png` | `旅途获取/7.png` | 136×144 | 加时奖励大图 |
| `presentation-reward-rocket.png` | `旅途获取/8.png` | 134×153 | 火箭奖励大图 |
| `presentation-reward-heart.png` | `旅途获取/9.png` | 157×140 | 体力奖励大图 |
| `presentation-reward-coins.png` | `旅途获取/10.png` | 243×203 | 金币奖励大图 |

`episode-*` 补充切片与其它透明 PNG 一样由源稿逐字节进入 Web 运行目录，并在微信构建时随章节图放入 `journey-themes` 分包。旧 `locked-frame.png` 继续保留供回退，不因新增遮罩而删除。

现有 `reward-*` 小图继续用于纵向路线卡片；`presentation-reward-*` 只用于领取/解锁后的大弹层。两个主按钮尺寸相同但像素不同，必须分别使用 `episodeButton` 与 `rewardButton`，不能交叉复用。弹层面板、关闭键和按钮均保留 Journey 独立路径，避免以后替换时跨界面联动。

## 路线奖励卡交互

- 每个奖励节点的左侧关卡卡继续负责选关；点击右侧奖励卡或其中的奖励道具图标，才打开对应里程碑的 `Journey Rewards` 弹层。滑动手势一旦越过阈值就取消本次点击，不能在松手时误开弹层。
- 已通过该里程碑且尚未领取时，弹层显示实际关卡、奖励图标与数量，并绘制 `presentation-reward-button.png` 和 `Tap to Claim`；只有主按钮在同一指针于按钮内松手、奖励成功写入存档后，才记为已领取。
- 已领取时仍可从右侧奖励卡打开同一弹层查看奖励，但不绘制 `presentation-reward-button.png`、不保留主按钮点击热区；在既有按钮文字锚点 `(360, 1006)` 使用既有 40px 奖励按钮字样式显示“已领取”。
- 尚未通过该里程碑时，右侧奖励卡同样打开只读弹层，但不绘制按钮、不保留主按钮点击热区；在同一文字锚点与字号显示“通过第x关后领取”，其中 `x` 为该奖励的实际里程碑关卡。
- 关闭键在三种状态下始终可用，关闭查看弹层不得发奖或改写领取记录。完整示意里的 `Level 22`、`Add Time x1` 等仅是参考数据，运行时必须展示所点奖励节点的真实内容。

已解锁章节的 `Use` 只打开由上述正式切片组成的 `Episode Unlocked!` 弹层，不立即更换主题或离开 Journey。关闭键取消且不改变当前主题；只有点击 `Tap to Continue`、成功加载并持久化所选主题后才跳转 Home。十章均复用本目录已登记的正式章节图和对应 Home 背景，不生成或新增替代资源。

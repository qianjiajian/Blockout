# 暂停 / 设置正式切图替换表

本目录来自“切图2/暂停”和“切图2/设置”。两种界面共用同一套面板、关闭按钮、设置图标和开关；运行切片按源文件逐字节复制，保持原始尺寸和 Alpha，禁止拉伸、缩放或重新编码。

| 文件 | 原始尺寸 | 用途 |
|---|---:|---|
| `panel.png` | 594×889 | 暂停与设置共用弹窗底板 |
| `close.png` | 94×98 | 右上角关闭 |
| `sound.png` | 75×61 | 声音图标 |
| `haptic.png` | 90×80 | 震动图标 |
| `reduced-motion.png` | 88×77 | 特效/简化动效图标 |
| `toggle-on.png` / `toggle-off.png` | 111×53 | 开 / 关状态 |
| `replay-button.png` | 225×84 | 暂停界面重新开始 |
| `home-button.png` | 225×84 | 暂停界面返回主页 |
| `clear-progress-button.png` | 448×84 | 设置界面清除进度 |

`pause-reference.png`、`pause-typography-reference.png`、`settings-reference.png`、`settings-typography-reference.png` 只用于位置和字号核对，永不进入 `public/` 或微信发行包。

720×1584逻辑画板的动态文字规格为：标题60px，暂停锚点 `(360, 375)`、设置锚点 `(360, 381)`；“声音/震动/动效”46px、左对齐 x=263、锚点 y=586/716/848；底部操作文字36px、锚点 y=1065。暂停页按钮中心 x=228.5/492.5，设置页清除进度按钮中心 x=360；这些锚点均已按各自示意图补偿 Canvas `middle` 基线。

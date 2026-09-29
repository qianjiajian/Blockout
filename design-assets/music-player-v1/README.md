# 音乐播放器资源预览

这些是按播放器界面预览生成的独立资源，运行时按需加载并分别绘制；整屏预览图只作设计参考。

| 文件 | 用途 | 格式 | 透明背景 |
|---|---|---|---|
| `music-background.png` | 音乐播放器独立背景层 | PNG 941×1672 | 否 |
| `music-player-deck.png` | 播放器内层面板 | PNG（透明） | 是 |
| `music-vinyl-disc.png` | 可独立旋转的黑胶唱片与唱片内圈 | PNG 1254×1254（透明） | 是 |
| `music-vinyl-tonearm.png` | 静态金属唱针、唱臂与底座 | PNG 1254×1254（透明） | 是 |
| `music-progress-track.png` / `music-progress-fill.png` / `music-progress-knob.png` | 播放进度条拆分资源 | PNG（透明） | 是 |
| `music-row-selected.png` / `music-row-locked.png` | 歌曲卡片背景 | PNG（透明） | 是 |
| `music-status-unlocked.png` / `music-status-locked.png` | 状态按钮底图 | PNG（透明） | 是 |
| `music-lock-icon.png` / `music-equalizer-icon.png` | 锁定和播放状态图标 | PNG（透明） | 是 |
| `music-entry-icon.png` | 主界面音乐入口图标 | PNG 1254×1254 | 是 |
| `music-panel-frame.png` | 播放器内容面板外框 | PNG 1024×1536 | 是 |
| `music-header-banner.png` | “背景音乐”标题横幅底图，文字由界面绘制 | PNG 2172×724 | 是 |
| `music-close-button.png` | 关闭按钮 | PNG 1254×1254 | 是 |
| `music-play-button.png` | 播放/暂停按钮 | PNG 1254×1254 | 是 |
| `music-skip-button.png` | 下一首按钮 | PNG 1254×1254 | 是 |
| `album-desert-dawn.png` | 沙漠晨曦专辑封面 | PNG 1254×1254 | 否 |
| `album-lighthouse-bay.png` | 海湾灯塔专辑封面 | PNG 1254×1254 | 否 |
| `album-starry-journey.png` | 星空旅途专辑封面 | PNG 1254×1254 | 否 |
| `album-forest-stream.png` | 森林溪流专辑封面 | PNG 1254×1254 | 否 |

控制按钮和入口图标为透明 PNG，方便叠加到现有界面；标题文字、歌曲名称和解锁条件建议由代码绘制，后续替换素材时不需要重新生成文字图片。

| `music-prev-button.png` | 上一首按钮 | PNG 1254×1254 | 是 |
| `music-volume-icon.png` | 音量图标 | PNG 1254×1254 | 是 |

`preview-mockup.png` 是整屏预览图，仅用于设计参考，不作为运行时资源。背景、面板、横幅、按钮和专辑图均保持独立文件，便于后续替换。

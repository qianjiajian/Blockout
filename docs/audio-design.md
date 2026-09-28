# 《Block Out!》音频设计

游戏音频采用两首分场景背景音乐、11 组原创立体声音效与 4 组用户指定音效。运行时只按当前场景加载对应音乐，并在主界面与挑战之间切换时释放非活动音乐的解码缓冲，避免两首长音乐约 100 MB 的 PCM 同时驻留；素材尚未解码或旧版微信 WebAudio 不支持缓冲播放时，会自动使用同语义的合成音作为降级方案，不阻塞操作。

## 背景音乐

- 主界面曲 `Happy Carnival`（Alex-Productions）：用于 Home、商店、排行榜、Journey、Collection、关卡列表、设置等所有关卡挑战外页面。保留完整 148.178 秒、48 kHz 立体声；去除内嵌封面与冗余标签，并以 LAME VBR V3 优化为 3,388,560 字节，比用户提供的 6,135,456 字节缩小 44.77%。菜单播放增益由 0.32 调至 0.24，以匹配旧菜单音乐的听感响度并避免遮盖按钮音效。
- 挑战曲 `Happy Foods (Happy Ukulele)`（Infraction）：用于正式游玩、危险倒计时、胜利和失败等关卡挑战场景。源文件本身已是精简的 48 kHz 立体声 VBR MP3；仅逐帧移除 45 字节 ID3 编码器标签，所有音频帧及解码 PCM 与用户文件完全一致，运行文件为 1,297,152 字节、126.016 秒。挑战播放增益按响度差降至原来的约 62%，避免盖住移动、机关和消除音效。
- 常规游玩、剩余 20 秒危险状态、胜利与失败沿用挑战曲但采用不同动态混音；暂停、结算写入失败、应用退后台时静音。
- 主界面优化母带：`art-source/audio/happy-carnival.mp3`；运行素材：`public/assets/audio/happy-carnival.mp3`
- 挑战优化母带：`art-source/audio/happy-foods.mp3`；运行素材：`public/assets/audio/happy-foods.mp3`

`Happy Foods` 的首尾均为零采样，不会在循环点产生爆音；原作开头约 0.54 秒、结尾约 1.92 秒为安静段，因此完整曲目循环时会保留约 2.46 秒的自然停顿。

`Happy Carnival` 的来源文件元数据标注为 CC BY 3.0，并要求保留以下完整署名；同时注明非 YouTube 项目应联系作者，因此游戏正式发布前还需确认项目使用授权：

> Happy Carnival by Alex-Productions https://soundcloud.com/alexproductionsmusic  
> Creative Commons — Attribution 3.0 Unported — CC BY 3.0  
> Free Download / Stream: https://bit.ly/3uAqwbI  
> Music promoted by Audio Library https://bit.ly/49AFcq7

用户提供的 `Happy Foods` 文件没有携带许可文本。Infraction 官方曲目页面与 InAudio 许可页将游戏、应用列为支持用途，但商业项目需要适用的 InAudio 订阅或项目许可；正式发布前必须获取并留存授权文件。项目内保留以下来源记录：

> Music from #InAudio: https://inaudio.org/  
> Track: Happy Foods (Happy Ukulele)  
> Artist: Infraction  
> Source: https://www.youtube.com/watch?v=ovoY5W8sIvU

## 交互节点与音效

| 音效 | 精确触发节点 | 听感目标 |
| --- | --- | --- |
| `button` | 普通按钮确认、弹窗开关、设置切换、底部五栏切页 | 使用用户指定的 `click.mp3` |
| `putdown` | 色块实际开始拖动后松手落位；单纯点按、取消手势和成功消除不触发 | 使用用户指定的 `putdown.mp3` |
| `blocked` | 条件不满足、锁定内容、存档操作失败、错误出口 | 低沉闭合感，只用于明确的操作拒绝 |
| `exit` | 方块通过匹配出口并被消除 | 使用用户指定的 `xiaochu.mp3` |
| `ice` | 冰层剥落或冰封出口拒绝 | 晶体碎裂，高频但经过混音衰减 |
| `thaw` | 冰冻色块或冰冻出口的计数归零并正式解冻 | 使用用户指定的 `sui.mp3`；只在成功解冻时播放 |
| `mechanic` | 机关状态被成功推进或解锁 | 继电器式确认，配合机关粒子脉冲 |
| `time` | 加时道具实际生效 | 双点计时提示后上扬 |
| `rocket` | 火箭确认目标并移除方块 | 点火、加速、命中三段式反馈 |
| `pulse` | 脉冲道具实际削减机关进度 | 低频扩散与能量回收感 |
| `booster` | 其余通用道具实际生效 | 能量充入，不与三类专属道具混淆 |
| `reward` | 商店购买写入成功、旅程奖励领取、主题应用 | 明亮三音确认，只在事务提交后播放 |
| `unlock` | 新道具解锁提示出现 | 较长的展开式音阶，强调新能力 |
| `win` | 关卡结算成功写入后 | 完整胜利乐句，与结果页同时到达 |
| `fail` | 倒计时结束且失败态建立 | 下行收束，不制造尖锐惩罚感 |

界面中的“音乐”开关同时控制背景音乐与交互音效。关闭后全部音频立即静音；再次开启沿用同一个音频上下文，避免移动端重复创建音频设备。

方块按下选择、普通拖动过程和拖动碰撞不播放声音，只有实际拖动后的松手落位播放一次 `putdown`；碰撞仍可在开启触觉反馈时提供限频的轻震动。

## 生成与验收

- `pnpm audio:build`：用固定种子重新生成全部 WAV 音效，并逐字节复制两首已优化的用户背景音乐；不再重新编码音乐。
- `pnpm audio:verify`：校验音效、两首背景音乐的来源/运行哈希、压缩记录、循环时长，并确保两首旧音乐没有残留。
- `pnpm build:wechat`：挑战音乐与音效进入 `audio` 分包，完整菜单音乐进入独立 `menu-music` 分包；两包分别执行 4 MiB 门禁与逐文件校验。

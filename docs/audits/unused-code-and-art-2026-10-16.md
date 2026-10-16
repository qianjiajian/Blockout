# 未正式使用的代码与美术资源审计

审计日期：2026-10-16  
适用规则：`docs/rules/mechanism-rules-v1.198.0.md`  
审计性质：只读盘点；本次没有删除文件、修改注册表或改动运行逻辑。

这里把“正式使用”定义为：能从正式 Web、微信或棋盘编辑器入口到达，或被当前运行时资源加载器明确加载。测试、工具、历史候选、来源追溯和设计稿不算正式运行消费者，但不能因此直接删除。

## 规则与入口核对

- `node tools/verify-rules-lock.mjs`：通过。
- 正式入口：`index.html -> src/web.ts -> src/game/ColorEscapeGame.ts`、微信入口 `src/wechat.ts`、编辑器入口 `board-editor.html -> src/editor/boardEditor.ts`。
- `src/**/*.ts` 共 331 个；从上述入口做静态 import 图后，282 个可达，49 个没有被正式入口直接或间接引用。下面的代码清单就是这 49 个候选。
- “不可达”只说明没有进入当前正式入口图；其中一部分仍被测试、审计脚本或证据生成流程使用，建议先归档或加用途标记，不要直接删除。

## 代码候选

### 1. 测试、脚本、旧活动或分析代码

```text
src/core/blockOutDifficulty.ts
src/core/campaignBlueprints.ts
src/core/campaignComposition.ts
src/core/campaignDifficultyOverrides.ts
src/core/campaignExpansion.ts
src/core/campaignStrategyLayouts.ts
src/core/levelDesignSummary.ts
src/core/levelOriginality.ts
src/core/levelStrategyMetrics.ts
src/core/economyBalance.ts
src/core/localLeaderboard.ts
src/core/solutions.ts
src/core/dailyChallengeCatalogV3.ts
src/core/dailyChallengeVariant.ts
src/core/mechanismKindParity.ts
src/core/paletteAwareExitContractAudit.ts
src/core/revisedCandidateAudit.ts
src/core/revisedLevelSearch.ts
src/core/revisedRepositionFloor.ts
src/game/blockConnectors.ts
src/game/blockingFocus.ts
src/game/suppliedRevealArt.test.ts
```

### 2. 未进入当前正式 `LEVELS` 的旧版或候选关卡数据

```text
src/core/chapterFourVideoLevels.ts
src/core/chapterFourCertifiedLevels.generated.ts
src/core/chapterOneCompetitorLevels.ts
src/core/chapterOneScore80Levels.ts
src/core/chapterOnePilotLevels.ts
src/core/competitorConstrainedCampaign.ts
src/core/competitorConstrainedLevels.generated.ts
src/core/expandedDensityCampaign.ts
src/core/expandedDensityLevels.generated.ts
src/core/formal201to205Data.ts
src/core/formalLeagueCandidateData.ts
src/core/leagueTestLevel.ts
src/core/videoParityBaseLevels.generated.ts
src/core/rejected211to220Rim.ts
```

### 3. 只由测试或工具使用的修复/合同批次

```text
src/core/competitorExitStructuralBatchB.ts
src/core/competitorLateExitContracts101To200.ts
src/core/competitorLateExitStructuralBatchF.ts
src/core/competitorLateExitStructuralBatchG.ts
src/core/competitorLateExitStructuralBatchH.ts
src/core/competitorLateMechanismStructuralBatchK.ts
src/core/competitorLateShutterContracts1To100.ts
src/core/competitorLateShutterStructuralBatchD.ts
src/core/competitorMidExitStructuralBatchE.ts
src/core/competitorShutterStructuralBatchC.ts
src/core/competitorSingleFieldContractBatchI.ts
src/core/openingCompositionFaithfulnessRepairs.ts
```

这些文件仍可能是规则证明、回归审计或候选生成所需的证据源；清理前应先确认对应测试和工具是否已经迁移。

### 4. 根目录临时脚本

按 `.tmp-*`、`tmp-*`、`.codex-*` 及若干一次性脚本名统计到 382 个代码文件，约 36,039,973 字节（约 34.4 MiB）：

- `.tmp-*`：170 个，约 15,046,035 字节。
- `tmp-*`：194 个，约 20,966,818 字节。
- `.codex-*`：18 个，约 27,120 字节。

它们不属于 `package.json`、Vite、Web 或微信正式入口，但部分是证据生成器。较大的例子包括：

```text
tmp-121.cjs                         5,286,998 B
.tmp-l10now.cjs                     4,821,288 B
.tmp-levels.cjs                     4,820,794 B
.tmp-levels10.cjs                   4,820,794 B
tmp-current-levels.cjs              4,683,180 B
tmp-levels-formal.cjs               4,405,862 B
tmp-levels.cjs                      4,315,457 B
tmp-competitorConstrainedLevels.generated.cjs  1,325,454 B
```

建议先把可复用的审计脚本移到 `tools/`，把一次性输出脚本和已过期候选移到带日期的归档目录，再删除确认无证据引用的文件。

## 美术资源候选

### 1. 明确退役、当前没有正式运行消费者

| 资源 | 数量/约大小 | 依据 |
| --- | ---: | --- |
| `public/assets/art/ui/daily-challenge-v1/` | 3 / 86,378 B | `src/game/artManifest.ts` 的 `LEGACY_DAILY_CHALLENGE_ART_URLS`；当前使用 supplied-v1 |
| `public/assets/art/ui/daily-challenge-v2/` PNG | 11 / 1,086,010 B | 同上；微信资源策略列为旧版本 |
| `public/assets/art/ui/league-video-v1/` 的 row、self-row、score-token、coin-reward、bronze 至 glory | 12 / 2,970,204 B | `LEGACY_LEAGUE_TROPHY_ART_URLS`；当前使用 supplied-v1/rank-badges-v2 |
| `public/assets/art/ui/formal-pages/shop/` | 7 / 208,704 B | 当前福利站由 `src/game/welfareSuppliedArt.ts` 的 shop-supplied-v1 提供 |
| `public/assets/art/ui/formal-pages/booster-purchase-reference-v1/panel.png` | 1 / 1,707,965 B | `LEGACY_SUPPLIED_POPUP_ART_URLS` |
| `public/assets/art/ui/formal-pages/life-refill-reference-v1/panel.png` | 1 / 743,283 B | 当前补给弹窗复用 booster purchase 资源 |
| `public/assets/art/ui/profile-reference-v1/` | 32 / 254,294 B | 当前头像/头像框路径改为 supplied 版本 |
| `public/assets/art/ui/profile-unlocks-v1/avatar-15.png` 至 `avatar-19.png` | 5 / 53,947 B | `profileAvatarPath` 只有 20–24 仍使用该目录 |
| `public/assets/art/ui/profile-unlocks-v1/frame-9.png` 至 `frame-18.png` | 10 / 41,505 B | 当前头像框统一从 `profile-frames-supplied-v1` 加载 |
| `public/assets/art/gameplay/mechanics/revised-reference-v1/shutter-strip.png` | 1 / 29,975 B | 九切片 `src/game/shutterNineSlice.ts` 已替代旧单条素材 |

这些资源可以保留作历史追溯，但已经具备较强的退役证据。

### 2. 源码声明但没有当前加载调用，需人工确认

```text
public/assets/art/ui/formal-pages/journey/episode-locked-shade.png
public/assets/art/ui/formal-pages/journey/lock.png
```

它们只在 `src/game/artManifest.ts` 声明；当前 Journey loader 没有请求，建议先标记为“保留源稿/未加载”，确认页面合同后再决定是否归档。

### 3. `art-source` 中明确只作回退或设计参考

```text
art-source/gameplay/connectors/              # 8 个，上一版连接件，仅回退
art-source/gameplay/gates/                  # 8 个，上一版出口母版
art-source/ui/home-v2/                      # 含 reference-layout，上一版首页
art-source/ui/journey/journey-track-v1.png  # 旧十节点路线
art-source/fx/exit-suction-trail-v1.png     # 历史源稿，不进 manifest
art-source/references/gameplay-v1/          # 版式/字号/拼接核对
```

以下背景图也是旧版本回退候选，未出现在 `art-source/manifest.json` 的 runtime 条目中：

```text
art-source/backgrounds/gameplay-lab-v1.png
art-source/backgrounds/gameplay-lab-v2.png
art-source/backgrounds/home-lab-v1.png
art-source/backgrounds/home-lab-v1-runtime-backup.jpg
art-source/backgrounds/home-lab-v2.png
art-source/backgrounds/home-lab-v2-runtime-uncompressed-backup.png
```

### 4. 源目录明确标记为 source-only / explicitly unused 的图

```text
art-source/ui/formal-pages/mechanism-guide-v2/unused-icon-bomb.png
art-source/ui/formal-pages/mechanism-guide-v2/unused-icon-color-floor.png
art-source/ui/formal-pages/mechanism-guide-v2/unused-icon-flip-gate.png
art-source/ui/formal-pages/mechanism-guide-v2/unused-icon-toggle-block.png
art-source/ui/formal-pages/collection-album-v3/unused-panel-di0.png
art-source/ui/formal-pages/mechanism-guide-v2/close.png
art-source/ui/formal-pages/mechanism-guide-v2/reference-layout.png
```

依据是对应目录 README 的 source-only/explicitly unused 标记。`collection-album-v1/` 与 `collection-album-v2/` 中被 V3 取代的旧 tabs、cards、lock、mask、detail-close 等切片也属于归档候选，恢复时需要回滚整套 URL 合同。

### 5. 音频源稿（附带盘点）

```text
art-source/audio/provided-sfx/history/loss-20261009-ccd7ec32eb0c.mp3
art-source/audio/music-library/source/*.mp3
art-source/audio/sfx/*.wav
```

这些不是 Web/微信运行时文件：运行时加载的是 `public/assets/audio/...` 下的 MP3。WAV 和 source MP3 应作为来稿/版权追溯保留，不能与正式运行资源混列。

## 不要误删的资源

- `public/assets/art/ui/profile-unlocks-v1/avatar-20.png` 至 `avatar-24.png` 仍由动态头像路径加载。
- `public/assets/art/ui/profile-frames-supplied-v1/frame-0.png` 至 `frame-18.png` 是当前正式头像框。
- `art-source/gameplay/mechanics/revised-reference-v1/` 除 `shutter-strip.png` 外仍可能按关卡动态加载。
- `public/assets/audio/sfx/*.mp3` 和 `public/assets/audio/music-library/*.mp3` 仍被 Web/微信运行时目录使用。
- `formal-border-v1` 等编辑器/回退资源不能只因不在主页面入口就判定为未使用。
- `design-assets/music-player-v1/` 虽然当前公共运行目录缺少对应目录，但源码仍声明并使用其路径；这是“可能缺失/未接线”，不是安全的未使用资源。

## 验证限制

- `pnpm run art:verify` 在现有工作树的资源清单漂移处失败：`life-refill-reference-v1/panel.png` 仍被校验器要求，但当前 manifest/策略已把它视为旧资源。
- `node tools/audit-wechat-resource-usage.mjs` 在构建 manifest 与当前源码 hash 不一致处失败，未进入完整资源审计。

因此本报告采用静态入口图、源码引用、资源 manifest、README 和资源策略交叉核对；验证失败反映现有清单/构建状态需要后续修复，不代表本报告中的候选都可以立即删除。

## 建议的清理顺序

1. 先把根目录临时脚本按“证据生成器 / 可复用工具 / 一次性输出”分类并登记用途。
2. 对上面的高置信退役资源建立归档清单，确认没有历史合同或发布包回滚需求后再移出运行资源目录。
3. 对 49 个不可达 TS 文件逐项检查测试和工具引用，先迁移证据再删除。
4. 修复 art manifest 与构建 manifest 漂移后，再重新运行资源审计；在此之前不批量删除。

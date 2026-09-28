# Lv21 局部修复候选 C：看图与通关验证记录

更新时间：2026-09-22（北京时间）。规则 v1.4.0；runtime `revised-2026-09-21-v1.2`。

## 授权与范围

用户回复“可以”，批准保留Lv21已认可轮廓、满铺、块数和机制配额，在隔离候选中局部重排并重新交图。原草案B、其他9关、正式LEVELS及存档均未修改。未获正式替换授权。

输入：`deliverables/revised-opening-layouts-lv021-030-2026-09-21T15-22-04-725Z/review.json`，由原视觉认可回执绑定。B版规范化level SHA=`1dbe3da805d7e00d18f1b03e1a57b3f6cf2b6fee77423b6694a4a59567306920`，已证明红条消除后只有蓝块上下往返。

候选C规范化level SHA=`a1cd3a275f0d5690b02bba3a43fdab2af7774b77604c953c835f48cc6c0f5868`。

最新交付目录：`deliverables/revised-lv021-local-repair-2026-09-21T15-58-53-028Z/`。

- `index.html` / `comparison.png`：原B与候选C并排对比。
- `before.png` / `after.png`：真实游戏画布棋盘图。
- `candidate.json` / `route.json`：完整隔离候选与已回放路线。
- `opening-full.png` / `step-*.png` / `complete.png`：真实Pointer过程截图。
- `review.json`：来源/代码/美术/候选绑定、逐项差异、静态检查、完整模型与浏览器回放，以及独立下界预算结果。

15-54-31目录为同一几何的39拖/11非清除路线中间版，保留证据，但最新交付以15-58-53的38拖/10非清除路线为准。

## 实际变化

- 保留确切6×9、50格轮廓；保持左右及上下对称、连通且无内部孤岛墙。
- 出口和三道卷帘的完整配置逐项不变。仍2普通出口、3冰门2/6/13；卷帘10/17/19，隐藏批量4/4/2。
- 下部9个色块局部重铺，维持上部其余形状与10个隐藏块的几何。9个下部块仍沿用各自颜色和外壳属性。
- 普通6层冰从开局a01调至左侧10次卷帘中的普通h10-03，未揭开前不减数。2层冰仍绑定a02外壳。仍2个冰块、4个外壳，不是删除冰或额外隐藏开局块；按v1.3/v1.4已批准的同关承载阶段重排执行。
- 14开局/24全关；可见块占36格＋真实卷帘14格＝50/50满铺。异形比例4/14、4/24；初始同色正交相邻0。
- 复用现有正式块素材，32个形状/颜色/外壳层需求加载完整；没有生成新美术或修改资源。绿色2×3使用既有`green-rectangle-2x3.png`的星纹图案，数据不是星标块、未新增星门机制；图片核对时需注意这一既有视觉样式。

## 已执行验证

1. 规则锁：active v1.4.0、6不可变版本PASS。
2. `node --test tools/verify-rules-lock.test.mjs tools/revised-opening-coverage.test.mjs`：21/21 PASS。
3. `pnpm exec vitest run tests/revisedCandidateAudit.test.ts tests/revisedLevelSearch.test.ts tests/revisedRepositionFloor.test.ts`：3文件65项PASS。
4. 新工具`tools/review-revised-lv21-repair.mjs`：核对原回执/源绑定，固定批准mask，静态/满铺/冰壳同体/素材审计通过，再独立新建模型重放输入路线。对已知7次腾挪的可解候选运行时，按预期拒绝，不产生通过图集。
5. 新候选先39拖/11非清除真实Pointer完整通过，再对独立搜索找到的更短路线重新执行：**38次有效拖动、28次清除事件、10次非清除拖动，24块全部清空**。28次清除包含4次剥层，未把剥层算成新块。
6. Chromium真实鼠标按每条路径逐格操作，每拖后与独立模型完整空间快照一致；无页面异常，无Storage/IndexedDB访问。完成图与初始图已亲看。对比页390px视口不横向溢出。
7. 输入源码/资源前后绑定无漂移；三个保护文件SHA未变。没有运行与本隔离布局无关的Web/WeChat发布构建、没有capture freeze。

## 不得算作通过的事项

- **必要腾挪≥10仍未认证。** 独立`checkRevisedRepositionFloor`预算15,000状态/2,000,000 transitions/60秒，实际2,447 explored、15,000 discovered、703,247 transitions、36.21秒后max-states，结果unknown。没有发现更短路线不等于证明下界。可解路线恰好10次只给出一个上界，不给出下界。
- 尝试删除原11个非清除动作并重新寻路，没有形成更短完整通关；12种搜索排序找到38拖/10次路线。这些都是有限探针，不是完整证明。
- 时间/三星未标定。300秒仅继承隔离实验时限；自动化操作时长不能当作真人时间系数。
- 全季机制首次引入证据及旧完整artifact工具向v1.4迁移仍未收口。本工具明确只是局部修复预览/回放，不绕过正式发证门禁。
- `lowerBoundCertified/timeValidated/fullCandidateValidated/layoutApprovedByUser/gameplayAccepted/releaseApproved`均false。浏览器回放不是手机实机验收。

## 下一步

先由用户核对候选C的新摆放，保留原B。随后补足候选C的严格必要腾挪下界与时间/三星门禁，完成后再继续后续关卡。若找到真实少于10的路线，须拒收或局部修复C，不能因本次图片/通关验证通过而降低门槛。正式替换仍需完成当前约定的全部验收与用户授权。

下界原始证据：`.codex-temp/lv21-repair-gates/from-nine/floor/result-1869820386.json`；独立重排/短路审计：`.codex-temp/lv21-repair-blocks/target-1869820386-independent-audit.json`。下界JSON已嵌入最新交付review，避免仅依赖临时文件。

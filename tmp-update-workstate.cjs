const fs=require('fs');const p='docs/rules/WORKSTATE.md';let s=fs.readFileSync(p,'utf8');const section=[
'## 201–210最新难度重生成（2026-09-29，活动v1.123.0）','',
'- 201–210已按最新十关节奏生成隔离候选：简/普/普/难/简/普/难/简/普/超；候选必挪下界目标为5/12/11/17/5/12/17/5/11/21，完整路线U为7/13/15/19/7/13/19/7/15/29，三星拖数为37/31/34/41/36/31/41/37/34/70。',
'- `src/core/formal201to210Data.ts`提供十关候选，`src/core/remake201to210.ts`导出十关隔离集合；因v1.118历史接受范围，独立正式隔离记录仍仅201/210，生产`LEVELS`及边界仍为200。',
'- 当前v1.5 `replayRevisedRoute`对十关候选均为`valid=true`、`complete=true`；证据为`deliverables/continue201-210-20260929/routes-v123.json`和`tests/fixtures/remake201-210-v123.json`。201/205旧`simple-candidates/routes.json`含计时炸弹元数据，不能作为当前候选回放证据；当前候选已按v1.5可验证字段保存，来源事实与适配差异仍分列。',
'- 下界报告`lower-bound-v123-simple.json`、`lower-bound-v123-seven.json`、`lower-bound-v123-210.json`均记录`threshold-proven`；空间搜索只证明对应静态机制抽象，不等同双屏Pointer、自然时钟或正式三星结算。',
'- 测试：`tests/remake201to210.test.ts` 12/12通过；生产边界未改，未进行正式接入、打包或发布。','',
].join('\n');if(!s.includes('## 201–210最新难度重生成'))s=section+s;fs.writeFileSync(p,s);

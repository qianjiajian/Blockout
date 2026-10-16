const fs=require('fs'); const p='AGENTS.md'; let s=fs.readFileSync(p,'utf8');
s=s.replace('当前活动规则：`docs/rules/mechanism-rules-v1.122.0.md`。修正211–220既定难度节奏与必挪区间；正式边界仍为200，旧证据和存档保持，不发布，活动版本以manifest为准。','当前活动规则：`docs/rules/mechanism-rules-v1.123.0.md`。201–210按最新十关难度节奏生成隔离候选；正式边界仍为200，旧证据和存档保持，不发布，活动版本以manifest为准。');
s=s.replace('2. 完整阅读该版本文档。当前为 `docs/rules/mechanism-rules-v1.122.0.md`（211–220难度节奏与必挪口径修正，承继v1.121）。','2. 完整阅读该版本文档。当前为 `docs/rules/mechanism-rules-v1.123.0.md`（201–210最新十关难度节奏与必挪口径，承继v1.122）。');
const marker='## 不得自行放宽的规则\n\n';
const bullet='- v1.123优先：201–210按简/普/普/难/简/普/难/简/普/超，必挪区间分别为5–10、11–15、11–15、16–20、5–10、11–15、16–20、5–10、11–15、21–30；当前候选下界/路线目标为5/12/11/17/5/12/17/5/11/21，完整路线U为7/13/15/19/7/13/19/7/15/29，三星拖数独立。十关仅隔离候选，201/210保留已接受正式隔离记录，正式LEVELS及活动边界仍为200；下界/路线证据、双屏Pointer、自然钟和正式三星结算完成前不接入、不发布。\n\n';
if(!s.includes('- v1.123优先')) s=s.replace(marker,marker+bullet); fs.writeFileSync(p,s);

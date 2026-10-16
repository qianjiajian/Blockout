import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const[acceptanceFile,output]=process.argv.slice(2);
if(!acceptanceFile||!output)throw Error('Usage: node export-accepted-gallery.mjs final-acceptance.json new-directory');
const sha=b=>createHash('sha256').update(b).digest('hex');
const acceptedBytes=await fs.readFile(acceptanceFile),accepted=JSON.parse(acceptedBytes);
assert.equal(accepted.formalReady,true);assert.equal(accepted.status,'FORMAL_100_ACCEPTED_NOT_PUBLISHED');
assert.equal(accepted.formalPointerScreens,200);assert.equal(accepted.modelVerified,100);
assert.equal(sha(await fs.readFile('src/core/leagueLevelData.ts')),accepted.inputSha256['src/core/leagueLevelData.ts']);
const source=path.dirname(accepted.visualFile),visual=JSON.parse(await fs.readFile(accepted.visualFile));
assert.equal(sha(await fs.readFile(accepted.visualFile)),accepted.inputSha256[accepted.visualFile]);
assert.equal(visual.evidence.length,100);
await fs.mkdir(output,{recursive:false});await fs.mkdir(path.join(output,'images'));
for(const row of visual.evidence){
 const proof=accepted.model.rows.find(r=>r.index===row.index);assert.equal(row.levelSha256,proof.levelSha256);
 const bytes=await fs.readFile(path.join(source,row.image));assert.equal(sha(bytes),row.imageSha256);
 await fs.writeFile(path.join(output,row.image),bytes,{flag:'wx'});
}
let html=await fs.readFile(path.join(source,'index.html'),'utf8');
html=html.replaceAll('荣耀联赛 · 当前候选开局审查','荣耀联赛 · 100关正式布局图').replaceAll('荣耀联赛候选开局审查','荣耀联赛正式布局图')
 .replace(/<div class="banner">[\s\S]*?<\/div>/,'<div class="banner">100关已接入正式数据，并通过200次双屏通关验证。困难80关、超难20关；L为已证明的必挪下界，U为完整通关路线的必挪次数。<p>已知界面问题：部分高棋盘会遮住顶部积分提示，截图保留实际显示。</p></div>')
 .replaceAll('个候选','个关卡').replaceAll('当前候选真实开局','正式关卡真实开局')
 .replace(/<small>raw 状态 \d+ · 积分块 (\d+)<\/small>/g,'<small>积分块 $1 · 成功通关30分</small>')
 .replace('筛选关号、主线来源或机制','输入关号，或机制名称')
 .replace("c.hidden=!c.dataset.search.includes(e.target.value.trim())","c.hidden=/^\\d+$/.test(e.target.value.trim())?Number(c.dataset.index)!==Number(e.target.value.trim()):!c.dataset.search.includes(e.target.value.trim())")
 .replace('</style>','.toolbar{flex-wrap:wrap}input{min-width:0;width:min(360px,100%)}@media(max-width:480px){main{padding:16px}h1{font-size:24px}.grid{grid-template-columns:1fr}} </style>');
await fs.writeFile(path.join(output,'index.html'),html,{flag:'wx'});
await fs.writeFile(path.join(output,'provenance.json'),JSON.stringify({status:accepted.status,acceptanceFile,acceptanceSha256:sha(acceptedBytes),
 count:100,formalPointerScreens:200,sourceCapture:source,note:'Images were captured from exact candidate objects before adoption; final acceptance verifies identical formal objects and 200 formal Pointer runs. Images are copied without editing.',
 productionSha256:accepted.inputSha256['src/core/leagueLevelData.ts'],images:visual.evidence},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,count:100,gallery:path.join(output,'index.html'),formalPointerScreens:200}));

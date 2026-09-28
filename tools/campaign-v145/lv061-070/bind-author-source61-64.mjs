import fs from 'node:fs';
import assert from 'node:assert/strict';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {shapeClass} from '../../remake31to40-source-v141.mjs';
const file=process.argv[2],data=JSON.parse(fs.readFileSync(file)),{level}=data;
const root='deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64';
if(level.id===63){data.originality={layoutIntent:'规则矩形内重组多格块邻接，固定轴向的行列形成相互阻挡的交叉工作区。',alignment:'横向条形块与原向L形块按原图格边对齐，保48格完整矩形满铺。',changes:'18块重新铺设、8色门位置重配，三件L3同面积矩形化满足异形比例；非竞品整体镜像或换色。',constraints:'四个轴向块必须与各自出口保持固定通行行列，18块8异形源超比例最少换3块。'};data.design={primaryMechanism:'固定轴向的行列通路与逐步解冻的八色出口',concreteDecision:'先为低计数门对应块打开工作位，同时避免四个轴向块锁住后续高冰色通路；外壳解开后须重新安排青色内芯。'};}
const images=level.id===61?['deliverables/remake61-70-v146-20260924/source-audit/lv61-0.png',...['0015','0034','0060','0072'].map(n=>`.codex-temp/video-audit-41-70/frames-61-70/frame-${n}.jpg`)]:level.id===63?['.codex-temp/video-audit-41-70/frames-61-70/frame-0172.jpg']:['0097','0107','0111','0148','0152','0153'].map(n=>`.codex-temp/video-audit-41-70/frames-61-70/frame-${n}.jpg`);
const bindings=Object.fromEntries(images.map(p=>[p,digest(fs.readFileSync(p))]));
const rows=[];
for(const stage of data.source.stages)for(const src of stage.items){const b=level.blocks.find(b=>b.id===`v146-${level.id}-${src.sourceId}`);assert(b,'Missing source body '+src.sourceId);assert.equal(b.color,src.color);for(const k of ['movementAxis','frozen','layers'])assert.deepEqual(b[k],src[k],src.sourceId+' '+k);
 const adapted=data.adaptations.find(a=>a.sourceId===src.sourceId);assert.equal(shapeClass(b.shape),adapted?.to??src.kind);
 if(stage.id==='opening')assert(!b.shutterId&&!level.generators?.some(g=>g.queueBlockIds.includes(b.id)));
 else if(stage.id.startsWith('cover')){assert.equal(b.shutterId,`v146-${level.id}-${stage.id}`);assert.equal(level.shutters.find(s=>s.id===b.shutterId).count,stage.count??Number(stage.id.split('-')[1]));}
 else assert(level.generators.some(g=>g.queueBlockIds.includes(b.id)));
 rows.push({sourceId:src.sourceId,blockId:b.id,stage:stage.id,sourceKind:src.kind,designKind:shapeClass(b.shape),color:b.color,movementAxis:b.movementAxis??null,frozen:b.frozen??null,layers:b.layers??null,matched:true,adaptation:adapted??null});
}
assert.deepEqual(level.gates.map(g=>[g.color,g.frozen??0]).sort(),data.source.gates.map(g=>[g.color,g.frozen??0]).sort());
const report={ruleVersion:data.activeRuleVersion,levelId:level.id,sourceType:'independently viewed local video frames',bindings,sourceInventory:data.source,rows,extraBodies:level.blocks.filter(b=>!rows.some(r=>r.blockId===b.id)),gateColorAndInitialIceMatched:true,sourceKnownBodiesPreserved:true,correctionsToTruth:level.id===61?['truth axis count2 covers opening only; actual whole-level4 = opening blue SQ2 horizontal and red H2 vertical, hidden orange H2 horizontal and green H2 horizontal.','Red H2 moves at unchanged x from bottom row to upper neck and returns in frames0015/0034/0060; this confirms printed vertical-axis restriction.']:level.id===62?['Hidden region has7 bodies/15cells, blue V3 frozen5 omitted from truth.','Real fixed cargo sequence pink H3,blue SQ2,pink L4, not old H4/V3/H4.']:[],levelSha256:digest(level),passed:true};
const sourcePath=`${root}/source-review${level.id}-${Date.now()}.json`;fs.writeFileSync(sourcePath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
data.sourceEvidence={file:sourcePath,sha256:digest(fs.readFileSync(sourcePath)),bindings,sourceAlignment:report};
const out=`${root}/bound-candidate${level.id}-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify(data,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,sourcePath,rows:rows.length,extras:report.extraBodies.length,passed:true}));

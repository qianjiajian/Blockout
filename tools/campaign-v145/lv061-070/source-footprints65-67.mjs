import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
const root='deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67';
const rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]),regular={SINGLE:rect(1,1),H2:rect(2,1),H3:rect(3,1),V2:rect(1,2),V3:rect(1,3),SQ2:rect(2,2)};
const norm=c=>{const x=Math.min(...c.map(p=>p[0])),y=Math.min(...c.map(p=>p[1]));return c.map(p=>[p[0]-x,p[1]-y]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);};
// Independently transcribed from the visible connected outlines, with x right/y down.
// Pixel origins are approximate top-left cell corners; cell membership is exact.
const irregular={
 65:[
  {tail:'lift2-2',color:'purple',kind:'L4',cells:[[0,0],[1,0],[0,1],[0,2]],pixelOrigin:[100,390],frame:398,reason:'源竖向左长臂L4在现有完整原向素材中无精确匹配；改用q0 shape10横向L4，保4格、紫色、隐藏批次和独立实体。'},
  {tail:'lift2-4',color:'red',kind:'L3',cells:[[0,0],[1,0],[1,1]],pixelOrigin:[250,390],frame:398,reason:'源上横两格、右下单格L3无q0整图；必要改为q0 shape4左上单格、下横两格，保3格、红色和批次。'},
  {tail:'lift2-6',color:'blue',kind:'L3',cells:[[0,0],[1,0],[0,1]],pixelOrigin:[200,440],frame:398,reason:'源上横两格、左下单格L3无q0整图；必要改为q0 shape4左上单格、下横两格，保3格、蓝色和批次。'},
  {tail:'lift2-8',color:'yellow',kind:'T4',cells:[[1,0],[0,1],[1,1],[2,1]],pixelOrigin:[200,490],frame:398}
 ],
 66:[
  {tail:'lift2-2',color:'purple',kind:'L3',cells:[[0,0],[0,1],[1,1]],pixelOrigin:[150,370],frame:465},
  {tail:'lift2-3',color:'red',kind:'T4',cells:[[0,0],[1,0],[2,0],[1,1]],pixelOrigin:[150,320],frame:465,reason:'源上横三格、中央下伸T4本身无q0整图；仅转为原向T4仍与另外四体无5×3全铺解。native-hidden-packing穷尽0解，必要单体改为同面积原向L4(shape10)，保红色、冰5、隐藏批次及M11。'}
 ],
 67:[
  {tail:'lift2-1',extraTail:'lift2-3',color:'green',kind:'L3',cells:[[0,0],[1,0],[1,1]],pixelOrigin:[250,540],frame:522,reason:'源上横两格、右下单格L3无q0整图。q0 L3+V2+T4也不能铺满3×3；穷尽证据见native-hidden-packing。仅将此3格源体拆成两个真正独立的绿色H2与S，保3格/颜色/批次，蓝V2及黄T4完整保持；不是拼接贴图。'},
  {tail:'lift2-2',color:'yellow',kind:'T4',cells:[[1,0],[0,1],[1,1],[2,1]],pixelOrigin:[200,590],frame:522}
 ]
};
export function footprintBinding(level,sourceBinding,api){
 const id=level.id;assert(irregular[id]);assert(sourceBinding.source.passed);assert.equal(sourceBinding.source.levelSha256,digest(level));
 const specials=new Map(irregular[id].map(e=>[`v146-${id}-${e.tail}`,e])),skip=new Set(irregular[id].filter(e=>e.extraTail).map(e=>`v146-${id}-${e.extraTail}`));
 const rows=[],frameBindings={};
 for(const check of sourceBinding.source.checks){
  if(skip.has(check.id))continue;const e=specials.get(check.id),kind=e?.kind??check.kind??check.authoredKind,b=level.blocks.find(b=>b.id===check.id);assert(b);
  const cells=e?.cells??regular[kind];assert(cells,`Unknown source footprint ${check.id} ${kind}`);const sourceShape=norm(cells),second=e?.extraTail?level.blocks.find(b=>b.id===`v146-${id}-${e.extraTail}`):null;
  const ids=[b.id,...(second?[second.id]:[])],candidateShapes=[b,...(second?[second]:[])].map(x=>({blockId:x.id,cells:norm(x.shape),native:api.matchFormalBlockShape(x.shape,'native-only')}));
  assert(candidateShapes.every(c=>c.native?.quarterTurns===0));assert([b,...(second?[second]:[])].every(x=>x.color===(e?.color??check.sourceColor??check.color)));
  const sameFootprint=!second&&JSON.stringify(sourceShape)===JSON.stringify(candidateShapes[0].cells);assert(sameFootprint||e?.reason);
  if(second)assert.equal(b.shape.length+second.shape.length,sourceShape.length);else assert.equal(b.shape.length,sourceShape.length);
  let framePath=null;if(e){framePath=`.codex-temp/video-audit-41-70/frames-61-70/frame-${String(e.frame).padStart(4,'0')}.jpg`;frameBindings[framePath]=digest(fs.readFileSync(framePath));}
  rows.push({blockId:b.id,candidateBlockIds:ids,sourceShape,candidateShape:second?candidateShapes.map(c=>c.cells):candidateShapes[0].cells,sameFootprint,adaptationReason:sameFootprint?null:e.reason,sourceNativeMatch:api.matchFormalBlockShape(sourceShape,'native-only')??null,candidateNativeMatches:candidateShapes.map(c=>c.native),sourceFamily:kind,framePath,...(e?{sourceCellGrid:{pixelOrigin:e.pixelOrigin,cellSize:50,xDirection:'right',yDirection:'down',coordinatePrecision:'cell membership exact; pixel corner approximate'},sourceObservation:'direct connected body outline; colors/ice/batch bound in independent source-binding'}:{sourceObservation:'axis-aligned rectangle: exact width/height from independently verified source piece inventory'})});
 }
 const ledger=JSON.parse(fs.readFileSync(root+'/source-corrections.json')).levels.find(l=>l.id===id);for(const f of ledger.evidence){assert.equal(digest(fs.readFileSync(f.path)),f.sha256);frameBindings[f.path]=f.sha256;}
 assert.equal(rows.length,id===65?23:id===66?22:17);
 return{levelId:id,levelSha256:digest(level),status:'PASS',unknown:[],frameBindings,regularFootprintsExhaustive:true,sourceBodyCount:rows.length,rows,adaptedSourceBodies:rows.filter(r=>!r.sameFootprint).length,notExactCopy:true,scope:'来源足迹及必要适配审计PASS；不代替完整路线/难度/Pointer。源绿L3拆分以单条源体对两候选体记录。',additionalOrdinaryPadding:'Excluded from source rows; area and native identities are exhaustively checked by source-binding.',packingProof:{path:root+'/native-hidden-packing.json',sha256:digest(fs.readFileSync(root+'/native-hidden-packing.json'))}};
}
if(process.argv[1]?.endsWith('source-footprints65-67.mjs')){const{api}=await loadApi(),candidateFile=process.argv[2],sourceBindingFile=process.argv[3],d=JSON.parse(fs.readFileSync(candidateFile)),source=JSON.parse(fs.readFileSync(sourceBindingFile)),report={...footprintBinding(d.level,source,api),candidateFile,candidateFileSha256:digest(fs.readFileSync(candidateFile)),sourceBindingFile,sourceBindingSha256:digest(fs.readFileSync(sourceBindingFile)),toolSha256:digest(fs.readFileSync(import.meta.filename))},out=`${root}/source-footprint-binding${d.level.id}-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,status:report.status,rows:report.rows.length,adaptations:report.adaptedSourceBodies}));}

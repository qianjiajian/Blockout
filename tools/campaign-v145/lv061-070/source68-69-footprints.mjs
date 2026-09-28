import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
const lock=verifyRulesLock();assert(lock.ok);
const {api}=await loadApi(),root='deliverables/remake31-200-v145-20260924/batches/lv061-070',out=root+'/source-audit';
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const norm=c=>JSON.stringify(c.map(p=>p.join(',')).sort());
const L=[[0,0],[0,1],[1,1]],R=[[0,0],[1,0],[1,1]],UL=[[0,0],[1,0],[0,1]],BR=[[1,0],[0,1],[1,1]];
const rows={
 68:[
 ['opening-4',536,R,'Yellow opening L3 occupies both top cells and the bottom-right cell.'],
 ['opening-5',536,L,'Blue opening L3 occupies top-left and both bottom cells.'],
 ['lift2-4',588,[[0,0],[0,1],[1,1],[2,1]],'Blue lift L4 has the three-cell bar below its leftmost top cell.'],
 ['lift2-5',588,[[0,0],[1,0],[2,0],[2,1]],'Purple lift L4 has the three-cell bar above its rightmost bottom cell.'],
 ['lift2-6',588,L,'Green lift L3 occupies top-left and both bottom cells.'],
 ['lift2-7',588,R,'Yellow lift L3 occupies both top cells and bottom-right.']
 ],
 69:[
 ['opening-1',615,UL,'Purple opening L3 occupies both top cells and bottom-left.'],
 ['opening-2',615,BR,'Blue/cyan opening L3 shell occupies top-right and both bottom cells; the outlined shell follows this actual footprint.'],
 ['cover6-4',648,BR,'Cyan cover6 L3 occupies top-right and both bottom cells.'],
 ['cover9-3',660,[[0,0],[1,0],[2,0],[1,1]],'Green cover9 T4 has the full three-cell bar on top and its stem below the center.'],
 ['cover11-3',678,L,'Blue cover11 L3 occupies top-left and both bottom cells.'],
 ['cover11-4',678,R,'Yellow cover11 L3 occupies both top cells and bottom-right.']
 ]
};
const candidates={68:root+'/author68-69/final68-1790251090160.json',69:root+'/author68-69/minimal69b-best-1790253295336.json'};
for(const id of [68,69]){
 const srcPath=`${out}/source-review${id}.json`,source=JSON.parse(fs.readFileSync(srcPath)),candidate=JSON.parse(fs.readFileSync(candidates[id])),facts=[...source.opening.items,...source.stages.flatMap(s=>s.items)];
 const items=rows[id].map(([sourceId,second,sourceLocalCells,visualObservation])=>{
  const framePath=`.codex-temp/video-audit-41-70/frames-61-70/frame-${String(second).padStart(4,'0')}.jpg`,b=candidate.level.blocks.find(b=>b.id===`v147-${id}-${sourceId}`),fact=facts.find(b=>b.sourceId===sourceId),sourceNativeMatch=api.matchFormalBlockShape(sourceLocalCells,'native-only')??null,designNativeMatch=api.matchFormalBlockShape(b.shape,'native-only')??null,exactFootprintPreserved=norm(sourceLocalCells)===norm(b.shape),familyChanged=sourceLocalCells.length!==b.shape.length||sourceId==='lift2-7'&&id===68;
  return {sourceId,color:fact.color,sourceFamily:fact.kind,sourceLocalCells,visualObservation,frame:{path:framePath,sha256:sha(framePath),second},blockId:b.id,designLocalCells:b.shape,sourceNativeMatch,designNativeMatch,exactFootprintPreserved,adaptation:exactFootprintPreserved?null:familyChanged?(id===68?'Additional native-family inventory adaptation: yellow L3 to V3 equal area, after restricting all other bodies to actual native q0 art. Zero additional family edits cannot tile either possible 28-cell rectangle; the separate tiling proof does not prove that source local footprints were unchanged.':'Blue L3 shell to native SINGLE shell: no native whole shell art for source L3 footprint, and the preserved board/real curtain areas leave an exact two-cell visible-capacity deficit. Keep blue/cyan layer order.'):'Necessary original-orientation art adaptation within the same family and area: source local footprint has no native-only whole shape match; map to the existing q0 whole-art footprint without runtime texture rotation.'};
 });
 const record={level:id,createdAt:new Date().toISOString(),rules:{activeVersion:lock.activeVersion},sourceContract:{path:srcPath,sha256:sha(srcPath)},candidate:{path:candidates[id],sha256:sha(candidates[id]),status:id===68?'frozen final candidate':'unfinished witness prefix; shape bindings only, not an accepted level'},coordinateConvention:'Normalize each visible rigid body bounding box to (0,0); x right, y down; cells are occupied unit grid cells. No source anchor or movement sequence inferred from its shape family.',scope:'Every source irregular body in opening and all known hidden batches. Rectangles and bars have no directional ambiguity; no generated media used.',items,summary:{irregularBodies:items.length,exactFootprints:items.filter(r=>r.exactFootprintPreserved).length,changedFootprints:items.filter(r=>!r.exactFootprintPreserved).length,unsupportedSourceNativeFootprints:items.filter(r=>!r.sourceNativeMatch).length},minimumClaim:id===68?'The prior minimum-one proof concerns one additional family change after all shapes have already been restricted to native q0 inventory. It is not a claim that only one actual source footprint changes. Four actual irregular footprints differ, each listed above.':'The blue shell is the sole family/area change in this candidate. This does not mean one actual footprint change: four other irregular bodies require listed q0 direction adaptation.',sourceUnknown:[],runtimeChanged:false,productionChanged:false};
 const path=`${out}/source-footprints${id}-${Date.now()}.json`;fs.writeFileSync(path,JSON.stringify(record,null,2));console.log(JSON.stringify({path,summary:record.summary,sourceMatch:items.map(r=>[r.sourceId,!!r.sourceNativeMatch])}));
}

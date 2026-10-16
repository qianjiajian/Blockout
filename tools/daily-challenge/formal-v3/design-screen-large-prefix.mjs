import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {designFingerprints,loadBoundedRuntime} from './bounded-proof.mjs';
import {reverseTemplateFingerprints} from './design-reverse-construction-ledger.mjs';
import {auditKnownInterleavedBlueprint} from './design-reverse-interleaved.mjs';
import {absoluteCells,boardCells,digest} from './diversity-layout-factory.mjs';

// Selection diagnostic, not a new constructed candidate or difficulty search.
// Fixed supplied trace frames and static single-body geometric reachability
// only; no new full-world move sequence or complete colour assignment is tried.
const root='deliverables/daily-formal-v3-20261008/design',ledger=`${root}/reverse-construction-attempts`;
const label=process.env.DESIGN_REVERSE_SCREEN_LABEL??'reverse-large-prefix-screen-01';
if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid label');
const output=`${root}/${label}.json`;if(fs.existsSync(output))throw Error('Preserve prior screen');
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const claimed=new Set(),failedShapes=new Set(),failedColours=new Set(),failed=[];
for(const entry of fs.readdirSync(ledger,{withFileTypes:true})){
 const path=`${ledger}/${entry.name}`;
 if(entry.isFile()&&entry.name.startsWith('final-stock-alias-')){claimed.add(JSON.parse(fs.readFileSync(path)).inputSha256);continue;}
 if(!entry.isDirectory())continue;
 const claimPath=`${path}/claim.json`,claim=JSON.parse(fs.readFileSync(claimPath)),fp=reverseTemplateFingerprints(claim.constructionTemplateLevel);
 claimed.add(fp.inputSha256);const result=fs.existsSync(`${path}/result.json`)?JSON.parse(fs.readFileSync(`${path}/result.json`)):null;
 const outcome=fs.existsSync(`${path}/proof-outcome.json`)?JSON.parse(fs.readFileSync(`${path}/proof-outcome.json`)):null;
 if(!result?.constructed||outcome?.accepted===false){failedShapes.add(fp.shapeInventorySha256);failedColours.add(fp.colourInventorySha256);failed.push({claimPath,claimSha256:hash(claimPath),...fp});}
}
const runtime=await loadBoundedRuntime(),seen=new Set(),eligible=[],rejected=[];
function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){
 const path=`${dir}/${e.name}`;if(e.isDirectory()){if(e.name!=='reverse-construction-attempts')scan(path);continue;}
 if(!/^candidate-.*\.json$/.test(e.name))continue;
 let p;try{p=JSON.parse(fs.readFileSync(path));}catch{continue;}
 if(!p.accepted||!p.level||!p.drags||p.U<21)continue;
 const inputSha=digest(p.level);if(seen.has(inputSha))continue;seen.add(inputSha);
 const fp=reverseTemplateFingerprints(p.level),sourceLevelId=p.sourceLevelId??p.level.id;let reason;
 try{assertPlainProofDomain(p.level);}catch{reason='not-plain';}
 if(claimed.has(fp.inputSha256))reason='already-claimed-stock';
 if(failedShapes.has(fp.shapeInventorySha256))reason='same-shape-stock-as-failed';
 if(failedColours.has(fp.colourInventorySha256))reason='same-colour-stock-as-failed';
 if(new Set(p.level.gates.map(g=>g.color)).size!==p.level.gates.length||p.level.gates.some(g=>!p.level.blocks.some(b=>b.color===g.color)))reason='outside-declared-colour-pilot-domain';
 const d=designFingerprints(p.level),physical=digest({shapeSha256:d.shapeSha256,colorSha256:d.colorSha256});
 if(fs.existsSync(`deliverables/daily-formal-v3-20261008/proof/attempts/identities/${physical}.blocked.json`))reason='failed-physical-input';
 if(reason){rejected.push({path,sourceLevelId,reason});continue;}
 eligible.push({path,fileSha256:hash(path),sourceLevelId,U:p.U,L:p.L,...fp});
}}
scan(root);
const key=p=>p.join(','),dirs=[[0,-1],[1,0],[0,1],[-1,0]],bounds=b=>[1+Math.max(...b.shape.map(p=>p[0])),1+Math.max(...b.shape.map(p=>p[1]))];
function atGate(b,g,l){const[w,h]=bounds(b);return g.side==='top'?b.y===0&&b.x>=g.offset&&b.x+w<=g.offset+g.size:
 g.side==='bottom'?b.y+h===l.height&&b.x>=g.offset&&b.x+w<=g.offset+g.size:
 g.side==='left'?b.x===0&&b.y>=g.offset&&b.y+h<=g.offset+g.size:b.x+w===l.width&&b.y>=g.offset&&b.y+h<=g.offset+g.size;}
let staticHeldCoordinates=0;
function reachable(level,body){
 const allowed=new Set(boardCells(level).map(key)),occupied=new Set(level.blocks.filter(b=>b.id!==body.id).flatMap(absoluteCells).map(key));
 const queue=[[body.x,body.y]],seen=new Set(queue.map(key));
 for(let i=0;i<queue.length;i++)for(const[dx,dy]of dirs){const p=[queue[i][0]+dx,queue[i][1]+dy],k=key(p);
  if(seen.has(k)||!body.shape.every(([x,y])=>allowed.has(key([p[0]+x,p[1]+y]))&&!occupied.has(key([p[0]+x,p[1]+y]))))continue;
  seen.add(k);queue.push(p);
 }
 staticHeldCoordinates+=queue.length;return queue;
}
function trace(packet){let current=structuredClone(packet.level);const frames=[];
 for(const drag of packet.drags){const body=current.blocks.find(b=>b.id===drag.blockId);if(!body)throw Error('Missing known trace body');
  const end=drag.path.at(-1)??[body.x,body.y],next={...current,blocks:drag.exitSide?current.blocks.filter(b=>b.id!==body.id):current.blocks.map(b=>b.id===body.id?{...b,x:end[0],y:end[1]}:b)};
  frames.push({before:current,after:next,body,drag});current=next;
 }return frames;
}
function suffixDomains(packet,frames,start){
 const colours=packet.level.gates.map(g=>g.color),domains=[];
 for(const body of packet.level.blocks){const own=frames.slice(start).filter(f=>f.body.id===body.id);if(!own.length){domains.push({id:body.id,colours,withheld:true});continue;}
  const clear=own.find(f=>f.drag.exitSide);if(!clear)throw Error('Incomplete fixed suffix');
  const reach=reachable(clear.before,clear.body);let choices=packet.level.gates.filter(g=>reach.some(([x,y])=>atGate({...body,x,y},g,packet.level))).map(g=>g.color);
  // For solid rectangles, complete flush contact with an ordinary gate is a
  // necessary immediate clear. For irregular shapes retain a conservative
  // overapproximation instead of declaring an unqualified exclusion.
  const[w,h]=bounds(body);
  if(body.shape.length===w*h)for(const f of own.filter(f=>!f.drag.exitSide))choices=choices.filter(c=>{
   const gate=packet.level.gates.find(g=>g.color===c);return ![[f.body.x,f.body.y],...f.drag.path].some(([x,y])=>atGate({...body,x,y},gate,packet.level));
  });
  domains.push({id:body.id,colours:choices,withheld:false});
 }return domains;
}
function prefixes(packet){
 const frames=trace(packet),area=boardCells(packet.level).length,rows=[];let clearedArea=0,clears=0;
 for(const[index,f]of frames.entries())if(f.drag.exitSide){clearedArea+=f.body.shape.length;clears++;const fraction=clearedArea/area;
  if(fraction<.25)continue;if(fraction>.4)break;
  const cut=f.after,movable=cut.blocks.filter(b=>reachable(cut,b).length>1),movableIds=new Set(movable.map(b=>b.id));
  const potentialArea=clearedArea+movable.reduce((n,b)=>n+b.shape.length,0),domains=suffixDomains(packet,frames,index+1),forced=domains.filter(d=>!d.withheld&&d.colours.length===1),fixedConflicts=[];
  for(const a of forced)for(const b of forced)if(a.id<b.id&&!movableIds.has(a.id)&&!movableIds.has(b.id)&&a.colours[0]===b.colours[0]){
   const aa=cut.blocks.find(x=>x.id===a.id),bb=cut.blocks.find(x=>x.id===b.id);
   if(absoluteCells(aa).some(([x,y])=>absoluteCells(bb).some(([u,v])=>Math.abs(x-u)+Math.abs(y-v)===1)))fixedConflicts.push({a:a.id,b:b.id,color:a.colours[0]});
  }
  rows.push({blueprintAllowLargePrefix:true,blueprintPrefixClearCount:clears,blueprintMaximumPrefixArea:Math.floor(area*.4),
   prefixDragCount:index+1,temporaryVacancyArea:clearedArea,vacancyFraction:fraction,cutLevelSha256:digest(cut),
   immediatelyMovableIds:[...movableIds],potentiallyChangeableFootprintArea:potentialArea,potentiallyChangeableFootprintFraction:potentialArea/area,
   staticSuffixDomains:domains,immobileSingletonAdjacentConflicts:fixedConflicts,
   eligible:potentialArea/area>=.55&&!fixedConflicts.length&&domains.every(d=>d.colours.length),
   diagnosticOnly:true,additionalParkingMayExpandReach:true});
 }return rows;
}
eligible.sort((a,b)=>b.U-a.U||a.sourceLevelId-b.sourceLevelId||a.path.localeCompare(b.path));
const records=[],analysed=[],sources=new Set(),shapes=new Set(),colours=new Set();
for(const row of eligible){
 if(records.length===6)break;
 if(sources.has(row.sourceLevelId)||shapes.has(row.shapeInventorySha256)||colours.has(row.colourInventorySha256))continue;
 const packet=JSON.parse(fs.readFileSync(row.path)),options=prefixes(packet);analysed.push({...row,prefixes:options});
 const chosen=options.filter(x=>x.eligible).sort((a,b)=>b.potentiallyChangeableFootprintFraction-a.potentiallyChangeableFootprintFraction||b.vacancyFraction-a.vacancyFraction)[0];
 if(!chosen)continue;
 let qualification;try{qualification=auditKnownInterleavedBlueprint(runtime,packet,{prefixClearCount:chosen.blueprintPrefixClearCount,maximumPrefixArea:chosen.blueprintMaximumPrefixArea,allowLargePrefix:true});}
 catch(error){rejected.push({path:row.path,sourceLevelId:row.sourceLevelId,reason:'known-replay-qualification:'+error.message});continue;}
 records.push({...row,...chosen,qualification});sources.add(row.sourceLevelId);shapes.add(row.shapeInventorySha256);colours.add(row.colourInventorySha256);
}
const result={status:'READ_ONLY_LARGE_PREFIX_NEW_STOCK_SCREEN',newCandidateSearches:0,lowerSearches:0,originalFilesChanged:false,
 methodology:'Only supplied reference trace reconstruction and static single-held occupancy reach/ordinary rectangular contact diagnostics. Static colour domains are conservative screening aids, not qualified final domains or difficulty certificates. Final domains run once inside the new constructor budget.',
 staticHeldCoordinates,failedStocksChecked:failed.length,failedStockBindings:failed,claimedStocksChecked:claimed.size,
 candidatesSeen:seen.size,eligibleStocks:eligible.length,records,analysed,rejected,
 proofToolchainSha256:runtime.toolchainSha256,toolSha256:hash('tools/daily-challenge/formal-v3/design-screen-large-prefix.mjs')};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,eligible:eligible.length,analysed:analysed.length,records:records.map(x=>({source:x.sourceLevelId,U:x.U,area:x.temporaryVacancyArea,fraction:x.vacancyFraction,movable:x.potentiallyChangeableFootprintFraction,prefix:x.blueprintPrefixClearCount,path:x.path}))}));

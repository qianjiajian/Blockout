import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {independentPartitionSha256} from './formal-v2/geometry.mjs';
const root='deliverables/daily-formal-v2-20261007';
const gallery=JSON.parse(await fs.readFile('deliverables/daily-layout-gallery-20261007/layout-index.json','utf8'));
const lookup=new Map(gallery.items.map(x=>[x.formalId,x]));
const index=JSON.parse(await fs.readFile(`${root}/runtime-verified/index.json`,'utf8'));
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const sorted=x=>x.map(v=>JSON.stringify(v)).sort();
const records=await Promise.all(index.files.map(async f=>{
 const r=JSON.parse(await fs.readFile(f,'utf8')),l=r.level,m=lookup.get(r.formalId);
 const queued=new Set((l.generators??[]).flatMap(g=>g.queueBlockIds));
 const body=b=>b.shape.map(([x,y])=>[x+b.x,y+b.y]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
 const placed=l.blocks.filter(b=>!queued.has(b.id));
 const footprints=new Map(placed.map(b=>[JSON.stringify(body(b)),b.shape.length]));
 const gates=sorted(l.gates.map(g=>[g.side,g.offset,g.size,g.color]));
 const pure=structuredClone(l);delete pure.shutters;delete pure.generators;
 pure.blocks=placed.map(b=>({id:b.id,x:b.x,y:b.y,shape:b.shape,color:b.color}));
 return {code:m.code,formalId:r.formalId,stage:m.stage,difficulty:r.difficulty,sourceLevelId:r.sourceLevelId,
   footprints,totalArea:[...footprints.values()].reduce((a,b)=>a+b,0),gates,gatesSha:hash(gates),
   purePartitionSha:independentPartitionSha256(pure),level:l};
}));
const compare=(a,b)=>{let area=0;for(const [key,n]of a.footprints)if(b.footprints.has(key))area+=n;return area/Math.max(a.totalArea,b.totalArea);};
const rows=records.map(a=>{const candidates=records.filter(b=>b!==a&&b.sourceLevelId===a.sourceLevelId);
 const best=candidates.map(b=>({code:b.code,ratio:compare(a,b)})).sort((x,y)=>y.ratio-x.ratio||x.code.localeCompare(y.code))[0];
 return {code:a.code,sourceLevelId:a.sourceLevelId,nearest:best};});
const groups=gallery.groups.map(g=>{const set=records.filter(r=>r.stage===g.stage&&r.difficulty===g.difficulty);
 const nearest=set.map(a=>({code:a.code,...set.filter(b=>b!==a).map(b=>({other:b.code,ratio:compare(a,b)})).sort((x,y)=>y.ratio-x.ratio)[0]}));
 return {key:g.key,title:g.title,difficulty:g.difficultyTitle,count:set.length,gateConfigurations:new Set(set.map(x=>x.gatesSha)).size,nearest};});
const exampleA=records.find(r=>r.code==='01-D1-03'),exampleB=records.find(r=>r.code==='01-D1-04');
const same=[...exampleA.footprints.keys()].filter(k=>exampleB.footprints.has(k));
const report={status:'LAYOUT_SIMILARITY_CONFIRMED',generatedAt:new Date().toISOString(),scope:450,
  note:'Read-only diagnostic. Exact distinct partitions do not establish perceptual or gameplay diversity. The area score matches exact absolute shape footprints, ignores colors/mechanism roles, excludes queued bodies, includes hidden bodies, and normalizes by the larger sum of unique body areas; it is not a difficulty or diversity certificate.',
  sourceCounts:Object.fromEntries([...new Set(records.map(r=>r.sourceLevelId))].map(id=>[id,records.filter(r=>r.sourceLevelId===id).length])),
  distinctGateConfigurationsIgnoringMechanismFlags:new Set(records.map(r=>r.gatesSha)).size,
  distinctBodyPartitionsIgnoringMechanismRolesAndCovers:new Set(records.map(r=>r.purePartitionSha)).size,
  nearestSameSource:{atLeast90Percent:rows.filter(r=>r.nearest.ratio>=.9).length,atLeast80Percent:rows.filter(r=>r.nearest.ratio>=.8).length,
    min:Math.min(...rows.map(r=>r.nearest.ratio)),mean:rows.reduce((a,r)=>a+r.nearest.ratio,0)/450,max:Math.max(...rows.map(r=>r.nearest.ratio))},
  firstGroupGateConfigurations:groups[0].gateConfigurations,
  example:{a:exampleA.code,b:exampleB.code,sameExactPlacedBodies:same.length,samePlacedArea:same.reduce((s,k)=>s+exampleA.footprints.get(k),0),
    boardArea:exampleA.level.width*exampleA.level.height,gateConfigurationSame:exampleA.gatesSha===exampleB.gatesSha,
    aOnly:[...exampleA.footprints.keys()].filter(k=>!exampleB.footprints.has(k)).map(JSON.parse),bOnly:[...exampleB.footprints.keys()].filter(k=>!exampleA.footprints.has(k)).map(JSON.parse)},
  groups,rows};
const output=`${root}/layout-similarity-audit.json`;await fs.writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...report,groups:undefined,rows:undefined,output},null,2));

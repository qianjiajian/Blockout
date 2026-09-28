import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,ruleGate,OUTPUT,writeNew} from './remake61to70-v146.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {archiveReviewInputs} from './review-input-archive.mjs';

const inputs={
 61:['author61-64/bound-candidate61-1790248712270.json','author61-64/source-footprint-binding61-1790254017407.json',2],
 62:['author61-64/bound-candidate62-1790251522066.json','author61-64/source-footprint-binding62-1790254017409.json',2],
 63:['author61-64/bound-candidate63-1790248803816.json','author61-64/source-footprint-binding63-1790254017412.json',8],
 65:['author65-67/candidate65-1790248711981.json','author65-67/source-footprint-binding65-1790254262922.json',23],
 66:['author65-67/candidate66-1790250038524.json','author65-67/source-footprint-binding66-1790254264518.json',22],
 68:['author68-69/final68-1790251090160.json','source-audit/source-footprints68-v3-1790254100006.json',6]
};
const norm=c=>{const x=Math.min(...c.map(p=>p[0])),y=Math.min(...c.map(p=>p[1]));return c.map(p=>[p[0]-x,p[1]-y]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);};
const sha=p=>digest(fs.readFileSync(p)),json=p=>JSON.parse(fs.readFileSync(p));
const lock=ruleGate(),discovery=await loadApi(),records=[];
for(const [id,[candidate,source,count]] of Object.entries(inputs)){
 const candidateFile=`${OUTPUT}/${candidate}`,sourceFile=`${OUTPUT}/${source}`,d=json(candidateFile),s=json(sourceFile);
 assert.equal(d.level.id,Number(id));assert.equal(s.levelSha256,digest(d.level));assert.deepEqual(s.unknown,[]);assert.equal(s.rows.length,count);
 const frames=Array.isArray(s.frameBindings)?Object.fromEntries(s.frameBindings.map(f=>[f.path,f.sha256])):s.frameBindings;
 for(const [p,h] of Object.entries(frames))assert.equal(sha(p),h);
 records.push({id:Number(id),candidateFile,sourceFile,d,s,frames});
}
const archive=archiveReviewInputs(`${OUTPUT}/checks/footprint-inputs-${Date.now()}`,[...discovery.inputs,...records.flatMap(r=>[r.candidateFile,r.sourceFile,...Object.keys(r.frames)]),'tools/campaign-v145/lv061-070/review-source-footprints.mjs','docs/rules/manifest.json',`docs/mechanism-rules-v${lock.activeVersion}.md`]);
const {api,inputs:apiInputs}=await loadApi();assert.deepEqual(apiInputs,discovery.inputs);archive.assertUnchanged();
for(const r of records){
 const rows=[],assets={};
 for(const observed of r.s.rows){
  const blockId=observed.blockId,sourceShape=norm(observed.sourceShape??observed.sourceLocalCells),b=r.d.level.blocks.find(b=>b.id===blockId);assert(b,blockId);
  const candidateShape=norm(b.shape),sameFootprint=JSON.stringify(sourceShape)===JSON.stringify(candidateShape);
  assert.equal(sameFootprint,observed.sameFootprint??observed.exactFootprintPreserved);
  const sourceNativeMatch=api.matchFormalBlockShape(sourceShape,'native-only')??null,candidateNativeMatch=api.matchFormalBlockShape(b.shape,'native-only');
  assert.deepEqual(sourceNativeMatch,observed.sourceNativeMatch);assert.equal(candidateNativeMatch?.quarterTurns,0);
  const sourceArt=api.auditCandidateBlockArt({id:r.id,blocks:[{...b,shape:sourceShape}]}),candidateArt=api.auditCandidateBlockArt({id:r.id,blocks:[b]});assert(candidateArt.passed);
  for(const a of candidateArt.requirements){const file='public/'+a.path.replace(/^\//,'');assert(fs.existsSync(file));assets[file]=sha(file);}
  const sourceNativeSupported=!!sourceNativeMatch&&sourceArt.passed&&sourceArt.requirements.every(a=>fs.existsSync('public/'+a.path.replace(/^\//,'')));
  const adaptationReason=observed.adaptationReason??observed.adaptation??null;
  const ratioAdaptation=r.id===63&&['opening-11','opening-12','opening-15'].some(t=>blockId===`v146-63-${t}`);
  if(ratioAdaptation){assert.equal(r.d.level.blocks.length,18);assert.equal(r.s.rows.length,8);assert.equal(candidateShape.length,3);assert.equal(new Set(candidateShape.map(c=>c[1])).size,1);assert.equal(8-Math.floor(18*.3),3);}
  if(!sameFootprint){assert(adaptationReason?.length>10);assert(!sourceNativeSupported||ratioAdaptation,'A source-supported shape change needs separate necessity review: '+blockId);}
  assert.equal(sourceShape.length,candidateShape.length,'These six final candidates preserve every source body area');
  rows.push({blockId,sourceShape,candidateShape,sameFootprint,adaptationReason,sourceNativeMatch,sourceNativeSupported,ratioAdaptation,sourceArt,candidateNativeMatch,candidateArt});
 }
 archive.assertUnchanged();
 const report={levelId:r.id,status:'PASS',unknown:[],ruleVersion:lock.activeVersion,levelSha256:digest(r.d.level),candidate:r.candidateFile,candidateSha256:sha(r.candidateFile),sourceSidecar:r.sourceFile,sourceSidecarSha256:sha(r.sourceFile),frameBindings:r.frames,rows,changedFootprints:rows.filter(x=>!x.sameFootprint).length,assets,inputArchive:archive.serializable(),scope:'Exact source-local shape and required native artwork verification; rectangular source bodies and attributes are additionally bound by the separate full source reports. No route or source candidate bytes changed.',visuallyReviewedFrames:['lv61-0','0097','0153','0172','0398','0465','0536','0588']};
 const out=`${OUTPUT}/checks/footprint-binding${r.id}-${Date.now()}.json`;writeNew(out,report);console.log(JSON.stringify({out,id:r.id,status:report.status,rows:rows.length,changedFootprints:report.changedFootprints}));
}

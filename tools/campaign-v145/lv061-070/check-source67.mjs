import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,OUTPUT,writeNew,ruleGate} from './remake61to70-v146.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {checkSource66_67} from './check-source66-67.mjs';
import {findLiftCausalCase} from './lift-causal-case.mjs';
import {archiveReviewInputs} from './review-input-archive.mjs';
const norm=c=>c.map(p=>[...p]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
export function checkFootprints67(level,footprints,api){
 assert.equal(level.id,67);assert.equal(footprints.levelId,67);assert.equal(footprints.levelSha256,digest(level));assert.equal(footprints.rows.length,17);assert.deepEqual(footprints.unknown,[]);
 for(const [p,h]of Object.entries(footprints.frameBindings))assert.equal(digest(fs.readFileSync(p)),h);
 const rows=[],assets={},ids=new Set();
 for(const r of footprints.rows){
  const split=r.blockId==='v146-67-lift2-1',blocks=r.candidateBlockIds.map(id=>level.blocks.find(b=>b.id===id));assert(blocks.every(Boolean));
  for(const b of blocks){assert(!ids.has(b.id));ids.add(b.id);for(const k of ['movementAxis','keyId','lockedBy','lockCount','star','timedBombSeconds','rotationBadge'])assert(b[k]===undefined||b[k]===false);}
  const source=norm(r.sourceShape);
  if(split){assert.deepEqual(r.candidateBlockIds,['v146-67-lift2-1','v146-67-lift2-3']);assert.deepEqual(source,[[0,0],[1,0],[1,1]]);assert.deepEqual(norm(blocks[0].shape),[[0,0],[1,0]]);assert.deepEqual(blocks[1].shape,[[0,0]]);assert(blocks.every(b=>b.color==='green'&&b.shutterId==='v146-67-lift2'&&!b.frozen&&!b.layers));assert.equal(api.matchFormalBlockShape(source,'native-only'),undefined);assert.equal(r.sameFootprint,false);}
  else{assert.equal(blocks.length,1);assert.deepEqual(norm(blocks[0].shape),source);assert.equal(r.sameFootprint,true);}
  if(r.blockId==='v146-67-lift2-2')assert.deepEqual(source,[[1,0],[0,1],[1,1],[2,1]]);
  const actualMatch=api.matchFormalBlockShape(source,'native-only')??null;assert.deepEqual(actualMatch,r.sourceNativeMatch);
  for(const b of blocks){const match=api.matchFormalBlockShape(b.shape,'native-only');assert.equal(match.quarterTurns,0);const art=api.auditCandidateBlockArt({id:67,blocks:[b]});assert(art.passed);for(const a of art.requirements){const p='public/'+a.path.replace(/^\//,'');assets[p]=digest(fs.readFileSync(p));}}
  rows.push({...r,split,independentlyChecked:true});
 }
 assert.equal(ids.size,18);const padding=level.blocks.filter(b=>!ids.has(b.id));assert.equal(padding.length,8);assert.equal(padding.reduce((n,b)=>n+b.shape.length,0),22);assert(padding.every(b=>b.id.startsWith('v146-67-padding-')));
 return{levelId:67,status:'PASS',levelSha256:digest(level),unknown:[],rows,changedFootprints:1,frameBindings:footprints.frameBindings,assets,sourceBodyCount:17,authoredSourceBodies:18,paddingBodies:8,paddingCells:22,visuallyReviewedFrames:['0486','0518','0520','0522']};
}
if(process.argv[1]?.endsWith('check-source67.mjs')){
 const lock=ruleGate(),candidate=process.argv[2],footprintFile=process.argv[3],data=JSON.parse(fs.readFileSync(candidate)),footprints=JSON.parse(fs.readFileSync(footprintFile)),ledgerFile=`${OUTPUT}/author65-67/source-corrections.json`,ledger=JSON.parse(fs.readFileSync(ledgerFile)).levels.find(l=>l.id===67),discovery=await loadApi();
 const archive=archiveReviewInputs(`${OUTPUT}/checks/source67-inputs-${Date.now()}`,[...discovery.inputs,candidate,footprintFile,ledgerFile,`${OUTPUT}/author65-67/native-hidden-packing.json`,...ledger.evidence.map(f=>f.path),'tools/campaign-v145/lv061-070/check-source67.mjs','docs/rules/manifest.json',`docs/mechanism-rules-v${lock.activeVersion}.md`]);
 const {api}=await loadApi();archive.assertUnchanged();const source=checkSource66_67(data.level,ledger,api),f=checkFootprints67(data.level,footprints,api),liftCausalCase=findLiftCausalCase(data.level,data.drags,api);assert(liftCausalCase.passed);archive.assertUnchanged();
 const stamp=Date.now(),out=`${OUTPUT}/checks/source-binding67-${stamp}.json`,footprintOut=`${OUTPUT}/checks/footprint-binding67-${stamp}.json`;
 writeNew(out,{candidate,source,liftCausalCase,inputArchive:archive.serializable()});writeNew(footprintOut,{...f,sourceSidecar:footprintFile,sourceSidecarSha256:digest(fs.readFileSync(footprintFile)),inputArchive:archive.serializable()});console.log(JSON.stringify({out,footprintOut,status:'PASS',sourceBodies:17,candidateBodies:data.level.blocks.length}));
}

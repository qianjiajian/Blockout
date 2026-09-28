import fs from 'node:fs';import assert from 'node:assert/strict';
import {ROOT,digest,ruleGate,writeNew,auditSpatial} from './common.mjs';
import {loadApi,replay} from './replay.mjs';
const lock=ruleGate();assert(lock.verified.some(v=>v.version==='1.112.0'));
const acceptanceFile=ROOT+'/acceptance191196-1790530736977.json',acceptance=JSON.parse(fs.readFileSync(acceptanceFile));
const {api}=await loadApi(),rows=[];
for(const entry of acceptance.candidates){const d=JSON.parse(fs.readFileSync(entry.file)),l=d.level;assert.equal(digest(fs.readFileSync(entry.file)),entry.fileSha256);assert.equal(digest(l),entry.levelSha256);assert.equal(digest(d.drags),entry.routeSha256);
 const spatial=auditSpatial(l,api),route=replay(l,d.drags,api,{complete:true,requirePointerCompatible:true});assert.equal(route.nonClearingDrags,l.id===191?15:10);assert.equal(d.drags.length,l.id===191?31:27);
 let evidence;
 if(l.id===191){const file=ROOT+'/author191-193/adopt191196-review-1790530798176.json';evidence={file,sha256:digest(fs.readFileSync(file))};assert.equal(l.blocks.length,14);assert.equal(l.blocks.filter(b=>b.layers?.length===2).length,2);}
 else{assert.equal(l.blocks.length,17);assert.equal(l.flipDoors.length,3);assert.deepEqual(Object.fromEntries(l.flipDoors.map(g=>[g.color,g.initiallyOpen])),{green:false,pink:true,purple:false});assert.equal([...l.gates,...l.flipDoors].filter(g=>g.frozen===2).length,7);const file=ROOT+'/conditional196-root-1790525129193.json',r=JSON.parse(fs.readFileSync(file));assert.equal(r.levelSha256,entry.levelSha256);assert.equal(r.routeSha256,entry.routeSha256);assert(r.independentLower.thresholdProven);assert.equal(r.independentLower.floor,5);assert.equal(digest(fs.readFileSync(r.sourceReview)),r.sourceReviewSha256);const old=JSON.parse(fs.readFileSync(r.sourceReview));assert(old.proof.thresholdProven);assert.equal(old.proof.floor,5);assert.equal(old.levelSha256,entry.levelSha256);evidence={file,sha256:digest(fs.readFileSync(file)),lower:r.independentLower,sourceReview:r.sourceReview,sourceReviewSha256:r.sourceReviewSha256,sourceInitialPhase:'UNKNOWN',knownSourceReviewRetained:true};}
 rows.push({id:l.id,...entry,spatial,route,evidence,sourceValidated:false,sourceContractSatisfied:true,sourceStatus:l.id===191?'USER_ACCEPTED_AUTHORED_OPENING':'USER_ACCEPTED_AUTHORED_SOURCE_FIELDS',acceptanceFile,acceptanceSha256:digest(fs.readFileSync(acceptanceFile)),L:l.id===191?11:5,U:route.nonClearingDrags,originalScore:api.levelStarTargets(l)});
}
const out=ROOT+'/accepted191196-review-'+Date.now()+'.json';writeNew(out,{status:'ACCEPTED_CANDIDATES_REVIEW_PASS',activeVersion:lock.activeVersion,rows,oldEvidenceRewritten:false,newFloorSearch:false,sourceUnknownRemains:true,formalPointerPending:true});console.log(out);

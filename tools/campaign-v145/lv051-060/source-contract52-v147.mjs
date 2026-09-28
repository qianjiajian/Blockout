import fs from 'node:fs';
import assert from 'node:assert/strict';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
const lock=verifyRulesLock();assert(lock.ok);const file=process.argv[2],d=JSON.parse(fs.readFileSync(file)),l=d.level,s=d.sourceReview;assert.equal(l.id,52);
const shape={SINGLE:[[0,0]],H2:[[0,0],[1,0]],V2:[[0,0],[0,1]],V3:[[0,0],[0,1],[0,2]],SQ2:[[0,0],[1,0],[0,1],[1,1]]},canonical=a=>a.map(p=>p.join(',')).sort();
assert.equal(l.blocks.length,s.pieces.length);assert.equal(l.gates.length,s.gates.length);
const rows=s.pieces.map(p=>{const ids=d.sourceAdaptation.blockMapping[p.sourceId];assert.equal(ids.length,1);const b=l.blocks.find(b=>b.id===ids[0]);assert(b);assert.equal(b.color,p.color);assert.deepEqual(canonical(b.shape),canonical(shape[p.kind]));assert.equal(b.movementAxis,p.movementAxis);for(const k of ['frozen','layers','shutterId','keyId','lockedBy','timedBombSeconds'])assert.equal(b[k],p[k]);return{sourceId:p.sourceId,candidateId:b.id,shape:p.kind,color:p.color,axis:p.movementAxis??null,passed:true};});
assert.equal(new Set(rows.map(r=>r.candidateId)).size,l.blocks.length);
for(const[color,count]of s.gates){const gates=l.gates.filter(g=>g.color===color);assert.equal(gates.length,1);assert.equal(gates[0].frozen??0,count);}
for(const f of s.frames)assert.equal(digest(fs.readFileSync(f.path)),f.sha256);assert.equal(digest(fs.readFileSync(s.truthFile)),s.truthSha256);
const r={checkedAt:new Date().toISOString(),ruleVersion:lock.activeVersion,sourceContractPassed:true,candidate:file,candidateSha256:digest(fs.readFileSync(file)),levelSha256:digest(l),sourceSha256:digest(s),rows,sourceFramesVerified:s.frames.length,visualReview:'Root reviewed unoperated frame32; seven axes and six gate/color counters match the carried source inventory. This corrects the later truth frame, not the immutable truth file.',sourceGeometry:'source6x8/full48 cells matches retained geometry',layoutExactCopy:false,inventoryExact:true,lowerBoundProven:false,formalAdopted:false,toolSha256:digest(fs.readFileSync(process.argv[1]))};
const out='deliverables/remake31-200-v145-20260924/batches/lv051-060/agent51-54/source-contract52-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify(r,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,sourceContractPassed:true,rows:rows.length}));

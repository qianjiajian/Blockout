import fs from 'node:fs';
import assert from 'node:assert/strict';
import {digest} from '../../revised-preview-validation-v160.mjs';
const file=process.argv[2],r=JSON.parse(fs.readFileSync(file)),d=JSON.parse(fs.readFileSync(r.source));assert.equal(digest(fs.readFileSync(r.source)),r.sourceFileSha256);assert.equal(digest(d.level),r.levelSha256);assert(r.replay.valid&&r.replay.complete);
const candidate=structuredClone(d);candidate.drags=r.drags;candidate.replay=r.replay;delete candidate.search;delete candidate.freshQuality;delete candidate.decisionCases;delete candidate.iceLocalChoices;
candidate.routeImprovement={sourceCandidate:r.source,sourceCandidateSha256:r.sourceFileSha256,sourceRouteSha256:r.oldRouteSha256,report:file,reportSha256:digest(fs.readFileSync(file)),levelUnchanged:true,changes:r.changes};
const out=`deliverables/remake31-200-v145-20260924/batches/lv051-060/root58/shortened-candidate-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify(candidate,null,2)+'\n',{flag:'wx'});console.log(out);

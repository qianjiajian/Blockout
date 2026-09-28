import assert from 'node:assert/strict';
import fs from 'node:fs';
import {digest} from './revised-preview-validation-v160.mjs';

// A delta is based only on a pinned successful ancestor run, never a failed
// partial run. All current candidates still receive complete model validation.
export function selectFormalUiIds(archive, checkedInputs, priorUi){
 const all=archive.rows.map(r=>r.levelId);
 if(!priorUi)return {ids:all,selection:'cumulative',priorUi:null};
 const bytes=fs.readFileSync(priorUi.path);assert.equal(digest(bytes),priorUi.sha256,'Prior UI report drift');
 const report=JSON.parse(bytes);assert.equal(report.status,'passed','Prior UI must be complete');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.forbiddenStorage,[]);
 assert.equal(checkedInputs[report.archivePath],report.archiveSha256,'Prior UI must belong to a bound ancestor archive');
 const ancestorBytes=fs.readFileSync(report.archivePath);assert.equal(digest(ancestorBytes),report.archiveSha256);
 const ancestor=JSON.parse(ancestorBytes);
 assert.deepEqual(report.ids,ancestor.rows.map(r=>r.levelId),'Prior UI must cover whole ancestor batch');
 assert.deepEqual(report.rows.map(r=>r.levelId),report.ids);
 assert(report.rows.every(r=>r.complete&&r.pointerReplayValidated),'Incomplete prior UI row');
 for(const row of ancestor.rows)assert.deepEqual(archive.rows.find(r=>r.levelId===row.levelId),row,'Prior authored evidence changed');
 const ids=all.filter(id=>!report.ids.includes(id));assert(ids.length,'No new formal maps to validate');
 return {ids,selection:'since-passed-ancestor',priorUi:{...priorUi,ids:report.ids,archivePath:report.archivePath,archiveSha256:report.archiveSha256,historicalUiNotRerun:true}};
}

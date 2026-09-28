// Derive this task's actual-input runner without modifying historical tools.
import fs from 'node:fs';
const root='tools/star-targets81-90';
fs.mkdirSync(root,{recursive:true});
let runner=fs.readFileSync('tools/star-targets51-60/playtest.mjs','utf8')
 .replaceAll('tools/star-targets51-60','tools/star-targets81-90')
 .replaceAll('deliverables/star-targets51-60-20260927','deliverables/star-targets81-90-20260927')
 .replaceAll('src/core/remake51to60.ts','src/core/remake81to90.ts')
 .replaceAll('52/54/55/56/58/59 scoring-only','81/83/85/87/88 scoring-only')
 .replaceAll('other194Preserved','other195Preserved')
 .replaceAll('allSixScoringLevelsValidated','allFiveScoringLevelsValidated')
 .replaceAll('historicalRoutesPreserved:true','historicalEvidencePreserved:true,routeReplacedIds:[85]')
 .replace('note:id===59?"The user-authorized formal level keeps its lower bound UNKNOWN; this scoring run does not certify L16.":id===58?"The accepted lower-bound exception remains unchanged; this is a scoring verification.":"This run verifies scoring and full playability; no new lower-bound claim."',
  'note:id===88?"The v1.57 direct-adoption exception keeps the target lower bound UNKNOWN; this scoring run does not certify L15.":id===85?"The historical U9 route is invalid under the current exit check. The replacement route only verifies scoring; a route above U10 does not certify the simple difficulty band.":"This run verifies scoring and full playability; no new lower-bound claim."');
const sourceLineage=`
// Bind the newly selected 85 route through both the assembled manifest and
// the independent solver artifact, not just a copy of the manifest itself.
const route85=witnesses.rows.find(row=>row.id===85),original85=route85.originalSource;
assert(original85?.file&&original85.sha256,'85 requires its independent route source');
assert.equal(witnesses.evidenceBindings[original85.file],original85.sha256);
assert.equal(digest(fs.readFileSync(original85.file)),original85.sha256);
const original85Doc=JSON.parse(fs.readFileSync(original85.file)),original85Row=original85Doc.rows?.find(row=>row.id===85)??original85Doc;
assert.equal(original85Row.id??original85Row.levelId??original85Row.level?.id,85);
assert.deepEqual(original85Row.drags??original85Row.route,route85.drags);
assert.equal(digest(original85Row.drags??original85Row.route),route85.routeSha256);
assert.deepEqual(omitTarget(original85Row.level),omitTarget(route85.level));
assert(original85Row.replay?.valid&&original85Row.replay?.complete,'Independent source must record its complete current-model replay');
`;
runner=runner.replace('const compiled=await build(',sourceLineage+'\nconst compiled=await build(');
fs.writeFileSync(root+'/playtest.mjs',runner);
let browser=fs.readFileSync('tools/star-targets51-60/browser.mjs','utf8')
 .replace('[52,54,55,56,58,59]','[81,83,85,87,88]').replace('six explicitly','five explicitly');
fs.writeFileSync(root+'/browser.mjs',browser);
let html=fs.readFileSync('tools/star-targets51-60/index.html','utf8')
 .replaceAll('star-targets51-60','star-targets81-90').replace('52/54/55/56/58/59','81/83/85/87/88');
fs.writeFileSync(root+'/index.html',html);

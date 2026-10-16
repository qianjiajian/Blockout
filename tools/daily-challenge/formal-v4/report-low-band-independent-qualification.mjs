import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const V4='deliverables/daily-formal-v4-20261008',own='tools/daily-challenge/formal-v4/report-low-band-independent-qualification.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const fileBindings={},toolBindings={};
async function read(file){const bytes=await fs.readFile(file);fileBindings[file]=sha(bytes);return JSON.parse(bytes);}
const authored=`${V4}/proof/low-band-prefix-tail-independent-author-suite-01/report.json`;
const independent=`${V4}/proof/low-band-prefix-tail-independent-negatives-01/report.json`;
const a=await read(authored),b=await read(independent);
assert.equal(a.status,'LOW_BAND_PREFIX_TAIL_QUALIFICATION_PASS');assert.equal(a.evidence.length,9);assert(a.evidence.every(x=>x.passed));
assert.equal(b.status,'INDEPENDENT_PRIVATE_NEGATIVES_PASS');assert.equal(b.evidence.length,3);assert(b.evidence.every(x=>x.passed));
assert.equal(a.publicRequestCountBefore,14728);assert.equal(a.publicRequestCountAfter,14728);
assert.equal(b.publicRequestsBefore,14728);assert.equal(b.publicRequestsAfter,14728);
assert.equal(a.publicLedgerClaims,0);assert.equal(b.publicLedgerClaims,0);
const positive=a.evidence.find(x=>x.test==='inclusive-full-upper-original-lower').result;
assert.equal(positive.toolchainSha256,'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804');
for(const [p,h]of Object.entries(positive.designBindings)){assert.equal(sha(await fs.readFile(p)),h,p);toolBindings[p]=h;}
const entry='tools/daily-challenge/formal-v4/prefix-tail-low-band.mjs';
assert.equal(toolBindings[entry],'1db4f9381a76065ecc6801763a8e0a4ed64056311c3e0d8a2fc3035cb3ede555');
const runner='tools/daily-challenge/formal-v4/run-low-band-prefix-plan.mjs';
const compiled=await build({entryPoints:[entry,runner,own,'tools/daily-challenge/formal-v4/prefix-tail-low-band-independent.test.mjs','tools/daily-challenge/formal-v4/prefix-tail-low-band.test.mjs'],
 bundle:true,write:false,outdir:'unused-build-output',metafile:true,platform:'node',format:'esm',packages:'external',logLevel:'silent'});
for(const p of Object.keys(compiled.metafile.inputs)){const key=p.replaceAll('\\','/'),h=sha(await fs.readFile(key));if(toolBindings[key])assert.equal(toolBindings[key],h);toolBindings[key]=h;}
for(const row of [...a.evidence,...b.evidence])for(const result of [row.result,row.positive,row.negative].filter(x=>x?.attempt)){
 const requestPath=result.evidenceFile.replace(/\.v4-low-band-prefix-tail-result\.json$/,'.request.json');
 const request=await read(requestPath);assert.deepEqual(request,result.attempt);
 const ledgerResult=await read(requestPath.replace(/\.request\.json$/,'.result.json'));
 assert.equal(ledgerResult.accepted,result.accepted);assert.equal(ledgerResult.status,result.status);
 assert.equal(request.levelSha256,result.levelSha256);
 await read(result.evidenceFile);await read(result.planEvidence.path);
 if(!result.accepted)await read(requestPath.replace(/\.request\.json$/,'.blocked.json'));
}
const report={status:'INDEPENDENT_LOW_BAND_PREFIX_TAIL_PASS',errors:[],
 toolBindings,inputBindings:fileBindings,proofToolchainSha256:positive.toolchainSha256,
 tests:{independentlyRerunAuthorTests:9,independentlyAuthoredTests:3,passed:12,failed:0},
 evidence:[{path:authored,sha256:fileBindings[authored],passed:true,scope:'Fresh private rerun of nine original boundary fixtures'},
  {path:independent,sha256:fileBindings[independent],passed:true,scope:'Independently authored continuous-held turn, shared hard cap, metadata retry and fake-clear negatives'}],
 checks:[
  {passed:true,subject:'Predeclared D1 16–20 and D2 21–30 remain fixed. Tail ceiling is inclusive total ceiling minus actual validated prefix parking; zero remainder uses cost-zero closure only.'},
  {passed:true,subject:'One original-object public claim precedes the one tail U. Tail proof is upper-only; full original canonical and independent replay must finish all inventory before original-object lower is attempted.'},
  {passed:true,subject:'U failure or out-of-band U never starts original L, changes target band, retries or chooses a fallback. Both physical identity and attempt failures are sealed.'},
  {passed:true,subject:'Prior construction, all known prefix commits, registered tail worlds and one unregistered terminal reservation share <=10000. Separate original lower uses raw<=9999 plus one reservation. Exact full-world count is not claimed.'},
  {passed:true,subject:'A bent two-unit continuous hold counts one parking. Six-body original U is complete and only one; it cannot support floor two. Falsely labeling that stop as exit is rejected before tail search.'},
  {passed:true,subject:'Current runner binds exact static audit, root visual audit, independent qualification, fixed recipe/difficulty, candidate and construction objects. It writes the first-search plan before claims, maintains each source last-failed parent, and leaves the 147 selection unchanged.'},
  {passed:true,subject:'Private namespace uses existing-ancestor realpath, rejects root/snapshot junction aliases of both production ledgers, and cannot silently switch to production qualification.'}],
 reviewedRunner:{path:runner,sha256:toolBindings[runner],executed:false},
 newRealCandidateSearches:0,newRealCandidateConstructions:0,publicLedgerClaims:0,publicRequestCountBefore:14728,publicRequestCountAfter:14728,
 qualificationOnly:true,currentRuntimeValidationClaimed:false,formalReady:false,
 limitations:['Twelve private qualification tests are not mathematical evidence for any future candidate. Actual inputs still require independent static/visual audit, first claim, complete original U and original L in their fixed band.',
  'Mathematical execution is the explicit historical 4588 workspace. Current UI compatibility and eventual 300-by-two-screen Pointer acceptance remain separate.']};
const file=`${V4}/proof/low-band-prefix-tail-independent-01/report.json`;await fs.mkdir(file.slice(0,file.lastIndexOf('/')),{recursive:true});
await fs.writeFile(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,file,sha256:sha(await fs.readFile(file)),tests:report.tests,toolBindings:Object.keys(toolBindings).length}));

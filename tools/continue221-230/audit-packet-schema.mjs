import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {checkLevelSpecLiteral} from './levelspec-literal-check.mjs';
import {runtimeNativeArtIssues} from './runtime-native-art.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';

const files=process.argv.slice(2);
assert(files.length,'Pass final qualified packet filenames');
const output=path.resolve('deliverables/continue221-230-20260930/schema-audit-'+Date.now());
fs.mkdirSync(output);
const rows=files.map(file=>{
  const p=JSON.parse(fs.readFileSync(file)),level=p.level;
  assert(level,`${file} missing level`);
  const schema=checkLevelSpecLiteral(level,path.join(output,`level${level.id}.satisfies.ts`));
  const findings=runtimeNativeArtIssues(level);
  // The renderer explicitly falls back to the original whole outer solid plus
  // an inner-color badge when a dedicated shell sprite does not exist.
  const shellPresentationFallback=findings.filter(i=>i.reason==='Missing registered shell asset');
  const artIssues=findings.filter(i=>i.reason!=='Missing registered shell asset');
  const canonicalSha256=digest(level),jsonSha256=createHash('sha256').update(JSON.stringify(level)).digest('hex');
  const hashAlgorithm=p.levelSha256===canonicalSha256?'sha256-canonical-json':p.levelSha256===jsonSha256?'sha256-json-stringify':null;
  return {file,levelId:level.id,canonicalSha256,jsonSha256,packetSha256:p.levelSha256,hashAlgorithm,packetShaMatches:hashAlgorithm!==null,schema,artIssues,shellPresentationFallback};
});
const report={passed:rows.every(r=>r.schema.passed&&r.artIssues.length===0&&r.packetShaMatches),rows};
fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({output,passed:report.passed,rows:rows.map(r=>({id:r.levelId,schema:r.schema.passed,diagnostics:r.schema.diagnostics,artIssues:r.artIssues,shellPresentationFallback:r.shellPresentationFallback,hashAlgorithm:r.hashAlgorithm,shaMatches:r.packetShaMatches}))}));
assert(report.passed);

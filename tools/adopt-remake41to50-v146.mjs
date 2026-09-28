// Archives fresh candidate checks and verifies a reviewed subset in final LEVELS.
// Production edits remain a separate, explicit local integration step.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {IDS,VERSION,OUTPUT,BASELINE,loadApi,ruleGate,assertBaseline,checkCandidate,writeNew} from './remake41to50-v146.mjs';
import {loadReviewedSourceCatalog} from './remake41to50-source-v146.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
ruleGate();const [mode,...args]=process.argv.slice(2),{api,inputs}=await loadApi();
const baseline=JSON.parse(fs.readFileSync(BASELINE));assertBaseline(baseline);
const bind=(ids)=>{
 const bound={};
 const visit=file=>{const p=path.relative(process.cwd(),path.resolve(file)).replaceAll('\\','/');assert(!p.startsWith('../'));if(Object.hasOwn(bound,p))return;const bytes=fs.readFileSync(p);bound[p]=digest(bytes);
  if(/\.[cm]?[jt]s$/.test(p)){const parsed=ts.createSourceFile(p,bytes.toString('utf8'),ts.ScriptTarget.Latest,true);for(const statement of parsed.statements){if(!ts.isImportDeclaration(statement)&&!ts.isExportDeclaration(statement))continue;const s=statement.moduleSpecifier;if(s&&ts.isStringLiteral(s)&&/^\..*\.[cm]?[jt]s$/.test(s.text))visit(path.resolve(path.dirname(p),s.text));}}
 };
 for(const p of [...inputs,BASELINE,'docs/rules/manifest.json',`docs/mechanism-rules-v${VERSION}.md`,'docs/mechanism-rules-v1.47.0.md','tools/adopt-remake41to50-v146.mjs','tools/remake41to50-v146.mjs','tools/remake41to50-source-v146.mjs',...Object.keys(loadReviewedSourceCatalog(ids).bindings)])visit(p);
 return bound;
};
if(mode==='prepare'){
  const candidates=args.map(file=>({file,data:JSON.parse(fs.readFileSync(file))})).sort((a,b)=>a.data.level.id-b.data.level.id);
  const ids=candidates.map(c=>c.data.level.id);assert(ids.length&&new Set(ids).size===ids.length&&ids.every(id=>IDS.includes(id)));
  const folder=`${OUTPUT}/batch-${Date.now()}`,m={ruleVersion:VERSION,createdAt:new Date().toISOString(),ids,rows:[],baseline:BASELINE,baselineSha256:digest(fs.readFileSync(BASELINE)),
    campaignBefore:structuredClone(api.LEVELS),campaignBeforeSha256:digest(api.LEVELS),unchangedOutsideSubsetSha256:digest(api.LEVELS.filter(l=>!ids.includes(l.id))),inputs:bind(ids),humanBlindTested:false,releaseApproved:false};
  for(const {file,data}of candidates){
    const checks=checkCandidate(data,baseline,api),candidatePath=`${folder}/lv${data.level.id}.json`,checksPath=`${folder}/lv${data.level.id}-checks.json`;
    writeNew(candidatePath,data);writeNew(checksPath,checks);
    m.rows.push({id:data.level.id,source:file,sourceSha256:digest(fs.readFileSync(file)),candidatePath,candidateFileSha256:digest(fs.readFileSync(candidatePath)),checksPath,checksSha256:digest(fs.readFileSync(checksPath)),
      levelSha256:digest(data.level),routeSha256:digest(data.drags),lowerBound:checks.lowerBound,upperBound:checks.upperBound,starAssessment:checks.starAssessment});
    console.log(JSON.stringify({id:data.level.id,status:'candidate-pass',L:checks.lowerBound,U:checks.upperBound}));
  }
  const authorFiles=ids.map(id=>id===48?'tools/author48-v146.mjs':id<=43?'tools/author41-43-v146.mjs':id<=46?'tools/author44-46-v146.mjs':'tools/author47-50-v146.mjs');
  if(ids.includes(48)){const dir=OUTPUT+'/agent44-46/assist48';authorFiles.push(...fs.readdirSync(dir).filter(p=>p.endsWith('.mjs')).map(p=>dir+'/'+p));}
  if(ids.includes(50)){const dir=OUTPUT+'/agent47-50';authorFiles.push(...fs.readdirSync(dir).filter(p=>p.endsWith('.mjs')&&p.includes('50')).map(p=>dir+'/'+p));}
  const constructionFiles=[...new Set(authorFiles)].filter(p=>fs.existsSync(p));
  const archivePath=folder+'/construction-sources.json';writeNew(archivePath,{files:constructionFiles.map(p=>({path:p,sha256:digest(fs.readFileSync(p)),content:fs.readFileSync(p,'utf8')}))});
  m.constructionArchive={path:archivePath,sha256:digest(fs.readFileSync(archivePath))};
  const manifestPath=`${folder}/manifest.json`;writeNew(manifestPath,m);console.log(JSON.stringify({manifestPath,ids}));
}else if(mode==='verify'){
  const [file]=args,m=JSON.parse(fs.readFileSync(file)),ids=m.ids;assert.equal(m.ruleVersion,VERSION);assert.equal(m.baselineSha256,digest(fs.readFileSync(BASELINE)));
  assert.equal(digest(m.campaignBefore),m.campaignBeforeSha256);assert.equal(digest(m.campaignBefore.filter(l=>!m.ids.includes(l.id))),m.unchangedOutsideSubsetSha256);assert.deepEqual(m.rows.map(r=>r.id),m.ids);
  assert.equal(new Set(m.ids).size,m.ids.length);assert(m.ids.every(id=>IDS.includes(id)));
  assert.equal(api.LEVELS.length,200);assert.equal(digest(api.LEVELS.filter(l=>!m.ids.includes(l.id))),m.unchangedOutsideSubsetSha256,'Do not overwrite concurrent batches');
  const rows=[];
  for(const row of m.rows){
    assert.equal(digest(fs.readFileSync(row.candidatePath)),row.candidateFileSha256);assert.equal(digest(fs.readFileSync(row.checksPath)),row.checksSha256);
    const data=JSON.parse(fs.readFileSync(row.candidatePath));assert.deepEqual(api.LEVELS[row.id-1],data.level);
    assert.equal(digest(data.level),row.levelSha256);assert.equal(digest(data.drags),row.routeSha256);
    const result=checkCandidate({...data,level:api.LEVELS[row.id-1]},baseline,api);rows.push(result);
    console.log(JSON.stringify({id:row.id,status:'formal-pass',L:result.lowerBound,U:result.upperBound}));
  }
  const reportPath=`${OUTPUT}/formal-verification-${Date.now()}.json`;
  writeNew(reportPath,{status:'PASS',ruleVersion:VERSION,manifestPath:file,manifestSha256:digest(fs.readFileSync(file)),rows,inputs:bind(ids),
    campaignSha256:digest(api.LEVELS),outsideSubsetUnchanged:true,protected1to30Unchanged:digest(api.LEVELS.slice(0,30))===digest(baseline.levels.slice(0,30).map(r=>r.level)),
    pointerValidated:false,humanBlindTested:false,releaseApproved:false});
  console.log(JSON.stringify({reportPath,status:'PASS'}));
}else throw Error('Usage: prepare CANDIDATE_FILES | verify MANIFEST');

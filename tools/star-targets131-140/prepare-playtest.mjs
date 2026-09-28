// Authoring helper: reuse the already reviewed Pointer loop without editing it.
import fs from 'node:fs';
const old=fs.readFileSync('tools/star-targets141-150/playtest.mjs','utf8');
const head=`import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {observe as observeFormalModelTiming,replayTiming as replayObservedModelTiming} from '../campaign-v145/lv141-150/observed-timing-flips.mjs';
import {IDS,TARGETS,BEFORE_SHA,omitTarget,validateScoringData,replaySpatial} from './verification.mjs';
const FIXTURE='tests/fixtures/remake131to140-v172.json',OUTPUT='deliverables/star-targets131-140-20260927/agent-b';
const [beforeFile,expectedBeforeSha,ruleVersion,ruleSha]=process.argv.slice(2);
assert(beforeFile&&/^[a-f0-9]{64}$/.test(expectedBeforeSha??'')&&/^1\\.[0-9]+\\.0$/.test(ruleVersion??'')&&/^[a-f0-9]{64}$/.test(ruleSha??'')&&process.argv.length===6,'Usage: node tools/star-targets131-140/playtest.mjs BEFORE_JSON RAW_SHA256 RULE_VERSION RULE_RAW_SHA256');
const ruleFile='docs/rules/mechanism-rules-v'+ruleVersion+'.md',lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\\n'));assert.equal(lock.activeVersion,ruleVersion,'Use the separately reviewed new scoring contract');assert.equal(digest(fs.readFileSync(ruleFile)),ruleSha);
const viewport={width:Number(process.env.REMAKE_VIEWPORT_WIDTH??496),height:Number(process.env.REMAKE_VIEWPORT_HEIGHT??1078)};assert([[496,1078],[320,568]].some(([w,h])=>viewport.width===w&&viewport.height===h));
const bindings={};
function bind(file){const absolute=path.resolve(file),p=path.relative(process.cwd(),absolute).replaceAll('\\\\','/');assert(!p.startsWith('../')&&!path.isAbsolute(p));if(Object.hasOwn(bindings,p))return;const bytes=fs.readFileSync(p);bindings[p]=digest(bytes);if(/\\.[cm]?[jt]s$/.test(p)){const source=ts.createSourceFile(p,bytes.toString('utf8'),ts.ScriptTarget.Latest,true);for(const node of source.statements){if(!ts.isImportDeclaration(node)&&!ts.isExportDeclaration(node))continue;const spec=node.moduleSpecifier;if(spec&&ts.isStringLiteral(spec)&&/^\\..*\\.[cm]?[jt]s$/.test(spec.text))bind(path.resolve(path.dirname(absolute),spec.text));}}}
const tree=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())tree(p);else bind(p);}};
tree('src');tree('public/assets/art');for(const p of[beforeFile,FIXTURE,'docs/rules/manifest.json',ruleFile,'tools/star-targets131-140/browser.mjs','tools/star-targets131-140/index.html','tools/star-targets131-140/playtest.mjs'])bind(p);
assert.equal(expectedBeforeSha,BEFORE_SHA,'Known immediate-before archive only');assert.equal(digest(fs.readFileSync(beforeFile)),expectedBeforeSha,'Before archive independently pinned');
const before=JSON.parse(fs.readFileSync(beforeFile)),fixture=JSON.parse(fs.readFileSync(FIXTURE)),clean=v=>JSON.parse(JSON.stringify(v));
const compiled=await build({stdin:{resolveDir:process.cwd(),contents:"export {LEVELS} from './src/core/levels.ts';export {PuzzleModel} from './src/core/PuzzleModel.ts';export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';export {levelStarTargets,evaluateLevelStars} from './src/core/levelStarConditions.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64')),levels=clean(api.LEVELS),scoring=validateScoringData(before,fixture,levels,api);
for(const [p,h]of Object.entries(before.bindings)){if(!['src/core/remake131to140.ts',FIXTURE].includes(p))assert.equal(digest(fs.readFileSync(p)),h,'Pre-write runtime unchanged: '+p);}const sourceBindings={};for(const [p,h]of Object.entries(before.evidenceBindings??{})){assert.equal(digest(fs.readFileSync(p)),h,'Immutable evidence');sourceBindings[p]=h;}
const candidates=IDS.map(id=>{const row=fixture.rows.find(r=>r.id===id),level=levels[id-1],old=before.priorLevels[id-1],oldStars=api.levelStarTargets(old),stars=api.levelStarTargets(level);assert.deepEqual(row.level,level);const replay=replaySpatial(level,row.drags,api);assert(replay.valid&&replay.complete);assert.equal(replay.effectiveDrags,TARGETS[id]);const prefixStates=row.drags.map((_,i)=>{const r=replaySpatial(level,row.drags.slice(0,i+1),api);assert(r.valid,r.error);return JSON.parse(r.finalStateKey);});return{...row,level,oldStars,stars,prefixStates};});
`;
let body=old.slice(old.indexOf('const output=path.resolve(OUTPUT,'));
body=body.replaceAll('star-targets141-150','star-targets131-140').replace("scope:'nine scoring metadata changes and ten final LEVELS verifications'","scope:'ten scoring metadata changes and ten final LEVELS verifications'").replace('archiveContinuity,','');
const start=body.indexOf('  report.acceptedConcurrentData=');
const end=body.indexOf('  const freshBuild=',start);
body=body.slice(0,start)+"  assert.deepEqual(report.currentWorkspaceDrift,[],'No runtime/art/rule/data/tool drift accepted during this isolated input run');\n"+body.slice(end);
body=body.replace("afterLock.activeVersion==='1.78.0'","afterLock.activeVersion===ruleVersion");
fs.writeFileSync('tools/star-targets131-140/playtest.mjs',head+body);

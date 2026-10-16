import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {digest} from '../../revised-preview-validation-v160.mjs';

const reportPath=path.resolve(process.argv[2]??'');
assert(fs.existsSync(reportPath),'Pass the original report.json');
const report=JSON.parse(fs.readFileSync(reportPath,'utf8'));
assert.equal(report.status,'FAIL','Keep the original top-level FAIL');
assert.deepEqual(report.requestedIds,Array.from({length:10},(_,i)=>201+i));
assert.equal(report.rows.length,10);
for(const row of report.rows){
 assert.equal(row.status,'PASS',`Lv${row.id} Pointer`);
 assert.equal(row.settlement.earnedStars,3,`Lv${row.id} actual settlement`);
 assert.equal(row.naturalTimingReplay.passed,true,`Lv${row.id} natural clock replay`);
}
assert.deepEqual(report.errors,[]);
assert.deepEqual(report.drift,[]);
assert.deepEqual(report.sourceEvidenceDrift,[]);
const expected=['src/core/formal211to220Data.ts','src/core/remake221to230Data.ts'];
assert.deepEqual(report.currentWorkspaceDrift.map(x=>x.path).sort(),expected);
const original=file=>path.join(path.dirname(reportPath),'source-snapshot',file);
const changed=Object.fromEntries(report.currentWorkspaceDrift.map(x=>[x.path,x]));
for(const file of expected){
 assert.equal(digest(fs.readFileSync(original(file))),changed[file].priorSha256);
 assert.equal(digest(fs.readFileSync(file)),changed[file].currentSha256,
  `${file} changed again; cannot certify report-close bytes`);
}
function parse(file,text){
 const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
 assert.equal(ast.parseDiagnostics.length,0);
 const [imp,...rest]=ast.statements;
 assert(ts.isImportDeclaration(imp)&&imp.importClause?.isTypeOnly);
 assert.equal(imp.moduleSpecifier.text,'./types');
 assert.equal(imp.importClause.namedBindings.elements.length,1);
 assert.equal(imp.importClause.namedBindings.elements[0].name.text,'LevelSpec');
 const exports={};
 for(const statement of rest){
  assert(ts.isVariableStatement(statement)&&statement.modifiers?.some(x=>x.kind===ts.SyntaxKind.ExportKeyword));
  assert(statement.declarationList.flags&ts.NodeFlags.Const);
  assert.equal(statement.declarationList.declarations.length,1);
  const declaration=statement.declarationList.declarations[0];
  assert(ts.isIdentifier(declaration.name)&&declaration.initializer);
  exports[declaration.name.text]=declaration.initializer;
 }
 return {ast,exports};
}
function arrayPayload(node,ast,minimum,maximum){
 if(ts.isAsExpression(node))node=node.expression;
 assert(ts.isArrayLiteralExpression(node));
 const rows=JSON.parse(node.getText(ast));
 assert(Array.isArray(rows));
 const ids=rows.map(row=>row.id);
 assert.equal(new Set(ids).size,ids.length);
 assert(ids.every(id=>Number.isInteger(id)&&id>=minimum&&id<=maximum));
 return ids;
}
const audits={};
for(const file of expected){
 const prior=parse(file,fs.readFileSync(original(file),'utf8'));
 const current=parse(file,fs.readFileSync(file,'utf8'));
 if(file.includes('211to220')){
  const names=['FORMAL_211_220_LEVELS','FORMAL_211_220_EVIDENCE','getFormal211to220LevelStrict'];
  assert.deepEqual(Object.keys(prior.exports),names);
  assert.deepEqual(Object.keys(current.exports),names);
  const priorGetter=prior.exports.getFormal211to220LevelStrict.getText(prior.ast);
  const currentGetter=current.exports.getFormal211to220LevelStrict.getText(current.ast);
  assert.equal(currentGetter,priorGetter,'211 registry lookup function must be unchanged');
  audits[file]={priorLevelIds:arrayPayload(prior.exports.FORMAL_211_220_LEVELS,prior.ast,211,220),
   currentLevelIds:arrayPayload(current.exports.FORMAL_211_220_LEVELS,current.ast,211,220),
   priorEvidenceIds:arrayPayload(prior.exports.FORMAL_211_220_EVIDENCE,prior.ast,211,220),
   currentEvidenceIds:arrayPayload(current.exports.FORMAL_211_220_EVIDENCE,current.ast,211,220),
   unchangedLookupFunction:true,staticJsonPayloads:true};
 }else{
  assert.deepEqual(Object.keys(prior.exports),['QUALIFIED_221_230_LEVELS']);
  assert.deepEqual(Object.keys(current.exports),['QUALIFIED_221_230_LEVELS']);
  audits[file]={priorLevelIds:arrayPayload(prior.exports.QUALIFIED_221_230_LEVELS,prior.ast,221,230),
   currentLevelIds:arrayPayload(current.exports.QUALIFIED_221_230_LEVELS,current.ast,221,230),
   staticJsonPayloads:true};
 }
}
const output=path.join(path.dirname(reportPath),'supplement-disjoint-data-drift.json');
const supplement={originalReport:reportPath,originalStatus:'FAIL',levelsPassed:report.rows.map(row=>row.id),
 drift:report.currentWorkspaceDrift,audits,sharedRuntimeDrift:[],isolated201to210DataDrift:[],
 caveat:'This separate audit does not change the original FAIL status and does not validate production LEVELS adoption.',
 releaseApproved:false};
fs.writeFileSync(output,JSON.stringify(supplement,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,levelsPassed:supplement.levelsPassed,audits}));

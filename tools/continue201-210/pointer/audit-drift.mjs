import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
import ts from 'typescript';
import {digest} from '../../revised-preview-validation-v160.mjs';

const reportPath=path.resolve(process.argv[2]??'');
assert(fs.existsSync(reportPath),'Pass the original Pointer report.json');
const report=JSON.parse(fs.readFileSync(reportPath,'utf8'));
assert.equal(report.status,'FAIL','Preserve the original FAIL report');
assert.deepEqual(report.requestedIds,Array.from({length:10},(_,i)=>201+i));
assert.equal(report.rows.length,10);
for(const row of report.rows){
 assert.equal(row.status,'PASS',`Lv${row.id} Pointer`);
 assert.equal(row.settlement.earnedStars,3,`Lv${row.id} settlement`);
 assert.equal(row.naturalTimingReplay.passed,true,`Lv${row.id} natural timing`);
 assert.equal(row.nativeDrawAudit.rotated,0,`Lv${row.id} native art`);
}
assert.deepEqual(report.errors,[]);
assert.deepEqual(report.drift,[]);
assert.deepEqual(report.sourceEvidenceDrift,[]);
assert.equal(report.currentWorkspaceDrift.length,1);
const change=report.currentWorkspaceDrift[0];
assert.equal(change.path,'src/core/remake221to230Data.ts');
const original=path.join(path.dirname(reportPath),'source-snapshot',change.path);
assert.equal(digest(fs.readFileSync(original)),change.priorSha256);
const latest221Sha256=digest(fs.readFileSync(change.path));

const bundle=await build({entryPoints:['tools/continue201-210/pointer/browser.mjs'],
 bundle:true,write:false,metafile:true,platform:'browser',format:'esm',logLevel:'silent',
 plugins:[{name:'root-src',setup(compiler){compiler.onResolve({filter:/^\/src\//},args=>({path:path.resolve('.'+args.path)}));}}]});
const inputs=Object.keys(bundle.metafile.inputs).map(p=>p.replaceAll('\\','/'));
assert(inputs.some(p=>p.endsWith('/formal201to210Data.ts')));
assert(inputs.some(p=>p.endsWith('/levels.ts')));
const changedInput=inputs.find(p=>p.endsWith('/remake221to230Data.ts'));
const changedInputBytesInOutput=Object.values(bundle.metafile.outputs).reduce((sum,output)=>sum+(output.inputs[changedInput]?.bytesInOutput??0),0);
assert(changedInputBytesInOutput>0,'Audit the actual imported module, even if it is unrelated data');
function isStaticData(node){
 if(ts.isArrayLiteralExpression(node))return node.elements.every(isStaticData);
 if(ts.isObjectLiteralExpression(node))return node.properties.every(property=>
  ts.isPropertyAssignment(property)
  && (ts.isIdentifier(property.name)||ts.isStringLiteral(property.name)||ts.isNumericLiteral(property.name))
  && isStaticData(property.initializer));
 if(ts.isStringLiteral(node)||ts.isNumericLiteral(node)||node.kind===ts.SyntaxKind.TrueKeyword
  ||node.kind===ts.SyntaxKind.FalseKeyword||node.kind===ts.SyntaxKind.NullKeyword)return true;
 if(ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.MinusToken)return isStaticData(node.operand);
 return false;
}
function static221Payload(file){
 const ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
 assert.equal(ast.parseDiagnostics.length,0,`${file} parse errors`);
 assert.equal(ast.statements.length,2,`${file} must contain only a type import and one data export`);
 const [typeImport,declaration]=ast.statements;
 assert(ts.isImportDeclaration(typeImport)&&typeImport.importClause?.isTypeOnly);
 assert(ts.isVariableStatement(declaration)&&declaration.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword));
 assert.equal(declaration.declarationList.declarations.length,1);
 const item=declaration.declarationList.declarations[0];
 assert(ts.isIdentifier(item.name)&&item.name.text==='QUALIFIED_221_230_LEVELS');
 assert(item.initializer&&isStaticData(item.initializer),'221 module must be pure literal data');
 return {items:item.initializer.elements.length,staticLiteralOnly:true};
}
const before221=static221Payload(original),after221=static221Payload(change.path);
const levelsText=fs.readFileSync(path.join(path.dirname(reportPath),'source-snapshot/src/core/levels.ts'),'utf8');
assert(levelsText.includes("export { REMADE_221_230_LEVELS, CONTINUATION_LEVELS_221_230 } from './remake221to230';"));
assert(!levelsText.includes('applyRemake221to230('));
const supplement={originalReport:reportPath,originalStatus:report.status,
 individualLevelsPassed:report.rows.map(r=>r.id),originalError:report.error,
 drift:change,snapshotInputHashVerified:true,currentInputHashVerified:true,
 browserDependencyInputs:inputs.length,changedInputBytesInOutput,before221,after221,
 latest221Sha256,latest221MatchesOriginalReportClose:latest221Sha256===change.currentSha256,
 browserImports201to210Data:true,browserImportsProductionLevels:true,
 changed221FileInBrowserDependencyGraph:Boolean(changedInput),
 conclusion:'The ten isolated-object Pointer/clock/settlement rows passed. The original batch remains FAIL solely because the re-exported 221–230 data module changed during its byte-binding window. The captured and latest versions are pure literals, and production LEVELS does not apply that module. This supplement does not relabel the original report, prove the intermediate 221 bytes, or certify production adoption.',
 productionDataValidated:false,releaseApproved:false};
const output=path.join(path.dirname(reportPath),'supplement-disjoint-drift.json');
fs.writeFileSync(output,JSON.stringify(supplement,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,changed221FileInBrowserDependencyGraph:Boolean(changedInput),changedInputBytesInOutput,before221,after221,individualLevelsPassed:supplement.individualLevelsPassed}));

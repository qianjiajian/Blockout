import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {digest} from '../../../revised-preview-validation-v160.mjs';

const C='tools/campaign-v145/lv141-150/round2-c';
const B='tools/campaign-v145/lv141-150/round2-b';
const SOURCE=`${C}/native96.cs`;
const REQUIRED={
 146:[SOURCE,`${C}/assist146/native-stars.mjs`,`${C}/assist146/qualify.mjs`,
  'tools/remake111to120-spatial-floor-v147.mjs','src/core/PuzzleModel.ts','src/core/blockExitFrontier.ts'],
 148:[SOURCE,`${C}/native96.mjs`,`${C}/qualify-native96.mjs`,
  'tools/remake131to140-axis-floor-v172.mjs',
  'deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/local-graph.mjs'],
};
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const hash=h=>assert(typeof h==='string'&&/^[0-9a-f]{64}$/.test(h),'Expected SHA256');
const fileKey=p=>{assert(typeof p==='string'&&p.length,'Expected file path');const v=fs.realpathSync(path.resolve(p)).replaceAll('\\','/');return process.platform==='win32'?v.toLowerCase():v;};
function readReport(file,expected){hash(expected);const bytes=fs.readFileSync(file);assert.equal(digest(bytes),expected,`Qualification file drift: ${file}`);const r=JSON.parse(bytes);assert(record(r),'Expected qualification object');assert.equal(r.passed,true,`Qualification must have passed=true: ${file}`);return r;}
function bindings(value,label){
 assert(record(value)&&Object.keys(value).length,`${label}: nonempty bindings required`);
 const found=new Map();
 for(const [file,expected]of Object.entries(value)){
  hash(expected);const key=fileKey(file);assert(!found.has(key),`${label}: duplicate canonical path ${file}`);
  assert.equal(digest(fs.readFileSync(file)),expected,`${label}: drift ${file}`);found.set(key,expected);
 }
 return found;
}
function requireFiles(found,files,label){for(const file of files)assert.equal(found.get(fileKey(file)),digest(fs.readFileSync(file)),`${label}: missing required dependency ${file}`);}
function sameBindingSubset(inner,outer){for(const [file,h]of inner)assert.equal(outer.get(file),h,`Outer envelope must retain qualification binding ${file}`);}
function sameWrapperCode(){
 const clean=file=>{let count=0;const source=fs.readFileSync(file,'utf8').replaceAll('\r\n','\n');const cleaned=source.replace(/^export const (WRAPPER|OUT)='[^'\n]+';$/gm,(_line,key)=>{count++;return `export const ${key}='<isolated-path>';`;});assert.equal(count,2,'Alias may change exactly two path constants');return cleaned;};
 assert.equal(clean(`${B}/assist146/native-stars.mjs`),clean(`${C}/assist146/native-stars.mjs`),'Alias wrapper has a semantic code difference');
}
function validateRows(id,r){
 const size=id===146?4:6;assert(Array.isArray(r.rows)&&r.rows.length===size,`Expected ${size} complete fixtures`);
 assert.deepEqual(r.rows.map(row=>row.fixture).sort((a,b)=>a-b),Array.from({length:size},(_,i)=>i),'Missing or repeated fixture');
 for(const row of r.rows){
  assert(Number.isSafeInteger(row.states)&&row.states>0,'Positive state count');
  assert(Number.isSafeInteger(row.transitions)&&row.transitions>=0,'Finite transition count');
  assert(row.optimum===null||Number.isSafeInteger(row.optimum)&&row.optimum>=0,'Explicit exact optimum or unreachable null required');
  const optimum=row.optimum??Infinity;
  if(id===146){
   assert.equal(row.everySuccessorMatches,true);assert.equal(row.normalizationPreservesEveryOptimum,true);
   assert(Array.isArray(row.checks)&&row.checks.length===4,'Four threshold checks required');
   assert.deepEqual(row.checks.map(c=>c.floor).sort((a,b)=>a-b),[1,2,3,4]);
   for(const c of row.checks)assert.equal(c.status,optimum>=c.floor?'threshold-proven':'relaxed-shortcut','Qualification threshold must agree with exact optimum');
   assert(typeof row.input==='string'&&typeof row.output==='string','Native trace locations required');
  }else{
   assert.equal(row.everyNormalizedSuccessorMatches,true);assert.equal(row.everyNormalizationAndCanonicalKeyMatches,true);assert.equal(row.everyStateOptimumPreserved,true);
   assert(Array.isArray(row.thresholdChecks)&&row.thresholdChecks.length===4,'Four threshold checks required');
   assert.deepEqual(row.thresholdChecks.map(c=>c.threshold).sort((a,b)=>a-b),[1,2,3,4]);
   for(const c of row.thresholdChecks)assert.equal(c.thresholdProven,optimum>=c.threshold,'Qualification threshold must agree with exact optimum');
   assert(typeof row.nativeInput==='string'&&typeof row.nativeOutput==='string','Native trace locations required');
  }
 }
 if(id===146){
  assert.equal(r.budgetUnknownNotPass,true);assert(Array.isArray(r.negative));
  assert.deepEqual([...r.negative].sort(),['hidden-ice','key','lift','oversized'],'All unsupported-domain controls required');
 }else{
  assert.equal(r.budgetExhaustionNeverProven,true);assert.equal(r.unsupportedNeverProven,true);hash(r.nativeExeHash);
  const byId=new Map(r.rows.map(row=>[row.fixture,row]));
  assert.equal(byId.get(3).cells,96);assert.equal(byId.get(4).cells,80);assert.equal(byId.get(5).bodies,32);
  const executable=`deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-c/native96/native-${digest(fs.readFileSync(SOURCE)).slice(0,16)}.exe`;
  assert.equal(digest(fs.readFileSync(executable)),r.nativeExeHash,'Qualified native executable drift');
 }
 return{fixtures:size,states:r.rows.reduce((n,row)=>n+row.states,0),transitions:r.rows.reduce((n,row)=>n+row.transitions,0)};
}

/** Qualification-envelope gate for the exact native backends selected by the
 * public v1.73 entry. It does not run a solver or replace a candidate's fresh
 * floor result, source audit, full route, or final Pointer evidence.
 */
export function verifyQualification(data){
 const id=data?.level?.id;if(![146,148].includes(id))return null;
 const q=data.proofQualification;assert(record(q),'Native proof qualification required');
 const outer=bindings(q.bindings,'Candidate qualification'),top=readReport(q.file,q.sha256);
 requireFiles(outer,REQUIRED[id],'Candidate qualification');
 const topBindings=bindings(top.bindings,'Qualification report');sameBindingSubset(topBindings,outer);
 let report=top,reportFile=q.file,reportHash=q.sha256,alias=false;
 if(id===146&&Object.hasOwn(top,'qualifiedReport')){
  alias=true;assert.equal(top.sourceBackendUnchanged,true);assert.equal(top.wrapperSemanticCodeIdentical,true);
  assert.deepEqual(top.onlyDifferences,['WRAPPER self-binding filesystem path','OUT evidence isolation filesystem path']);
  requireFiles(topBindings,[...REQUIRED[id],`${B}/assist146/native-stars.mjs`,top.qualifiedReport],'Alias report');
  requireFiles(outer,[`${B}/assist146/native-stars.mjs`,top.qualifiedReport],'Candidate alias qualification');
  assert.equal(topBindings.get(fileKey(top.qualifiedReport)),top.qualifiedReportSha256,'Alias report digest binding mismatch');
  sameWrapperCode();reportFile=top.qualifiedReport;reportHash=top.qualifiedReportSha256;
  report=readReport(reportFile,reportHash);
 }else assert(!Object.hasOwn(top,'qualifiedReport'),'Aliases are supported only for146');
 const qualifiedBindings=bindings(report.bindings,'Qualified backend report');
 requireFiles(qualifiedBindings,REQUIRED[id],'Qualified backend report');sameBindingSubset(qualifiedBindings,outer);
 const coverage=validateRows(id,report);
 return{passed:true,id,qualificationFile:q.file,qualificationSha256:q.sha256,alias,
  qualifiedReport:reportFile,qualifiedReportSha256:reportHash,...coverage,
  requiredBindings:Object.fromEntries(REQUIRED[id].map(file=>[file,digest(fs.readFileSync(file))])),
  actualPublicWrapper:REQUIRED[id][1],sourceHash:digest(fs.readFileSync(SOURCE)),
  wrapperHash:digest(fs.readFileSync(REQUIRED[id][1])),candidateFloorRecomputed:false};
}

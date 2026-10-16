import fs from 'node:fs/promises';
import path from 'node:path';
import {plainGameplayFingerprint} from './design-layout-factory.mjs';
import {levelSha256} from './proof-contract.mjs';
const root='deliverables/league-v2-20261008',packets=[],receipts=[];
async function walk(directory){for(const e of await fs.readdir(directory,{withFileTypes:true})){
 const file=path.join(directory,e.name).replaceAll('\\','/');
 if(e.isDirectory()){if(e.name==='tests')continue;await walk(file);}
 else if(/^candidate-\d+\.json$/.test(e.name))packets.push(file);
 else if(e.name.endsWith('.result.json'))receipts.push(file);
}}
await walk(root);
const groups=new Map(),flags=[],budgets=[],actual=[];
for(const file of packets){
 const p=JSON.parse(await fs.readFile(file,'utf8'));if(!p.proof?.lower||!p.level)continue;
 const key=plainGameplayFingerprint(p.level);groups.set(key,[...(groups.get(key)??[]),{file,accepted:p.accepted,proofAccepted:p.proof.accepted,receipt:p.proof.proofReceipt}]);
 if(p.accepted&&!p.proof.accepted)flags.push({file,reason:'packet-accepted-with-proof-rejected'});
 if(p.levelSha256!==levelSha256(p.level)||p.proof.levelSha256!==p.levelSha256)flags.push({file,reason:'packet-proof-object-mismatch'});
}
for(const file of receipts){
 const r=JSON.parse(await fs.readFile(file,'utf8'));
 if(!r.level)continue;
 for(const [kind,s]of [['lower',r.lower??r.lowerBound?.result],['upper',r.route?.search]]){
  if(!s)continue;
  if(s.discoveredStates>10000||s.exploredStates>10000||s.budget?.maxStates>10000||s.rawFullBoardStates>10000)flags.push({file,kind,reason:'state-budget-exceeded'});
  budgets.push({file,kind,status:s.status,termination:s.termination,accepted:r.accepted,states:s.discoveredStates,raw:s.rawFullBoardStates??null});
 }
 actual.push({file,accepted:r.accepted,index:r.index??null,physicalFingerprint:r.attempt?.id,levelSha256:r.levelSha256,raw:!!(r.lower?.rawFullBoardStates!==undefined||r.lowerBound?.result?.rawFullBoardStates!==undefined),configurationRetry:r.attempt?.configurationRetry??null});
}
const duplicatePlainSearches=[...groups.values()].filter(g=>g.length>1);
for(const group of duplicatePlainSearches)flags.push({reason:'same-plain-physical-input-searched-in-multiple-packets',group});
const rawLinks=[];
const rawDir=path.join(root,'proof/raw-success-revalidation');
for(const name of await fs.readdir(rawDir))if(name.endsWith('.revalidation-link.json')){
 const file=path.join(rawDir,name).replaceAll('\\','/'),link=JSON.parse(await fs.readFile(file,'utf8'));
 const old=JSON.parse(await fs.readFile(link.previousReceipt,'utf8')),next=JSON.parse(await fs.readFile(link.nextReceipt,'utf8'));
 const same=old.levelSha256===next.levelSha256&&old.levelSha256===link.previousLevelSha256;
 if(!old.accepted||!same)flags.push({file,reason:'raw-revalidation-not-original-success-same-object'});
 rawLinks.push({file,previousAccepted:old.accepted,nextAccepted:next.accepted,sameObject:same,raw:link.rawFullBoardStates});
}
const report={status:flags.length?'AUDIT_FLAGS':'OBSERVED_LEDGER_CONSISTENT',scope:'Read-only snapshot of league-v2 attempted candidate packets/receipts; concurrently running tasks may add later rows',createdAt:new Date().toISOString(),
 counts:{candidatePackets:packets.length,attemptedPlainPackets:[...groups.values()].reduce((n,g)=>n+g.length,0),distinctPhysicalPlainInputs:groups.size,proofReceipts:actual.length,budgetRecords:budgets.length,legacyBudgetRecords:budgets.filter(b=>b.raw===null).length,strictRawBudgetRecords:budgets.filter(b=>b.raw!==null).length,rawSuccessRevalidations:rawLinks.length},
 flags,duplicatePlainSearches,rawLinks,budgetTerminationCounts:budgets.reduce((m,b)=>(m[b.termination]=(m[b.termination]??0)+1,m),{}),
 maximumStates:Math.max(0,...budgets.map(b=>b.states??0)),maximumRawStates:Math.max(0,...budgets.map(b=>b.raw??0)),configurationRetries:actual.filter(r=>r.configurationRetry)};
const output=path.join(root,`proof/ledger-audit-${Date.now()}.json`);await fs.writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,status:report.status,counts:report.counts,flags:flags.length,maximumStates:report.maximumStates,maximumRawStates:report.maximumRawStates}));

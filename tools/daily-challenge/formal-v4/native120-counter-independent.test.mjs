import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from './runtime.mjs';
import {makeNative120PrefixTailV4Plan,exploreNative120PrefixTailV4} from './prefix-tail-native-120-v4.mjs';
import {NATIVE120_ENGINE_BINDING} from './native-120-upper.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';

const runtime=await loadV4Runtime(),out=process.env.NATIVE120_COUNTER_OUT;
assert(out);await fs.mkdir(out,{recursive:false});
const hash=b=>createHash('sha256').update(b).digest('hex'),evidence=[];
const before=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(p=>p.endsWith('.request.json')).sort();
const stock={id:999941,name:'Independent native120 four-body control',width:2,height:2,timeSeconds:120,reward:0,difficulty:'hard',mechanismRules:'revised-2026-09-27-v1.5',
 blocks:[{id:'r',x:0,y:0,shape:[[0,0]],color:'red'},{id:'b',x:1,y:0,shape:[[0,0]],color:'blue'},
  {id:'g',x:1,y:1,shape:[[0,0]],color:'green'},{id:'y',x:0,y:1,shape:[[0,0]],color:'yellow'}],
 gates:[{id:'gr',side:'top',offset:0,size:1,color:'red'},{id:'gb',side:'bottom',offset:1,size:1,color:'blue'},
  {id:'gg',side:'left',offset:1,size:1,color:'green'},{id:'gy',side:'top',offset:1,size:1,color:'yellow'}]};
async function fixture(label){
 const directory=path.join(out,label);await fs.mkdir(directory);
 const candidate={sourceLevelId:stock.id,level:structuredClone(stock),prefixDrags:[{blockId:'r',path:[],exitSide:'top'}],
  constructionAccounting:{version:'late-region-static-construction-v1',completeWorldReservations:1,microStates:0,transitions:0,elapsedMilliseconds:0}};
 const p=path.join(directory,'construction.json');await fs.writeFile(p,JSON.stringify({...candidate,levelSha256:levelSha256(candidate.level),prefixSha256:routeSha256(candidate.prefixDrags)})+'\n',{flag:'wx'});
 candidate.constructionEvidence={path:p,sha256:hash(await fs.readFile(p))};
 const plan=makeNative120PrefixTailV4Plan(runtime,candidate,{qualificationOnly:true,floor:1,
  upperBudget:{maxStates:100,maxMilliseconds:120000,maxTransitions:50000,maxMicroStates:10000},lowerBudget:{maxStates:100,maxMilliseconds:5000}});
 return{candidate,plan,ledgerDirectory:path.join(directory,'private-ledger')};
}
test('a changed import-time native engine binding cannot be silently replaced by a new compiled-read SHA',async()=>{
 const f=await fixture('engine-drift'),originalRead=fs.readFile,target=path.resolve(NATIVE120_ENGINE_BINDING.tool.path);
 const actual=await originalRead(target),forged=Buffer.concat([actual,Buffer.from('\n// private read-only drift injection\n')]);
 let reads=0,result,error;
 try{
  fs.readFile=async function(p,...args){if(typeof p==='string'&&path.resolve(p)===target){reads++;return args[0]==='utf8'?forged.toString('utf8'):forged;}return originalRead.call(this,p,...args);};
  try{result=await exploreNative120PrefixTailV4(runtime,f.candidate,{plan:f.plan,qualificationOnly:true,ledgerDirectory:f.ledgerDirectory});}catch(e){error=e.message;}
 }finally{fs.readFile=originalRead;}
 assert((await fs.readFile(target)).equals(actual),'Frozen source was never changed');
 const consistent=!result?.accepted||result.upperToolchainBindings[NATIVE120_ENGINE_BINDING.tool.path]===result.upperEngine.tool.sha256;
 evidence.push({test:'import-byte-vs-fresh-read-binding',passed:consistent,reads,error,result,
  originalSha256:hash(actual),injectedReadSha256:hash(forged),fileMutation:false,privateFsReadFaultInjection:true});
 assert(consistent,'Accepted native120 evidence binds a different engine byte SHA than its own engine descriptor');
});
test('late deferred second replay seals the private claim and never invokes original lower',async()=>{
 const f=await fixture('deferred-late'),originalNow=Date.now;let now=0,fullModelCount=0;
 class Observed extends runtime.PuzzleModel{
  constructor(level,...args){super(level,...args);const ordinal=level.blocks.length===stock.blocks.length?++fullModelCount:0;
   const commit=this.commitAction.bind(this);this.commitAction=()=>{const ok=commit();if(ordinal===3&&this.snapshot().complete)now=120000;return ok;};
  }
 }
 let result;try{Date.now=()=>now;result=await exploreNative120PrefixTailV4({...runtime,PuzzleModel:Observed},f.candidate,{plan:f.plan,qualificationOnly:true,ledgerDirectory:f.ledgerDirectory});}
 finally{Date.now=originalNow;}
 assert.equal(fullModelCount,3);assert.equal(result.accepted,false);assert.equal(result.U,null);assert.equal(result.L,null);assert.equal(result.lowerBound,null);
 assert.equal(result.upperConstruction.valid,true);assert.match(result.reasons.join(';'),/deadline/);
 assert(await fs.stat(path.join(f.ledgerDirectory,result.attempt.id+'.blocked.json')));
 assert(await fs.stat(path.join(f.ledgerDirectory,'identities',result.attempt.retryIdentitySha256+'.blocked.json')));
 evidence.push({test:'second-deferred-replay-late-no-lower',passed:true,result,fullModelCount,clockRestored:true});
});
test.after(async()=>{
 const after=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(p=>p.endsWith('.request.json')).sort();assert.deepEqual(after,before);
 const fileBindings={};for(const p of ['tools/daily-challenge/formal-v4/native120-counter-independent.test.mjs','tools/daily-challenge/formal-v4/native-120-upper.mjs','tools/daily-challenge/formal-v4/prefix-tail-native-120-v4.mjs'])fileBindings[p]=hash(await fs.readFile(p));
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({status:evidence.length===2&&evidence.every(x=>x.passed)?'NATIVE120_COUNTER_NEGATIVES_PASS':'NATIVE120_COUNTER_NEGATIVES_FAIL',
  evidence,fileBindings,frozenMathSha256:runtime.toolchainSha256,runtimeBindings:runtime.toolchainBindings,
  publicBefore:before.length,publicAfter:after.length,newRealCandidateSearches:0,publicClaimsStarted:0,sourceFilesModified:false,qualificationOnly:true},null,2)+'\n',{flag:'wx'});
});

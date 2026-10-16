import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {icedFlipPrivateFixture} from './iced-flip-private-fixture.mjs';
import {assertIcedFlipConfiguration,ICED_FLIP_SLOT} from './fixed-iced-flip-construction.mjs';
import {withFixedIcedFlipAttempt} from './fixed-iced-flip-attempt.mjs';
import {assertIcedTerminalHistoryMembership} from './qualify-fixed-iced-flip.mjs';
import {createAttemptLedger} from '../formal-v3/bounded-proof.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';

const rt=await loadV4CatalogRuntime();
const out=process.env.ICED_FLIP_INDEPENDENT_OUT;
assert(out,'An explicit fresh private evidence directory is required');
await fs.mkdir(out,{recursive:false});
const sha=b=>createHash('sha256').update(b).digest('hex');
const pub='deliverables/daily-formal-v3-20261008/proof/attempts';
const before=(await fs.readdir(pub)).filter(p=>p.endsWith('.request.json')).length;
const evidence=[];
const put=async(p,q)=>{const b=JSON.stringify(q,null,2)+'\n';await fs.writeFile(p,b,{flag:'wx'});return{path:p,sha256:sha(b)};};
function fixture(){const f=icedFlipPrivateFixture();return{...f,c:{flips:f.configuration.doors,ice:f.level.blocks.filter(b=>b.frozen).map(b=>({id:b.id,count:b.frozen}))}};}

test('ordinary same-colour portals and decreasing any original ice cannot enter the fixed four-portal domain',()=>{
 const f=fixture(),h=levelSha256(f);assertIcedFlipConfiguration(f.level,f.c,{qualificationOnly:true});
 const duplicate=structuredClone(f.level);duplicate.gates.push({...duplicate.gates[0],id:'ordinary-red-decoy',side:'left',offset:0});
 assert.throws(()=>assertIcedFlipConfiguration(duplicate,f.c,{qualificationOnly:true}),/unique physical exits/);
 const decrease=structuredClone(f.c);decrease.ice.find(b=>b.count===4).count=3;
 assert.throws(()=>assertIcedFlipConfiguration(f.level,decrease,{qualificationOnly:true}),/strengthen/);
 assert.equal(levelSha256(f),h);evidence.push({test:'no-colour-only-participation-or-ice-weakening',passed:true});
});

test('an existing failed public physical input blocks before any constructor callback or construction claim',async()=>{
 const dir=await fs.mkdtemp(path.join(out,'failed-public-')),privatePublic=path.join(dir,'public'),construction=path.join(dir,'construction');
 const f=fixture(),ledger=await createAttemptLedger(privatePublic),request=await ledger.claim(f.level);
 await ledger.finish(request,{accepted:false,status:'INDEPENDENT_PRIVATE_EXISTING_FAILURE',levelSha256:levelSha256(f.level)});
 const requestFile=path.join(privatePublic,request.id+'.request.json'),resultFile=path.join(privatePublic,request.id+'.result.json');
 const original=[sha(await fs.readFile(requestFile)),sha(await fs.readFile(resultFile))];
 const base={accepted:true,level:f.level,drags:f.drags,levelSha256:levelSha256(f.level),routeSha256:routeSha256(f.drags)};
 let calls=0;const q=await withFixedIcedFlipAttempt(rt,base,rt.slots.find(s=>s.formalId===ICED_FLIP_SLOT),()=>{calls++;throw Error('unreachable');},
  {qualificationOnly:true,publicLedgerDirectory:privatePublic,ledgerDirectory:construction,configuration:f.c});
 assert.equal(calls,0);assert.equal(q.status,'ICED_FLIP_HISTORICAL_INPUT_BLOCKED');assert(q.terminalBlocked&&!q.constructionAttemptStarted);
 assert.equal(await fs.stat(construction).then(()=>true).catch(()=>false),false);
 assert.deepEqual([sha(await fs.readFile(requestFile)),sha(await fs.readFile(resultFile))],original);
 evidence.push({test:'old-failed-public-identity-callback-zero',passed:true,result:q,callbackInvocations:calls,privateClaimOnly:request.id});
});

test('terminal whitelist does not permit own basename in another root or loss of an original ledger member',async()=>{
 const make=async label=>{const directory=path.join(out,label),roots=Array.from({length:7},(_,i)=>path.join(directory,'root'+i));for(const p of roots)await fs.mkdir(p,{recursive:true});
  const old=await put(path.join(roots[6],'old.json'),{original:true});return{roots,old,snapshot:{roots:roots.map(p=>({directory:p,files:p===roots[6]?[old]:[]}))}};};
 const a=await make('cross-root'),request={id:'own',identityOrigin:'own',retryIdentitySha256:'identity'};
 const report={construction:{constructionAttempt:request,planFile:path.join(a.roots[4],'plan.json'),resultFile:path.join(a.roots[4],'own.construction-result.json')}};
 const options={publicLedgerDirectory:a.roots[0],constructionLedgerDirectory:a.roots[4]};
 assert((await assertIcedTerminalHistoryMembership(a.snapshot,report,options)).passed);
 await put(path.join(a.roots[3],'own.result.json'),{sameBasenameIsNotOwn:true});
 await assert.rejects(()=>assertIcedTerminalHistoryMembership(a.snapshot,report,options),/Unrelated ledger addition/);
 const b=await make('deleted-old');await fs.unlink(b.old.path);
 await assert.rejects(()=>assertIcedTerminalHistoryMembership(b.snapshot,{}, {publicLedgerDirectory:b.roots[0],constructionLedgerDirectory:b.roots[4]}),/disappeared/);
 evidence.push({test:'terminal-full-path-and-old-membership',passed:true});
});

test.after(async()=>{
 const after=(await fs.readdir(pub)).filter(p=>p.endsWith('.request.json')).length;assert.equal(after,before);
 const fileBindings={};for(const f of ['fixed-iced-flip.independent.test.mjs','fixed-iced-flip-construction.mjs','fixed-iced-flip-attempt.mjs','qualify-fixed-iced-flip.mjs','iced-flip-private-fixture.mjs']){
  const p='tools/daily-challenge/formal-v4/'+f;fileBindings[p]=sha(await fs.readFile(p));}
 await put(path.join(out,'report.json'),{status:evidence.length===3?'INDEPENDENT_FIXED_ICED_FLIP_NEGATIVES_PASS':'INDEPENDENT_FIXED_ICED_FLIP_NEGATIVES_INCOMPLETE',testsPassed:evidence.length,expectedTests:3,evidence,fileBindings,
  publicRequests:{before,after},newActualAdaptations:0,newRealSearches:0,newPublicClaims:0,qualificationOnly:true,formalReady:false});
});

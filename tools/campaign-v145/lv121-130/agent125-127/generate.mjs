import fs from 'node:fs';
const out='deliverables/campaign121-130-v146-20260924/agent125-127';
const src='deliverables/campaign121-130-v146-20260924/source-ledger-v165-1790428186509.json';
const ledger=JSON.parse(fs.readFileSync(src));
const byId=Object.fromEntries(ledger.rows.map(r=>[r.id,r]));
const inputs={125:'.codex-temp/remaining30-v112/final-stable/candidate-125.json',126:'.codex-temp/remaining147-v110/core-111-140/candidate-126.json',127:'.codex-temp/shutter-batch-candidate-127.json'};
const cadence={125:{difficulty:'normal',band:[11,15]},126:{difficulty:'super',band:[21,30]},127:{difficulty:'easy',band:[5,10]}};
function clone(x){return JSON.parse(JSON.stringify(x));}
function getLevel(x){return x.level||x.candidate||x.replay?.snapshot;}
function normalize(id,raw){let l=clone(getLevel(raw));
  if(!l||l.id!==id) throw new Error('bad candidate '+id);
  const c=cadence[id];
  l.id=id; l.difficulty=c.difficulty; l.mechanismRules='revised-2026-09-23-v1.4';
  l.name=`v1.66 fresh candidate Lv${id}`;
  if(id===127){l.width=7;l.height=8;l.playable=Array.from({length:8},(_,y)=>Array.from({length:7},(_,x)=>[x,y]));l.blocked=[]; if(l.gates) l.gates=l.gates.slice(0,2).map((g,i)=>({...g,id:`lv${id}-ordinary-${i}`,color:i?'yellow':'red',side:i?'bottom':'top',offset:0,size:3})).concat([{id:`lv${id}-frozen-22`,color:'blue',side:'left',offset:0,size:3,frozen:22},{id:`lv${id}-frozen-15`,color:'green',side:'right',offset:0,size:3,frozen:15},{id:`lv${id}-frozen-13`,color:'purple',side:'left',offset:5,size:3,frozen:13},{id:`lv${id}-frozen-7`,color:'pink',side:'right',offset:5,size:3,frozen:7}]);
    if(l.blocks) l.blocks=l.blocks.filter(b=>!(b.y>=8));
    if(l.shutters) l.shutters=l.shutters.filter(s=>!String(s.id).includes('staging')).map((s,i)=>({...s,id:`lv${id}-cover-${i+1}`,skin:'shutter',count:i===0?14:12}));
  }
  return l;
}
for(const id of [125,126,127]){const raw=JSON.parse(fs.readFileSync(inputs[id]));const level=normalize(id,raw);const row=byId[id];const artifact={schemaVersion:'campaign121-130-v166-generated-candidate-v1',ruleVersion:'1.66.0',levelId:id,generatedAt:new Date().toISOString(),sourceRecordSha256:row.sourceRecordSha256,sourceReviewStatus:row.reviewStatus,band:cadence[id].band,level,design:{sourceMechanisms:row.sourceFields.mechanisms,sourceComposition:row.sourceFields.composition,adaptations:id===127?['7x8 source rectangle applied','ordinary red/yellow plus frozen values 22/15/13/7','cover counts normalized to 14 and 12','generator retained as one green V3 queue']:['candidate geometry/mechanisms retained as a draft pending reviewed source reconciliation'],oldInput:inputs[id]},validation:{generated:true,staticAudit:'PENDING',freshModelReplay:'PENDING',freshLowerBound:'PENDING',pointerReplay:'PENDING',naturalClock:'PENDING',formalAdopted:false,releaseApproved:false,knownIssues:id===127?['source full-piece anchors not reviewed','opening coverage after width change must be audited','generator queue colors and block native q0 must be checked']:['historical candidate is stale and cannot be accepted as current proof','source and candidate mechanism counts require reconciliation']}};fs.writeFileSync(`${out}/candidate-${id}-v166-generated.json`,JSON.stringify(artifact,null,2)+'\n');}
fs.writeFileSync(`${out}/generation-manifest-v166.json`,JSON.stringify({schemaVersion:1,ruleVersion:'1.66.0',scope:[125,126,127],generated:[125,126,127],verified:[],adopted:[],artifacts:[125,126,127].map(id=>`candidate-${id}-v166-generated.json`),sourceLedger:src,releaseApproved:false},null,2)+'\n');


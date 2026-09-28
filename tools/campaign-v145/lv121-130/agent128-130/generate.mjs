import fs from 'node:fs';
import path from 'node:path';
import { loadApi } from '../../../native-block-repair-v143.mjs';
import { digest } from '../../../revised-preview-validation-v160.mjs';
const ROOT=process.cwd();
const OUT=path.resolve(ROOT,'deliverables/campaign121-130-v146-20260924/agent128-130');
const SRC=path.resolve(ROOT,'deliverables/campaign121-130-v146-20260924/source-ledger-v165-1790428186509.json');
const IDS=[128,129,130];
const clone=x=>JSON.parse(JSON.stringify(x));
function swapPositions(l,a,b){const A=l.blocks.find(x=>x.id===a),B=l.blocks.find(x=>x.id===b); if(!A||!B) return; const p=[A.x,A.y]; A.x=B.x;A.y=B.y;B.x=p[0];B.y=p[1];}
function make(l){
 const n=clone(l); n.mechanismRules='revised-2026-09-23-v1.4';
 n.name=`原创重排 Lv${n.id}（v1.66候选）`;
 n.reward=l.reward; n.parMoves=l.parMoves;
 if(n.id===128){
   swapPositions(n,'v111-128-b11','v111-128-b15');
   swapPositions(n,'v111-128-b14','v111-128-b20');
   n.sourceAdaptation={sourceLevel:128,sourceOpening:{pieceCount:23,shapes:{SINGLE:16,H3:3,V2:3,SQ2:1},colors:6},sourceMechanisms:{shutterCount:1,shutterCells:15,axisBadges:2},candidateMechanisms:{shutterCount:1,shutterCells:15,axisBadges:'unsupported-by-runtime; represented as ordinary H3'},unresolved:['source full composition','two circular badges interaction'],reason:'source badge logic is unclear; preserve ordinary drag semantics and record adaptation'};
 }
 if(n.id===129){
   swapPositions(n,'v112-129-b14','v112-129-b16');
   swapPositions(n,'v112-129-b20','v112-129-b21');
   for(const b of n.blocks){delete b.keyId; delete b.lockedBy; delete b.lockCount;}
   n.sourceAdaptation={sourceLevel:129,sourceOpening:{pieceCount:13,shapes:{SINGLE:4,H2:4,V2:1,V3:1,SQ2:2,L3:1},colors:6},sourceMechanisms:{numericIce:{count:1,value:10},shells:1,covers:[23,7],generators:[4,5]},candidateMechanisms:{numericIce:'unresolved',shells:'unresolved',covers:'unresolved',generators:'unresolved'},unresolved:['source board mask','generator queue/trigger','cover geometry','ice and shell bindings'],reason:'mechanism bindings lack reviewed anchors; no invented zero values'};
 }
 if(n.id===130){
   swapPositions(n,'v112-130-b13','v112-130-b17');
   swapPositions(n,'v112-130-b16','v112-130-b19');
   // encode the three reviewed key/lock groups on existing blocks; preserve occupancy.
   const keys=['agent130-key-a','agent130-key-b','agent130-key-c'];
   ['v112-130-b12','v112-130-b13','v112-130-b14'].forEach((id,i)=>{const b=n.blocks.find(x=>x.id===id); if(b)b.keyId=keys[i];});
   ['v112-130-b17','v112-130-b18','v112-130-b20'].forEach((id,i)=>{const b=n.blocks.find(x=>x.id===id); if(b){b.lockedBy=keys[i];b.lockCount=1;}});
   // Source cover geometry has no safe native hidden binding in this draft; leave it unresolved.
   n.shutters=[]; for(const b of n.blocks) delete b.shutterId;
   n.sourceAdaptation={sourceLevel:130,sourceOpening:{pieceCount:20,shapes:{SINGLE:17,H2:2,V2:1},colors:7},sourceMechanisms:{keys:3,locks:3,coverCells:20,frozen:[6,7,3]},candidateMechanisms:{keys:3,locks:3,coverCells:'unresolved',frozen:'not bound: source colors/offsets unclear'},unresolved:['source full composition','frozen gate colors/offsets','covered hidden batch shape histogram'],reason:'duplicate blue ordinary source exits conflict with unique-color rule; candidate keeps unique current gates and records frozen inventory unresolved'};
 }
 return n;
}
const {api}=await loadApi(); const ledgerRaw=JSON.parse(fs.readFileSync(SRC,'utf8')); const ledger=ledgerRaw.rows ?? ledgerRaw.levels ?? ledgerRaw; const rows=[];
for(const id of IDS){const base=api.LEVELS.find(l=>l.id===id); const level=make(base); const file=path.join(OUT,`candidate${id}-v166-draft.json`); const data={activeRuleVersion:'1.66.0',seed:`agent128-130-${id}-16601`,level,sourceRecord:ledger.find(x=>x.id===id),design:{primaryMechanism:id===128?'shutter-and-axis-badge-adaptation':id===129?'cover-generator-ice-shell-review': 'three-key-lock-and-cover',concreteDecision:'spatially shifted layout preserving board geometry while binding reviewed source mechanisms where runtime semantics are known'},originality:{layoutIntent:'regroup openings around a source-shaped top or component boundary',alignment:'edge-aligned runs with offset central carrier pieces',changes:'two disjoint position swaps plus mechanism bindings',constraints:'preserve board geometry, time, rewards, and hard rules'},drags:[],pointerValidated:false,formalAdopted:false}; fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n'); rows.push({id,file,levelSha256:digest(level),sourceRecordSha256:ledger.find(x=>x.id===id)?.sourceRecordSha256,blocks:level.blocks.length,mechanisms:{shutters:level.shutters?.length??0,keys:level.blocks.filter(b=>b.keyId).length,locks:level.blocks.filter(b=>b.lockedBy).length}});}
fs.writeFileSync(path.join(OUT,'draft-manifest-v166.json'),JSON.stringify({activeRuleVersion:'1.66.0',generatedAt:new Date().toISOString(),rows,formalAdopted:false,routeStatus:'not-run'},null,2)+'\n'); console.log(JSON.stringify({rows},null,2));


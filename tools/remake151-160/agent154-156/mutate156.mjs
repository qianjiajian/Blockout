import fs from 'node:fs';
import {rng,color,attempt,write} from './common.mjs';
const original=JSON.parse(fs.readFileSync('deliverables/remake151-160-20260927/agent154-156/candidate-156-99.json'));
const rows=[];
for(let seed=1001;seed<=1020;seed++){
 const l=structuredClone(original.level),R=rng(seed),queued=new Set(l.generators.flatMap(g=>g.queueBlockIds)),opening=l.blocks.filter(b=>!queued.has(b.id)),pins=Object.fromEntries(opening.filter(b=>b.color==='yellow').map(b=>[b.id,'yellow']));pins['r102-156-o2']='red';pins['r102-156-o4']='green';
 if(!color(opening,['red','green','cyan','orange'],seed,pins))continue;
 for(const g of l.generators){const third=l.blocks.find(b=>b.id===g.queueBlockIds[2]);third.color=R.shuffle(['red','green','cyan','orange'])[0];}
 const r=attempt(l,seed,{...original.source,correction:'Source20-body facts independently reverified: 2 yellow V2 + red ice1 H3 + yellow ice1 H2. Four16 FIFO bodies preserved. Full42cell current rectangle authored with8SQ2+S ordinary fill (13opening+16queued=29); known12 source M11 reduced to8 as minimal <=30% adaptation. Source ledger from source151_153 independent review forthcoming.'});rows.push(r);console.log(JSON.stringify(r));
}
console.log(write('mutation156-1001-'+Date.now(),rows));

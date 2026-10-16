import fs from 'node:fs';
for (const f of ['early-1-19.json','mid-20-64.json','late-65-100.json']) {
 const p='deliverables/league-regeneration-20261004/formal/'+f; const x=JSON.parse(fs.readFileSync(p,'utf8'));
 const rows=x.acceptedRows||x.accepted||[]; console.log(f, x.status, 'accepted',rows.length, 'keys',Object.keys(x));
 console.log(rows.map(a=>({index:a.index,id:a.level?.id,status:a.status,difficulty:a.level?.difficulty,specials:a.specials?.length,L:a.lower?.thresholdProven,U:a.replay?.nonClearingDrags})))
}

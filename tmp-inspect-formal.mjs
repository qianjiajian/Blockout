import fs from 'node:fs';
for (const f of ['early-1-19.json','mid-20-64.json','late-65-100.json']) {
 const x=JSON.parse(fs.readFileSync('deliverables/league-regeneration-20261004/formal/'+f,'utf8')); console.log('\n---',f);
 console.dir((x.acceptedRows||x.accepted||x.rows||[]).slice(0,2),{depth:3});
}

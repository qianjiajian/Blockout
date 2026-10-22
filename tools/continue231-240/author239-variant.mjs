import fs from 'node:fs';
let s=fs.readFileSync('tools/continue231-240/author239.mjs','utf8')
 .replaceAll('row.error=e.stack','row.error=e.message')
 .replaceAll('x:2,y:3,shape','x:2,y:0,shape')
 .replaceAll("['top',0,3],['top',4,3],['right',0,3],['right',4,3],['left',0,3],['left',5,3],['bottom',0,3]","['right',0,3],['right',4,3],['left',0,3],['left',5,3],['bottom',0,3],['bottom',4,3]")
 .replace("side:'bottom',offset:5,rimSpan:2","side:'top',offset:3,rimSpan:3")
 .replace('spawn:[2,3]','spawn:[2,0]');
fs.writeFileSync('tools/continue231-240/author239-mouth.mjs',s,{flag:'wx'});
const dir='deliverables/continue231-240-20261019/author239/run-1-1792396914071';
const rows=fs.readdirSync(dir).filter(f=>f.startsWith('candidate-')).map(f=>{const q=JSON.parse(fs.readFileSync(dir+'/'+f));return{seed:q.row.seed,file:f,status:q.row.status,error:q.row.error?.split('\n')[0]};});
fs.writeFileSync(dir+'/interrupted-report.json',JSON.stringify({status:'ALL_GENERATED_CANDIDATES_REJECTED_STATIC_MOUTH',summaryWriterFailure:'Original report serialization exceeded string size because bundled module stacks were huge. Candidate evidence unchanged.',rows},null,2),{flag:'wx'});

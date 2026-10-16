import fs from 'node:fs';
const p='playtest-results/league-full/1790842853218/report.json'; const x=JSON.parse(fs.readFileSync(p,'utf8')); console.log(Object.keys(x));
for (const k of Object.keys(x)) if(Array.isArray(x[k])) console.log(k,x[k].length)
console.dir(x,{depth:2});

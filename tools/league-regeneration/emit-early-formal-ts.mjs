import fs from 'node:fs';
const source=JSON.parse(fs.readFileSync('deliverables/league-regeneration-20261004/formal/early-1-19-formal-catalog.json'));
const entries=source.entries.map(({index,level,specials,levelSha256})=>({index,level,specials,levelSha256,gameplayKey:levelSha256,packing:0}));
const out='deliverables/league-regeneration-20261004/formal/early-1-19-formal.ts';
fs.writeFileSync(out,`// Generated from early-1-19-formal-catalog.json; isolated formal candidates.\nexport const FORMAL_EARLY_1_19 = ${JSON.stringify(entries,null,2)} as const;\n`);
console.log(JSON.stringify({status:'emitted',out,entries:entries.map(x=>x.index)}));

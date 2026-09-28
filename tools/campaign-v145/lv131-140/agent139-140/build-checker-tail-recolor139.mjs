import fs from'node:fs';import assert from'node:assert/strict';
const root='tools/campaign-v145/lv131-140/agent139-140/';let s=fs.readFileSync(root+'actual-checker-clear-lane139.mjs','utf8');
s=s.replace("level=d.level;",`level=structuredClone(d.level);
for(const [id,color]of[['n139-c16-8','blue'],['n139-c16-7','purple']]){const b=level.blocks.find(b=>b.id===id);assert(b);b.color=color;if(b.layers)b.layers[0]=color;}`);
assert(s.includes("'n139-opening-6'?[6,4]"));s=s.replace("'n139-opening-6'?[6,4]","'n139-opening-6'?[8,4]");
s=s.replaceAll('actual-checker-lane-prefix139-','actual-checker-recolor-prefix139-').replaceAll('actual-checker-lane-tail139-','actual-checker-recolor-tail139-');
fs.writeFileSync(root+'actual-checker-recolor139.mjs',s,{flag:'wx'});

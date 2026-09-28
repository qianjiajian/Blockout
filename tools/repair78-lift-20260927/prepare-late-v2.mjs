import fs from 'node:fs';
const original=fs.readFileSync('tools/repair78-lift-20260927/find-late.mjs','utf8');
const version=original
 .replace(".replace(marker,'transitions++;if(raw[c.N]!==NONE&&raw[c.N]<13)return;const cost=n.cost+k;');", ".replace(marker,'transitions++;if(raw[c.N]!==NONE&&raw[c.N]<13)return;if(raw[c.N]===NONE&&[\"r147-78-open-0\",\"r147-78-open-7\"].every(id=>raw[c.blocks.findIndex(b=>b.id===id)]===NONE))return;const cost=n.cost+k;').replace('n.clears===c.totalClears','n.clears===13&&n.s[c.N]===13');")
 .replaceAll('late-domain.mjs','late-prefix-domain-v2.mjs')
 .replace('maxMilliseconds:15000','maxMilliseconds:20000')
 .replace('late-search-','late-prefix-')
 .replace('replay?.valid&&replay.complete&&firstReveal?.cleared===13','replay?.valid&&firstReveal?.cleared===13');
fs.writeFileSync('tools/repair78-lift-20260927/find-late-prefix-v2.mjs',version,{flag:'wx'});

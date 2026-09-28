import fs from 'node:fs';
const source=fs.readFileSync('tools/repair78-lift-20260927/find-late-prefix-v2.mjs','utf8')
 .replace('n.clears===13&&n.s[c.N]===13','n.clears>=13&&n.s[c.N]===13')
 .replaceAll('late-prefix-domain-v2','late-prefix-domain-v3');
fs.writeFileSync('tools/repair78-lift-20260927/find-late-prefix-v3.mjs',source,{flag:'wx'});

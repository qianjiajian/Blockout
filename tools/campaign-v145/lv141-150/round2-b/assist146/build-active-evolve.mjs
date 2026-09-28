import fs from 'node:fs';let s=fs.readFileSync('tools/campaign-v145/lv141-150/round2-b/assist146/evolve-corridor146.mjs','utf8');
s=s.replace('let rng=146242','let rng=146247');s=s.replace('n<160','n<120');
s=s.replace("filter(({b,i})=>state[i]!==65535)","filter(({b,i})=>state[i]!==65535&&((!b.shutterId||state[level.blocks.length+level.shutters.findIndex(s=>s.id===b.shutterId)]!==65535)&&((b.frozen??0)<=parent.result.maxClearsSeen)||rnd()<.15))");
s=s.replace('parent.result.maxClearsSeen+5','parent.result.maxClearsSeen+1');
s=s.replace('const{b,i}=live[Math.floor(rnd()*live.length)]','if(!live.length)break;const{b,i}=live[Math.floor(rnd()*live.length)]');
fs.writeFileSync('tools/campaign-v145/lv141-150/round2-b/assist146/evolve-active146.mjs',s);

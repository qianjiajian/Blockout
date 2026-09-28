import fs from 'node:fs';let s=fs.readFileSync('tools/campaign-v145/lv141-150/round2-b/evolve146.mjs','utf8');
s=s.replaceAll("from '../../../","from '../../../../").replace("from './resume-search.mjs'","from '../resume-search.mjs'");s=s.replace("/round2-b',input=","/round2-b/assist146',input=");s=s.replace('let rng=146184','let rng=146242');s=s.replace('n<200','n<160');s=s.replace('maxMilliseconds:1800,maxStates:50000,floor:36','maxMilliseconds:1000,maxStates:35000,floor:31');
fs.writeFileSync('tools/campaign-v145/lv141-150/round2-b/assist146/evolve-corridor146.mjs',s);

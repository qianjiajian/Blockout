import {build} from 'esbuild';
const b=await build({stdin:{contents:`export { LEVELS } from './src/core/levels.ts'; export { mechanismsUsedByDailyLevel } from './src/core/dailyChallenge.ts';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const {LEVELS,mechanismsUsedByDailyLevel}=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
for(const id of [7,9,11,97,83,112]){const l=LEVELS.find(x=>x.id===id); console.log(id,l?.mechanismRules,l?.difficulty,l?.parMoves,l?.preservedMoveTarget,mechanismsUsedByDailyLevel(l||{}));}

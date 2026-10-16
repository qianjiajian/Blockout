import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {writeFile} from 'node:fs/promises';
const b=await build({stdin:{contents:"export * from './src/core/league.ts';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
const api=await import(`data:text/javascript;base64,${Buffer.from(b.outputFiles[0].text).toString('base64')}`);
const start=Date.parse('2026-10-01T12:00:00+08:00'),rows=[];
for(const daily of [2,5,10])for(let seed=1;seed<=12;seed++){
 let state=api.createLeague(start,seed,0),index=1;const initialRank=api.leagueRank(state.season),history=[];
 for(let day=0;day<15;day++){
  const at=start+day*api.LEAGUE_DAY_MS;
  for(let k=0;k<daily&&index<=100;k++,index++){
   const time=at+k*180000,old=state.season.bots.map(b=>b.score);
   state=api.advanceLeague(state,time);
   state.season.bots.forEach((b,i)=>assert(b.score>=old[i]));
   let attempt=api.startLeagueAttempt(state,index,time);
   for(let n=0;n<9;n++)attempt=api.collectLeagueSpecial(attempt,`badge-${n}`);
   state=api.finishLeagueAttempt(state,attempt,true,time+120000).state;
  }
  history.push({day:day+1,score:state.season.score,rank:api.leagueRank(state.season)});
 }
 state=api.advanceLeague(state,state.season.endMs);assert(api.parseLeague(state));
 assert(state.pending.rank<initialRank,'Steady participation must improve from the starting rank');
 rows.push({daily,seed,clears:state.season.cleared.length,initialRank,finalRank:state.pending.rank,history});
}
const zero=api.advanceLeague(api.createLeague(start,123,6),api.createLeague(start,123,6).season.endMs);
assert.equal(zero.pending.coins,0);assert.equal(zero.pending.toTier,5);
const old=api.createLeague(start,123,0),after=api.claimLeague({coins:100,league:api.advanceLeague(old,start+60*api.LEAGUE_DAY_MS)},start+60*api.LEAGUE_DAY_MS);
assert.equal(after.league.season.index,4);assert.equal(after.coins,100);
await writeFile('deliverables/league-full-20261001/season-scenarios.json',JSON.stringify({status:'PASS',rows,zeroScore:zero.pending,longOffline:{seasonIndex:after.league.season.index,coins:after.coins},scope:'Explicit synthetic calendar forecasts in Node; no claim human experience or actual 15-day browser wait'},null,2));
console.log(JSON.stringify({status:'PASS',scenarios:rows.length,finalRanks:[Math.min(...rows.map(r=>r.finalRank)),Math.max(...rows.map(r=>r.finalRank))]}));

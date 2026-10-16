import {LEAGUE_LEVELS} from './leagueLevelData';
import type {LeagueSeason} from './league';

export const LEAGUE_LEVEL_COUNT=100;
export function nextLeagueLevel(season:Pick<LeagueSeason,'cleared'>):number|undefined {
  const cleared=new Set(season.cleared);
  for(let index=1;index<=LEAGUE_LEVEL_COUNT;index++)if(!cleared.has(index))return index;
  return undefined;
}
export function getLeagueLevel(index:number){
  if(!Number.isInteger(index)||index<1||index>LEAGUE_LEVEL_COUNT)throw Error('Invalid league level');
  const entry=LEAGUE_LEVELS[index-1];
  if(!entry||entry.index!==index)throw Error('League content unavailable');
  return entry;
}

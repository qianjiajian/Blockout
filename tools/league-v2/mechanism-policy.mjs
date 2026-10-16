import { mechanismInventory } from './mechanism-intensity.mjs';

export { mechanismInventory };
export const MECHANISM_POLICY_VERSION = 'league-v2-mechanism-policy-1';
export const LEAGUE_MECHANISM_UNLOCKS = Object.freeze({
  'color-exit':1, 'irregular-block':5, 'frozen-exit':6, 'irregular-board':8,
  'numeric-ice':10, 'multilayer-shell':15, shutter:20, generator:35,
  'axis-block':50, 'key-lock':59, 'layered-lift':65, star:100,
});

/** These quantities are disclosed design targets, not a user-specified quota.
 * A layout that cannot carry its stage is rejected for redesign; a larger
 * count is never substituted for a genuine non-clearing lower bound. */
export function leagueMechanismPlan(index, { difficulty, blockCount=24 }={}) {
  if(!Number.isInteger(index)||index<1||index>100)throw Error('invalid league index');
  const superHard=difficulty===2||difficulty==='super'||index%5===3;
  const stage=Object.entries(LEAGUE_MECHANISM_UNLOCKS).filter(([,n])=>n<=index).at(-1)[0];
  const latestDevice=Object.entries(LEAGUE_MECHANISM_UNLOCKS).filter(([m,n])=>n<=index&&!['color-exit','irregular-block','irregular-board'].includes(m)).at(-1);
  const rotations=index>=65?['key-lock','generator','layered-lift','shutter','axis-block','multilayer-shell']:
    index>=59?['generator','multilayer-shell','axis-block','key-lock','shutter']:
    index>=50?['generator','shutter','axis-block','multilayer-shell']:
    index>=35?['shutter','multilayer-shell','generator']:
    index>=20?['multilayer-shell','numeric-ice','shutter']:
    index>=15?['multilayer-shell','numeric-ice']:
    index>=10?['frozen-exit','numeric-ice']:['frozen-exit'];
  const introductory=latestDevice&&index<latestDevice[1]+3;
  const primary=index<6?stage:introductory?latestDevice[0]:rotations[(index-(latestDevice[1]+3))%rotations.length];
  const instances=primary==='generator'?2:superHard?3:2;
  const minimumCounter=Math.max(3,Math.min(superHard?5:3,Math.floor(blockCount/4)));
  const secondary=[];
  if(index>=10&&primary!=='numeric-ice')secondary.push({mechanism:'numeric-ice',instances:superHard?3:2,minimumCounter});
  if(index>=6&&primary!=='frozen-exit')secondary.push({mechanism:'frozen-exit',instances:2,minimumCounter:3});
  if(index>=50&&primary!=='axis-block')secondary.push({mechanism:'axis-block',instances:2,minimumCounter:null});
  return {version:MECHANISM_POLICY_VERSION,index,stage,primary,introductory:Boolean(introductory),foundationOnly:index<6,
    primaryTargets:{instances,minimumCounter:['frozen-exit','numeric-ice','shutter'].includes(primary)?minimumCounter:primary==='key-lock'?(superHard?3:2):null,
      queuePerGenerator:primary==='generator'?(superHard?4:3):null,minimumLiftArea:primary==='layered-lift'?2:null},
    secondary,requiredUnlocks:Object.entries(LEAGUE_MECHANISM_UNLOCKS).filter(([,n])=>n<=index).map(([m])=>m),
    targetBasis:'Engineering plan, not a user-fixed quota: the first three slots following a device unlock feature it, then already-unlocked primary mechanisms rotate. Hard/super target 2/3 real primary instances plus capacity-aware supporting constraints, and the same-index total must exceed the old batch. Counters use actual preceding removal/peel events and are staggered, not arbitrary labels.',
    capacityFailure:'reject candidate and redesign shape/color/layout; generator rotations after37 may use one real mid-board FIFO with stronger supporting instances after finite double-device construction fails, preserving the generator stage and total-instance increase',
    numericExclusions:['axis-block','multilayer-shell','generator','layered-lift','star'],
    difficultyProof:false};
}

export function summarizeInventory(level){
  const inventory=mechanismInventory(level);
  return Object.fromEntries(Object.entries(inventory).map(([m,items])=>[m,{instances:items.length,
    values:items.filter(i=>Number.isFinite(i.value)).map(i=>i.value),
    layers:items.filter(i=>Number.isFinite(i.layers)).map(i=>i.layers),
    inventory:items.filter(i=>Number.isFinite(i.queue)).map(i=>i.queue)}]));
}

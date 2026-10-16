import fs from 'node:fs';
import { loadRuntime } from '../formal-v2/contract.mjs';
import { intensify } from './mechanism-intensity.mjs';

// This small native mounting fixture has U0. It qualifies two real machines,
// not a difficulty band, a new production slot, or layout originality.
export const generatorMountFixture = () => {
  const shape=[[0,0],[1,0],[0,1],[1,1]],colors=['red','green','yellow','cyan','blue','orange','blue','purple','pink'];
  const level={id:3,name:'Two real rim dispensers fixture',difficulty:'hard',reward:0,width:6,height:6,timeSeconds:180,parMoves:9,mechanismRules:'revised-2026-09-27-v1.5',
    blocks:colors.map((color,i)=>({id:'mount-b'+i,color,x:i%3*2,y:Math.floor(i/3)*2,shape:structuredClone(shape)})),
    gates:[{id:'red',color:'red',side:'top',offset:0,size:2},{id:'green',color:'green',side:'top',offset:2,size:2},{id:'yellow',color:'yellow',side:'top',offset:4,size:2},
      {id:'blue',color:'blue',side:'bottom',offset:0,size:2},{id:'purple',color:'purple',side:'bottom',offset:2,size:2},{id:'pink',color:'pink',side:'bottom',offset:4,size:2},
      {id:'cyan',color:'cyan',side:'left',offset:3,size:2},{id:'orange',color:'orange',side:'right',offset:0,size:2}]};
  const drags=[...[[1,'top'],[2,'top'],[0,'top'],[6,'bottom'],[7,'bottom'],[8,'bottom']].map(([i,exitSide])=>({blockId:'mount-b'+i,path:[],exitSide})),
    {blockId:'mount-b3',path:[[0,3]],exitSide:'left'},{blockId:'mount-b5',path:[[4,1],[4,0]],exitSide:'right'},
    {blockId:'mount-b4',path:[[1,2],[0,2],[0,3],[0,4]],exitSide:'bottom'}];
  return {level,drags};
};

if(process.argv[1]?.replaceAll('\\','/').endsWith('mechanism-intensity-fixtures.mjs')){
 const runtime=await loadRuntime(),root='deliverables/daily-formal-v3-20261008/mechanisms/'+(process.env.MECHANISM_FIXTURE_LABEL??'pilot-v3-2');fs.mkdirSync(root,{recursive:true});const rows=[];
 const bases=[['d1','0030',1],['d2','0180',2],['d3','0147',3]];
 for(const [label,num,difficulty]of bases){const basePath=`deliverables/daily-formal-v3-20261008/design/global-pilot-02/candidate-${num}.json`,base=JSON.parse(fs.readFileSync(basePath));
  for(const mechanism of ['frozen-exit','numeric-ice','axis-block','key-lock','star','colored-grid','flip-door','bomb','shutter','multilayer-shell','layered-lift','generator']){
   const result=await intensify(base.level,base.drags,mechanism,{runtime,difficulty,sourceLevelId:base.sourceLevelId,maxAttempts:12});const path=`${root}/${label}-${mechanism}.json`;fs.writeFileSync(path,JSON.stringify({...result,basePath,fixtureOnly:true,newLowerBoundCertified:false},null,2)+'\n');const row={path,difficulty,mechanism,ok:result.ok,U:result.replay?.nonClearingDrags,instances:result.participation?.instanceCount,counters:result.participation?.details.map(x=>x.value??null),reason:result.ok?null:result.failedAttempts.at(-1)?.error};rows.push(row);console.log(JSON.stringify(row));
  }
 }
 const base=generatorMountFixture(),result=await intensify(base.level,base.drags,'generator',{runtime,difficulty:1,maxAttempts:12});const path=root+'/two-rim-generator-qualification.json';fs.writeFileSync(path,JSON.stringify({...result,fixtureOnly:true,difficultyQualified:false,note:'Mounting/activity fixture U0; not a D1 production candidate.'},null,2)+'\n');rows.push({path,mechanism:'generator',mountingQualificationOnly:true,ok:result.ok,U:result.replay?.nonClearingDrags,reason:result.failedAttempts.at(-1)?.error});
 fs.writeFileSync(root+'/summary.json',JSON.stringify({schemaVersion:1,rows,acceptedMechanismFixtures:rows.filter(r=>r.ok).length,formalCandidates:0},null,2)+'\n');console.log(JSON.stringify(rows.at(-1)));
}

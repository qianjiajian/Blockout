// v1.29 authoring subcheck. Never alter, skip, reorder or recolor live cargo.
// A passing color check does not certify mounting, solvability or difficulty.
const COLORS=new Set(['red','blue','green','yellow','purple','orange','cyan','pink']);
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const idValid=value=>typeof value==='string'&&value.trim().length>0;

export function auditGeneratorQueueColors(level){
  const issues=[],generators=[],stats={generators:0,queuedBlocks:0,adjacentPairs:0,consecutiveSameColorPairs:0};
  const add=(code,message,details={})=>issues.push({code,message,...details});
  const finish=()=>({ruleVersion:'1.29.0',levelId:level?.id,passed:issues.length===0,issues,generators,stats,
    mapsModified:false,solvabilityValidated:false,difficultyValidated:false,pointerValidated:false,releaseApproved:false});
  if(!record(level)){add('invalid-level','Expected an authored level object.');return finish();}
  if(level.generators===undefined)return finish();
  if(!Array.isArray(level.generators)){add('invalid-generators','Generators must be an array.');return finish();}
  stats.generators=level.generators.length;
  if(!stats.generators)return finish();
  if(!Array.isArray(level.blocks)){add('invalid-blocks','Generator queue colors require the authored blocks array.');return finish();}
  const blocks=new Map(),ambiguous=new Set();
  for(const block of level.blocks){
    if(!record(block)||!idValid(block.id)){add('invalid-block','Each block must have a nonblank string ID.');continue;}
    if(blocks.has(block.id)){ambiguous.add(block.id);add('duplicate-block-id','Duplicate block IDs make queue colors ambiguous.',{blockId:block.id});}
    else blocks.set(block.id,block);
  }
  const machineIds=new Set(),queueOwners=new Map();
  for(const [machineIndex,generator]of level.generators.entries()){
    if(!record(generator)){add('invalid-generator','Each generator must be an object.');continue;}
    const generatorId=idValid(generator.id)?generator.id:`<generator-${machineIndex+1}>`;
    if(!idValid(generator.id))add('invalid-generator-id','Generator ID must be a nonblank string.',{generatorId});
    else if(machineIds.has(generator.id))add('duplicate-generator-id','Generator IDs must identify distinct machines.',{generatorId});
    machineIds.add(generatorId);
    const row={generatorId,queue:[],pairsChecked:0,sameColorPairs:[]};generators.push(row);
    if(!Array.isArray(generator.queueBlockIds)){add('invalid-generator-queue','queueBlockIds must be an authored ordered array.',{generatorId});continue;}
    stats.queuedBlocks+=generator.queueBlockIds.length;
    for(const [offset,blockId]of generator.queueBlockIds.entries()){
      const queueIndex=offset+1,details={generatorId,queueIndex,blockId};let color=null;
      if(!idValid(blockId))add('invalid-queue-block-id','Queue entries must be nonblank block IDs.',{generatorId,queueIndex});
      else{
        if(queueOwners.has(blockId))add(queueOwners.get(blockId)===machineIndex?'duplicate-queue-block':'shared-queue-block',
          'A real block may appear only once in exactly one generator queue.',details);
        else queueOwners.set(blockId,machineIndex);
        const block=blocks.get(blockId);
        if(!block)add('missing-queue-block','The queued block ID does not resolve to a real authored block.',details);
        else if(ambiguous.has(blockId))add('ambiguous-queue-block','This block ID resolves to multiple authored blocks.',details);
        else{
          const layers=block.layers;
          if(!COLORS.has(block.color))add('invalid-block-color','Authored block color must use the existing eight-color palette.',details);
          if(layers!==undefined&&(!Array.isArray(layers)||layers.length<1||layers.length>2||Array.from(layers).some(c=>!COLORS.has(c)))){
            add('invalid-block-layers','Authored layers must contain one or two known colors.',details);
          }else{
            const outer=layers?.[0]??block.color;
            if(COLORS.has(outer))color=outer;
            else add('unknown-output-color','The first visible output color cannot be determined.',details);
          }
        }
      }
      row.queue.push({index:queueIndex,blockId:idValid(blockId)?blockId:null,color});
    }
    // Do not use mutable head/remaining, current board neighbors or later peeled
    // colors: this is the full fixed authored sequence for THIS machine only.
    for(let offset=1;offset<row.queue.length;offset++){
      const previous=row.queue[offset-1],current=row.queue[offset];
      if(previous.color===null||current.color===null)continue;
      row.pairsChecked++;stats.adjacentPairs++;
      if(previous.color===current.color){
        const pair={queueIndex:current.index,previousBlockId:previous.blockId,blockId:current.blockId,color:current.color};
        row.sameColorPairs.push(pair);stats.consecutiveSameColorPairs++;
        add('consecutive-generator-color','Consecutive cargo from the same generator must have different initial outer colors.',{generatorId,...pair});
      }
    }
  }
  return finish();
}

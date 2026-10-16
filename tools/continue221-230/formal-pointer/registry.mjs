import assert from 'node:assert/strict';
import {build} from 'esbuild';

export async function loadRegistry(){
  const result=await build({stdin:{contents:"export * from './src/core/formal221to230Data.ts'; export {LEVELS,getLevelStrict} from './src/core/levels.ts';",resolveDir:process.cwd(),sourcefile:'formal-pointer-registry-entry.ts',loader:'ts'},
    bundle:true,write:false,format:'esm',platform:'node',metafile:true,logLevel:'silent'});
  const api=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
  assert.equal(api.LEVELS.length,200,'Production boundary must remain 200');
  assert.deepEqual(api.FORMAL_221_230_LEVELS.map(level=>level.id),Array.from({length:10},(_,i)=>221+i));
  for(const level of api.FORMAL_221_230_LEVELS){
    assert.equal(api.getFormal221to230LevelStrict(level.id),level);
    assert.throws(()=>api.getLevelStrict(level.id),RangeError);
  }
  return {api,inputs:Object.keys(result.metafile.inputs).filter(file=>file!=='formal-pointer-registry-entry.ts')};
}

import fs from 'node:fs';

// Read-only ancestry, following only real design-candidate references. Never
// infer an independent prototype merely because a newer file has another name.
export function createReferenceLineageReader({onError=()=>{}}={}){
 const memo=new Map();
 const norm=p=>p.replaceAll('\\','/');
 const direct=c=>Boolean(c?.provenance?.partitionSearch&&c.provenance.colouringSearch
  &&c.provenance.sourceTemplateCopied===false&&c.provenance.sourceBoardExactlyRetained===true
  &&c.provenance.sourceShapeMultisetChanged===true);
 const strings=(v,out=new Set())=>{
  if(typeof v==='string'&&/^deliverables\/.+\/design\/.+\/candidate-[^/]+\.json$/.test(norm(v)))out.add(norm(v));
  else if(Array.isArray(v))for(const x of v)strings(x,out);
  else if(v&&typeof v==='object')for(const [k,x]of Object.entries(v))if(!['selectionDiversity','comparisons','toolchainBindings','proofToolchainBindings'].includes(k))strings(x,out);
  return out;
 };
 function inspect(input,visiting=new Set()){
  const p=norm(input);if(memo.has(p))return memo.get(p);
  if(visiting.has(p))return{path:p,roots:[],ancestors:[],unknownReasons:['cyclic-ancestry'],directWholeBoard:false};
  visiting=new Set(visiting);visiting.add(p);
  let c;try{c=JSON.parse(fs.readFileSync(p,'utf8'));}catch(error){onError({path:p,error:error.message,phase:'ancestry-read'});return{path:p,roots:[],ancestors:[],unknownReasons:['unreadable-ancestor'],directWholeBoard:false};}
  const isDirect=direct(c),roots=new Set(),ancestors=new Set(),unknownReasons=[];
  if(isDirect)roots.add(p);
  else{
   const linked=strings(c.provenance);
   const original=c.sourceLedger?.snapshots?.candidate?.original?.path;if(original)linked.add(norm(original));
   if(c.baseInputFile)linked.add(norm(c.baseInputFile));
   linked.delete(p);
   for(const q of linked){
    if(!fs.existsSync(q)){unknownReasons.push(`missing-ancestor:${q}`);continue;}
    ancestors.add(q);const parent=inspect(q,visiting);for(const x of parent.roots)roots.add(x);for(const x of parent.ancestors)ancestors.add(x);unknownReasons.push(...parent.unknownReasons);
   }
   if(!linked.size)unknownReasons.push('no-bound-whole-board-ancestor');
  }
  const result={path:p,roots:[...roots].sort(),ancestors:[...ancestors].sort(),unknownReasons:[...new Set(unknownReasons)],directWholeBoard:isDirect};memo.set(p,result);return result;
 }
 return{inspect,isDirectWholeBoard:direct};
}

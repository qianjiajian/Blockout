import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');

/** Verify the provenance of already inspected real game screenshots. Does not
 * manufacture a manual review or substitute screenshots for gameplay tests. */
export async function auditLeagueVisual({visualFile,selections,expectedCount=100}){
 const errors=[],bindings={},seen=new Set();
 const read=async file=>{const b=await fs.readFile(file);bindings[file]=sha(b);return JSON.parse(b);};
 const visual=await read(visualFile),root=path.dirname(visualFile),capture=await read(path.join(root,'report.json'));
 if(selections.length!==expectedCount||new Set(selections.map(r=>r.index)).size!==expectedCount)errors.push('selection-count');
 if(visual.status!=='CANDIDATE_ATLAS_MANUALLY_INSPECTED_NOT_FORMAL'||visual.captures!==expectedCount||visual.evidence?.length!==expectedCount||new Set(visual.evidence?.map(r=>r.index)).size!==expectedCount)errors.push('manual-review-incomplete');
 if(capture.status!=='CANDIDATE_OPENINGS_CAPTURED_NOT_FORMAL'||capture.rows?.length!==expectedCount||new Set(capture.rows?.map(r=>r.index)).size!==expectedCount||capture.errors?.length||!capture.realGameplayRenderer||capture.viewport?.width!==496||capture.viewport?.height!==1078)errors.push('real-capture-incomplete');
 const required=['tools/league-v2/pointer.html','tools/league-v2/pointer-browser.mjs','tools/league-v2/review-capture.mjs','src/game/ColorEscapeGame.ts','src/game/gameplayArtLayout.ts','src/game/artManifest.ts','src/core/PuzzleModel.ts','src/core/leagueRun.ts'];
 for(const f of required)if(!capture.bindings?.[f])errors.push('capture-binding-missing:'+f);
 for(const[f,hash]of Object.entries(capture.bindings??{})){bindings[f]=sha(await fs.readFile(f));if(bindings[f]!==hash)errors.push('capture-input-changed:'+f);}
 for(const s of selections){
  const v=visual.evidence?.find(r=>r.index===s.index),c=capture.rows?.find(r=>r.index===s.index),proof=await read(s.proofFile);
  if(!v||!c||v.levelSha256!==proof.levelSha256||c.levelSha256!==proof.levelSha256||c.proofFile!==s.proofFile||c.proofFileSha256!==bindings[s.proofFile]||c.image!==v.image||c.imageSha256!==v.imageSha256){errors.push('visual-object-binding:'+s.index);continue;}
  if(c.status!=='CANDIDATE_OPENING_CAPTURED'||c.storageViolations?.length||!c.drawAudit?.calls||c.drawAudit.rotated||c.drawAudit.canvasRotationCalls)errors.push('capture-render-invalid:'+s.index);
  if(seen.has(v.imageSha256))errors.push('reused-image:'+s.index);seen.add(v.imageSha256);
  const f=path.join(root,v.image),b=await fs.readFile(f);bindings[f]=sha(b);
  if(bindings[f]!==v.imageSha256||b.length<24||b.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||b.readUInt32BE(16)!==496||b.readUInt32BE(20)!==1078)errors.push('image-content-or-dimensions:'+s.index);
  for(const[asset,hash]of Object.entries(proof.staticAudit?.assetBindings??{})){
   const file=path.join('public',asset).replaceAll('\\','/');bindings[file]??=sha(await fs.readFile(file));
   if(c.assetBindings?.[file]!==hash||bindings[file]!==hash)errors.push('capture-asset-binding:'+s.index+':'+asset);
  }
 }
 for(const[f,hash]of Object.entries(bindings))if(sha(await fs.readFile(f))!==hash)errors.push('visual-input-changed-during-audit:'+f);
 return {passed:errors.length===0,expectedCount,count:capture.rows?.length??0,errors,bindings,formalReady:false};
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {VERSION,NATIVE_QUALIFICATION_READY,NATIVE_EVIDENCE_HELPER,assertShellProvidedNativeQualificationConfigV198,qualifyShellProvidedNativeV198} from './qualify-shell-provided-native-history09-catalog-copy-v198.mjs';

// Synthetic descriptors only. No level/input construction, model, browser,
// replay, search, history consumer or real evidence read is performed.
const prefix='deliverables/daily-formal-v4-20261008/proof/';
const keys=['candidate','rootDesign','pointer','visual','completion','mechanismReview'];
function config(){return{version:VERSION,...Object.fromEntries(keys.map((key,i)=>[key,{path:prefix+'synthetic-native-qualifier-'+key+'.json',sha256:String(i+1).repeat(64)}])),output:prefix+'synthetic-native-qualification.json'};}

test('native qualifier remains disabled before any descriptor or evidence IO',async()=>{
 assert.equal(NATIVE_QUALIFICATION_READY,false);
 assert.equal(NATIVE_EVIDENCE_HELPER.path,'tools/daily-challenge/formal-v4/shell-native-execution-evidence-history09-v198.mjs');
 await assert.rejects(qualifyShellProvidedNativeV198(null),/Native current-UI qualifier is not independently enabled/);
 await assert.rejects(qualifyShellProvidedNativeV198({path:'missing-do-not-read.json',sha256:'a'.repeat(64)}),/Native current-UI qualifier is not independently enabled/);
});

test('native qualification config is distinct from the projected qualification contract',()=>{
 const c=config();assert.equal(assertShellProvidedNativeQualificationConfigV198(c),c);
 c.version='shell-provided-original-evidence-current-ui-qualification-v198-history09-catalog-copy-01';
 assert.throws(()=>assertShellProvidedNativeQualificationConfigV198(c));
});

test('every required acceptance descriptor requires its exact hash and rejects extra fields',()=>{
 for(const key of keys){
  const missing=config();delete missing[key];assert.throws(()=>assertShellProvidedNativeQualificationConfigV198(missing));
  const bad=config();bad[key].sha256='PENDING';assert.throws(()=>assertShellProvidedNativeQualificationConfigV198(bad));
  const extra=config();extra[key].accepted=true;assert.throws(()=>assertShellProvidedNativeQualificationConfigV198(extra));
 }
 const unsupported=config();unsupported.skipPointer=true;assert.throws(()=>assertShellProvidedNativeQualificationConfigV198(unsupported));
});

test('qualification cannot overwrite any input descriptor or escape its proof output directory',()=>{
 for(const key of keys){const c=config();c.output=c[key].path;assert.throws(()=>assertShellProvidedNativeQualificationConfigV198(c));}
 for(const out of ['outside.json',prefix+'../escape.json',prefix+'nested/../escaped.json',prefix+'not-json.txt']){const c=config();c.output=out;assert.throws(()=>assertShellProvidedNativeQualificationConfigV198(c));}
});

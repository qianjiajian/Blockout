import fs from 'node:fs';
let s=fs.readFileSync('tools/remake111to120-spatial-floor-v147.mjs','utf8');
s=s.replace("from './revised-preview-validation-v160.mjs'","from '../../../revised-preview-validation-v160.mjs'");
s=s.replace('diagnosticTrace=false}={})','diagnosticTrace=false,startState=null}={})');
s=s.replace('start=normalized(c.initial),began=','start=normalized(startState?Uint16Array.from(startState):c.initial),began=');
fs.writeFileSync('tools/campaign-v145/lv141-150/round2-b/resume-search.mjs',s);

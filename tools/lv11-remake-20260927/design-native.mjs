import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {compileLevel} from '../remake21to30-mask-floor.mjs';
import {equivalentBlockGroups} from '../remake21to30-symmetry-floor-v139.mjs';
import {compileNative41,NATIVE_SOURCE} from '../remake41-optional-native-v146.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
export function runStaticNative(level,{artifactRoot,maxMilliseconds=500,maxStates=300000,floor=21}={}){
 if(!artifactRoot)throw Error('Explicit isolated artifactRoot required');
 const binary=compileNative41(path.join(artifactRoot,'native')),c=compileLevel(level);
 const payload={width:c.W,height:c.H,initial:[...c.initial],blocks:c.blocks.map(b=>({ice:b.ice,revealAt:b.revealAt,spawn:b.initial,poses:b.poses.map(p=>p?{lo:p.mask[0],hi:p.mask[1],top:p.mask[2],exit:p.exits[0]?(p.exits[0].frozen??0):-1,neighbors:p.neighbors}:null)})),covers:c.covers.map(s=>({count:s.count,lo:s.mask[0],hi:s.mask[1],top:s.mask[2]})),generators:[],groups:equivalentBlockGroups(c),floor,maxStates,maxMilliseconds,normalize:true,symmetry:true,collect:false};
 const folder=path.join(artifactRoot,'run-'+Date.now()+'-'+process.pid);fs.mkdirSync(folder,{recursive:true});const input=path.join(folder,'input.json'),output=path.join(folder,'output.json');fs.writeFileSync(input,JSON.stringify(payload),{flag:'wx'});
 execFileSync(binary.exe,[path.resolve(input),path.resolve(output)],{windowsHide:true,stdio:'pipe',timeout:maxMilliseconds+10000});
 return {...JSON.parse(fs.readFileSync(output)),input,output,binary,levelSha256:digest(level),sourceHash:digest(fs.readFileSync(NATIVE_SOURCE)),screeningOnly:true};
}

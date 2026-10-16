import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {keyPayload} from '../../remake191-200/author194-196/key-floor.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
const root='deliverables/continue221-230-20260930/hard/native-grid';fs.mkdirSync(root,{recursive:true});
const source='tools/continue221-230/author-hard20260930/native-grid32.cs';
export function gridPayload(level,opts={}){const projected=structuredClone(level);delete projected.coloredGrids;const {p,c}=keyPayload(projected,{floor:16,maxMilliseconds:3500,maxStates:900000,...opts});
 for(const[i,b]of level.blocks.entries())p.blocks[i].forbidden=(b.layers??[b.color]).map(color=>{const out=[0,0,0,0];for(const g of level.coloredGrids??[])if(g.color!==color)for(const[x,y]of g.cells){const at=y*level.width+x;out[at>>>5]|=1<<(at&31);}return out;});return{p,c};}
export function runGrid(p){const sourceHash=digest(fs.readFileSync(source)),exe=path.resolve(root,'grid-'+sourceHash.slice(0,12)+'.exe');if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(source)],{windowsHide:true,stdio:'pipe'});
 const dir=path.resolve(root,'run-'+Date.now()+'-'+Math.random().toString(16).slice(2,7));fs.mkdirSync(dir);const input=dir+'/input.json',output=dir+'/output.json';fs.writeFileSync(input,JSON.stringify(p));execFileSync(exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:p.maxMilliseconds+3000});return{...JSON.parse(fs.readFileSync(output)),input,output,source,sourceHash,inputSha256:digest(p),qualificationRequired:true};}
export function gridFloor(level,opts={}){const{p}=gridPayload(level,opts);return runGrid(p);}

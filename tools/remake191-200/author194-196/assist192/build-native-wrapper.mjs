import fs from 'node:fs';
const own='tools/remake191-200/author194-196/assist192/';
const raw=fs.readFileSync('tools/remake191-200/author191-193/native-witness192.mjs','utf8');
const imports="import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{execFileSync}from'node:child_process';import{keyPayload}from'../key-floor.mjs';import{api,digest}from'../common.mjs';import{each,clearCount}from'../../../campaign-v145/lv131-140/agent139-140/axis128-graph.mjs';\nconst OUT='deliverables/remake191-200-20260927/author194-196/assist192';const source='"+own+"native-witness192.cs';\n";
fs.copyFileSync('tools/remake191-200/author191-193/native-witness192.cs',own+'native-witness192.cs',fs.constants.COPYFILE_EXCL);
fs.writeFileSync(own+'native-witness192.mjs',imports+raw.slice(raw.indexOf('export function nativeWitness192')),{flag:'wx'});
let s=fs.readFileSync(own+'free-h4.mjs','utf8');
s=s.replace("import {replay} from '../../replay.mjs';","import {replay} from '../../replay.mjs';import {nativeWitness192} from './native-witness192.mjs';")
 .replace('200192','201192')
 .replace('s=searchSpatial(project(l),api,{floor:21,maxMilliseconds:500,maxStates:15000,maxTransitions:170000,normalize:true,orderSeed:a,diagnosticTrace:true});','s=nativeWitness192(l,{floor:21,maxMilliseconds:700,maxStates:90000});');
fs.writeFileSync(own+'native-free-h4.mjs',s,{flag:'wx'});

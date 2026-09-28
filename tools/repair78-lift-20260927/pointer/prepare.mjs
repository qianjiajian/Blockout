import fs from 'node:fs';
const target='tools/repair78-lift-20260927/pointer',previous='tools/resolve78-20260927';
let header=fs.readFileSync(previous+'/playtest-header.txt','utf8')
 .replaceAll("from '../", "from '../../")
 .replaceAll('resolve78-20260927','repair78-lift-20260927/pointer')
 .replace("const OUTPUT='deliverables/repair78-lift-20260927/pointer/pointer';", "const OUTPUT='deliverables/repair78-lift-20260927/pointer';")
 .replace('validateData,replaySpatial','validateRepair,replaySpatial,inspectReveal,spatialRevealProof')
 .replace('ruleVersion,ruleSha]=process.argv.slice(2)','ruleVersion,ruleSha,caseName]=process.argv.slice(2)')
 .replace('process.argv.length===8&&','process.argv.length===9&&')
 .replace('RULE_VERSION RULE_SHA\');','RULE_VERSION RULE_SHA CASE(normal|late-no-external)\');\nassert([\'normal\',\'late-no-external\'].includes(caseName));')
 .replace("for(const[p,h]of Object.entries(before.bindings)){assert.equal(digest(fs.readFileSync(p)),h,'Solve-only task may not change any baseline binding: '+p);bind(p);}", "for(const[p,h]of Object.entries(before.bindings)){if(p!=='src/core/levels.ts')assert.equal(digest(fs.readFileSync(p)),h,'Only the approved final LEVELS wiring may change: '+p);bind(p);}\nconst newSourceFiles=Object.keys(bindings).filter(p=>p.startsWith('src/')&&!Object.hasOwn(before.bindings,p));assert.deepEqual(newSourceFiles,['src/core/level78LateLiftRepair.ts'],'Only the approved Level 78 repair module may be added');")
 .replace("assert.deepEqual(source.drags??source.route,route.drags);", "const routeField=evidence.routeField??'drags';assert(['drags','lateDrags'].includes(routeField));assert.deepEqual(source[routeField],route.drags);")
 .replace('validation=validateData(before,route,levels,api)','validation=validateRepair(before,route,levels,api)')
 .replace('return{...route,level,oldStars:stars,stars,prefixStates};', "const revealProof=spatialRevealProof(level,route.drags,api);if(caseName==='normal')assert(route.drags.length<=stars.moveTarget,'Normal route must reach current three-star drag target');else assert.deepEqual(revealProof.remainingExternalIds,[],'All opening blocks must already be cleared at the first reveal event');return{...route,level,oldStars:stars,stars,prefixStates,revealProof};")
 .replace('`pointer-${Date.now()}-', '`pointer-${caseName}-${Date.now()}-')
 .replace("scope:'Lv78 solve-only final LEVELS route verification'", "scope:'Lv78 hidden-lift repair final LEVELS route verification',caseName")
 .replace('all200Preserved:true','other199Preserved:true')
 .replace('RESOLVE78_PREFLIGHT_ONLY','REPAIR78_PREFLIGHT_ONLY');
let old=fs.readFileSync(previous+'/playtest.mjs','utf8'),loop=old.slice(old.indexOf('const snapshotRoot='))
 .replaceAll('resolve78-20260927','repair78-lift-20260927/pointer')
 .replace("const row={id,status:'running'", "const row={id,caseName,spatialRevealProof:data.revealProof,status:'running'")
 .replace('row.naturalTimingReplay=replayObservedModelTiming(level,timing,api);', "row.naturalTimingReplay=replayObservedModelTiming(level,timing,api);row.actualRevealProof=inspectReveal(level,timing.events,timing.initial);assert.deepEqual(row.actualRevealProof.remainingExternalIds,data.revealProof.remainingExternalIds);if(caseName==='late-no-external')assert.deepEqual(row.actualRevealProof.remainingExternalIds,[],'No external clears may assist ice after reveal');")
 .replace("console.log(JSON.stringify({id,status:row.status", "console.log(JSON.stringify({id,caseName,status:row.status");
fs.writeFileSync(target+'/playtest-header.txt',header);
fs.writeFileSync(target+'/playtest.mjs',header+'\n'+loop);
fs.writeFileSync(target+'/browser.mjs',fs.readFileSync(previous+'/browser.mjs','utf8').replace('Level 78 solve verification','Level 78 hidden-lift repair verification'));
fs.writeFileSync(target+'/index.html',fs.readFileSync(previous+'/index.html','utf8').replaceAll('resolve78-20260927','repair78-lift-20260927/pointer').replaceAll('第78关重新求解正式输入验收','第78关升降隐藏层修复正式输入验收'));

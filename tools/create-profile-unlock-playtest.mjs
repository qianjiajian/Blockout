import{readFile,writeFile}from'node:fs/promises';
let s=await readFile('tools/playtest-player-profile.mjs','utf8');s=s.slice(0,s.indexOf('try{for(')).replace('player-profile-20261008','profile-unlocks-20261009');
s=s.replace("featureSeen:['basics']","featureSeen:['basics'],boosterUnlockSeen:['time','rocket','pulse']");
s+=`try{for(const width of [320,496])for(const language of ['zh-CN','en']){
 const context=await browser.newContext({viewport:{width,height:width===320?568:1078}}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('Persistent storage forbidden');};Storage.prototype.setItem=()=>{throw Error('Persistent storage forbidden');};});
 await p.goto(origin+'/profile-fixture?'+language);await p.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.homeProfileArt);
 await click(p,'homeProfile');await click(p,'profile.edit');await click(p,'profile.nextPage');await screenshot(p,'locked-avatars-'+width+'-'+language);
 await click(p,'profile.select.15');assert.equal(await p.evaluate(()=>window.__COLOR_ESCAPE__.profileDraftAvatar),1);
 await click(p,'profile.frameTab');await click(p,'profile.select.9');assert.equal(await p.evaluate(()=>window.__COLOR_ESCAPE__.profileDraftFrame),7);await click(p,'profile.nextPage');await click(p,'profile.select.18');await screenshot(p,'locked-frames-'+width+'-'+language);
 await click(p,'profile.close');await p.evaluate(()=>{const g=window.__COLOR_ESCAPE__;g.save.highestLevel=200;g.save.rewardedLevels=[190];});
 await click(p,'homeProfile');await click(p,'profile.edit');await click(p,'profile.nextPage');await click(p,'profile.select.24');assert.equal(await p.evaluate(()=>window.__COLOR_ESCAPE__.profileDraftAvatar),24);await screenshot(p,'unlocked-avatars-'+width+'-'+language);
 await click(p,'profile.frameTab');await click(p,'profile.nextPage');await click(p,'profile.select.18');assert.equal(await p.evaluate(()=>window.__COLOR_ESCAPE__.profileDraftFrame),7);
 await p.evaluate(()=>window.__COLOR_ESCAPE__.save.rewardedLevels.push(200));await click(p,'profile.select.18');assert.equal(await p.evaluate(()=>window.__COLOR_ESCAPE__.profileDraftFrame),18);await screenshot(p,'unlocked-frames-'+width+'-'+language);
 for(const fault of ['reject','unknown-empty','unknown-written']){
 await p.evaluate(m=>window.__PROFILE_TEST__.mode(m),fault);await click(p,'profile.save');assert.equal((await current(p)).save.playerProfile.avatar,1);
 await p.evaluate(()=>{window.__PROFILE_TEST__.candidate=window.__COLOR_ESCAPE__.pendingProfileSave?.candidateSave;window.__PROFILE_TEST__.candidateWriteCount=window.__PROFILE_TEST__.writes.filter(w=>w.object===window.__PROFILE_TEST__.candidate).length;window.__PROFILE_TEST__.mode('commit');});await click(p,fault==='reject'?'profile.save':'profile.retry');assert.equal((await current(p)).stored.playerProfile.avatar,24);assert.equal((await current(p)).stored.playerProfile.frame,18);assert.equal((await current(p)).stored.coins,240);
 if(fault!=='reject')assert(await p.evaluate(()=>{return window.__PROFILE_TEST__.candidateWriteCount===1 && window.__PROFILE_TEST__.writes.filter(w=>w.object===window.__PROFILE_TEST__.candidate).length>=1;}));
 await click(p,'profile.close');await p.waitForFunction(()=>window.__COLOR_ESCAPE__.homeProfileArt);await screenshot(p,'equipped-home-'+width+'-'+language);
 await p.evaluate(()=>{window.__COLOR_ESCAPE__.save.playerProfile.avatar=1;window.__COLOR_ESCAPE__.save.playerProfile.frame=7;});await click(p,'homeProfile');await click(p,'profile.edit');await click(p,'profile.nextPage');await click(p,'profile.select.24');await click(p,'profile.frameTab');await click(p,'profile.nextPage');await click(p,'profile.select.18');
 }
 rows.push({width,language,status:'PASS',lockedClick:true,level200Ledger:true,freeSave:true,saveFaults:['reject','unknown-empty','unknown-written']});await context.close();
}assert.deepEqual(errors,[]);await writeFile(resolve(output,'report.json'),JSON.stringify({status:'PASS',scope:'Synthetic mainline progress, isolated MemoryHost, real Pointer. No real player save.',rows,errors,sourceSha:sha(await readFile('src/game/ColorEscapeGame.ts'))},null,2));console.log('PASS unlock profiles: four viewport/language runs');
}catch(e){await writeFile(resolve(output,'report.json'),JSON.stringify({status:'FAIL',rows,errors,error:String(e)},null,2));throw e;}finally{await browser.close();await server.close();}
`;
await writeFile('tools/playtest-profile-unlocks.mjs',s);





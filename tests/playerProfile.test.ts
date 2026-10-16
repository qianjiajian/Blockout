import {describe,it,expect,vi} from "vitest";
import {normalizePlayerProfile,cleanProfileName,startProfileAttempt,completeProfileAttempt,profileAppearanceUnlocked,profileUnlockLevel} from "../src/core/playerProfile";
import {ColorEscapeGame} from "../src/game/ColorEscapeGame";
import type {GameHost} from "../src/platform/Host";
function fixture() {
  let mode="commit";let data:any={schemaVersion:1,currentLevel:6,highestLevel:6,coins:240,bestStars:{1:3},rewardedLevels:[1],language:"en",sound:false,music:false,collectionIntroShown:true};
  const writes:any[]=[];const host={canvas:{setAttribute:vi.fn()},context:{},viewport:()=>({width:496,height:1078,pixelRatio:1,safeTop:0,safeBottom:0}),
    preferredLocales:()=>["en"],onPointer:vi.fn(),onResize:vi.fn(),onHide:vi.fn(),onShow:vi.fn(),requestFrame:()=>1,scheduleTimeout:()=>1,cancelTimeout:vi.fn(),
    createImage:()=>new Promise(()=>{}),storageRead:()=>mode.startsWith("unknown")?{status:"unavailable"}:{status:"ok",value:structuredClone(data)},
    storageSet:(_key:string,v:any)=>{writes.push(v);if(mode==="commit"||mode==="unknown-written")data=structuredClone(v);return mode==="commit";},
    storageGet:()=>data,music:vi.fn(),sound:vi.fn(),vibrate:vi.fn(),musicTransport:()=>({positionSeconds:0,durationSeconds:0,playing:false}),setMusicPaused:vi.fn(),seekMusic:vi.fn()};
  const game=new ColorEscapeGame(host as unknown as GameHost) as any;
  game.openProfile();return {game,writes,setMode:(m:string)=>mode=m,stored:()=>data};
}
describe("profile identity, names and real attempt statistics",()=>{
  it("preserves existing identity while bounding corrupt appearance and metrics",()=>{const p=normalizePlayerProfile({id:"1482757",name:"  so   cool  ",avatar:999,frame:99,firstTryWins:-9},Date.now());expect(p.id).toBe("1482757");expect(p.name).toBe("so cool");expect(p.avatar).toBe(24);expect(p.frame).toBe(18);expect(p.firstTryWins).toBe(0);});
  it("does not invent historical wins on migration",()=>{const p=normalizePlayerProfile(undefined);expect(p.firstTryWins).toBe(0);expect(p.longestStreak).toBe(0);expect(p.attempts).toEqual({});});
  it("sanitizes control characters and handles Unicode length",()=>{expect(cleanProfileName(" \u0000 🐱你好 ")).toBe("🐱你好");expect(Array.from(cleanProfileName("🐱".repeat(30))).length).toBe(16);});
  it("counts first-attempt clears once and breaks consecutive wins after an unfinished attempt",()=>{
    const p=normalizePlayerProfile(undefined);startProfileAttempt(p,6);completeProfileAttempt(p,6,true);completeProfileAttempt(p,6,true);expect(p.firstTryWins).toBe(1);expect(p.longestStreak).toBe(1);
    startProfileAttempt(p,7);completeProfileAttempt(p,7,true);expect(p.longestStreak).toBe(2);startProfileAttempt(p,8);startProfileAttempt(p,8);completeProfileAttempt(p,8,true);expect(p.currentStreak).toBe(1);expect(p.firstTryWins).toBe(2);
    startProfileAttempt(p,6);completeProfileAttempt(p,6,false);expect(p.firstTryWins).toBe(2);
  });
});
describe("actual game profile transaction boundary",()=>{
  it("guards locked appearance at commit and grants old players eligible cosmetics for free",()=>{
    const {game,stored}=fixture();game.profileDraftAvatar=15;game.profileDraftFrame=9;game.commitProfile(false);expect(game.save.playerProfile.avatar).toBe(0);expect(game.pendingProfileSave).toBeUndefined();
    game.save.highestLevel=21;game.commitProfile(false);expect(stored().playerProfile.avatar).toBe(15);expect(stored().playerProfile.frame).toBe(9);expect(stored().coins).toBe(240);
  });
  it("does not grant cosmetics from temporary test progress",()=>{
    const {game}=fixture();game.temporaryLevelTestSession={baselineSave:game.cloneSave(game.save)};game.save.highestLevel=200;game.save.rewardedLevels=[200];game.profileDraftAvatar=24;game.profileDraftFrame=18;game.commitProfile(false);expect(game.save.playerProfile.avatar).toBe(0);expect(game.pendingProfileSave).toBeUndefined();
  });
  it("restores new selection after reload without changing identity or wallet",()=>{
    const {game}=fixture();game.save.highestLevel=200;game.save.rewardedLevels.push(200);game.profileDraftAvatar=24;game.profileDraftFrame=18;game.commitProfile(false);
    const restored=game.sanitizeSave(game.save);expect(restored.playerProfile.avatar).toBe(24);expect(restored.playerProfile.frame).toBe(18);expect(restored.playerProfile.id).toBe(game.save.playerProfile.id);expect(restored.coins).toBe(240);
  });
  it("renames for exactly 100 and keeps progress, inventory and journal unchanged",()=>{const {game,stored}=fixture();const before=structuredClone(game.save);game.profileDraftName="so cool";game.commitProfile(true);expect(stored().coins).toBe(140);expect(stored().playerProfile.name).toBe("so cool");expect(stored().bestStars).toEqual(before.bestStars);expect(stored().boosters).toEqual(before.boosters);expect(stored().activeRun).toEqual(before.activeRun);});
  it("does not charge for empty, same or unaffordable names",()=>{const {game}=fixture();for(const name of ["",game.save.playerProfile.name]){game.profileDraftName=name;game.commitProfile(true);expect(game.save.coins).toBe(240);}game.save.coins=40;game.profileDraftName="different";game.commitProfile(true);expect(game.save.coins).toBe(40);});
  it("saves appearance for free and clones attempt records",()=>{const {game,stored}=fixture();const original=game.save;game.profileDraftAvatar=13;game.profileDraftFrame=4;game.commitProfile(false);expect(stored().coins).toBe(240);expect(stored().playerProfile.avatar).toBe(13);expect(stored().playerProfile.frame).toBe(4);expect(game.save.playerProfile.attempts).not.toBe(original.playerProfile.attempts);});
  it.each(["unknown-empty","unknown-written"])("%s retries original rename candidate, guards background updates and never double charges",mode=>{
    const {game,writes,setMode,stored}=fixture();game.profileDraftName="so cool";setMode(mode);game.commitProfile(true);const candidate=game.pendingProfileSave.candidateSave;
    expect(game.save.coins).toBe(240);expect(game.persist(game.cloneSave(game.save))).toBe(false);expect(game.ensureDailyTaskCycle()).toBe(false);
    game.refreshLifeState(Date.now()+3600000);game.refreshLeague();game.profileDraftName="changed later";setMode("commit");game.commitProfile(true);
    expect(writes.at(-1)).toBe(candidate);expect(stored().coins).toBe(140);expect(stored().playerProfile.name).toBe("so cool");expect(game.pendingProfileSave).toBeUndefined();
  });
  it("rejects a failed save without modifying account",()=>{const {game,setMode}=fixture();setMode("reject");game.profileDraftName="so cool";game.commitProfile(true);expect(game.save.coins).toBe(240);expect(game.pendingProfileSave).toBeUndefined();});
});
describe("specified mainline unlock boundaries",()=>{
  it("keeps all original cosmetics free",()=>{for(let i=0;i<15;i++)expect(profileAppearanceUnlocked("avatar",i,{highestLevel:1,rewardedLevels:[]})).toBe(true);for(let i=0;i<9;i++)expect(profileAppearanceUnlocked("frame",i,{highestLevel:1,rewardedLevels:[]})).toBe(true);});
  it("checks all twenty thresholds before/at/after clear including level 200",()=>{
    for(const kind of ["avatar","frame"] as const)for(let n=0;n<10;n++){
      const index=n+(kind==="avatar"?15:9),level=(kind==="avatar"?10:20)+n*20;expect(profileUnlockLevel(kind,index)).toBe(level);
      expect(profileAppearanceUnlocked(kind,index,{highestLevel:level,rewardedLevels:[]})).toBe(false);
      expect(profileAppearanceUnlocked(kind,index,{highestLevel:level,rewardedLevels:[level]})).toBe(true);
      expect(profileAppearanceUnlocked(kind,index,{highestLevel:level+1,rewardedLevels:[]})).toBe(true);
    }
  });
  it("rejects invalid indexes",()=>{for(const i of [-1,25,999,NaN,.5])expect(profileAppearanceUnlocked("avatar",i,{highestLevel:200,rewardedLevels:[200]})).toBe(false);});
});

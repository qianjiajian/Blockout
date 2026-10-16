import {describe,expect,it,vi} from "vitest";
import {ColorEscapeGame} from "../src/game/ColorEscapeGame";
import {profileRect,profileTargets} from "../src/game/playerProfileUi";
import type {GameHost} from "../src/platform/Host";

function fixture(width=496,height=1078){
  let mode="commit";
  let data:any={schemaVersion:1,currentLevel:6,highestLevel:6,coins:240,bestStars:{1:3},rewardedLevels:[1],language:"en",sound:false,music:false,reducedMotion:true,collectionIntroShown:true};
  const writes:any[]=[];
  const host={canvas:{setAttribute:vi.fn()},context:{},viewport:()=>({width,height,pixelRatio:1,safeTop:0,safeBottom:0}),
    preferredLocales:()=>["en"],onPointer:vi.fn(),onResize:vi.fn(),onHide:vi.fn(),onShow:vi.fn(),requestFrame:()=>1,scheduleTimeout:()=>1,cancelTimeout:vi.fn(),
    createImage:()=>new Promise(()=>{}),storageRead:()=>mode.startsWith("unknown")?{status:"unavailable"}:{status:"ok",value:structuredClone(data)},
    storageSet:(_key:string,value:any)=>{writes.push(value);if(mode==="commit"||mode==="unknown-written")data=structuredClone(value);return mode==="commit";},storageGet:()=>data,
    music:vi.fn(),sound:vi.fn(),vibrate:vi.fn(),musicTransport:()=>({positionSeconds:0,durationSeconds:0,playing:false}),setMusicPaused:vi.fn(),seekMusic:vi.fn()};
  const game=new ColorEscapeGame(host as unknown as GameHost) as any;game.openProfile();game.profileArt={};
  return{game,writes,setMode:(value:string)=>{mode=value;},stored:()=>data};
}
function tap(game:any,key:string){
  const target=profileTargets(game.profileView()).find(([name])=>name===key);expect(target,`visible ${key}`).toBeDefined();
  const r=target![1];game.handleProfilePointer({id:1,x:r.x+r.width/2,y:r.y+r.height/2});
}

describe("overview name editing",()=>{
  it.each([[320,568],[496,1078]])("keeps both adjacent overview icon centers independently clickable at %s by %s",(width,height)=>{
    const {game}=fixture(width,height);game.artReady=true;
    for(const key of ["profile.copy","profile.editName"]){
      const r=profileTargets(game.profileView()).find(([name])=>name===key)![1];
      const point={id:1,x:r.x+r.width/2,y:r.y+r.height/2};
      expect(game.profileTargetAt(point)).toBe(key);
      expect(game.buttonReleaseTargetAt(point)?.key).toBe(key);
    }
  });
  it.each(["profile.cancelRename","profile.cancelRenameBottom"])("returns to overview without writes through %s",key=>{
    const {game,writes}=fixture(),before=structuredClone(game.save),count=writes.length;
    tap(game,"profile.editName");expect(game.profilePage).toBe("rename");expect(game.profileView().renameReturnPage).toBe("stats");
    game.profileDraftName="Not saved";tap(game,key);
    expect(game.profilePage).toBe("stats");expect(game.save).toEqual(before);expect(writes).toHaveLength(count);
  });
  it("commits exactly 100 coins then returns to the overview without altering other account fields",()=>{
    const {game,stored}=fixture(),before=structuredClone(game.save);
    tap(game,"profile.editName");game.profileDraftName="Stats Updated";tap(game,"profile.rename");
    expect(game.profilePage).toBe("stats");expect(stored().coins).toBe(140);expect(game.save.playerProfile.name).toBe("Stats Updated");
    const actual=structuredClone(game.save);actual.coins=before.coins;actual.playerProfile.name=before.playerProfile.name;
    expect(actual).toEqual(before);expect(game.profileDraftName).toBe("Stats Updated");
  });
  it.each(["unknown-empty","unknown-written"])("retains overview return and original candidate during %s retry",mode=>{
    const {game,writes,stored,setMode}=fixture();tap(game,"profile.editName");game.profileDraftName="Original Candidate";
    setMode(mode);tap(game,"profile.rename");const pending=game.pendingProfileSave.candidateSave;
    expect(game.profilePage).toBe("rename");expect(game.profileView().renameReturnPage).toBe("stats");expect(game.save.coins).toBe(240);
    expect(profileTargets(game.profileView()).map(([key])=>key)).toEqual(["profile.retry"]);
    game.profileDraftName="Ignore this";setMode("commit");tap(game,"profile.retry");
    expect(writes.at(-1)).toBe(pending);expect(stored().coins).toBe(140);expect(game.save.playerProfile.name).toBe("Original Candida");
    expect(game.profilePage).toBe("stats");expect(game.pendingProfileSave).toBeUndefined();
  });
  it("keeps overview-origin rename open on rejection and later retries without double charging",()=>{
    const {game,stored,setMode}=fixture(),before=structuredClone(game.save);
    tap(game,"profile.editName");game.profileDraftName="Retry Stats";setMode("reject");tap(game,"profile.rename");
    expect(game.profilePage).toBe("rename");expect(game.profileView().renameReturnPage).toBe("stats");expect(game.save).toEqual(before);
    setMode("commit");tap(game,"profile.rename");expect(stored().coins).toBe(140);expect(game.profilePage).toBe("stats");
  });
  it.each(["avatar","frame"])("keeps the existing %s cancel and committed return to avatar",page=>{
    const {game,stored}=fixture();game.profilePage=page;tap(game,"profile.editName");expect(game.profileView().renameReturnPage).toBe("avatar");
    tap(game,"profile.cancelRename");expect(game.profilePage).toBe("avatar");
    game.profilePage=page;tap(game,"profile.editName");game.profileDraftName="Editor Name";tap(game,"profile.rename");
    expect(game.profilePage).toBe("avatar");expect(stored().coins).toBe(140);
  });
  it("does not expose the overview rename entry until art finishes loading",()=>{
    const {game}=fixture();game.profileArt=undefined;
    expect(profileTargets(game.profileView()).some(([key])=>key==="profile.editName")).toBe(false);
    const r=profileRect(536,527,49,49);game.handleProfilePointer({id:1,x:r.x+r.width/2,y:r.y+r.height/2});
    expect(game.profilePage).toBe("stats");expect(game.pendingProfileSave).toBeUndefined();
  });
});

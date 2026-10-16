import {describe, expect, it, vi} from "vitest";
import {normalizePlayerProfile} from "../src/core/playerProfile";
import {ColorEscapeGame} from "../src/game/ColorEscapeGame";
import type {GameHost} from "../src/platform/Host";
import {PROFILE_SUPPLIED_ART, type ProfileSuppliedArt} from "../src/game/profileSuppliedArt";
import {
  drawPlayerProfile, PROFILE_CATALOG_RECT, PROFILE_INPUT_RECT, PROFILE_OFFSET_Y,
  PROFILE_SCALE, profileCatalogCells, profileCatalogMaxScroll, profileRect, profileTargets,
  type ProfileArt, type ProfilePage, type ProfileView,
} from "../src/game/playerProfileUi";

const fakeImage=(key:string)=>({key,naturalWidth:100,naturalHeight:100}) as unknown as HTMLImageElement;
function artFixture():ProfileArt {
  const ui=Object.fromEntries(Object.keys(PROFILE_SUPPLIED_ART).map(key=>[key,fakeImage(key)])) as ProfileSuppliedArt;
  return {
    header:fakeImage("legacy-header"),panel:fakeImage("legacy-panel"),save:fakeImage("legacy-save"),edit:ui.editName,coin:fakeImage("legacy-coin"),
    avatars:Array.from({length:25},(_,i)=>fakeImage(`avatar-${i}`)),frames:Array.from({length:19},(_,i)=>fakeImage(`frame-${i}`)),
    stats:Array.from({length:3},(_,i)=>fakeImage(`legacy-stat-${i}`)),
    ui,
  };
}
function viewFixture(page:ProfilePage="stats"):ProfileView {
  return {page,profile:normalizePlayerProfile({id:"7654321",name:"Dynamic Name",avatar:1,frame:2,joinedAt:1704067200000}),
    draftAvatar:1,draftFrame:2,name:"Draft Name",coins:245,highest:42,totalStars:98,levelRank:17,
    english:false,pending:false,saveEnabled:true,scrollOffset:0,
    unlockedAvatars:Array.from({length:25},()=>true),unlockedFrames:Array.from({length:19},()=>true)};
}
function paint(view:ProfileView,art=artFixture()) {
  const images:Array<{image:HTMLImageElement,args:number[],alpha:number,filter:string}>=[];
  const texts:Array<{text:string,args:number[]}>=[];
  const presses:Array<{key:string,rect:ReturnType<typeof profileRect>}>=[];
  const popups:Array<{key:string,rect:ReturnType<typeof profileRect>}>=[];
  const stack:Array<{globalAlpha:number,filter:string}>=[];
  const base:any={globalAlpha:1,filter:"none",save(){stack.push({globalAlpha:this.globalAlpha,filter:this.filter});},restore(){Object.assign(this,stack.pop());},
    createLinearGradient:()=>({addColorStop:()=>{}}),measureText:(value:string)=>({width:value.length*10}),
    drawImage(image:HTMLImageElement,...args:number[]){images.push({image,args,alpha:this.globalAlpha,filter:this.filter});},
    fillText(text:string,...args:number[]){texts.push({text:String(text),args});}};
  const ctx=new Proxy(base,{get:(target,key)=>key in target?target[key]:()=>{}}) as CanvasRenderingContext2D;
  drawPlayerProfile(ctx,view,art,(key,rect,draw)=>{presses.push({key,rect});draw();},{popup:(key,rect,draw)=>{popups.push({key,rect});draw();}});
  return{images,texts,presses,popups,art};
}
const args=(rect:ReturnType<typeof profileRect>)=>[rect.x,rect.y,rect.width,rect.height];

describe("supplied profile art and reference geometry",()=>{
  it("projects the supplied 720 by 1584 artboard exactly once",()=>{
    expect(PROFILE_SCALE).toBe(496/720);expect(PROFILE_OFFSET_Y).toBeCloseTo(539-792*496/720);
    expect(PROFILE_CATALOG_RECT).toEqual(profileRect(103,764,516,316));
    expect(PROFILE_INPUT_RECT).toEqual(profileRect(131,817,458,84));
  });
  it.each([false,true])("uses formal overview slices and real values for english=%s",english=>{
    const result=paint({...viewFixture(),english}),ui=result.art.ui!;
    expect(result.images.some(draw=>draw.image===ui.statsPanel&&draw.args.join() === [63,306,594,844].join())).toBe(true);
    for(const image of [ui.close,ui.statHighest,ui.statStars,ui.statRank,english?ui.titleEn:ui.titleZh])expect(result.images.some(draw=>draw.image===image)).toBe(true);
    expect(result.images.some(draw=>draw.image===result.art.panel||draw.image===result.art.header||result.art.stats.includes(draw.image))).toBe(false);
    const labels=result.texts.map(draw=>draw.text);
    for(const value of ["Dynamic Name","42","98","17"])expect(labels).toContain(value);
    expect(labels.some(text=>text.includes("7654321"))).toBe(true);
    expect(labels).not.toContain("so cool");expect(labels).not.toContain("6559152");
    expect(result.popups).toContainEqual({key:"profile",rect:profileRect(63,306,594,844)});
  });
  it.each<ProfilePage>(["avatar","frame"])("uses the supplied %s editor and aligned actions",page=>{
    const result=paint(viewFixture(page)),ui=result.art.ui!;
    for(const image of [ui.editorPanel,ui.saveButton,ui.close,ui.catalogPanel])expect(result.images.some(draw=>draw.image===image)).toBe(true);
    expect(result.images.some(draw=>draw.image===ui.saveButton&&draw.args.join()===[248,1100,225,84].join())).toBe(true);
    expect(profileTargets(viewFixture(page)).find(([key])=>key==="profile.save")?.[1]).toEqual(profileRect(248,1100,225,84));
    expect(result.popups).toContainEqual({key:"profile",rect:profileRect(63,306,594,932)});
  });
  it.each<ProfilePage>(["avatar","frame"])("draws the final edit-name icon on the unchanged %s edit target",page=>{
    const result=paint(viewFixture(page)),ui=result.art.ui!;
    expect(result.images.some(draw=>draw.image===ui.editName&&draw.args.join()===[526,517,66,67].join())).toBe(true);
    expect(profileTargets(viewFixture(page)).find(([key])=>key==="profile.editName")?.[1]).toEqual(profileRect(526,517,66,67));
    expect(result.presses.some(press=>press.key==="profile.editName")).toBe(true);
  });
  it("places the overview edit-name icon beside a width-limited nickname",()=>{
    const result=paint(viewFixture("stats")),ui=result.art.ui!;
    expect(result.images.some(draw=>draw.image===ui.editName&&draw.args.join()===[536,527,49,49].join())).toBe(true);
    expect(profileTargets(viewFixture("stats")).find(([key])=>key==="profile.editName")?.[1]).toEqual(profileRect(536,527,49,49));
    expect(result.presses.some(press=>press.key==="profile.editName")).toBe(true);
    expect(result.texts.find(draw=>draw.text==="Dynamic Name")?.args).toEqual([276,551,244]);
    for(const state of [{loading:true},{pending:true}])expect(profileTargets({...viewFixture("stats"),...state}).some(([key])=>key==="profile.editName")).toBe(false);
  });
  it("retains the overview below the rename dialog when opened from the overview",()=>{
    const result=paint({...viewFixture("rename"),renameReturnPage:"stats"}),ui=result.art.ui!;
    expect(result.images.some(draw=>draw.image===ui.statsPanel)).toBe(true);
    expect(result.images.some(draw=>draw.image===ui.editorPanel)).toBe(false);
    expect(result.images.some(draw=>draw.image===ui.renamePanel)).toBe(true);
    expect(result.popups).toContainEqual({key:"profile",rect:profileRect(63,306,594,844)});
    expect(profileTargets({...viewFixture("rename"),renameReturnPage:"stats"} as ProfileView).map(([key])=>key)).not.toContain("profile.editName");
  });
  it("matches supplied five-column avatars and four-column frames without losing entries",()=>{
    const avatars=profileCatalogCells("avatar"),frames=profileCatalogCells("frame");
    expect(avatars.slice(0,5).map(cell=>cell.rect.x)).toEqual([116,217,318,419,520].map(x=>x*PROFILE_SCALE));
    expect(frames.slice(0,4).map(cell=>cell.rect.x)).toEqual([123,249,375,501].map(x=>x*PROFILE_SCALE));
    expect(avatars[5].rect.x).toBe(avatars[0].rect.x);expect(frames[4].rect.x).toBe(frames[0].rect.x);
    expect(profileCatalogCells("avatar",profileCatalogMaxScroll("avatar")).at(-1)?.index).toBe(24);
    expect(profileCatalogCells("frame",profileCatalogMaxScroll("frame")).at(-1)?.index).toBe(18);
  });
  it("uses the formal rename panel, input, coin and 100 coin price with an explicit close target",()=>{
    const result=paint(viewFixture("rename")),ui=result.art.ui!;
    for(const image of [ui.renamePanel,ui.renameInput,ui.renameButton,ui.coin])expect(result.images.some(draw=>draw.image===image)).toBe(true);
    expect(result.images.some(draw=>draw.image===ui.renamePanel&&draw.args.join()===[63,590,594,514].join())).toBe(true);
    expect(result.texts.map(draw=>draw.text)).toContain("Draft Name");expect(result.texts.map(draw=>draw.text)).toContain("100");
    const targets=profileTargets(viewFixture("rename"));
    expect(targets.find(([key])=>key==="profile.input")?.[1]).toEqual(PROFILE_INPUT_RECT);
    expect(targets.find(([key])=>key==="profile.cancelRename")?.[1]).toEqual(profileRect(584,579,94,98));
    expect(targets.find(([key])=>key==="profile.rename")?.[1]).toEqual(profileRect(231,946,258,85));
    expect(result.popups).toContainEqual({key:"profile.rename",rect:profileRect(63,590,594,514)});
  });
  it.each<ProfilePage>(["stats","avatar","frame","rename"])("keeps %s loading and pending hit areas aligned with displayed controls",page=>{
    const targets=profileTargets({...viewFixture(page),pending:true});expect(targets.map(([key])=>key)).toEqual(["profile.retry"]);
    expect(args(targets[0][1])).toEqual(args(page==="rename"?profileRect(231,946,258,85):profileRect(248,1100,225,84)));
    const loading=profileTargets({...viewFixture(page),loading:true});
    expect(loading.every(([key])=>key==="profile.close"||key==="profile.cancelRename")).toBe(true);
  });
  it.each(["avatar","frame"] as const)("grays locked %s icons, keeps the preview in color and excludes save action",page=>{
    const view={...viewFixture(page),saveEnabled:false,draftAvatar:24,draftFrame:18,scrollOffset:profileCatalogMaxScroll(page),
      unlockedAvatars:Array.from({length:25},(_,i)=>i<15),unlockedFrames:Array.from({length:19},(_,i)=>i<9)};
    const result=paint(view),locked=page==="avatar"?result.art.avatars.slice(15):result.art.frames.slice(9);
    const draws=result.images.filter(draw=>locked.includes(draw.image));expect(draws.length).toBeGreaterThan(0);
    const size=profileCatalogCells(page,view.scrollOffset)[0].rect.width/PROFILE_SCALE*(page==="frame"?1.46:1);
    for(const draw of draws){expect(draw.alpha).toBe(1);expect(draw.filter).toBe(Math.abs(draw.args[2]-size)<.001?"grayscale(1)":"none");}
    expect(profileTargets(view).some(([key])=>key==="profile.save")).toBe(false);
    expect(result.presses.some(({key})=>key==="profile.save")).toBe(false);
  });
});

describe("supplied profile resource ownership",()=>{
  it("loads every formal UI slice and releases its owned handles once despite legacy aliases",async()=>{
    const data={schemaVersion:1,currentLevel:6,highestLevel:6,coins:240,bestStars:{1:3},rewardedLevels:[1],language:"en",sound:false,music:false,collectionIntroShown:true};
    const released=vi.fn();
    const host={canvas:{setAttribute:vi.fn()},context:{},viewport:()=>({width:496,height:1078,pixelRatio:1,safeTop:0,safeBottom:0}),
      preferredLocales:()=>["en"],onPointer:vi.fn(),onResize:vi.fn(),onHide:vi.fn(),onShow:vi.fn(),requestFrame:()=>1,scheduleTimeout:()=>1,cancelTimeout:vi.fn(),
      createImage:()=>new Promise(()=>{}),releaseImage:released,storageRead:()=>({status:"ok",value:structuredClone(data)}),storageSet:()=>true,storageGet:()=>data,
      music:vi.fn(),sound:vi.fn(),vibrate:vi.fn(),musicTransport:()=>({positionSeconds:0,durationSeconds:0,playing:false}),setMusicPaused:vi.fn(),seekMusic:vi.fn()};
    const game=new ColorEscapeGame(host as unknown as GameHost) as any;
    const handles:HTMLImageElement[]=[];
    game.loadImages=vi.fn(async(paths:string[])=>paths.map(path=>{const image=fakeImage(path);handles.push(image);return image;}));
    game.openProfile();await vi.waitFor(()=>expect(game.profileArt?.ui).toBeDefined());
    const requested:string[]=game.loadImages.mock.calls[0][0];
    for(const [key,path] of Object.entries(PROFILE_SUPPLIED_ART)){
      expect(requested).toContain(path);expect(game.profileArt.ui[key].key).toBe(path);
    }
    expect(requested).not.toContain("assets/art/ui/profile-reference-v1/edit.png");
    expect(game.profileArt.edit).toBe(game.profileArt.ui.editName);
    expect(game.profileArt.avatars).toHaveLength(25);expect(game.profileArt.frames).toHaveLength(19);
    game.releaseProfileArt();expect(game.profileArt).toBeUndefined();
    expect(released).toHaveBeenCalledTimes(handles.length);
    for(const handle of handles)expect(released.mock.calls.filter(([image])=>image===handle)).toHaveLength(1);
  });
});

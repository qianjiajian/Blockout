import { LEAGUE_TIERS, leagueBotNames, leagueRank, leagueReward, type LeagueState } from "../core/league";
import {nextLeagueLevel,LEAGUE_LEVEL_COUNT} from "../core/leagueLevels";
import { LEAGUE_VIDEO_ART } from "./artManifest";
import { LEAGUE_LIST, LEAGUE_ROW_PITCH, LEAGUE_SECTION_HEIGHT, clampLeagueScroll, leagueRowTop } from "./leagueScroll";
import {drawLeagueIntro,type LeagueIntroPage} from "./leagueIntroUi";
import { FEATURE_UNLOCKS } from "../core/featureUnlocks";
import { LEAGUE_TIER_CAROUSEL_CLIP, leagueTierCarouselSlots } from "./leagueTierSlide";
import { leagueArtRect, LEAGUE_ART_SCALE, LEAGUE_ART_OFFSET_Y, LEAGUE_SUPPLIED_LAYOUT } from "./leagueSuppliedLayout";
import { drawLeagueSettlement } from "./leagueSettlementUi";
import type { LeagueSettlementArt } from "./LeagueSettlementArtStore";
export interface LeagueRect {x:number;y:number;width:number;height:number}
export const LEAGUE_UI={back:leagueArtRect(27,78,73,74),info:leagueArtRect(629,78,73,74),tierPrevious:{x:8,y:278,width:48,height:74},tierNext:{x:440,y:278,width:48,height:74},self:leagueArtRect(4,1350,561,112),challenge:leagueArtRect(588,1382,103,50),primary:{x:106,y:940,width:284,height:76},dismiss:{x:108,y:946,width:280,height:74},detailClose:LEAGUE_SUPPLIED_LAYOUT.detailClose,startChallenge:{x:106,y:900,width:284,height:76},resultContinue:{x:80,y:925,width:336,height:120},cancelChallenge:{x:108,y:1014,width:280,height:60},introContinue:{x:32,y:943,width:432,height:108}} satisfies Record<string,LeagueRect>;
export const LEAGUE_ART_NAMES=["background","bronze","silver","gold","platinum","emerald","diamond","master","glory","row","round-button","score-token","continue-button","self-row","parchment","coin-reward","glory-star","stage-background","top-header","bottom-footer","list-panel","title-base","timer-panel","tier-name-base","row-first","row-second","row-third","back-button","info-button","challenge-button","arrow-left","arrow-right","level-star","detail-panel","close-button"] as const;
export type LeagueArt=Record<typeof LEAGUE_ART_NAMES[number],HTMLImageElement>;
export const LEAGUE_ART_PATHS=LEAGUE_ART_NAMES.map(n=>`/${LEAGUE_VIDEO_ART[n]}`);
export function leagueCountdown(end:number,now:number):string{const s=Math.max(0,Math.ceil((end-now)/1000));return `${Math.floor(s/86400)}天 ${String(Math.floor(s%86400/3600)).padStart(2,"0")}:${String(Math.floor(s%3600/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;}
export function gloryTitle(s:number):string{return s>=100?"荣耀·传奇":s>=50?"荣耀·永恒":s>=30?"荣耀·至尊":s>=10?"荣耀·崇高":"荣耀";}
export function leagueRows(s:LeagueState){
  const names=leagueBotNames(s.seed,s.season.index);
  return [...s.season.bots.map((b,i)=>({...b,name:names[i],player:false})),{id:"player",name:"我",avatar:0,score:s.season.score,player:true}].sort((a,b)=>b.score-a.score||Number(b.player)-Number(a.player)||a.id.localeCompare(b.id)).map((r,i)=>({...r,rank:i+1}));
}
export interface LeagueView{state?:LeagueState;now:number;scroll:number;tier:number;tierPosition?:number;playerLevel?:number;info:boolean;introPage?:LeagueIntroPage;challengeNotice?:boolean;persistence?:"unknown"|"rejected";action?:"open"|"refresh"|"claim"|"intro";artError?:boolean;settlementArtError?:boolean}
export interface LeaguePaint{button:(key:string,rect:LeagueRect,text:string,color?:string)=>void;pressable?:(key:string,rect:LeagueRect,draw:()=>void)=>void;popup?:(key:string,bounds:LeagueRect,draw:()=>void)=>void;drawAvatar?:(avatar:number,player:boolean,rect:LeagueRect)=>void;avatars?:HTMLImageElement[];art?:LeagueArt;settlementArt?:LeagueSettlementArt}
export function drawLeague(ctx:CanvasRenderingContext2D,v:LeagueView,p:LeaguePaint):void{
  if(v.state?.pending && v.introPage===undefined){drawLeagueSettlement(ctx,{pending:v.state.pending,persistence:v.persistence,action:v.action,artError:v.settlementArtError},p,p.settlementArt);return;}
  ctx.save();const a=p.art;
  const text=(value:string,x:number,y:number,size=25,color="#fce6a6",align:CanvasTextAlign="center",maxWidth?:number)=>{ctx.font=`600 ${size}px "Microsoft YaHei",sans-serif`;ctx.textAlign=align;ctx.fillStyle=color;if(maxWidth===undefined)ctx.fillText(value,x,y);else ctx.fillText(value,x,y,maxWidth);};
  const image=(img:HTMLImageElement|undefined,r:LeagueRect,contain=false)=>{if(!img)return;let{x,y,width,height}=r;if(contain){const scale=Math.min(width/(img.naturalWidth||img.width),height/(img.naturalHeight||img.height));const w=(img.naturalWidth||img.width)*scale,h=(img.naturalHeight||img.height)*scale;x+=(width-w)/2;y+=(height-h)/2;width=w;height=h;}ctx.drawImage(img,x,y,width,height);};
  const press=(key:string,r:LeagueRect,draw:()=>void)=>p.pressable?p.pressable(key,r,draw):draw();
  const button=(key:string,r:LeagueRect,label:string,round=false)=>{if(a){press(key,r,()=>{if(key==="league.back"||key==="league.info"){image(a[key==="league.back"?"back-button":"info-button"],r,true);return;}image(round?a["round-button"]:a["continue-button"],r,true);text(label,r.x+r.width/2,r.y+r.height*.66,29,"#fff1c5");});}else p.button(key,r,label,"#43dc38");};
  const nt=(value:string,x:number,y:number,size:number,color="#fff",align:CanvasTextAlign="center",maxWidth?:number)=>text(value,x*LEAGUE_ART_SCALE,y*LEAGUE_ART_SCALE+LEAGUE_ART_OFFSET_Y,size*LEAGUE_ART_SCALE,color,align,maxWidth===undefined?undefined:maxWidth*LEAGUE_ART_SCALE);
  const ni=(img:HTMLImageElement|undefined,x:number,y:number,width:number,height:number)=>image(img,leagueArtRect(x,y,width,height),true);
  const shade=()=>{ctx.fillStyle="rgba(0,25,18,.9)";ctx.fillRect(0,0,496,1078);};
  const trophy=(tier:number,r:LeagueRect,alpha=1)=>{ctx.save();ctx.globalAlpha=alpha;image(a?.[LEAGUE_ART_NAMES[tier+1]],r,true);ctx.restore();};
  ctx.fillStyle="#6540f5";ctx.fillRect(0,0,496,1078);
  if(a){image(a["stage-background"],LEAGUE_SUPPLIED_LAYOUT.stage,true);image(a["list-panel"],LEAGUE_SUPPLIED_LAYOUT.list,true);image(a["top-header"],LEAGUE_SUPPLIED_LAYOUT.header,true);image(a["title-base"],LEAGUE_SUPPLIED_LAYOUT.title,true);image(a["bottom-footer"],LEAGUE_SUPPLIED_LAYOUT.footer,true);}
  const s=v.state;
  if(!a){if(v.persistence!=="unknown")text(v.artError?"界面加载失败":"界面加载中…",248,560,26);if(v.persistence==="unknown")button("league.retry",LEAGUE_UI.primary,"重试保存");else if(v.artError)button("league.artRetry",LEAGUE_UI.primary,"重新加载");if(v.persistence!=="unknown")button("league.back",LEAGUE_UI.back,"‹",true);ctx.restore();return;}
  if(s && v.introPage!==undefined && !v.persistence){drawLeague(ctx,{...v,introPage:undefined},p);drawLeagueIntro(ctx,v.introPage,p);ctx.restore();return;}
  if(v.persistence!=="unknown")button("league.back",LEAGUE_UI.back,"‹",true);
  nt("联赛",354,137,44);
  if(!s){image(a.parchment,{x:58,y:455,width:380,height:390});text(`通关第${FEATURE_UNLOCKS.league.completedLevel}关，开启联赛`,248,590,27,"#754421");text("每期15天 · 50人竞逐",248,650,24,"#754421");if(v.persistence)button("league.retry",LEAGUE_UI.primary,"重试保存");ctx.restore();return;}
  button("league.info",LEAGUE_UI.info,"i",true);image(a["timer-panel"],LEAGUE_SUPPLIED_LAYOUT.timer,true);nt(leagueCountdown(s.season.endMs,v.now),360,224,44,"#fff","center",360);
  const tierSlots=leagueTierCarouselSlots(v.tierPosition??v.tier),tierClip=LEAGUE_TIER_CAROUSEL_CLIP;
  ctx.save();ctx.beginPath();ctx.rect(tierClip.x,tierClip.y,tierClip.width,tierClip.height);ctx.clip();
  for(const slot of tierSlots)trophy(slot.tier,slot,slot.alpha);
  const glorySlot=tierSlots.find(slot=>slot.tier===7&&slot.distance<1);
  if(glorySlot){
    const scale=glorySlot.width/204,cx=glorySlot.x+glorySlot.width/2,cy=glorySlot.y+glorySlot.height/2;
    const focus=1-glorySlot.distance;ctx.save();ctx.globalAlpha=focus*focus*(3-2*focus);
    image(a["glory-star"],{x:cx-41*scale,y:cy+81*scale,width:27*scale,height:27*scale},true);
    text(String(s.season.tier===7?s.season.stars:0),cx+8*scale,cy+105*scale,25*scale);ctx.restore();
  }
  ctx.restore();
  if(v.tier>0)press("league.tierPrevious",LEAGUE_UI.tierPrevious,()=>image(a["arrow-left"],{x:13,y:292,width:24,height:38},true));
  if(v.tier<7)press("league.tierNext",LEAGUE_UI.tierNext,()=>image(a["arrow-right"],{x:459,y:292,width:24,height:38},true));
  image(a["tier-name-base"],LEAGUE_SUPPLIED_LAYOUT.tierName,true);
  text(v.tier===7?gloryTitle(s.season.tier===7?s.season.stars:0):LEAGUE_TIERS[v.tier],248,418,27,"#fff");
  const offset=clampLeagueScroll(v.scroll),rows=leagueRows(s);
  const avatar=(n:number,player:boolean,r:LeagueRect)=>{if(p.drawAvatar)p.drawAvatar(n,player,r);else image(p.avatars?.[n%(p.avatars.length||1)],r,true);};
  const row=(r:typeof rows[number],y:number,self=false)=>{
    const ny=(y-LEAGUE_ART_OFFSET_Y)/LEAGUE_ART_SCALE;
    const card=self?a["self-row"]:r.rank===1?a["row-first"]:r.rank===2?a["row-second"]:r.rank===3?a["row-third"]:a.row;
    ni(card,self?4:33,ny,self?715:655,card.naturalHeight||card.height);
    const rankX=self?63:74,nameX=self?198:214,avatarX=self?104:120;
    nt(String(r.rank),rankX,ny+70,47,"#54230e");avatar(r.avatar,r.player,leagueArtRect(avatarX,ny+14,76,76));
    nt(r.name,nameX,ny+48,33,"#754517","left",184);
    ni(a["level-star"],nameX-3,ny+56,33,34);
    // Opponents have no campaign-level field; never invent Level 999 from the mockup.
    const subtitle=r.player&&v.playerLevel!==undefined?`Level ${v.playerLevel}`:r.rank<=10?"升级区":r.rank>=41?"降级区":"保级区";
    nt(subtitle,nameX+35,ny+88,23,"#754517","left",157);
    const pill=leagueArtRect(self?408:424,ny+30,144,52);
    const radius=17*LEAGUE_ART_SCALE,right=pill.x+pill.width,bottom=pill.y+pill.height;
    ctx.fillStyle="#e9cfaa";ctx.beginPath();ctx.moveTo(pill.x+radius,pill.y);ctx.arcTo(right,pill.y,right,bottom,radius);ctx.arcTo(right,bottom,pill.x,bottom,radius);ctx.arcTo(pill.x,bottom,pill.x,pill.y,radius);ctx.arcTo(pill.x,pill.y,right,pill.y,radius);ctx.closePath();ctx.fill();
    ni(a["score-token"],self?395:411,ny+27,49,57);nt(String(r.score),self?493:506,ny+71,33,"#54230e","center",100);
    if(!self){ni(a["coin-reward"],592,ny+18,66,50);nt(String(leagueReward(s.season.tier,r.rank,r.score)),630,ny+94,23,"#54230e","center",85);}
  };
  ctx.save();ctx.beginPath();ctx.rect(LEAGUE_LIST.x,LEAGUE_LIST.y,LEAGUE_LIST.width,LEAGUE_LIST.height);ctx.clip();
  const section=(index:number,label:string)=>{const y=LEAGUE_LIST.y+leagueRowTop(index)-LEAGUE_SECTION_HEIGHT-offset;text(label,248,y+28,25,index===40?"#ff9865":"#b2e7c8");};section(10,"保级区");section(40,"↓ 即将降级 ↓");
  rows.forEach((r,i)=>{const y=LEAGUE_LIST.y+leagueRowTop(i)-offset;if(y+LEAGUE_ROW_PITCH>=LEAGUE_LIST.y&&y<=LEAGUE_LIST.y+LEAGUE_LIST.height)row(r,y);});ctx.restore();row(rows.find(r=>r.player)!,LEAGUE_UI.self.y,true);
  press("league.challenge",LEAGUE_UI.challenge,()=>{image(a["challenge-button"],LEAGUE_UI.challenge,true);nt(nextLeagueLevel(s.season)===undefined?"完成":"挑战",639.5,1418,26);});
  if(v.persistence){shade();button("league.retry",LEAGUE_UI.primary,"重试保存");}
  if(v.info){
    ctx.fillStyle="rgba(0,0,0,.72)";ctx.fillRect(0,0,496,1078);
    const popup=p.popup??((_key:string,_bounds:LeagueRect,draw:()=>void)=>draw());
    popup("league.info",leagueArtRect(63,347,597,806),()=>{
    image(a["detail-panel"],LEAGUE_SUPPLIED_LAYOUT.detail,true);
    ctx.save();ctx.strokeStyle="#5130ce";ctx.lineWidth=6*LEAGUE_ART_SCALE;ctx.lineJoin="round";ctx.font=`600 ${60*LEAGUE_ART_SCALE}px "Microsoft YaHei",sans-serif`;ctx.textAlign="center";ctx.strokeText("详情",360*LEAGUE_ART_SCALE,435*LEAGUE_ART_SCALE+LEAGUE_ART_OFFSET_Y);nt("详情",360,435,60);ctx.restore();
    const lines=["每期15天，北京00:00切换","50人同组，同分你优先","徽章块10分，无倍数","成功计分，通关不可重复","失败、退出及跨期不计分","前10升级，后10降级","0分无金币，仍正常升降","荣耀前三：+5/+3/+2星","4–10名+1，后10名−2星","荣耀0星再降级回到大师","期末先领奖，再入新赛季"];
    lines.forEach((line,i)=>nt(line,360,570+i*41,40,"#7951ff","center",488));
    press("league.dismiss",LEAGUE_UI.detailClose,()=>image(a["close-button"],LEAGUE_UI.detailClose,true));
    });
  }
  if(v.challengeNotice){shade();text("联赛挑战",248,128,34);trophy(s.season.tier,{x:198,y:155,width:100,height:124});image(a.parchment,{x:28,y:300,width:440,height:616});
    const next=nextLeagueLevel(s.season),done=next===undefined;
    const lines=v.challengeNotice?done?[`本期${LEAGUE_LEVEL_COUNT}关已全部通关`,"不可重复通关或重复计分","仍可查看榜单，等待本期结算"]:[`第${next}/${LEAGUE_LEVEL_COUNT}关 · 困难`,`剩余 ${leagueCountdown(s.season.endMs,v.now)}`,"限时180秒 · 免体力 · 无通关金币","完整消除徽章块：每块10分","成功入榜，失败或退出不保留","跨期成功，两期均不计分","冰门：消除色块达到数字后打开","升降台：清空上方，揭开隐藏块","箭头块只沿箭头方向移动","色格只允许同色块进入"]:["收集特殊块，登上排行榜","每期15天，北京时间00:00切换","每组50人，同分时你优先","每个特殊块10分，无倍数","成功才计分，失败或退出不保留","已通关不可重复，跨期不计分","前10名升级，后10名降级","0分正常结算，不发金币","荣耀前3名 +5 / +3 / +2星","第4–10名+1，后10名−2星","荣耀0星再降级回到大师","结束后先领取，再进入新赛季"];
    lines.forEach((l,i)=>text(l,284,356+i*(v.challengeNotice?50:46),v.challengeNotice?20:22,"#794c2c","center",292));button(v.challengeNotice&&!done?"league.start":"league.dismiss",v.challengeNotice&&!done?LEAGUE_UI.startChallenge:LEAGUE_UI.dismiss,v.challengeNotice&&!done?"开始挑战":"点击继续");if(v.challengeNotice&&!done)button("league.dismiss",LEAGUE_UI.cancelChallenge,"返回联赛");}
  ctx.restore();
}

import type { LeagueRect } from "./leagueUi";
import { leagueArtRect, LEAGUE_ART_SCALE } from "./leagueSuppliedLayout";
export const LEAGUE_LIST: LeagueRect = leagueArtRect(33, 685, 655, 667);
export const LEAGUE_ROW_PITCH=114 * LEAGUE_ART_SCALE;
export const LEAGUE_SECTION_HEIGHT=38;
export const leagueRowTop=(index:number)=>(Math.min(index,3)*116+Math.max(0,index-3)*114)*LEAGUE_ART_SCALE+(index>=10?LEAGUE_SECTION_HEIGHT:0)+(index>=40?LEAGUE_SECTION_HEIGHT:0);
export const LEAGUE_SCROLL_MAX=leagueRowTop(49)+115*LEAGUE_ART_SCALE-LEAGUE_LIST.height;
export const clampLeagueScroll=(n:number)=>Math.max(0,Math.min(LEAGUE_SCROLL_MAX,n));
export interface LeagueScrollGesture { id:number; startY:number; lastY:number; startOffset:number; moved:boolean; lastAt:number; velocity:number }
export class LeagueScroll {
  offset=0; velocity=0; gesture?:LeagueScrollGesture;
  begin(id:number,x:number,y:number,now:number):boolean {
    if(this.gesture || x<LEAGUE_LIST.x || x>LEAGUE_LIST.x+LEAGUE_LIST.width || y<LEAGUE_LIST.y || y>LEAGUE_LIST.y+LEAGUE_LIST.height)return false;
    this.velocity=0;this.gesture={id,startY:y,lastY:y,startOffset:this.offset,moved:false,lastAt:now,velocity:0};return true;
  }
  move(id:number,y:number,now:number):boolean {
    const g=this.gesture;if(!g||g.id!==id)return false;
    const delta=y-g.startY;g.moved ||= Math.abs(delta)>8;
    if(g.moved){
      this.offset=clampLeagueScroll(g.startOffset-delta);
      const dt=Math.max(0.008,(now-g.lastAt)/1000);g.velocity=Math.max(-1800,Math.min(1800,(g.lastY-y)/dt));
    }
    g.lastY=y;g.lastAt=now;return true;
  }
  end(id:number,y:number,now:number,reducedMotion=false):boolean {
    const g=this.gesture;if(!g||g.id!==id)return false;
    const stale=now-g.lastAt>100;if(y!==g.lastY)this.move(id,y,now);
    this.velocity=g.moved&&!stale&&!reducedMotion?g.velocity:0;this.gesture=undefined;return true;
  }
  cancel():void {this.gesture=undefined;this.velocity=0;}
  update(delta:number):boolean {
    if(this.gesture||Math.abs(this.velocity)<5){this.velocity=0;return false;}
    const dt=Math.min(0.05,Math.max(0,delta)),before=this.offset;
    this.offset=clampLeagueScroll(this.offset+this.velocity*dt);this.velocity*=Math.exp(-7*dt);
    if(this.offset===0||this.offset===LEAGUE_SCROLL_MAX)this.velocity=0;
    return this.offset!==before;
  }
  toRank(rank:number):void {this.cancel();this.offset=clampLeagueScroll(leagueRowTop(Math.max(0,Math.min(49,rank-1)))-LEAGUE_LIST.height/2+LEAGUE_ROW_PITCH/2);}
}

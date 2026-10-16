import {describe,it,expect} from "vitest";
import {LeagueScroll,LEAGUE_SCROLL_MAX,LEAGUE_LIST} from "../src/game/leagueScroll";
describe("league drag lifecycle",()=>{
  it("clamps all 50 rows and ignores a second pointer",()=>{
    const s=new LeagueScroll();expect(s.begin(1,248,900,0)).toBe(true);
    expect(s.begin(2,248,600,1)).toBe(false);expect(s.move(2,450,20)).toBe(false);
    s.move(1,-4000,50);expect(s.offset).toBe(LEAGUE_SCROLL_MAX);s.end(1,-4000,60,true);
    s.begin(1,248,LEAGUE_LIST.y+5,70);s.move(1,6000,90);expect(s.offset).toBe(0);
  });
  it("keeps release velocity, decays by elapsed time and cancels safely",()=>{
    const s=new LeagueScroll();s.begin(1,248,800,0);s.move(1,700,50);s.end(1,700,60);
    expect(s.velocity).toBe(1800);expect(s.update(.02)).toBe(true);expect(s.offset).toBe(136);
    s.cancel();const offset=s.offset;expect(s.update(.05)).toBe(false);expect(s.offset).toBe(offset);
  });
  it("suppresses stale/reduced-motion flings, rejects outside starts and centers rank",()=>{
    const s=new LeagueScroll();expect(s.begin(1,248,300,0)).toBe(false);
    s.begin(1,248,800,0);s.move(1,600,40);s.end(1,600,200);expect(s.velocity).toBe(0);
    s.begin(1,248,800,210);s.move(1,600,230);s.end(1,600,240,true);expect(s.velocity).toBe(0);
    s.toRank(50);expect(s.offset).toBe(LEAGUE_SCROLL_MAX);s.toRank(1);expect(s.offset).toBe(0);
  });
});

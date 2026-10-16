import {describe,it,expect,vi} from "vitest";
import {LeagueArtStore} from "../src/game/LeagueArtStore";
import {LEAGUE_ART_NAMES} from "../src/game/leagueUi";
const settle=()=>new Promise(resolve=>setTimeout(resolve,0));
describe("generated league art lifetime",()=>{
  it("releases partial failure and retries the complete group",async()=>{
    let fail=true;const release=vi.fn(),changed=vi.fn();
    const store=new LeagueArtStore(async p=>{if(fail&&p.endsWith("gold.png"))throw Error("503");return {src:p} as HTMLImageElement;},release,changed);
    store.request();await settle();expect(store.error).toBe(true);expect(store.art).toBeUndefined();expect(release).toHaveBeenCalledTimes(LEAGUE_ART_NAMES.length-1);
    fail=false;store.request();await settle();expect(Object.keys(store.art!)).toHaveLength(LEAGUE_ART_NAMES.length);expect(store.error).toBe(false);
    store.dispose();expect(release).toHaveBeenCalledTimes(LEAGUE_ART_NAMES.length*2-1);expect(store.art).toBeUndefined();
  });
  it("releases late images after exit without publishing stale art",async()=>{
    let complete!:()=>void;const pending=new Promise<void>(resolve=>{complete=resolve;}),release=vi.fn(),changed=vi.fn();
    const store=new LeagueArtStore(async p=>{await pending;return {src:p} as HTMLImageElement;},release,changed);
    store.request();store.dispose();complete();await settle();expect(store.art).toBeUndefined();expect(store.loading).toBe(false);expect(release).toHaveBeenCalledTimes(LEAGUE_ART_NAMES.length);expect(changed).not.toHaveBeenCalled();
  });
});

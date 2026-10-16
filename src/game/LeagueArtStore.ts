import { LEAGUE_ART_NAMES, LEAGUE_ART_PATHS, type LeagueArt } from "./leagueUi";
export class LeagueArtStore {
  art?:LeagueArt;loading=false;error=false;private token=0;
  constructor(private load:(path:string)=>Promise<HTMLImageElement>,private release:(image:HTMLImageElement)=>void,private changed:()=>void){}
  request():void {
    if(this.art||this.loading)return;const token=++this.token;this.loading=true;this.error=false;
    void Promise.allSettled(LEAGUE_ART_PATHS.map(path=>this.load(path))).then(results=>{
      const images=results.flatMap(r=>r.status==="fulfilled"?[r.value]:[]);
      if(token!==this.token){images.forEach(this.release);return;}
      this.loading=false;
      if(images.length!==LEAGUE_ART_NAMES.length){images.forEach(this.release);this.error=true;}
      else this.art=Object.fromEntries(LEAGUE_ART_NAMES.map((name,i)=>[name,images[i]])) as LeagueArt;
      this.changed();
    });
  }
  dispose():void {this.token++;if(this.art)Object.values(this.art).forEach(this.release);this.art=undefined;this.loading=false;this.error=false;}
}

import {constructEarlyFrozenRegionStock} from './early-frozen-region-factory.mjs';
import {auditThawedPrefixBridge} from './early-frozen-prefix-tail.mjs';

/** The already qualified all-gates factory owns every placeholder/paint/iced
 * reservation. This adapter adds no retile, alternate colouring or search. */
export function constructEarlyPrefixStock(runtime,blueprint,options={}){
 const built=constructEarlyFrozenRegionStock(runtime,blueprint,options);
 if(!built.ok)return built;
 try{return{...built,thawedPrefixBridge:auditThawedPrefixBridge(runtime,built.level,built.plain.level,built.prefixDrags,built.iceDeclaration),
  upperStrategy:'one-thawed-prefix-plain-tail-original-ice-lower',newSearches:0};}
 catch(e){return{...built,ok:false,status:'STATIC_THAWED_PREFIX_REJECTED',reason:e.message,newSearches:0};}
}

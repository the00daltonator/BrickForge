// Runtime switches for the static website build (no server routes, catalog files next to
// the page, saves through a host-provided hook). The full site never sets these globals.
type SiteGlobals={__BF_STATIC__?:boolean;__BF_SAVE__?:(name:string,data:Blob)=>void};
const g=()=>(typeof window==='undefined'?{}:window) as SiteGlobals;
export const isStaticSite=()=>!!g().__BF_STATIC__;
/** URL of a bundled public file such as `catalog/parts.json`. */
export const assetUrl=(path:string)=>(isStaticSite()?'./':'/')+path;
/** Save hook installed by the static site; returns false when the normal browser download should run. */
export function hostSave(name:string,data:Blob){const save=g().__BF_SAVE__;if(!save)return false;save(name,data);return true}

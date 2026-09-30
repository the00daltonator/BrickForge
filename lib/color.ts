import {COLORS,GENERATOR_COLORS,color,observedColor} from './brick-engine';

// Perceptual color matching in CIE Lab. Plain RGB distance picks muddy or wrong hues
// for skin tones and dark colors; Lab keeps matches closer to what people see.
type Lab=[number,number,number];
const labCache=new Map<string,Lab>();
export function hexToRgb(hex:string):[number,number,number]{return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)) as [number,number,number]}
export function rgbToLab(r:number,g:number,b:number):Lab{
  const lin=(c:number)=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4};
  const R=lin(r),G=lin(g),B=lin(b);
  const x=(R*.4124+G*.3576+B*.1805)/.95047,y=R*.2126+G*.7152+B*.0722,z=(R*.0193+G*.1192+B*.9505)/1.08883;
  const f=(t:number)=>t>.008856?Math.cbrt(t):7.787*t+16/116;
  return [116*f(y)-16,500*(f(x)-f(y)),200*(f(y)-f(z))];
}
export function hexToLab(hex:string):Lab{let v=labCache.get(hex);if(!v){v=rgbToLab(...hexToRgb(hex));labCache.set(hex,v)}return v}
export const deltaE=(a:Lab,b:Lab)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
export const colorDistance=(a:number,b:number)=>deltaE(hexToLab(color(a).hex),hexToLab(color(b).hex));

/** Closest color ID from a candidate list to an RGB value. */
export function nearestLab(r:number,g:number,b:number,candidates:number[]){
  const lab=rgbToLab(r,g,b);let best=candidates[0],d=Infinity;
  for(const id of candidates){const e=deltaE(lab,hexToLab(color(id).hex));if(e<d){d=e;best=id}}
  return best;
}
/** Closest color to `target` among `candidates` (by color ID). */
export function closestColor(target:number,candidates:number[]){
  if(!candidates.length)return target;const t=hexToLab(color(target).hex);let best=candidates[0],d=Infinity;
  for(const id of candidates){const e=deltaE(t,hexToLab(color(id).hex));if(e<d){d=e;best=id}}
  return best;
}
/** Opaque colors that exist for a given part in the bundled catalog (e.g. 1 × 1 plates for mosaics). */
export function realColorsFor(partId:string){return GENERATOR_COLORS.filter(c=>observedColor(partId,c.id)).map(c=>c.id)}
/** A curated, widely produced palette for characters. Every color here exists as common bricks and plates. */
export const CHARACTER_PALETTE=[15,0,71,72,4,320,25,14,191,19,28,70,308,78,84,92,1,272,73,321,212,379,2,288,10,27,378,22,85,30,26,5,13,3,297].filter(id=>COLORS.some(c=>c.id===id));
export const SKIN_TONES=[14,78,92,84,70,308,15,71,2,10].filter(id=>COLORS.some(c=>c.id===id));

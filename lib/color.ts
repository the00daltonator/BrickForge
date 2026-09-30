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
/** CIEDE2000 color difference; much better than plain Lab distance around blues and purples. */
export function deltaE(a:Lab,b:Lab){
  const [L1,a1,b1]=a,[L2,a2,b2]=b,rad=Math.PI/180;
  const C1=Math.hypot(a1,b1),C2=Math.hypot(a2,b2),Cm=(C1+C2)/2,G=.5*(1-Math.sqrt(Cm**7/(Cm**7+25**7)));
  const a1p=a1*(1+G),a2p=a2*(1+G),C1p=Math.hypot(a1p,b1),C2p=Math.hypot(a2p,b2);
  const h=(x:number,y:number)=>{if(!x&&!y)return 0;const v=Math.atan2(y,x)/rad;return v<0?v+360:v};
  const h1=h(a1p,b1),h2=h(a2p,b2),dL=L2-L1,dC=C2p-C1p;
  let dh=0;if(C1p*C2p){dh=h2-h1;if(dh>180)dh-=360;else if(dh<-180)dh+=360}
  const dH=2*Math.sqrt(C1p*C2p)*Math.sin(dh*rad/2),Lm=(L1+L2)/2,Cpm=(C1p+C2p)/2;
  let hm=h1+h2;if(C1p*C2p){hm=Math.abs(h1-h2)>180?(h1+h2<360?(h1+h2+360)/2:(h1+h2-360)/2):(h1+h2)/2}
  const T=1-.17*Math.cos((hm-30)*rad)+.24*Math.cos(2*hm*rad)+.32*Math.cos((3*hm+6)*rad)-.2*Math.cos((4*hm-63)*rad);
  const SL=1+.015*(Lm-50)**2/Math.sqrt(20+(Lm-50)**2),SC=1+.045*Cpm,SH=1+.015*Cpm*T;
  const RT=-2*Math.sqrt(Cpm**7/(Cpm**7+25**7))*Math.sin(60*Math.exp(-(((hm-275)/25)**2))*rad);
  return Math.sqrt((dL/SL)**2+(dC/SC)**2+(dH/SH)**2+RT*(dC/SC)*(dH/SH));
}
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

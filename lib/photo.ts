import {Voxel,GENERATOR_COLORS,observedColor,color} from './brick-engine';
import {rgbToLab,deltaE,hexToLab,nearestLab,CHARACTER_PALETTE,SKIN_TONES} from './color';

// Local photo processing. Everything runs on raw RGBA pixels, so it works offline and in
// tests; only loadPixels needs a browser canvas.
export type Pixels={w:number;h:number;data:Uint8ClampedArray|Uint8Array};
export type Mask={w:number;h:number;on:Uint8Array;box:{x:number;y:number;w:number;h:number};removed:boolean};

export async function loadPixels(dataUrl:string,maxSide=320):Promise<Pixels>{
  const img=new Image();await new Promise<void>((ok,no)=>{img.onload=()=>ok();img.onerror=()=>no(new Error('Could not read this image.'));img.src=dataUrl});
  const s=Math.min(1,maxSide/Math.max(img.width,img.height)),w=Math.max(1,Math.round(img.width*s)),h=Math.max(1,Math.round(img.height*s));
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d')!;ctx.drawImage(img,0,0,w,h);
  return{w,h,data:ctx.getImageData(0,0,w,h).data};
}

const labAt=(p:Pixels,i:number)=>rgbToLab(p.data[i*4],p.data[i*4+1],p.data[i*4+2]);

/**
 * Separates the subject from a plain-ish background: pixels connected to the border whose
 * color stays close to the border colors become background. Transparent pixels are always
 * background. Keeps the largest subject region and fills holes inside it.
 */
export function subjectMask(p:Pixels,tolerance=18):Mask{
  const {w,h}=p,n=w*h,bg=new Uint8Array(n),labs=new Array<[number,number,number]>(n);
  for(let i=0;i<n;i++)labs[i]=labAt(p,i);
  // Border palette: a few representative border colors (handles gradients and two-tone walls).
  const border:number[]=[];for(let x=0;x<w;x++)border.push(x,(h-1)*w+x);for(let y=0;y<h;y++)border.push(y*w,y*w+w-1);
  const seeds:[number,number,number][]=[];for(const i of border){if(p.data[i*4+3]<64)continue;const l=labs[i];if(!seeds.some(s=>deltaE(s,l)<tolerance*.6))seeds.push(l);if(seeds.length>12)break}
  const queue:number[]=[];
  for(const i of border){const transparent=p.data[i*4+3]<64;if(transparent||seeds.some(s=>deltaE(s,labs[i])<tolerance)){bg[i]=1;queue.push(i)}}
  for(let q=0;q<queue.length;q++){const i=queue[q],x=i%w,y=(i-x)/w;
    for(const j of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1]){if(j<0||bg[j])continue;
      const transparent=p.data[j*4+3]<64;
      if(transparent||(deltaE(labs[j],labs[i])<tolerance*.55&&seeds.some(s=>deltaE(s,labs[j])<tolerance))){bg[j]=1;queue.push(j)}}}
  let on=new Uint8Array(n);for(let i=0;i<n;i++)on[i]=bg[i]?0:1;
  // Keep substantial subject regions (a head separated from the body by a thin gap still
  // counts) and drop specks of leftover background.
  const label=new Int32Array(n).fill(-1),sizes=new Map<number,number>();
  for(let i=0;i<n;i++){if(!on[i]||label[i]>=0)continue;const stack=[i];label[i]=i;let size=0;while(stack.length){const c=stack.pop()!;size++;const x=c%w,y=(c-x)/w;for(const j of [x>0?c-1:-1,x<w-1?c+1:-1,y>0?c-w:-1,y<h-1?c+w:-1])if(j>=0&&on[j]&&label[j]<0){label[j]=i;stack.push(j)}}sizes.set(i,size)}
  const largest=Math.max(0,...sizes.values());
  for(let i=0;i<n;i++)on[i]=label[i]>=0&&sizes.get(label[i])!>=largest*.04?1:0;
  // Fill holes: background not reachable from the border becomes subject.
  const outside=new Uint8Array(n),fill:number[]=[];for(const i of border)if(!on[i]&&!outside[i]){outside[i]=1;fill.push(i)}
  for(let q=0;q<fill.length;q++){const i=fill[q],x=i%w,y=(i-x)/w;for(const j of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1])if(j>=0&&!on[j]&&!outside[j]){outside[j]=1;fill.push(j)}}
  for(let i=0;i<n;i++)if(!outside[i])on[i]=1;
  const coverage=on.reduce((a,b)=>a+b,0)/n;const removed=coverage>.03&&coverage<.97;
  if(!removed)on=new Uint8Array(n).fill(1);
  let x0=w,y0=h,x1=-1,y1=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(on[y*w+x]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}
  return{w,h,on,box:{x:x0,y:y0,w:x1-x0+1,h:y1-y0+1},removed};
}

/** Median Lab color of subject pixels in a band of the subject's bounding box (fractions of height and width). */
function bandColor(p:Pixels,m:Mask,top:number,bottom:number,left=.25,right=.75){
  const {box}=m,ls:number[]=[],as:number[]=[],bs:number[]=[];
  for(let y=Math.floor(box.y+box.h*top);y<Math.min(box.y+box.h,Math.ceil(box.y+box.h*bottom));y++)for(let x=Math.floor(box.x+box.w*left);x<Math.ceil(box.x+box.w*right);x++){const i=y*p.w+x;if(!m.on[i])continue;const l=labAt(p,i);ls.push(l[0]);as.push(l[1]);bs.push(l[2])}
  if(!ls.length)return null;const med=(a:number[])=>a.sort((x,y)=>x-y)[a.length>>1];return [med(ls),med(as),med(bs)] as [number,number,number];
}
const nearestTo=(lab:[number,number,number]|null,palette:number[],fallback:number)=>{if(!lab)return fallback;let best=fallback,d=Infinity;for(const id of palette){const e=deltaE(lab,hexToLab(color(id).hex));if(e<d){d=e;best=id}}return best};

export type PhotoColors={skin:number;hair:number;shirt:number;pants:number;shoes:number;portrait:boolean;bald:boolean};
/**
 * Reads outfit colors from a photo of a person or character: hair at the top, face below it,
 * then torso, legs and feet. Portrait crops (head and shoulders) only provide hair, skin and shirt.
 */
export function characterColors(p:Pixels,m:Mask):PhotoColors{
  const portrait=m.box.h/Math.max(1,m.box.w)<1.7;
  const bands=portrait?{head:.6,shirt:[.8,1],pants:null,shoes:null}:{head:.3,shirt:[.3,.5],pants:[.62,.85],shoes:[.95,1]};
  // The face is the slice of the upper silhouette that looks most like a skin tone; hair is the top slice.
  const skins=SKIN_TONES.filter(id=>id!==15&&id!==71&&id!==2&&id!==10).map(id=>hexToLab(color(id).hex));
  const hairLab=bandColor(p,m,0,bands.head/8,.3,.7);let face:ReturnType<typeof bandColor>=null,fit=Infinity;
  for(let i=1;i<8;i++){const lab=bandColor(p,m,bands.head*i/8,bands.head*(i+1)/8,.35,.65);if(!lab||(hairLab&&deltaE(lab,hairLab)<10))continue;const d=Math.min(...skins.map(s=>deltaE(s,lab)));if(d<fit){fit=d;face=lab}}
  if(fit>20)face=bandColor(p,m,bands.head*.4,bands.head*.7,.35,.65);
  const skin=nearestTo(face,SKIN_TONES,78),hair=nearestTo(hairLab,CHARACTER_PALETTE,70);
  const shirt=nearestTo(bandColor(p,m,bands.shirt[0],bands.shirt[1]),CHARACTER_PALETTE,4);
  const pants=bands.pants?nearestTo(bandColor(p,m,bands.pants[0],bands.pants[1],.3,.7),CHARACTER_PALETTE,272):272;
  const shoes=bands.shoes?nearestTo(bandColor(p,m,bands.shoes[0],bands.shoes[1],.2,.8),CHARACTER_PALETTE,0):0;
  const bald=!!face&&!!hairLab&&deltaE(face,hairLab)<12;
  return{skin,hair,shirt,pants,shoes,portrait,bald};
}

/** Real colors available as 1 × 1 plates, the building block for mosaics and photo sculptures. */
export const plateColors=()=>GENERATOR_COLORS.filter(c=>observedColor('3024',c.id)).map(c=>c.id);

type Grid={gw:number;gh:number;cells:(number|null)[]};
/** Resamples the subject into a stud grid. `rowScale` converts one stud of width into grid rows. */
function sampleGrid(p:Pixels,m:Mask,width:number,rowScale:number,palette:number[],limit:number,dither:boolean):Grid{
  const {box}=m,gw=Math.max(4,Math.round(width)),gh=Math.max(2,Math.min(160,Math.round(gw*box.h/box.w*rowScale)));
  const avg:({r:number;g:number;b:number}|null)[]=[];
  for(let gy=0;gy<gh;gy++)for(let gx=0;gx<gw;gx++){
    const xa=box.x+Math.floor(gx*box.w/gw),xb=box.x+Math.max(Math.floor(gx*box.w/gw)+1,Math.floor((gx+1)*box.w/gw));
    const ya=box.y+Math.floor(gy*box.h/gh),yb=box.y+Math.max(Math.floor(gy*box.h/gh)+1,Math.floor((gy+1)*box.h/gh));
    let r=0,g=0,b=0,cnt=0,tot=0;for(let y=ya;y<yb;y++)for(let x=xa;x<xb;x++){tot++;const i=y*p.w+x;if(!m.on[i])continue;cnt++;r+=p.data[i*4];g+=p.data[i*4+1];b+=p.data[i*4+2]}
    avg.push(cnt*2>=tot&&cnt?{r:r/cnt,g:g/cnt,b:b/cnt}:null);
  }
  // Limit the palette to the most used colors so the build needs fewer different lots.
  const counts=new Map<number,number>();for(const a of avg)if(a){const id=nearestLab(a.r,a.g,a.b,palette);counts.set(id,(counts.get(id)||0)+1)}
  const kept=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,limit).map(([id])=>id);
  const cells:(number|null)[]=new Array(avg.length).fill(null);
  if(!dither){avg.forEach((a,i)=>{if(a)cells[i]=nearestLab(a.r,a.g,a.b,kept)});return{gw,gh,cells}}
  // Floyd–Steinberg error diffusion in RGB over the kept real colors.
  const buf=avg.map(a=>a&&{...a});
  for(let gy=0;gy<gh;gy++)for(let gx=0;gx<gw;gx++){const i=gy*gw+gx,a=buf[i];if(!a)continue;
    const id=nearestLab(Math.max(0,Math.min(255,a.r)),Math.max(0,Math.min(255,a.g)),Math.max(0,Math.min(255,a.b)),kept);cells[i]=id;
    const hx=color(id).hex,er=a.r-parseInt(hx.slice(1,3),16),eg=a.g-parseInt(hx.slice(3,5),16),eb=a.b-parseInt(hx.slice(5,7),16);
    for(const [dx,dy,f] of [[1,0,7/16],[-1,1,3/16],[0,1,5/16],[1,1,1/16]] as const){const x=gx+dx,y=gy+dy;if(x<0||x>=gw||y>=gh)continue;const t=buf[y*gw+x];if(t){t.r+=er*f;t.g+=eg*f;t.b+=eb*f}}}
  return{gw,gh,cells};
}

/** Flat mosaic lying on the table: a gray backing layer plus one color layer (studs up). */
export function mosaicVoxels(p:Pixels,m:Mask,width:number,opts:{dither?:boolean;colors?:number;backing?:number}={}):Voxel[]{
  const grid=sampleGrid(p,m,width,1,plateColors(),opts.colors??24,!!opts.dither);const voxels:Voxel[]=[];
  for(let z=0;z<grid.gh;z++)for(let x=0;x<grid.gw;x++){const c=grid.cells[z*grid.gw+x];if(c===null&&m.removed)continue;voxels.push({x,y:0,z,color:opts.backing??71});voxels.push({x,y:1,z,color:c??15})}
  return voxels;
}

/**
 * Upright figure on a display base. `standee` extrudes the silhouette to a fixed thickness;
 * `sculpture` inflates it: cells deep inside the silhouette get thicker, edges stay thin,
 * giving a rounded, symmetric 3D form from a single photo.
 */
export function figureVoxels(p:Pixels,m:Mask,width:number,mode:'sculpture'|'standee',opts:{colors?:number;base?:number;thickness?:number}={}):Voxel[]{
  // One stud of width equals 2.5 plates of height.
  const grid=sampleGrid(p,m,width,2.5,plateColors(),opts.colors??12,false),{gw,gh,cells}=grid;
  // Distance to the nearest empty cell, in studs (rows are 0.4 studs tall).
  const dist=new Float32Array(gw*gh).fill(Infinity);const q:number[]=[];
  for(let i=0;i<cells.length;i++){const x=i%gw,y=(i-x)/gw;if(cells[i]===null)continue;const edge=x===0||x===gw-1||y===0||y===gh-1||cells[i-1]===null||cells[i+1]===null||cells[i-gw]===null||cells[i+gw]===null;if(edge){dist[i]=.5;q.push(i)}}
  // Two-pass chamfer approximation (anisotropic: horizontal step 1, vertical 0.4).
  for(let pass=0;pass<2;pass++)for(let k=0;k<cells.length;k++){const i=pass?cells.length-1-k:k;if(cells[i]===null)continue;const x=i%gw,y=(i-x)/gw;
    for(const [dx,dy,c] of pass?[[1,0,1],[0,1,.4],[1,1,1.08],[-1,1,1.08]]:[[-1,0,1],[0,-1,.4],[-1,-1,1.08],[1,-1,1.08]]){const nx=x+dx,ny=y+dy;if(nx<0||nx>=gw||ny<0||ny>=gh)continue;const j=ny*gw+nx;if(dist[j]+c<dist[i])dist[i]=dist[j]+c}}
  const maxHalf=Math.max(1,Math.round(gw/6)),t=Math.max(1,opts.thickness??2);
  const lift=2,voxels:Voxel[]=[];let minZ=0,maxZ=0;
  for(let gy=0;gy<gh;gy++)for(let gx=0;gx<gw;gx++){const c=cells[gy*gw+gx];if(c===null)continue;const y=lift+gh-1-gy,x=gx-Math.floor(gw/2);
    if(mode==='standee'){for(let z=0;z<t;z++)voxels.push({x,y,z:z-Math.floor(t/2),color:c});minZ=Math.min(minZ,-Math.floor(t/2));maxZ=Math.max(maxZ,t-1-Math.floor(t/2));continue}
    const half=Math.max(1,Math.min(maxHalf,Math.round(Math.sqrt(dist[gy*gw+gx])*1.6)));for(let z=-half;z<half;z++)voxels.push({x,y,z,color:c});minZ=Math.min(minZ,-half);maxZ=Math.max(maxZ,half-1)}
  // Display base under the full footprint, one stud margin.
  const xs=voxels.map(v=>v.x);const bx0=Math.min(...xs)-1,bx1=Math.max(...xs)+1;
  for(let x=bx0;x<=bx1;x++)for(let z=minZ-1;z<=maxZ+1;z++)for(let y=0;y<lift;y++)voxels.push({x,y,z,color:opts.base??72});
  // Anything above an empty column that never reaches the base would float; the planner adds
  // supports, but a silhouette usually touches the ground along its bottom row.
  return voxels;
}

/** Uses the whole image as the subject (background removal off). */
export function fullMask(p:Pixels):Mask{return{w:p.w,h:p.h,on:new Uint8Array(p.w*p.h).fill(1),box:{x:0,y:0,w:p.w,h:p.h},removed:false}}
/** Preview of the detected subject on a checkerboard, as a data URL (browser only). */
export function maskPreview(p:Pixels,m:Mask){
  const c=document.createElement('canvas');c.width=p.w;c.height=p.h;const ctx=c.getContext('2d')!;const img=ctx.createImageData(p.w,p.h);
  for(let i=0;i<p.w*p.h;i++){const x=i%p.w,y=(i-x)/p.w,check=((x>>3)+(y>>3))%2?236:250;const on=m.on[i];img.data[i*4]=on?p.data[i*4]:check;img.data[i*4+1]=on?p.data[i*4+1]:check;img.data[i*4+2]=on?p.data[i*4+2]:check;img.data[i*4+3]=255}
  ctx.putImageData(img,0,0);return c.toDataURL('image/png');
}

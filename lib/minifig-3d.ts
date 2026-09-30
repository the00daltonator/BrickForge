import {Model,color} from './brick-engine';
import {MinifigLook,lookFromParts,isMinifigPart} from './minifig';

// Simplified 3D minifigure for the viewer, box art and instruction renders. Real minifigure
// proportions in grid units (studs across, plates up); the figure faces -Z. Arms, legs and
// head follow the pose of the model's minifigure joints.
export type FigurePlacement={look:MinifigLook;x:number;y:number;z:number;pose?:Record<string,number[]>};
type P3=[number,number,number];type AddFace=(points:P3[],fill:string,bias?:number)=>void;

const shade=(hex:string,n:number)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)*n))).toString(16).padStart(2,'0')).join('');
const P=.4,DEG=Math.PI/180;
/** Rotates a grid point about an axis through a pivot, in physical units. */
function rotate(p:P3,pivot:P3,axis:'x'|'y',deg:number):P3{
  if(!deg)return p;const c=Math.cos(deg*DEG),s=Math.sin(deg*DEG),v=[p[0]-pivot[0],(p[1]-pivot[1])*P,p[2]-pivot[2]];
  const r=axis==='x'?[v[0],v[1]*c-v[2]*s,v[1]*s+v[2]*c]:[v[0]*c+v[2]*s,v[1],-v[0]*s+v[2]*c];
  return[r[0]+pivot[0],r[1]/P+pivot[1],r[2]+pivot[2]];
}
export function minifigFaces(f:FigurePlacement,add:AddFace,grayscale=false){
  const hex=(id:number)=>{const h=color(id).hex;if(!grayscale)return h;const v=Math.round([1,3,5].reduce((s,i,k)=>s+parseInt(h.slice(i,i+2),16)*[.3,.59,.11][k],0));return '#'+v.toString(16).padStart(2,'0').repeat(3)};
  const cx=f.x+1,cz=f.z+.5,y0=f.y,look=f.look,pose=f.pose??{};
  const turn=pose['fig-head']?.[0]??0,armR=pose['fig-arm-r']?.[0]??0,armL=pose['fig-arm-l']?.[0]??0,legR=pose['fig-leg-r']?.[0]??0,legL=pose['fig-leg-l']?.[0]??0;
  type Xf=(p:P3)=>P3;const id:Xf=p=>p;
  // Axis-aligned box through a transform (all six faces; depth sorting hides the back ones).
  const box=(x0:number,x1:number,ya:number,yb:number,z0:number,z1:number,fill:string,t:Xf=id)=>{
    const c=(x:number,y:number,z:number)=>t([x,y,z]);
    add([c(x0,yb,z0),c(x1,yb,z0),c(x1,yb,z1),c(x0,yb,z1)],shade(fill,1.06));add([c(x0,ya,z0),c(x1,ya,z0),c(x1,ya,z1),c(x0,ya,z1)],shade(fill,.6));
    add([c(x0,ya,z0),c(x1,ya,z0),c(x1,yb,z0),c(x0,yb,z0)],shade(fill,.9));add([c(x0,ya,z1),c(x1,ya,z1),c(x1,yb,z1),c(x0,yb,z1)],shade(fill,.7));
    add([c(x0,ya,z0),c(x0,ya,z1),c(x0,yb,z1),c(x0,yb,z0)],shade(fill,.75));add([c(x1,ya,z0),c(x1,ya,z1),c(x1,yb,z1),c(x1,yb,z0)],shade(fill,.8));
  };
  // Vertical cylinder (or cone when r1 differs) through a transform.
  const cyl=(x:number,z:number,ya:number,yb:number,r0:number,fill:string,t:Xf=id,r1=r0,n=14)=>{
    const ring=(y:number,r:number)=>Array.from({length:n},(_,i)=>t([x+Math.cos(i*2*Math.PI/n)*r,y,z+Math.sin(i*2*Math.PI/n)*r]));
    const lo=ring(ya,r0),hi=ring(yb,r1);for(let i=0;i<n;i++){const k=(i+1)%n;add([lo[i],lo[k],hi[k],hi[i]],shade(fill,.72+.28*Math.abs(Math.cos((i+.5)*2*Math.PI/n-2.4))))}
    add(hi,shade(fill,1.08));add(lo,shade(fill,.6));
  };
  // Legs and hips.
  const hipPivot:P3=[cx,y0+4.1,cz];
  box(cx-.95,cx-.04,y0,y0+4.1,cz-.4,cz+.38,hex(look.legs),p=>rotate(p,hipPivot,'x',legR));
  box(cx+.04,cx+.95,y0,y0+4.1,cz-.4,cz+.38,hex(look.legs),p=>rotate(p,hipPivot,'x',legL));
  box(cx-.97,cx+.97,y0+3.9,y0+4.8,cz-.38,cz+.38,hex(look.hips));
  // Torso: a tapered block.
  const tb=y0+4.8,tt=y0+9,t=hex(look.torso),T=(x:number,y:number,z:number):P3=>[x,y,z];
  const tq=[T(cx-.97,tb,cz-.4),T(cx+.97,tb,cz-.4),T(cx+.67,tt,cz-.4),T(cx-.67,tt,cz-.4)],tk=tq.map(p=>T(p[0],p[1],cz+.4));
  add(tq,shade(t,.95));add(tk,shade(t,.7));add([tq[0],tk[0],tk[3],tq[3]],shade(t,.75));add([tq[1],tk[1],tk[2],tq[2]],shade(t,.8));add([tq[3],tq[2],tk[2],tk[3]],shade(t,1.05));
  // Neck accessories behind or in front.
  if(look.neck?.kind==='cape')box(cx-1,cx+1,y0+1.2,tt,cz+.42,cz+.52,hex(look.neck.color));
  if(look.neck?.kind==='backpack'||look.neck?.kind==='airtanks')box(cx-.6,cx+.6,y0+5.6,tt-.4,cz+.4,cz+.95,hex(look.neck.color));
  // Arms swing at the shoulders; hands at the ends; a tool in the right hand.
  for(const side of [-1,1]){const pivot:P3=[cx+side*.8,tt-.6,cz],deg=side<0?armR:armL,r:Xf=p=>rotate(p,pivot,'x',deg);
    box(cx+side*.66,cx+side*1.02,y0+5.9,tt-.3,cz-.2,cz+.2,hex(look.arms),r);
    cyl(cx+side*.9,cz-.1,y0+5,y0+5.9,.22,hex(look.hands),r);
    if(side<0&&look.tool){const tc=hex(look.tool.color),k=look.tool.kind;
      if(k==='shield')box(cx-1.12,cx-1.05,y0+3.6,y0+7.4,cz-.9,cz+.7,tc,r);
      else if(k==='staff'||k==='wand')cyl(cx-.9,cz-.1,y0+(k==='staff'?1:4.4),y0+(k==='staff'?13:7.6),.07,tc,r);
      else{cyl(cx-.9,cz-.1,y0+5.9,y0+6.5,.1,shade(tc,.6),r);box(cx-.97,cx-.83,y0+6.5,y0+10.8,cz-.16,cz-.04,tc,r)}}}
  // Head with stud, face, hair or headwear; turns about its own axis.
  const hp:P3=[cx,y0,cz],h:Xf=p=>rotate(p,hp,'y',turn),hy=tt+.25;
  cyl(cx,cz,tt,hy,.26,hex(look.head),h);cyl(cx,cz,hy,hy+3,.56,hex(look.head),h);
  const face=cz-.575;for(const ex of [-.19,.19])add([h([cx+ex-.06,hy+1.75,face]),h([cx+ex+.06,hy+1.75,face]),h([cx+ex+.06,hy+2.05,face]),h([cx+ex-.06,hy+2.05,face])],'#1b1b1b',.05);
  add([h([cx-.2,hy+.85,face]),h([cx+.2,hy+.85,face]),h([cx+.14,hy+.65,face]),h([cx-.14,hy+.65,face])],'#1b1b1b',.05);
  if(look.neck?.kind==='beard')box(cx-.5,cx+.5,hy,hy+1.2,cz-.66,cz-.5,hex(look.neck.color),h);
  const top=hy+3;
  if(look.hat){const c=hex(look.hat.color),k=look.hat.kind;
    if(k==='wizard'){cyl(cx,cz,top-.3,top,1.05,c,h);cyl(cx,cz,top,top+4.5,.6,c,h,.05)}
    else if(k==='cowboy'||k==='pirate'||k==='tophat'){cyl(cx,cz,top-.4,top-.1,1,c,h);cyl(cx,cz,top-.1,top+(k==='tophat'?2.6:1.3),.58,c,h)}
    else if(k==='chef')cyl(cx,cz,top-.6,top+2.4,.6,c,h,.72);
    else if(k==='crown')cyl(cx,cz,top-.4,top+.7,.6,c,h);
    else if(k==='cap'||k==='police'){cyl(cx,cz,top-1,top+.5,.6,c,h);box(cx-.45,cx+.45,top-.7,top-.5,cz-1.15,cz-.4,c,h)}
    else cyl(cx,cz,hy+1,top+.6,.64,c,h);}
  else if(look.hair){const c=hex(look.hair.color),long=['long','bob','bun','curly'].includes(look.hair.style);
    cyl(cx,cz,top-1.3,top+.55,.62,c,h);if(long)box(cx-.62,cx+.62,hy+.1,top-.6,cz,cz+.66,c,h);
    if(look.hair.style==='spiky')for(const [dx,dz] of [[-.3,-.2],[.25,-.25],[0,.25]])cyl(cx+dx,cz+dz,top+.5,top+1.6,.18,c,h,.02,6);}
  else cyl(cx,cz,top,top+.5,.3,hex(look.head),h);
}

/** The minifigures a model shows, built from its minifigure parts and posed by its joints. */
export function figuresOf(m:Model,pose:Record<string,number[]>|undefined=m.pose):FigurePlacement[]{
  if(!m.figures?.length)return [];const look=lookFromParts((m.extras??[]).filter(e=>isMinifigPart(e.part)));if(!look)return [];
  return m.figures.map(f=>({...f,look,pose}));
}

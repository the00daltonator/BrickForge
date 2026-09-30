import {Brick,bounds,dims,color,part} from './brick-engine';

// Shared isometric-style renderer used by the live viewer (canvas), instruction steps and
// box art (SVG). Painter's algorithm over flat faces; hidden faces between touching bricks
// are culled so large models stay light.
export type Pt={x:number;y:number;depth:number};
export type Face={points:Pt[];fill:string;depth:number;id:string;stroke?:string;width?:number};
export type SceneOptions={width:number;height:number;yaw?:number;pitch?:number;zoom?:number;frame?:Brick[];stepY?:number;explode?:boolean;selected?:string|null;highlight?:string[];outline?:Set<string>;fade?:Set<string>;cull?:boolean;grayscale?:boolean;margin?:number};
export const DEFAULT_VIEW={yaw:3.72,pitch:.42};

export const shade=(hex:string,n:number)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)*n))).toString(16).padStart(2,'0')).join('');
const gray=(hex:string)=>{const v=Math.round([1,3,5].reduce((s,i,k)=>s+parseInt(hex.slice(i,i+2),16)*[.3,.59,.11][k],0));return '#'+v.toString(16).padStart(2,'0').repeat(3)};
const mix=(hex:string,to:string,t:number)=>'#'+[1,3,5].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*(1-t)+parseInt(to.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');

export function projector(frame:Brick[],o:SceneOptions){
  const b=bounds(frame),cy=b.y+b.h/2,yaw=o.yaw??DEFAULT_VIEW.yaw,pitch=o.pitch??DEFAULT_VIEW.pitch,zoom=o.zoom??1,margin=o.margin??7;
  const ca=Math.cos(yaw),sa=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  const scale=Math.min(o.width/(Math.max(b.w,b.d)*1.6+margin),o.height/(b.h*.4*1.4+Math.max(b.w,b.d)*.55+margin*.85))*zoom;
  const proj=(x:number,y:number,z:number):Pt=>{x-=b.x+b.w/2;z-=b.z+b.d/2;y=(y-cy)*.4;const h=x*sa+z*ca;return{x:o.width/2+(x*ca-z*sa)*scale,y:o.height*.51+(h*sp-y*cp)*scale,depth:h*cp+y*sp}};
  return{proj,ca,sa,b,scale};
}

export function sceneFaces(bricks:Brick[],o:SceneOptions){
  const {proj,ca,sa}=projector(o.frame?.length?o.frame:bricks,o);
  const visible=o.stepY===undefined?bricks:bricks.filter(b=>b.y<=o.stepY!);
  const cull=o.cull!==false&&!o.explode,occ=new Set<string>();
  if(cull)for(const b of visible){const s=part(b.part).shape;if(s==='slope'||s==='round')continue;const d=dims(b);for(let x=0;x<d.w;x++)for(let z=0;z<d.d;z++)for(let y=0;y<d.h;y++)occ.add(`${b.x+x},${b.y+y},${b.z+z}`)}
  const filled=(x0:number,x1:number,y0:number,y1:number,z0:number,z1:number)=>{if(!cull)return false;for(let x=x0;x<x1;x++)for(let y=y0;y<y1;y++)for(let z=z0;z<z1;z++)if(!occ.has(`${x},${y},${z}`))return false;return true};
  const faces:Face[]=[];
  const add=(points:number[][],fill:string,id:string,stroke?:string,width?:number)=>{const ps=points.map(p=>proj(p[0],p[1],p[2]));faces.push({points:ps,fill,id,stroke,width,depth:ps.reduce((n,p)=>n+p.depth,0)/ps.length})};
  for(const brick of visible){
    const d=dims(brick),x=brick.x+.035,z=brick.z+.035,y=brick.y+(o.explode?brick.y*.35:0),X=brick.x+d.w-.035,Z=brick.z+d.d-.035,Y=y+d.h-.07;
    const bad=o.highlight?.includes(brick.id);let base=bad?'#ff5b40':color(brick.color).hex;if(o.grayscale&&!bad)base=gray(base);if(o.fade?.has(brick.id))base=mix(base,'#f2f4f7',.55);
    const edge=brick.id===o.selected?'#ffb25c':o.outline?.has(brick.id)?'#ff8a1f':undefined,ew=edge?(o.outline?.has(brick.id)?2.2:1.5):undefined;
    const shape=part(brick.part).shape,bx=brick.x,bz=brick.z,top=brick.y+d.h;
    if(shape==='round'){const cx=(x+X)/2,cz=(z+Z)/2,rx=(X-x)/2,rz=(Z-z)/2,ring:number[][]=[];for(let i=0;i<24;i++){const a=i*Math.PI/12,a2=(i+1)*Math.PI/12;ring.push([cx+Math.cos(a)*rx,Y,cz+Math.sin(a)*rz]);if(Math.cos((a+a2)/2)*sa+Math.sin((a+a2)/2)*ca>0)add([[cx+Math.cos(a)*rx,y,cz+Math.sin(a)*rz],[cx+Math.cos(a2)*rx,y,cz+Math.sin(a2)*rz],[cx+Math.cos(a2)*rx,Y,cz+Math.sin(a2)*rz],[cx+Math.cos(a)*rx,Y,cz+Math.sin(a)*rz]],shade(base,.7),brick.id,edge,ew)}add(ring,shade(base,1.05),brick.id,edge,ew)}
    else if(shape==='slope'){const p=part(brick.part),tr=(pts:number[][])=>pts.map(([xx,yy,zz])=>brick.rot?[bx+zz,yy,bz+p.w-xx]:[bx+xx,yy,bz+zz]);const a=.035,W=p.w-.035,D=p.d-.035,L=y+1;add(tr([[a,L,a],[W,L,a],[W,Y,D-1],[a,Y,D-1]]),shade(base,.95),brick.id,edge,ew);add(tr([[a,Y,D-1],[W,Y,D-1],[W,Y,D],[a,Y,D]]),shade(base,1.05),brick.id,edge,ew);const right=brick.rot?ca<0:sa>0,back=brick.rot?sa>0:ca>0;if(back)add(tr([[a,y,D],[W,y,D],[W,Y,D],[a,Y,D]]),shade(base,.75),brick.id,edge,ew);else add(tr([[a,y,a],[W,y,a],[W,L,a],[a,L,a]]),shade(base,.8),brick.id,edge,ew);const side=right?W:a;add(tr([[side,y,a],[side,y,D],[side,Y,D],[side,Y,D-1],[side,L,a]]),shade(base,.7),brick.id,edge,ew)}
    else{
      if(!filled(bx,bx+d.w,top,top+1,bz,bz+d.d))add([[x,Y,z],[X,Y,z],[X,Y,Z],[x,Y,Z]],shade(base,1.05),brick.id,edge,ew);
      if(ca>0){if(!filled(bx,bx+d.w,brick.y,top,bz+d.d,bz+d.d+1))add([[x,y,Z],[X,y,Z],[X,Y,Z],[x,Y,Z]],shade(base,.67),brick.id,edge,ew)}else if(!filled(bx,bx+d.w,brick.y,top,bz-1,bz))add([[x,y,z],[X,y,z],[X,Y,z],[x,Y,z]],shade(base,.82),brick.id,edge,ew);
      if(sa>0){if(!filled(bx+d.w,bx+d.w+1,brick.y,top,bz,bz+d.d))add([[X,y,z],[X,y,Z],[X,Y,Z],[X,Y,z]],shade(base,.78),brick.id,edge,ew)}else if(!filled(bx-1,bx,brick.y,top,bz,bz+d.d))add([[x,y,z],[x,y,Z],[x,Y,Z],[x,Y,z]],shade(base,.65),brick.id,edge,ew);
    }
    for(let dx=0;dx<d.w;dx++)for(let dz=0;dz<d.d;dz++){
      if(shape==='tile'||(shape==='slope'&&(brick.rot?dx<d.w-1:dz<d.d-1)))continue;if(cull&&occ.has(`${bx+dx},${top},${bz+dz}`))continue;
      const cx=bx+dx+.5,cz=bz+dz+.5,ring:number[][]=[];
      // The visible half of the stud's side is one contiguous arc; draw it as a single face.
      const visible:number[]=[];for(let i=0;i<10;i++){ring.push([cx+Math.cos(i*Math.PI/5)*.28,Y+.42,cz+Math.sin(i*Math.PI/5)*.28]);const mid=(i+.5)*Math.PI/5;if(Math.cos(mid)*sa+Math.sin(mid)*ca>0)visible.push(i)}
      const start=visible.find(i=>!visible.includes((i+9)%10))??0,arc:number[][]=[];for(let k=0;k<=visible.length;k++){const a=((start+k)%10)*Math.PI/5;arc.push([cx+Math.cos(a)*.28,Y,cz+Math.sin(a)*.28])}
      add([...arc,...arc.slice().reverse().map(([px,,pz])=>[px,Y+.42,pz])],shade(base,.75),brick.id,edge,ew);
      add(ring,shade(base,1.14),brick.id,edge,ew);
    }
  }
  faces.sort((a,b)=>a.depth-b.depth);
  return{faces,proj};
}

export function drawFaces(ctx:CanvasRenderingContext2D,faces:Face[]){
  for(const f of faces){ctx.beginPath();f.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=f.fill;ctx.fill();ctx.strokeStyle=f.stroke||'#050c142c';ctx.lineWidth=f.width??.65;ctx.stroke()}
}

export function facesToSvg(faces:Face[],width:number,height:number,extra=''){
  const r=(n:number)=>Math.round(n);
  const body=faces.map(f=>`<path d="M${f.points.map(p=>`${r(p.x)} ${r(p.y)}`).join('L')}Z" fill="${f.fill}"${f.stroke?` stroke="${f.stroke}" stroke-width="${f.width??1.5}"`:''}/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><g stroke="#050c142c" stroke-width=".6" stroke-linejoin="round">${body}</g>${extra}</svg>`;
}

/** Isometric render of a model or a step, as an SVG string. */
export function modelSvg(bricks:Brick[],o:Omit<SceneOptions,'width'|'height'>&{width?:number;height?:number}={}){
  const width=o.width??640,height=o.height??480;return facesToSvg(sceneFaces(bricks,{...o,width,height}).faces,width,height);
}
/** Small icon of one part in one color (grid parts only). */
export function partIconSvg(partId:string,colorId:number,size=64){
  const p=part(partId);if(!p)return '';
  const b:Brick={id:'icon',part:partId,color:colorId,x:0,y:0,z:0,rot:false};
  return modelSvg([b],{width:size,height:size,margin:.5,cull:false});
}

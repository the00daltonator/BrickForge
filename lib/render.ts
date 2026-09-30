import {Brick,Joint,bounds,dims,color,part} from './brick-engine';
import {Xf,applyXf,isIdentity} from './joints';
import {FigurePlacement,minifigFaces} from './minifig-3d';

// Shared isometric-style renderer used by the live viewer (canvas), instruction steps and
// box art (SVG). Painter's algorithm over flat faces; hidden faces between touching bricks
// are culled so large models stay light.
export type Pt={x:number;y:number;depth:number};
export type Face={points:Pt[];fill:string;depth:number;id:string;stroke?:string;width?:number};
export type SceneOptions={width:number;height:number;yaw?:number;pitch?:number;zoom?:number;frame?:Brick[];stepY?:number;explode?:boolean;selected?:string|null;highlight?:string[];outline?:Set<string>;fade?:Set<string>;cull?:boolean;grayscale?:boolean;margin?:number;transforms?:Map<string,Xf>;joints?:Joint[];pose?:Record<string,number[]>;attached?:Set<string>;figures?:FigurePlacement[]};
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
  // Minifigures are not grid bricks; stand-in columns keep them inside the camera frame.
  const figureFrame=(o.figures??[]).flatMap(f=>[0,3,6,9,12].map(dy=>({id:'frame',part:'3003',color:0,x:f.x,y:f.y+dy,z:f.z-.5,rot:false}) as Brick));
  const {proj,ca,sa}=projector([...(o.frame?.length?o.frame:bricks),...figureFrame],o);
  const visible=o.stepY===undefined?bricks:bricks.filter(b=>b.y<=o.stepY!);
  // Hidden faces are culled against neighbors in the same sub-assembly (they move together).
  const cull=o.cull!==false&&!o.explode,occ=new Set<string>(),cell=(g:string|undefined,x:number,y:number,z:number)=>`${g??''}|${x},${y},${z}`;
  if(cull)for(const b of visible){const s=part(b.part).shape;if(s==='slope'||s==='round')continue;const d=dims(b);for(let x=0;x<d.w;x++)for(let z=0;z<d.d;z++)for(let y=0;y<d.h;y++)occ.add(cell(b.group,b.x+x,b.y+y,b.z+z))}
  const faces:Face[]=[];
  for(const brick of visible){
    const xf=o.transforms?.get(brick.group??''),moved=!!xf&&!isIdentity(xf),g=brick.group;
    const filled=(x0:number,x1:number,y0:number,y1:number,z0:number,z1:number)=>{if(!cull)return false;for(let x=x0;x<x1;x++)for(let y=y0;y<y1;y++)for(let z=z0;z<z1;z++)if(!occ.has(cell(g,x,y,z)))return false;return true};
    const add=(points:number[][],fill:string,id:string,stroke?:string,width?:number)=>{const ps=points.map(p=>{const q=moved?applyXf(xf!,p):p;return proj(q[0],q[1],q[2])});faces.push({points:ps,fill,id,stroke,width,depth:ps.reduce((n,p)=>n+p.depth,0)/ps.length})};
    const d=dims(brick),x=brick.x+.035,z=brick.z+.035,y=brick.y+(o.explode?brick.y*.35:0),X=brick.x+d.w-.035,Z=brick.z+d.d-.035,Y=y+d.h-.07;
    const bad=o.highlight?.includes(brick.id);let base=bad?'#ff5b40':color(brick.color).hex;if(o.grayscale&&!bad)base=gray(base);if(o.fade?.has(brick.id))base=mix(base,'#f2f4f7',.55);
    const edge=brick.id===o.selected?'#ffb25c':o.outline?.has(brick.id)?'#ff8a1f':undefined,ew=edge?(o.outline?.has(brick.id)?2.2:1.5):undefined;
    const shape=part(brick.part).shape,bx=brick.x,bz=brick.z,top=brick.y+d.h;
    if(shape==='round'){const cx=(x+X)/2,cz=(z+Z)/2,rx=(X-x)/2,rz=(Z-z)/2,ring:number[][]=[];for(let i=0;i<24;i++){const a=i*Math.PI/12,a2=(i+1)*Math.PI/12;ring.push([cx+Math.cos(a)*rx,Y,cz+Math.sin(a)*rz]);if(moved||Math.cos((a+a2)/2)*sa+Math.sin((a+a2)/2)*ca>0)add([[cx+Math.cos(a)*rx,y,cz+Math.sin(a)*rz],[cx+Math.cos(a2)*rx,y,cz+Math.sin(a2)*rz],[cx+Math.cos(a2)*rx,Y,cz+Math.sin(a2)*rz],[cx+Math.cos(a)*rx,Y,cz+Math.sin(a)*rz]],shade(base,.7),brick.id,edge,ew)}add(ring,shade(base,1.05),brick.id,edge,ew)}
    else if(shape==='slope'){const p=part(brick.part),tr=(pts:number[][])=>pts.map(([xx,yy,zz])=>brick.rot?[bx+zz,yy,bz+p.w-xx]:[bx+xx,yy,bz+zz]);const a=.035,W=p.w-.035,D=p.d-.035,L=y+1;add(tr([[a,L,a],[W,L,a],[W,Y,D-1],[a,Y,D-1]]),shade(base,.95),brick.id,edge,ew);add(tr([[a,Y,D-1],[W,Y,D-1],[W,Y,D],[a,Y,D]]),shade(base,1.05),brick.id,edge,ew);const right=brick.rot?ca<0:sa>0,back=brick.rot?sa>0:ca>0;if(back||moved)add(tr([[a,y,D],[W,y,D],[W,Y,D],[a,Y,D]]),shade(base,.75),brick.id,edge,ew);if(!back||moved)add(tr([[a,y,a],[W,y,a],[W,L,a],[a,L,a]]),shade(base,.8),brick.id,edge,ew);for(const side of moved?[a,W]:[right?W:a])add(tr([[side,y,a],[side,y,D],[side,Y,D],[side,Y,D-1],[side,L,a]]),shade(base,.7),brick.id,edge,ew)}
    else{
      if(!filled(bx,bx+d.w,top,top+1,bz,bz+d.d))add([[x,Y,z],[X,Y,z],[X,Y,Z],[x,Y,Z]],shade(base,1.05),brick.id,edge,ew);
      // Posed pieces can show any side, so draw every exposed face and let depth order sort them.
      if(moved&&!filled(bx,bx+d.w,brick.y-1,brick.y,bz,bz+d.d))add([[x,y,z],[X,y,z],[X,y,Z],[x,y,Z]],shade(base,.6),brick.id,edge,ew);
      if((moved||ca>0)&&!filled(bx,bx+d.w,brick.y,top,bz+d.d,bz+d.d+1))add([[x,y,Z],[X,y,Z],[X,Y,Z],[x,Y,Z]],shade(base,.67),brick.id,edge,ew);
      if((moved||ca<=0)&&!filled(bx,bx+d.w,brick.y,top,bz-1,bz))add([[x,y,z],[X,y,z],[X,Y,z],[x,Y,z]],shade(base,.82),brick.id,edge,ew);
      if((moved||sa>0)&&!filled(bx+d.w,bx+d.w+1,brick.y,top,bz,bz+d.d))add([[X,y,z],[X,y,Z],[X,Y,Z],[X,Y,z]],shade(base,.78),brick.id,edge,ew);
      if((moved||sa<=0)&&!filled(bx-1,bx,brick.y,top,bz,bz+d.d))add([[x,y,z],[x,y,Z],[x,Y,Z],[x,Y,z]],shade(base,.65),brick.id,edge,ew);
      // Technic pin holes on the two faces the hole passes through.
      if(shape==='technic'){const hy=brick.y+1.8,alongX=!brick.rot;
        for(const face of [0,1]){const exposed=alongX?!filled(face?bx+d.w:bx-1,face?bx+d.w+1:bx,brick.y,top,bz,bz+d.d):!filled(bx,bx+d.w,brick.y,top,face?bz+d.d:bz-1,face?bz+d.d+1:bz);if(!exposed)continue;
          const ring:number[][]=[];for(let i=0;i<12;i++){const a=i*Math.PI/6,u=Math.cos(a)*.3,v=Math.sin(a)*.3/.4;ring.push(alongX?[face?X+.01:x-.01,hy+v,bz+d.d/2+u]:[bx+d.w/2+u,hy+v,face?Z+.01:z-.01])}
          add(ring,'#2b2f33',brick.id);}}
    }
    for(let dx=0;dx<d.w;dx++)for(let dz=0;dz<d.d;dz++){
      if(shape==='tile'||shape==='turntable'||(shape==='slope'&&(brick.rot?dx<d.w-1:dz<d.d-1)))continue;if(cull&&occ.has(cell(g,bx+dx,top,bz+dz)))continue;
      const cx=bx+dx+.5,cz=bz+dz+.5,ring:number[][]=[];
      if(moved){for(let i=0;i<10;i++){const a=i*Math.PI/5,a2=(i+1)*Math.PI/5;ring.push([cx+Math.cos(a)*.28,Y+.42,cz+Math.sin(a)*.28]);add([[cx+Math.cos(a)*.28,Y,cz+Math.sin(a)*.28],[cx+Math.cos(a2)*.28,Y,cz+Math.sin(a2)*.28],[cx+Math.cos(a2)*.28,Y+.42,cz+Math.sin(a2)*.28],[cx+Math.cos(a)*.28,Y+.42,cz+Math.sin(a)*.28]],shade(base,.75),brick.id,edge,ew)}add(ring,shade(base,1.14),brick.id,edge,ew);continue}
      // The visible half of the stud's side is one contiguous arc; draw it as a single face.
      const vis:number[]=[];for(let i=0;i<10;i++){ring.push([cx+Math.cos(i*Math.PI/5)*.28,Y+.42,cz+Math.sin(i*Math.PI/5)*.28]);const mid=(i+.5)*Math.PI/5;if(Math.cos(mid)*sa+Math.sin(mid)*ca>0)vis.push(i)}
      const start=vis.find(i=>!vis.includes((i+9)%10))??0,arc:number[][]=[];for(let k=0;k<=vis.length;k++){const a=((start+k)%10)*Math.PI/5;arc.push([cx+Math.cos(a)*.28,Y,cz+Math.sin(a)*.28])}
      add([...arc,...arc.slice().reverse().map(([px,,pz])=>[px,Y+.42,pz])],shade(base,.75),brick.id,edge,ew);
      add(ring,shade(base,1.14),brick.id,edge,ew);
    }
  }
  // Wheels on axle joints: tire, tread band and a hub with a spoke, so rolling is visible.
  for(const j of o.joints??[]){
    if(j.kind!=='axle'||!j.wheel||(o.attached&&!o.attached.has(j.id)))continue;
    const xf=o.transforms?.get(j.parent),w=j.wheel,[px,py,pz]=j.pivot,spin=((o.pose?.[j.id]?.[0])??0)*Math.PI/180;
    const pt=(xx:number,a:number,r:number)=>{const q=[xx,py+Math.sin(a)*r/.4,pz+Math.cos(a)*r];return xf&&!isIdentity(xf)?applyXf(xf,q):q};
    const add=(points:number[][],fill:string)=>{const ps=points.map(q=>proj(q[0],q[1],q[2]));faces.push({points:ps,fill,id:j.id,depth:ps.reduce((n,p)=>n+p.depth,0)/ps.length})};
    const tire=o.grayscale?gray(color(w.tire).hex):color(w.tire).hex,hub=o.grayscale?gray(color(w.wheel).hex):color(w.wheel).hex;
    const outer=px+w.side*w.width/2,inner=px-w.side*w.width/2,N=20;
    add(Array.from({length:N},(_,i)=>pt(inner,i*2*Math.PI/N,w.radius)),shade(tire,.7));
    for(let i=0;i<N;i++){const a=i*2*Math.PI/N,b=(i+1)*2*Math.PI/N;add([pt(inner,a,w.radius),pt(inner,b,w.radius),pt(outer,b,w.radius),pt(outer,a,w.radius)],shade(tire,1.1))}
    add(Array.from({length:N},(_,i)=>pt(outer,i*2*Math.PI/N,w.radius)),shade(tire,.9));
    const face=outer+w.side*.01;add(Array.from({length:N},(_,i)=>pt(face,i*2*Math.PI/N,w.radius*.58)),hub);
    const f2=face+w.side*.01;add([pt(f2,spin-.25,w.radius*.52),pt(f2,spin+.25,w.radius*.52),pt(f2,spin+Math.PI-.25,w.radius*.52),pt(f2,spin+Math.PI+.25,w.radius*.52)],shade(hub,.7));
    add(Array.from({length:10},(_,i)=>pt(f2+w.side*.005,i*Math.PI/5,w.radius*.16)),shade(hub,.55));
  }
  for(const f of o.figures??[])minifigFaces(f,(points,fill,bias=0)=>{const ps=points.map(p=>proj(p[0],p[1],p[2]));faces.push({points:ps,fill,id:'minifig',depth:ps.reduce((n,p)=>n+p.depth,0)/ps.length+bias})},o.grayscale);
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

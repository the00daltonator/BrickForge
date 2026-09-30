import editorPartColors from './editor-part-colors.json';
import catalogColors from './catalog-colors.json';
import catalogBricks from './catalog-bricks.json';
import bricklinkColors from './bricklink-colors.json';
import minifigData from './minifig-data.json';
export type Color = { id:number; bl:number; name:string; hex:string;transparent?:boolean };
const BASE_COLORS:Color[] = [
{id:15,bl:1,name:'White',hex:'#f4f4f4'},{id:0,bl:11,name:'Black',hex:'#21262d'},{id:71,bl:86,name:'Light bluish gray',hex:'#a0a5a9'},{id:72,bl:85,name:'Dark bluish gray',hex:'#6c6e68'},{id:4,bl:5,name:'Red',hex:'#c91a09'},{id:25,bl:4,name:'Orange',hex:'#fe8a18'},{id:14,bl:3,name:'Yellow',hex:'#f2cd37'},{id:19,bl:2,name:'Tan',hex:'#e4cd9e'},{id:1,bl:7,name:'Blue',hex:'#0055bf'},{id:9,bl:62,name:'Light blue',hex:'#b4d2e3'},{id:2,bl:6,name:'Green',hex:'#237841'},{id:10,bl:36,name:'Bright green',hex:'#4b9f4a'},{id:70,bl:88,name:'Reddish brown',hex:'#582a12'},{id:22,bl:47,name:'Purple',hex:'#81007b'},{id:13,bl:23,name:'Pink',hex:'#fc97ac'},{id:27,bl:34,name:'Lime',hex:'#bbd431'}];
const normalizeColor=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
export const COLORS:Color[]=[...BASE_COLORS.map(c=>({...c,bl:c.id===22?24:c.bl})),...catalogColors.filter(c=>!BASE_COLORS.some(b=>b.id===c.id)).map(c=>({...c,bl:Number(bricklinkColors.find(([n])=>normalizeColor(String(n))===normalizeColor(c.name))?.[1]??-1)}))];
export const GENERATOR_COLORS=COLORS.filter(c=>c.id>=0&&c.id<9999&&!c.transparent&&c.bl>=0);
export const observedColor=(id:string,c:number)=>(editorPartColors as Record<string,number[]>)[id]?.includes(c)??false;
export const ldrawColor=(id:number)=>BASE_COLORS.some(c=>c.id===id)?id:100000+id;
export type Part={id:string;name:string;w:number;d:number;h:number;cost:number;shape?:"box"|"tile"|"slope"|"round"};
export const PARTS:Part[]=[
{id:'3001',name:'Brick 2 × 4',w:2,d:4,h:3,cost:.24},{id:'3002',name:'Brick 2 × 3',w:2,d:3,h:3,cost:.21},{id:'3003',name:'Brick 2 × 2',w:2,d:2,h:3,cost:.16},{id:'3009',name:'Brick 1 × 6',w:1,d:6,h:3,cost:.24},{id:'3010',name:'Brick 1 × 4',w:1,d:4,h:3,cost:.18},{id:'3622',name:'Brick 1 × 3',w:1,d:3,h:3,cost:.15},{id:'3004',name:'Brick 1 × 2',w:1,d:2,h:3,cost:.12},{id:'3005',name:'Brick 1 × 1',w:1,d:1,h:3,cost:.10},
{id:'3020',name:'Plate 2 × 4',w:2,d:4,h:1,cost:.16},{id:'3021',name:'Plate 2 × 3',w:2,d:3,h:1,cost:.14},{id:'3022',name:'Plate 2 × 2',w:2,d:2,h:1,cost:.12},{id:'3710',name:'Plate 1 × 4',w:1,d:4,h:1,cost:.11},{id:'3623',name:'Plate 1 × 3',w:1,d:3,h:1,cost:.10},{id:'3023',name:'Plate 1 × 2',w:1,d:2,h:1,cost:.09},{id:'3024',name:'Plate 1 × 1',w:1,d:1,h:1,cost:.07}];
for(const p of catalogBricks)if(!PARTS.some(b=>b.id===p.id))PARTS.push(p);
PARTS.push(
{id:'3070b',name:'Tile 1 × 1',w:1,d:1,h:1,cost:.09,shape:'tile'},
{id:'3069b',name:'Tile 1 × 2',w:1,d:2,h:1,cost:.11,shape:'tile'},
{id:'63864',name:'Tile 1 × 3',w:1,d:3,h:1,cost:.15,shape:'tile'},
{id:'2431',name:'Tile 1 × 4',w:1,d:4,h:1,cost:.18,shape:'tile'},
{id:'6636',name:'Tile 1 × 6',w:1,d:6,h:1,cost:.23,shape:'tile'},
{id:'4162',name:'Tile 1 × 8',w:1,d:8,h:1,cost:.30,shape:'tile'},
{id:'3068b',name:'Tile 2 × 2',w:2,d:2,h:1,cost:.16,shape:'tile'},
{id:'87079',name:'Tile 2 × 4',w:2,d:4,h:1,cost:.23,shape:'tile'},
{id:'3039',name:'Slope 45° 2 × 2',w:2,d:2,h:3,cost:.20,shape:'slope'},
{id:'3037',name:'Slope 45° 2 × 4',w:4,d:2,h:3,cost:.30,shape:'slope'},
{id:'3040b',name:'Slope 45° 2 × 1',w:1,d:2,h:3,cost:.15,shape:'slope'},
{id:'3062b',name:'Round brick 1 × 1',w:1,d:1,h:3,cost:.12,shape:'round'},
{id:'3941',name:'Round brick 2 × 2',w:2,d:2,h:3,cost:.22,shape:'round'},
{id:'4032a',name:'Round plate 2 × 2',w:2,d:2,h:1,cost:.15,shape:'round'});
export const color=(id:number)=>COLORS.find(c=>c.id===id)||{id,bl:-1,name:`Unknown color ${id}`,hex:'#888888'};
export const part=(id:string)=>PARTS.find(p=>p.id===id)!;
// Names and planning prices for any catalog part, including non-grid minifigure elements.
const MINIFIG_NAMES:Record<string,string>={...minifigData.names,[minifigData.head.id]:minifigData.head.name,[minifigData.shortLegs.id]:minifigData.shortLegs.name,...Object.fromEntries([...minifigData.hair,...minifigData.hats,...minifigData.neck,...minifigData.tools].map(r=>[r.id,r.name]))};
export const partName=(id:string,fallback?:string)=>PARTS.find(p=>p.id===id)?.name??MINIFIG_NAMES[id]??fallback??`Part ${id}`;
export const partCost=(id:string)=>PARTS.find(p=>p.id===id)?.cost??(id.startsWith('973')?1.2:id.startsWith('970')||id.startsWith('41879')?.9:id.startsWith('3626')?.35:.6);
export type Brick={id:string;part:string;color:number;x:number;y:number;z:number;rot:boolean}; // x/z studs, y plates above ground
// extras: loose elements shipped with the build but not placed on the stud grid (minifigure parts, accessories).
export type Model={version:1;name:string;source:string;bricks:Brick[];notes:string[];extras?:Stock[]};
export type Stock={part:string;color:number;qty:number;name?:string;location?:string};
export type Voxel={x:number;y:number;z:number;color:number};
export const dims=(b:Brick)=>{const p=part(b.part);return {w:b.rot?p.d:p.w,d:b.rot?p.w:p.d,h:p.h}};
export const key=(p:string,c:number)=>`${p}:${c}`;
export function bounds(bs:Brick[]){if(!bs.length)return {x:0,y:0,z:0,w:1,h:1,d:1};let x=Infinity,y=Infinity,z=Infinity,X=-Infinity,Y=-Infinity,Z=-Infinity;for(const b of bs){const d=dims(b);x=Math.min(x,b.x);y=Math.min(y,b.y);z=Math.min(z,b.z);X=Math.max(X,b.x+d.w);Y=Math.max(Y,b.y+d.h);Z=Math.max(Z,b.z+d.d)}return{x,y,z,w:X-x,h:Y-y,d:Z-z};}
export function bom(bs:Brick[],stock:Stock[]=[],extras:Stock[]=[]){const map=new Map<string,Stock>();for(const b of bs){const k=key(b.part,b.color);const r=map.get(k);if(r)r.qty++;else map.set(k,{part:b.part,color:b.color,qty:1});}for(const e of extras){const k=key(e.part,e.color);const r=map.get(k);if(r)r.qty+=e.qty;else map.set(k,{part:e.part,color:e.color,qty:e.qty,name:e.name});}const counts=stockMap(stock);return [...map.values()].map(r=>({...r,owned:Math.min(r.qty,counts.get(key(r.part,r.color))||0),missing:Math.max(0,r.qty-(counts.get(key(r.part,r.color))||0))})).sort((a,b)=>b.qty-a.qty);}
export function stockMap(stock:Stock[]){const m=new Map<string,number>();for(const s of stock)m.set(key(s.part,s.color),(m.get(key(s.part,s.color))||0)+s.qty);return m;}
export function mergeStock(a:Stock[],b:Stock[]){const m=new Map<string,Stock>();for(const r of [...a,...b]){const k=key(r.part,r.color);const old=m.get(k);m.set(k,{...old,...r,name:r.name??old?.name,location:r.location||old?.location,qty:(old?.qty||0)+r.qty})}for(const s of m.values()){if(!s.location)delete s.location;if(s.name===undefined)delete s.name}return [...m.values()].filter(s=>s.qty>0);}
/** Removes quantities (e.g. a set taken apart elsewhere, or pieces used in a finished build). */
export function subtractStock(a:Stock[],b:Stock[]){const take=stockMap(b);return a.map(s=>{const k=key(s.part,s.color),n=take.get(k)||0;if(!n)return s;take.set(k,Math.max(0,n-s.qty));return{...s,qty:Math.max(0,s.qty-n)}}).filter(s=>s.qty>0);}
export function pack(voxels:Voxel[],name:string,source:string,plate=false,stock?:Stock[],swap=false):Model{
 const v=new Map<string,number>();const k=(x:number,y:number,z:number)=>`${x},${y},${z}`;for(const c of voxels)v.set(k(c.x,c.y,c.z),c.color);const used=new Set<string>();const remaining=stock?stockMap(stock):null;const owners=new Map<string,string>();const minX=Math.min(...voxels.map(v=>v.x)),minZ=Math.min(...voxels.map(v=>v.z));const candidates=PARTS.filter(p=>p.h===(plate?1:3)&&!p.shape&&p.w*p.d<=(plate?32:16)&&Math.max(p.w,p.d)<=8).sort((a,b)=>b.w*b.d-a.w*a.d);const bricks:Brick[]=[];
 const hangs=(c:Voxel)=>c.y>0&&!v.has(k(c.x,c.y-1,c.z))?0:1;
 for(const cell of [...voxels].sort((a,b)=>a.y-b.y||hangs(a)-hangs(b)||a.z-b.z||a.x-b.x)){
 if(used.has(k(cell.x,cell.y,cell.z)))continue;let chosen:{p:Part;rot:boolean;c:number;score:number}|undefined;
 for(const p of candidates){orientation:for(const rot of (cell.y%2?[true,false]:[false,true])){const w=rot?p.d:p.w,d=rot?p.w:p.d;for(let dx=0;dx<w;dx++)for(let dz=0;dz<d;dz++)if(used.has(k(cell.x+dx,cell.y,cell.z+dz))||v.get(k(cell.x+dx,cell.y,cell.z+dz))!==cell.color)continue orientation;
 let c=cell.color;if(!remaining&&!observedColor(p.id,c)&&p.id!==(plate?'3024':'3005'))continue;if(remaining&&(remaining.get(key(p.id,c))||0)<1){if(!swap)continue;const alt=COLORS.filter(c=>(remaining.get(key(p.id,c.id))||0)>0).sort((a,b)=>distance(a.hex,color(cell.color).hex)-distance(b.hex,color(cell.color).hex))[0];if(!alt)continue;c=alt.id;}const below=new Set<string>();for(let dx=0;dx<w;dx++)for(let dz=0;dz<d;dz++){const id=owners.get(k(cell.x+dx,cell.y-1,cell.z+dz));if(id)below.add(id)}const phase=cell.y%2===1;const stagger=(phase&&cell.x===minX&&w===1?80:0)+(phase&&cell.z===minZ&&d===1?80:0);const floating=cell.y>0&&!below.size?1000:0;const score=Math.max(0,below.size-1)*200+stagger+w*d-floating;if(!chosen||score>chosen.score)chosen={p,rot,c,score};}}
 if(!chosen)continue;const {p,rot,c}=chosen;const b:Brick={id:`b${bricks.length}`,part:p.id,color:c,x:cell.x,y:cell.y*(plate?1:3),z:cell.z,rot};bricks.push(b);const d=dims(b);for(let dx=0;dx<d.w;dx++)for(let dz=0;dz<d.d;dz++){used.add(k(cell.x+dx,cell.y,cell.z+dz));owners.set(k(cell.x+dx,cell.y,cell.z+dz),b.id)}if(remaining)remaining.set(key(p.id,c),(remaining.get(key(p.id,c))||0)-1);
 }
 return{version:1,name,source,bricks,notes:used.size<voxels.length?[`${voxels.length-used.size} cells could not be filled from your inventory. This is a partial build; review before exporting.`]:[]};
}
// Mixed packing for plate-height voxels (y in plates). Bricks fill three aligned plate
// layers of one color; plates keep faces, trims and thin details. Pieces that span
// lower seams and rest on studs are preferred, so fewer support columns are needed.
// Distance (in studs, through same-colored cells of one layer) from each overhanging cell to
// the nearest cell with something beneath it. Supported cells score 0; unreachable cells -1.
function overhangReach(voxels:Voxel[],v:Map<string,number>,k:(x:number,y:number,z:number)=>string){
 const dist=new Map<string,number>(),queue:Voxel[]=[];
 for(const c of voxels)if(c.y===0||v.has(k(c.x,c.y-1,c.z))){dist.set(k(c.x,c.y,c.z),0);queue.push(c)}
 for(let i=0;i<queue.length;i++){const c=queue[i],n=dist.get(k(c.x,c.y,c.z))!+1;for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nk=k(c.x+dx,c.y,c.z+dz);if(dist.has(nk)||v.get(nk)!==c.color)continue;dist.set(nk,n);queue.push({x:c.x+dx,y:c.y,z:c.z+dz,color:c.color})}}
 return(c:Voxel)=>dist.get(k(c.x,c.y,c.z))??-1;
}
export function packMixed(voxels:Voxel[],name:string,source:string):Model{
 const k=(x:number,y:number,z:number)=>`${x},${y},${z}`;const v=new Map<string,number>();for(const c of voxels)v.set(k(c.x,c.y,c.z),c.color);
 const used=new Set<string>(),owners=new Map<string,string>(),bricks:Brick[]=[];if(!voxels.length)return{version:1,name,source,bricks,notes:['No cells to build.']};
 const minX=Math.min(...voxels.map(c=>c.x)),minZ=Math.min(...voxels.map(c=>c.z));
 const candidates=PARTS.filter(p=>!p.shape&&(p.h===1||p.h===3)&&p.w*p.d<=(p.h===3?16:24)&&Math.max(p.w,p.d)<=8).sort((a,b)=>b.w*b.d*b.h-a.w*a.d*a.h);
 const reach=overhangReach(voxels,v,k);
 // Within a layer, the overhanging cells farthest from support pick first, so brim corners
 // and ledges claim a piece that reaches back onto supported cells before edges use them.
 for(const cell of [...voxels].sort((a,b)=>a.y-b.y||reach(b)-reach(a)||a.z-b.z||a.x-b.x)){
  if(used.has(k(cell.x,cell.y,cell.z)))continue;const course=Math.floor(cell.y/3)%2===1,hanging=reach(cell)!==0;
  let chosen:{p:Part;rot:boolean;x:number;z:number;score:number}|undefined;
  for(const p of candidates){if(!observedColor(p.id,cell.color)&&p.id!=='3024')continue;
   for(const rot of p.w===p.d?[false]:course?[true,false]:[false,true]){const w=rot?p.d:p.w,d=rot?p.w:p.d;
    // Supported cells anchor pieces at their min corner (cells arrive in ascending order);
    // overhanging cells may sit anywhere inside the piece so it can reach back to support.
    for(let ox=0;ox<(hanging?w:1);ox++)placement:for(let oz=0;oz<(hanging?d:1);oz++){const x=cell.x-ox,z=cell.z-oz;
     for(let dx=0;dx<w;dx++)for(let dz=0;dz<d;dz++)for(let dy=0;dy<p.h;dy++){const c=k(x+dx,cell.y+dy,z+dz);if(used.has(c)||v.get(c)!==cell.color)continue placement}
     const below=new Set<string>();for(let dx=0;dx<w;dx++)for(let dz=0;dz<d;dz++){const id=owners.get(k(x+dx,cell.y-1,z+dz));if(id)below.add(id)}
     const stagger=(course&&x===minX&&w===1?80:0)+(course&&z===minZ&&d===1?80:0),floating=cell.y>0&&!below.size?1000:0;
     // Leave neighbors that overhang (same color, nothing beneath) something to span onto:
     // a tall brick must not swallow their layer, and a piece should not strand them.
     let steals=0;for(let dy=0;dy<p.h;dy++)for(let dx=-1;dx<=w;dx++)for(let dz=-1;dz<=d;dz++){const inX=dx>=0&&dx<w,inZ=dz>=0&&dz<d;if(inX===inZ)continue;const n=k(x+dx,cell.y+dy,z+dz);if(v.get(n)===cell.color&&!used.has(n)&&cell.y+dy>0&&!v.has(k(x+dx,cell.y+dy-1,z+dz)))steals+=dy?4:3}
     const score=w*d*p.h*2+Math.max(0,below.size-1)*200+stagger-floating-steals*100;
     if(!chosen||score>chosen.score)chosen={p,rot,x,z,score};
    }}}
  if(!chosen)continue;const b:Brick={id:`b${bricks.length}`,part:chosen.p.id,color:cell.color,x:chosen.x,y:cell.y,z:chosen.z,rot:chosen.rot};bricks.push(b);const d=dims(b);
  for(let dx=0;dx<d.w;dx++)for(let dz=0;dz<d.d;dz++)for(let dy=0;dy<d.h;dy++){used.add(k(b.x+dx,b.y+dy,b.z+dz));owners.set(k(b.x+dx,b.y+dy,b.z+dz),b.id)}
 }
 return{version:1,name,source,bricks,notes:used.size<voxels.length?[`${voxels.length-used.size} cells could not be filled.`]:[]};
}
export function unpack(m:Model):{voxels:Voxel[];plate:boolean}{const plate=m.bricks.some(b=>part(b.part).h===1);const voxels:Voxel[]=[];for(const b of m.bricks){const d=dims(b);for(let x=0;x<d.w;x++)for(let z=0;z<d.d;z++)for(let y=0;y<(plate?d.h:1);y++)voxels.push({x:b.x+x,y:(plate?b.y:b.y/3)+y,z:b.z+z,color:b.color})}return{voxels,plate};}
export const distance=(a:string,b:string)=>{const rgb=(s:string)=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));const A=rgb(a),B=rgb(b);return A.reduce((v,x,i)=>v+(x-B[i])**2,0)};
export function nearest(r:number,g:number,b:number){return [...GENERATOR_COLORS].sort((a,c)=>distance(a.hex,`#${[r,g,b].map(n=>n.toString(16).padStart(2,'0')).join('')}`)-distance(c.hex,`#${[r,g,b].map(n=>n.toString(16).padStart(2,'0')).join('')}`))[0].id;}
export function recipe(kind:string,size=1,main=15):Model{
 const map=new Map<string,Voxel>();const box=(x:number,y:number,z:number,w:number,h:number,d:number,c:number)=>{for(let a=x;a<x+w;a++)for(let b=y;b<y+h;b++)for(let e=z;e<z+d;e++)map.set(`${a},${b},${e}`,{x:a,y:b,z:e,color:c})};
 const sphere=(x:number,y:number,z:number,rx:number,ry:number,rz:number,c:number)=>{for(let a=Math.floor(x-rx);a<=x+rx;a++)for(let b=Math.floor(y-ry);b<=y+ry;b++)for(let e=Math.floor(z-rz);e<=z+rz;e++)if(((a-x)/rx)**2+((b-y)/ry)**2+((e-z)/rz)**2<=1)box(a,b,e,1,1,1,c)};
 if(kind==='Astronaut'){box(-5,0,-3,10,1,7,72);box(-4,1,-3,3,2,5,main);box(1,1,-3,3,2,5,main);box(-4,3,-1,3,4,3,main);box(1,3,-1,3,4,3,main);box(-4,7,-2,8,5,5,main);box(-4,7,-3,8,1,1,25);box(-2,9,-3,4,2,1,71);box(-1,10,-4,1,1,1,4);box(1,10,-4,1,1,1,1);box(-6,7,-1,2,5,3,main);box(4,7,-1,2,5,3,main);box(-6,6,-1,2,2,3,25);box(4,6,-1,2,2,3,25);box(-3,8,3,6,4,2,71);sphere(-.5,14.5,0,4.5,3.5,3.5,main);box(-3,13,-3,6,3,1,0);box(-2,13,-4,4,2,1,19);box(-3,16,-3,6,1,1,main);}
 else if(kind==='Robot'){box(-4,0,-2,8,1,5,72);box(-3,1,-1,2,3,2,main);box(1,1,-1,2,3,2,main);box(-3,4,-2,6,5,4,main);box(-2,5,-3,4,2,1,25);box(-5,4,-1,2,5,2,71);box(3,4,-1,2,5,2,71);box(-4,9,-2,8,5,4,main);box(-3,11,-3,2,1,1,0);box(1,11,-3,2,1,1,0);box(-2,10,-3,4,1,1,71);box(0,14,0,1,2,1,71);box(0,16,0,1,1,1,4);}
 else if(kind==='Castle'){box(-7,0,-6,14,1,12,72);box(-6,1,-5,12,4,1,main);box(-6,1,4,12,4,1,main);box(-6,1,-4,1,4,8,main);box(5,1,-4,1,4,8,main);for(const x of [-6,3])for(const z of [-5,2]){box(x,1,z,3,8,3,main);for(let a=0;a<3;a+=2)for(let b=0;b<3;b+=2)box(x+a,9,z+b,1,1,1,main)}box(-1,1,-6,2,3,1,70);for(let x=-3;x<3;x+=2){box(x,5,-5,1,1,1,main);box(x,5,4,1,1,1,main)}}
 else if(kind==='Rocket'){box(-5,0,-5,11,1,11,72);for(let y=1;y<15;y++){const r=y<11?3:Math.max(0,3-Math.floor((y-10)/2));for(let x=-r;x<=r;x++)for(let z=-r;z<=r;z++)if(x*x+z*z<=r*r+1)box(x,y,z,1,1,1,y<3?25:y===7?4:main)}for(const x of [-4,3])box(x,1,-1,2,4,3,4);for(const z of [-4,3])box(-1,1,z,3,4,2,4);box(-1,9,-3,3,2,1,1);}
 else if(kind==='Cat'){box(-5,0,-4,10,1,8,72);sphere(0,4,0,3,3,2.5,main);box(-3,1,-3,2,2,3,main);box(1,1,-3,2,2,3,main);sphere(0,8,-1,4,3,3,main);box(-3,10,-2,2,3,2,main);box(2,10,-2,2,3,2,main);box(-2,8,-4,1,1,1,0);box(2,8,-4,1,1,1,0);box(0,7,-4,1,1,1,13);box(3,1,2,2,5,2,main);}
 else if(kind==='Dinosaur'){box(-6,0,-4,13,1,9,72);box(-3,1,-1,2,4,3,main);box(2,1,-1,2,4,3,main);sphere(0,5,0,4,3,3,main);box(-1,6,-3,3,4,3,main);box(-2,9,-5,5,3,5,main);box(-2,11,-5,1,1,1,0);box(2,11,-5,1,1,1,0);box(-1,9,-6,3,1,1,15);for(let i=0;i<5;i++)box(-1,Math.max(1,4-Math.floor(i/2)),3+i,2,2,1,main);}
 else throw new Error('Choose a starter, upload a photo, or connect AI for an original idea.');
 let voxels=[...map.values()];if(size===2)voxels=voxels.flatMap(v=>[0,1].flatMap(dx=>[0,1].map(dz=>({...v,x:v.x*2+dx,z:v.z*2+dz}))));return pack(voxels,kind,`Starter design · ${kind}`);
}
// Supported upright stud-grid connections only. Bounding boxes conservatively reject
// intersections with sloped/round bodies; touching side faces never makes a joint.
export function studCells(b:Brick){const d=dims(b),shape=part(b.part).shape;const out:{x:number;z:number}[]=[];if(shape==='tile')return out;for(let x=0;x<d.w;x++)for(let z=0;z<d.d;z++){if(shape==='slope'&&(b.rot?x!==d.w-1:z!==d.d-1))continue;out.push({x:b.x+x,z:b.z+z})}return out;}
export function checks(bs:Brick[]){
 let overlaps=0;const cells=new Map<string,string>(),studs=new Map<string,string>(),adj=new Map<string,Set<string>>(),unsupported:string[]=[],weak:string[]=[];
 for(const b of bs){adj.set(b.id,new Set());const d=dims(b);for(let x=0;x<d.w;x++)for(let z=0;z<d.d;z++)for(let y=0;y<d.h;y++){const k=`${b.x+x},${b.y+y},${b.z+z}`;if(cells.has(k))overlaps++;cells.set(k,b.id)}for(const c of studCells(b))studs.set(`${c.x},${b.y+d.h},${c.z}`,b.id)}
 const contacts:{lower:string;upper:string;studs:number}[]=[];
 for(const b of bs){const d=dims(b),below=new Map<string,number>();for(let x=0;x<d.w;x++)for(let z=0;z<d.d;z++){const id=studs.get(`${b.x+x},${b.y},${b.z+z}`);if(id&&id!==b.id)below.set(id,(below.get(id)||0)+1)}let n=0;for(const [id,count] of below){n+=count;adj.get(id)!.add(b.id);adj.get(b.id)!.add(id);contacts.push({lower:id,upper:b.id,studs:count})}if(b.y!==0&&!n)unsupported.push(b.id);if(b.y>0&&n===1&&d.w*d.d>1)weak.push(b.id)}
 const visited=new Set<string>(),components:string[][]=[];for(const b of bs){if(visited.has(b.id))continue;const group:string[]=[],queue=[b.id];visited.add(b.id);while(queue.length){const id=queue.pop()!;group.push(id);for(const next of adj.get(id)!){if(!visited.has(next)){visited.add(next);queue.push(next)}}}components.push(group)}components.sort((a,b)=>b.length-a.length);
 const bridgeMap=new Map<string,Set<string>>();for(const c of contacts){if(!bridgeMap.has(c.upper))bridgeMap.set(c.upper,new Set());bridgeMap.get(c.upper)!.add(c.lower)}const seamBridges=[...bridgeMap].filter(([,ids])=>ids.size>1).map(([id])=>id);const disconnected=components.slice(1).flat();const ground=bs.filter(b=>b.y===0);let mass=0,cx=0,cz=0;for(const b of bs){const d=dims(b),v=d.w*d.d*d.h;mass+=v;cx+=(b.x+d.w/2)*v;cz+=(b.z+d.d/2)*v}const base=ground.length?bounds(ground):null;
 const tippingRisk=!!mass&&(!base||cx/mass<base.x||cx/mass>base.x+base.w||cz/mass<base.z||cz/mass>base.z+base.d);
 return{overlaps,unsupported,components,disconnected,contacts,seamBridges,weak,tippingRisk,connected:bs.length>0&&components.length===1,passed:bs.length>0&&!overlaps&&!unsupported.length&&components.length===1};
}
export function layers(bs:Brick[]){return [...new Set(bs.map(b=>b.y))].sort((a,b)=>a-b)}
export function validateModel(raw:unknown):Model{const m=raw as Model;if(!m||m.version!==1||!Array.isArray(m.bricks)||!m.bricks.length||m.bricks.length>12000)throw new Error('Invalid project. Expected a BrickForge project with 1–12,000 bricks.');const ids=new Set();for(const b of m.bricks){if(!part(b.part)||!COLORS.some(c=>c.id===b.color)||typeof b.rot!=='boolean'||![b.x,b.y,b.z].every(n=>Number.isInteger(n)&&Math.abs(n)<=256)||b.y<0)throw new Error('Unsupported part, color, or coordinates in project.');if(ids.has(b.id))throw new Error('Duplicate brick IDs.');ids.add(b.id)}const extras=Array.isArray(m.extras)?m.extras.filter(e=>e&&typeof e.part==='string'&&/^[a-z0-9._-]{1,40}$/i.test(e.part)&&COLORS.some(c=>c.id===e.color)&&Number.isInteger(e.qty)&&e.qty>0&&e.qty<=999).slice(0,200).map(e=>({part:e.part,color:e.color,qty:e.qty,...(e.name?{name:String(e.name).slice(0,160)}:{})})):[];return{version:1,name:String(m.name||'Imported build').slice(0,120),source:String(m.source||'Project import').slice(0,200),bricks:m.bricks,notes:Array.isArray(m.notes)?m.notes.map(String):[],...(extras.length?{extras}:{})};}
export function shapesModel(raw:unknown,name:string):Model{const a=(raw as {shapes?:unknown[]})?.shapes;if(!Array.isArray(a)||!a.length||a.length>160)throw new Error('AI returned an invalid shape plan. Please try a simpler description.');const map=new Map<string,Voxel>();for(const shape of a){const s=shape as {x:number;y:number;z:number;w:number;h:number;d:number;color:number;type:string};if(![s.x,s.y,s.z,s.w,s.h,s.d].every(Number.isInteger)||Math.abs(s.x)>24||Math.abs(s.z)>24||s.y<0||s.y+s.h>40||s.w<1||s.w>40||s.h<1||s.d<1||s.d>40||!COLORS.some(c=>c.id===s.color))throw new Error('AI design exceeded supported dimensions. Try a smaller build.');for(let x=0;x<s.w;x++)for(let y=0;y<s.h;y++)for(let z=0;z<s.d;z++){if(s.type==='ellipsoid'&&((x+.5-s.w/2)/(s.w/2))**2+((y+.5-s.h/2)/(s.h/2))**2+((z+.5-s.d/2)/(s.d/2))**2>1)continue;const v={x:s.x+x,y:s.y+y,z:s.z+z,color:s.color};map.set(`${v.x},${v.y},${v.z}`,v);if(map.size>14000)throw new Error('This design is too large. Try a smaller size.');}}return pack([...map.values()],name,'AI shape plan · review connections before building');}
export function addSupports(model:Model):Model{
 const bricks=[...model.bricks],occupied=new Set<string>();const mark=(b:Brick)=>{const d=dims(b);for(let x=0;x<d.w;x++)for(let z=0;z<d.d;z++)for(let y=0;y<d.h;y++)occupied.add(`${b.x+x},${b.y+y},${b.z+z}`)};bricks.forEach(mark);const bad=checks(bricks).unsupported;let count=0;
 for(const brick of [...bricks].filter(b=>bad.includes(b.id)).sort((a,b)=>a.y-b.y)){const d=dims(brick);let best={x:brick.x,z:brick.z,base:0};for(let dx=0;dx<d.w;dx++)for(let dz=0;dz<d.d;dz++){let y=brick.y-1;while(y>=0&&!occupied.has(`${brick.x+dx},${y},${brick.z+dz}`))y--;if(y+1>best.base)best={x:brick.x+dx,z:brick.z+dz,base:y+1};}for(let y=best.base;y<brick.y;){const h=brick.y-y>=3?3:1;const b:Brick={id:`support-${bricks.length}`,part:h===3?'3005':'3024',color:71,x:best.x,y,z:best.z,rot:false};bricks.push(b);mark(b);count++;y+=h;}}
 return{...model,bricks,notes:count?[...model.notes,`${count} support bricks/plates added. Supports change the silhouette; check the model and use Undo if needed.`]:model.notes};
}
export function tileFinish(m:Model,stock?:Stock[]):Model{const above=new Set<string>();for(const b of m.bricks){const d=dims(b);for(let x=0;x<d.w;x++)for(let z=0;z<d.d;z++)above.add(`${b.x+x},${b.y},${b.z+z}`)}const remaining=stock?stockMap(stock):null;if(remaining)for(const b of m.bricks){const k=key(b.part,b.color);remaining.set(k,Math.max(0,(remaining.get(k)||0)-1))}let changed=0;const bricks=m.bricks.map(b=>{const d=dims(b);if(d.h!==1||part(b.part).shape)return b;for(let x=0;x<d.w;x++)for(let z=0;z<d.d;z++)if(above.has(`${b.x+x},${b.y+d.h},${b.z+z}`))return b;const p=PARTS.find(p=>p.shape==='tile'&&p.w===part(b.part).w&&p.d===part(b.part).d&&observedColor(p.id,b.color)&&(!remaining||(remaining.get(key(p.id,b.color))||0)>0));if(!p)return b;if(remaining)remaining.set(key(p.id,b.color),remaining.get(key(p.id,b.color))!-1);changed++;return{...b,part:p.id}});if(!changed)throw new Error('No exposed plates have a matching tile in the selected colors'+(stock?' and inventory.':'. Try a photo mosaic first.'));return{...m,bricks,notes:[...m.notes,`${changed} exposed plates replaced with smooth tiles.`]};}

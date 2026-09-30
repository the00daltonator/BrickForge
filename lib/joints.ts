import {Brick,Joint,Model,dims} from './brick-engine';

// Rigid-body posing for models with joints. Transforms work in physical stud units (a plate
// is 0.4 studs tall) so rotations keep true proportions; grid coordinates use plates on Y.
export type Xf={m:number[];t:[number,number,number]};
export type Pose=Record<string,number[]>;
const P=.4,DEG=Math.PI/180;
const ID:Xf={m:[1,0,0,0,1,0,0,0,1],t:[0,0,0]};

function rotation(axis:'x'|'y'|'z',deg:number){const c=Math.cos(deg*DEG),s=Math.sin(deg*DEG);
  return axis==='x'?[1,0,0,0,c,-s,0,s,c]:axis==='y'?[c,0,s,0,1,0,-s,0,c]:[c,-s,0,s,c,0,0,0,1]}
const mul3=(a:number[],b:number[])=>{const r=new Array(9).fill(0);for(let i=0;i<3;i++)for(let j=0;j<3;j++)for(let k=0;k<3;k++)r[i*3+j]+=a[i*3+k]*b[k*3+j];return r};
const apply3=(m:number[],v:number[])=>[m[0]*v[0]+m[1]*v[1]+m[2]*v[2],m[3]*v[0]+m[4]*v[1]+m[5]*v[2],m[6]*v[0]+m[7]*v[1]+m[8]*v[2]] as [number,number,number];
/** a after b: x ↦ a(b(x)). */
const compose=(a:Xf,b:Xf):Xf=>{const t=apply3(a.m,b.t);return{m:mul3(a.m,b.m),t:[t[0]+a.t[0],t[1]+a.t[1],t[2]+a.t[2]]}};
/** Rotation matrix for a joint at the given angles (first axis applied first). */
export function jointMatrix(j:Joint,angles:number[]=[]){let m=[1,0,0,0,1,0,0,0,1];j.axes.forEach((a,i)=>{m=mul3(rotation(a,angles[i]??0),m)});return m}
function about(pivot:[number,number,number],m:number[]):Xf{const c:[number,number,number]=[pivot[0],pivot[1]*P,pivot[2]];const mc=apply3(m,c);return{m,t:[c[0]-mc[0],c[1]-mc[1],c[2]-mc[2]]}}
export const isIdentity=(x:Xf)=>x.m.every((v,i)=>Math.abs(v-ID.m[i])<1e-9)&&x.t.every(v=>Math.abs(v)<1e-9);
/** Maps a grid point (studs, plates, studs) through a transform. */
export function applyXf(x:Xf,p:number[]):[number,number,number]{const v=apply3(x.m,[p[0],p[1]*P,p[2]]);return[v[0]+x.t[0],(v[1]+x.t[1])/P,v[2]+x.t[2]]}

/** World transform of every sub-assembly for a pose (children follow their parents). */
export function groupTransforms(joints:Joint[]=[],pose:Pose={}){
  const out=new Map<string,Xf>(),byChild=new Map(joints.map(j=>[j.child,j]));
  const resolve=(g:string,depth=0):Xf=>{if(out.has(g))return out.get(g)!;const j=byChild.get(g);if(!j||depth>32){out.set(g,ID);return ID}
    const x=compose(resolve(j.parent,depth+1),about(j.pivot,jointMatrix(j,clampPose(j,pose[j.id]))));out.set(g,x);return x};
  for(const j of joints)resolve(j.child);return out;
}
export function clampPose(j:Joint,a:number[]=[]){return j.axes.map((_,i)=>{const v=a[i]??0,[lo,hi]=j.limits[i];return j.kind==='axle'?v:Math.max(lo,Math.min(hi,v))})}
/** Groups moved by a joint: its child and everything attached below it. */
export function subtree(joints:Joint[],root:string){const out=new Set([root]);let grew=true;while(grew){grew=false;for(const j of joints)if(out.has(j.parent)&&!out.has(j.child)){out.add(j.child);grew=true}}return out}

// The floor is not an obstacle: a posed figure lifts a foot, it doesn't dig it into the ground.
// Sample points inside each cell (center and inset corners) for collision tests.
function samples(b:Brick){const d=dims(b),pts:number[][]=[];for(let x=0;x<d.w;x++)for(let y=0;y<d.h;y++)for(let z=0;z<d.d;z++){const cx=b.x+x+.5,cy=b.y+y+.5,cz=b.z+z+.5;pts.push([cx,cy,cz]);for(const dx of [-.34,.34])for(const dy of [-.34,.34])for(const dz of [-.34,.34])pts.push([cx+dx,cy+dy,cz+dz])}return pts}

/**
 * Usable range for each joint axis: the part's own limit, narrowed to where the moving
 * sub-assembly would first hit the rest of the model or the ground (checked every 3°).
 * Each joint is tested from the rest pose with the other joints at rest.
 */
export function jointRanges(m:Model):Record<string,[number,number][]>{
  const joints=m.joints??[],out:Record<string,[number,number][]>={};
  for(const j of joints){
    if(j.kind==='axle'){out[j.id]=j.limits.map(l=>[l[0],l[1]]);continue}
    const moving=subtree(joints,j.child),own=new Set([j.parentBrick,j.childBrick]);
    const occupied=new Set<string>();for(const b of m.bricks){if(moving.has(b.group??'')||own.has(b.id))continue;const d=dims(b);for(let x=0;x<d.w;x++)for(let y=0;y<d.h;y++)for(let z=0;z<d.d;z++)occupied.add(`${b.x+x},${b.y+y},${b.z+z}`)}
    const pts=m.bricks.filter(b=>moving.has(b.group??'')&&!own.has(b.id)).flatMap(samples);
    const hits=(axis:number,deg:number)=>{const angles=j.axes.map((_,i)=>i===axis?deg:0),x=about(j.pivot,jointMatrix(j,angles));
      for(const p of pts){const q=applyXf(x,p);if(occupied.has(`${Math.floor(q[0])},${Math.floor(q[1])},${Math.floor(q[2])}`))return true}return false};
    out[j.id]=j.axes.map((_,i)=>{const [lo,hi]=j.limits[i];let a=0,b=0;
      for(let d=3;d<=hi+1e-9;d+=3){if(hits(i,Math.min(d,hi)))break;b=Math.min(d,hi)}
      for(let d=-3;d>=lo-1e-9;d-=3){if(hits(i,Math.max(d,lo)))break;a=Math.max(d,lo)}
      return [a,b] as [number,number]});
  }
  return out;
}

// Pose presets by joint role. Angles are clamped to each joint's usable range.
type Preset={label:string;pose:(role:string)=>number[]|undefined};
export const POSE_PRESETS:Record<string,Preset>={
  rest:{label:'Stand straight',pose:()=>[0,0]},
  wave:{label:'Wave',pose:r=>r==='shoulderR'?[150,-30]:r==='shoulderL'?[10,0]:r==='neck'?[20]:undefined},
  walk:{label:'Mid-stride',pose:r=>r==='hipR'?[28,0]:r==='hipL'?[-28,0]:r==='shoulderR'?[-30,0]:r==='shoulderL'?[30,0]:undefined},
  cheer:{label:'Cheer',pose:r=>r==='shoulderR'?[170,-20]:r==='shoulderL'?[170,20]:r==='neck'?[0]:undefined},
  look:{label:'Look around',pose:r=>r==='neck'?[-60]:r==='waist'?[25]:undefined},
  doors:{label:'Open doors',pose:r=>r==='doorL'?[-75]:r==='doorR'?[75]:undefined},
  all:{label:'Open everything',pose:r=>r==='doorL'?[-75]:r==='doorR'?[75]:r==='hood'?[80]:r==='trunk'?[-80]:undefined},
};
export function applyPreset(joints:Joint[],ranges:Record<string,[number,number][]>,key:string):Pose{
  const preset=POSE_PRESETS[key],out:Pose={};if(!preset)return out;
  for(const j of joints){if(j.kind==='axle')continue;const want=preset.pose(j.role??'')??[0,0];out[j.id]=j.axes.map((_,i)=>{const [lo,hi]=ranges[j.id]?.[i]??j.limits[i];return Math.max(lo,Math.min(hi,want[i]??0))})}
  return out;
}
/** Looping animations for the live preview. t is seconds. */
export function animatedPose(joints:Joint[],ranges:Record<string,[number,number][]>,kind:string,t:number):Pose{
  const out:Pose={},w=Math.sin(t*4),fit=(j:Joint,i:number,v:number)=>{const [lo,hi]=ranges[j.id]?.[i]??j.limits[i];return Math.max(lo,Math.min(hi,v))};
  for(const j of joints){const r=j.role??'';let v:number[]=[0,0];
    if(kind==='walk'){if(r==='hipR')v=[26*w,0];else if(r==='hipL')v=[-26*w,0];else if(r==='shoulderR')v=[-30*w,0];else if(r==='shoulderL')v=[30*w,0];else if(r==='neck')v=[8*Math.sin(t*2)];else if(r==='waist')v=[6*w]}
    else if(kind==='wave'){if(r==='shoulderR')v=[150,-20+25*Math.sin(t*8)];else if(r==='neck')v=[15]}
    else if(kind==='dance'){if(r.startsWith('shoulder'))v=[90+60*Math.sin(t*5+(r==='shoulderL'?Math.PI:0)),0];else if(r.startsWith('hip'))v=[15*Math.sin(t*5+(r==='hipL'?Math.PI:0)),0];else if(r==='neck')v=[30*Math.sin(t*2.5)];else if(r==='waist')v=[30*Math.sin(t*2.5)]}
    else if(kind==='drive'){if(j.kind==='axle')v=[-(t*240)%360]}
    else if(kind==='doors'){const o=(1-Math.cos(t*1.6))/2;if(r==='doorL')v=[-80*o];else if(r==='doorR')v=[80*o];else if(r==='hood')v=[80*o];else if(r==='trunk')v=[-80*o]}
    out[j.id]=j.kind==='axle'?v.slice(0,1):j.axes.map((_,i)=>fit(j,i,v[i]??0));
  }
  return out;
}
export const ANIMATIONS=(joints:Joint[])=>{const roles=new Set(joints.map(j=>j.role));const list:{value:string;label:string}[]=[];
  if(roles.has('hipL')||roles.has('shoulderL'))list.push({value:'walk',label:'Walk'},{value:'wave',label:'Wave'},{value:'dance',label:'Dance'});
  if(joints.some(j=>j.kind==='axle'))list.push({value:'drive',label:'Drive'});
  if(roles.has('doorL')||roles.has('hood'))list.push({value:'doors',label:'Open & close'});
  return list};
export const presetsFor=(joints:Joint[])=>{const roles=new Set(joints.map(j=>j.role));return Object.entries(POSE_PRESETS).filter(([k])=>k==='rest'||(['wave','walk','cheer','look'].includes(k)?roles.has('shoulderL')||roles.has('neck'):roles.has('doorL')||roles.has('hood'))).map(([value,p])=>({value,label:p.label}))};

/** Problems that stop a joint from working: missing parts or studs locking two sub-assemblies. */
export function jointIssues(m:Model,locked:string[]=[]){
  const ids=new Set(m.bricks.map(b=>b.id)),issues:string[]=[];
  for(const j of m.joints??[]){if(!ids.has(j.parentBrick)||(j.childBrick&&!ids.has(j.childBrick)))issues.push(`${j.label}: a joint part was removed, so this joint no longer works.`)}
  if(locked.length)issues.push(`${locked.length} pieces press onto studs of a different moving section, locking a joint. Leave a one-plate gap between moving sections.`);
  return issues;
}
/** Static copy: joints removed (used when a model is re-fitted to an inventory). */
export function withoutJoints(m:Model):Model{const hw=new Set((m.joints??[]).flatMap(j=>(j.hardware??[]).map(h=>h.part)));const extras=(m.extras??[]).filter(e=>!hw.has(e.part));
  const {joints:_joints,pose:_pose,...rest}=m;void _joints;void _pose;return{...rest,bricks:m.bricks.map(({group:_g,...b})=>{void _g;return b}),...(extras.length?{extras}:{extras:undefined})}}

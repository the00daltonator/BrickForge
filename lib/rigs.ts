import {Brick,Joint,Model,Stock,Voxel,checks,packMixed,observedColors,color,partName,COLORS} from './brick-engine';
import {CharacterSpec,characterVoxels,normalizeSpec,minifigFor,characterModel} from './character';
import {closestColor} from './color';
import {jointRanges} from './joints';

// Moving builds made from real joint parts. Each rigid sub-assembly is packed on its own
// (so no brick spans a joint), joint elements are placed as fixed pieces, and loose hardware
// such as pins, wheels and tires is listed with the build.
type Fixed={part:string;color:number;x:number;y:number;z:number;rot?:boolean;group:string;key:string};
const hw=(part:string,color:number,qty=1):Stock=>({part,color,qty,name:partName(part)});
const real=(part:string,target:number)=>{const list=observedColors(part);return list.length?closestColor(target,list):target};
/** First plate size that exists in the wanted color (so tie plates match the build). */
function tiePlate(options:{part:string;x:number;z:number;rot?:boolean}[],c:number){return options.find(o=>observedColors(o.part).includes(c))??options[options.length-1]}

function assemble(name:string,source:string,groups:Map<string,Voxel[]>,fixed:Fixed[],joints:(Omit<Joint,'parentBrick'|'childBrick'>&{parentKey:string;childKey?:string})[],extras:Stock[],notes:string[]):Model{
  const bricks:Brick[]=[],keyToId=new Map<string,string>();
  const names=new Set([...groups.keys(),...fixed.map(f=>f.group)]);
  for(const g of names){
    const fx:Brick[]=fixed.filter(f=>f.group===g).map((f,i)=>{const id=`${g}-j${i}`;keyToId.set(f.key,id);return{id,part:f.part,color:real(f.part,f.color),x:f.x,y:f.y,z:f.z,rot:!!f.rot,group:g}});
    let packed=packMixed(groups.get(g)??[],name,source,fx),parts=checks(packed.bricks).components.length;
    for(const phase of [1,2]){if(parts===1)break;const alt=packMixed(groups.get(g)??[],name,source,fx,phase),n=checks(alt.bricks).components.length;if(n<parts||(n===parts&&alt.bricks.length<packed.bricks.length)){packed=alt;parts=n}}
    for(const b of packed.bricks)bricks.push(fx.includes(b)?b:{...b,id:`${g}-${b.id}`,group:g});
  }
  const js:Joint[]=joints.map(({parentKey,childKey,...j})=>({...j,parentBrick:keyToId.get(parentKey)!,...(childKey?{childBrick:keyToId.get(childKey)}:{})}));
  const hardware=js.flatMap(j=>j.hardware??[]),merged=new Map<string,Stock>();
  for(const s of [...extras,...hardware]){const k=`${s.part}:${s.color}`;const o=merged.get(k);merged.set(k,o?{...o,qty:o.qty+s.qty}:{...s})}
  const model:Model={version:1,name,source,bricks,notes,joints:js,pose:{},...(merged.size?{extras:[...merged.values()]}:{})};
  // Joint limits: the part's range narrowed to what the model's shape allows.
  const ranges=jointRanges(model);model.joints=js.map(j=>({...j,limits:ranges[j.id]??j.limits}));
  const report=checks(model.bricks,model.joints);
  model.notes=[...notes,report.passed?`${js.length} moving joints. Stud connections, joint links and collisions checked; ranges stop before parts would collide.`:'Review highlighted issues before building.','Friction joints hold a pose by clutch; heavy parts may droop. Ranges are geometry checks, not strength tests.'];
  return model;
}

// ---------- Posable characters ----------
export function posableCharacter(raw:Partial<CharacterSpec>):Model{
  const spec=normalizeSpec(raw),level=spec.rig==='fancy'?'fancy':'basic',fancy=level==='fancy';
  const long=spec.outfit==='robe'||spec.outfit==='dress',lift=fancy?2:0;
  const torsoGroup=fancy?'torso':'body',rootGroup=fancy?'hips':'body';
  const groups=new Map<string,Voxel[]>(),put=(g:string,v:Voxel)=>{if(!groups.has(g))groups.set(g,[]);groups.get(g)!.push(v)};
  // Split the figure into moving sections (the rig build has no base, so shift it to the ground).
  for(const c of characterVoxels(spec,{rig:true})){const v={...c,y:c.y-2};
    let g:string;
    if(v.y>=16)g='head';else if(v.y>=8&&v.x<=-4)g='arm-r';else if(v.y>=8&&v.x>=3)g='arm-l';
    else if(!long&&v.y<=6&&v.x<=-2)g='leg-r';else if(!long&&v.y<=6&&v.x>=1)g='leg-l';else g=v.y>=8?torsoGroup:rootGroup;
    if(fancy&&((g==='arm-r'||g==='arm-l')&&v.y>=15||(g==='leg-r'||g==='leg-l')&&v.y>=6))continue;
    const dy=g==='head'?2+lift:g==='arm-r'||g==='arm-l'||g===torsoGroup&&fancy?lift:0;
    // A deluxe torso turns on a small turntable; a plain bottom row ties its front and back together.
    const col=fancy&&g===torsoGroup&&v.y===8?spec.shirt:v.color;put(g,{...v,y:v.y+dy,color:col});}
  const fixed:Fixed[]=[],joints:Parameters<typeof assemble>[4]=[],notes:string[]=[];
  const pin=(g:string,x:number,y:number,c:number,key:string)=>fixed.push({part:'3700',color:c,x,y,z:-1,group:g,key});
  const ball=(g:string,x:number,y:number,socket:boolean,key:string)=>fixed.push({part:socket?'14704':'14417',color:72,x,y,z:-1,group:g,key});
  // Hips.
  if(!long){
    if(!fancy){pin(rootGroup,-1,4,spec.pants,'pelvis-r');pin(rootGroup,0,4,spec.pants,'pelvis-l');pin('leg-r',-2,4,spec.pants,'leg-r');pin('leg-l',1,4,spec.pants,'leg-l');
      for(const [side,x] of [['r',-1],['l',1]] as const)joints.push({id:`hip-${side}`,label:side==='r'?'Right hip':'Left hip',role:side==='r'?'hipR':'hipL',kind:'pin',parent:rootGroup,child:`leg-${side}`,parentKey:`pelvis-${side}`,childKey:`leg-${side}`,pivot:[x,5.8,0],axes:['x'],limits:[[-90,90]],hardware:[hw('2780',0)]});}
    else{for(let x=-1;x<=0;x++)for(let z=-1;z<=0;z++)for(const y of [4,6])put(rootGroup,{x,y,z,color:spec.pants});
      ball(rootGroup,-1,5,false,'pelvis-r');ball(rootGroup,0,5,false,'pelvis-l');ball('leg-r',-2,5,true,'leg-r');ball('leg-l',1,5,true,'leg-l');
      joints.push({id:'hip-r',label:'Right hip',role:'hipR',kind:'ball',parent:rootGroup,child:'leg-r',parentKey:'pelvis-r',childKey:'leg-r',pivot:[-1,5.5,0],axes:['x','z'],limits:[[-90,90],[-45,10]]});
      joints.push({id:'hip-l',label:'Left hip',role:'hipL',kind:'ball',parent:rootGroup,child:'leg-l',parentKey:'pelvis-l',childKey:'leg-l',pivot:[1,5.5,0],axes:['x','z'],limits:[[-90,90],[-10,45]]});}
  }
  // Waist twist (deluxe): turntable between the hips and the upper body.
  if(fancy){fixed.push({part:'3680',color:spec.pants,x:-1,y:8,z:-1,group:rootGroup,key:'waist-base'},{part:'3679',color:71,x:-1,y:9,z:-1,group:torsoGroup,key:'waist-top'});
    joints.push({id:'waist',label:'Waist',role:'waist',kind:'turntable',parent:rootGroup,child:torsoGroup,parentKey:'waist-base',childKey:'waist-top',pivot:[0,9,0],axes:['y'],limits:[[-90,90]]});}
  // Shoulders.
  const ys=13+lift;
  if(!fancy){pin(torsoGroup,-3,ys,spec.shirt,'torso-r');pin(torsoGroup,2,ys,spec.shirt,'torso-l');const sleeve=spec.kind==='animal'?spec.skin:spec.shirt;pin('arm-r',-4,ys,sleeve,'arm-r');pin('arm-l',3,ys,sleeve,'arm-l');
    for(const [side,x] of [['r',-3],['l',3]] as const)joints.push({id:`shoulder-${side}`,label:side==='r'?'Right shoulder':'Left shoulder',role:side==='r'?'shoulderR':'shoulderL',kind:'pin',parent:torsoGroup,child:`arm-${side}`,parentKey:`torso-${side}`,childKey:`arm-${side}`,pivot:[x,ys+1.8,0],axes:['x'],limits:[[-90,180]],hardware:[hw('2780',0)]});}
  else{ball(torsoGroup,-3,ys+1,false,'torso-r');ball(torsoGroup,2,ys+1,false,'torso-l');ball('arm-r',-4,ys+1,true,'arm-r');ball('arm-l',3,ys+1,true,'arm-l');
    joints.push({id:'shoulder-r',label:'Right shoulder',role:'shoulderR',kind:'ball',parent:torsoGroup,child:'arm-r',parentKey:'torso-r',childKey:'arm-r',pivot:[-3,ys+1.5,0],axes:['x','z'],limits:[[-90,180],[-170,15]]});
    joints.push({id:'shoulder-l',label:'Left shoulder',role:'shoulderL',kind:'ball',parent:torsoGroup,child:'arm-l',parentKey:'torso-l',childKey:'arm-l',pivot:[3,ys+1.5,0],axes:['x','z'],limits:[[-90,180],[-15,170]]});}
  // Neck turntable.
  const ny=16+lift;fixed.push({part:'3680',color:spec.shirt,x:-1,y:ny,z:-1,group:torsoGroup,key:'neck-base'},{part:'3679',color:71,x:-1,y:ny+1,z:-1,group:'head',key:'neck-top'});
  joints.push({id:'neck',label:'Head turn',role:'neck',kind:'turntable',parent:torsoGroup,child:'head',parentKey:'neck-base',childKey:'neck-top',pivot:[0,ny+1,0],axes:['y'],limits:[[-150,150]]});
  // Props held in the hands: a 2 × 2 grip plate joins the hand and the prop.
  const gy=9+lift,box=(g:string,x0:number,x1:number,y0:number,y1:number,z0:number,z1:number,c:number,skip?:number)=>{for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++)if(y!==skip)put(g,{x,y,z,color:c})};
  const grip=(g:string,x:number,c:number)=>fixed.push({part:'3022',color:c,x,y:gy,z:-1,group:g,key:`grip-${g}`});
  const shieldColor=spec.accent===spec.shirt?72:spec.accent;
  switch(spec.accessory){
    case 'sword':grip('arm-r',-5,spec.skin);box('arm-r',-5,-5,3+lift,7+lift,-1,-1,71);box('arm-r',-5,-5,8+lift,8+lift,-2,0,72);box('arm-r',-5,-5,gy+1,gy+2,-1,-1,70);break;
    case 'staff':grip('arm-r',-5,spec.skin);box('arm-r',-5,-5,2+lift,14+lift,-1,-1,70,gy);box('arm-r',-5,-5,15+lift,17+lift,-1,-1,spec.accent);break;
    case 'wand':grip('arm-r',-5,spec.skin);box('arm-r',-5,-5,gy+1,gy+6,-1,-1,0);box('arm-r',-5,-5,gy+7,gy+7,-1,-1,15);break;
    case 'shield':grip('arm-r',-5,shieldColor);for(let y=3+lift;y<=14+lift;y++)for(let z=-3;z<=1;z++){if(y===gy&&z>=-1&&z<=0)continue;put('arm-r',{x:-5,y,z,color:y>=6+lift&&y<=10+lift&&z>=-2&&z<=0?(spec.shirt===spec.accent?4:spec.shirt):shieldColor})}break;
    case 'guitar':grip('arm-l',3,70);box('arm-l',4,4,3+lift,8+lift,-2,1,70);box('arm-l',4,4,gy+1,gy+6,-1,0,70);box('arm-l',4,4,gy+7,gy+8,-1,0,0);break;
    case 'backpack':if(spec.cape)break;fixed.push({part:'3020',color:spec.accent===spec.shirt?25:spec.accent,x:-2,y:ny,z:1,rot:true,group:torsoGroup,key:'pack-plate'});box(torsoGroup,-2,1,9+lift,15+lift,2,3,spec.accent===spec.shirt?25:spec.accent);break;
  }
  if(spec.cape){const c=spec.headwear==='ninja'?spec.hat:spec.accent===spec.shirt?4:spec.accent;fixed.push({part:'3795',color:c,x:-3,y:ny,z:1,rot:true,group:torsoGroup,key:'cape-plate'});box(torsoGroup,-3,2,fancy?8+lift:3,15+lift,2,2,c)}
  if(spec.tail&&!spec.cape){fixed.push({part:'3795',color:long?spec.shirt:spec.pants,x:-1,y:7,z:-2,group:rootGroup,key:'tail-plate'});box(rootGroup,-1,0,3,6,2,2,spec.skin);box(rootGroup,-1,0,1,2,2,2,spec.ears==='fox'?15:spec.skin)}
  // Sections that rest on a small joint piece get a spanning plate at their base, like a real
  // build, so every brick above ties into one assembly.
  const tie=(g:string,y:number,options:Parameters<typeof tiePlate>[0])=>{const cellsAt=(groups.get(g)??[]).filter(v=>v.y===y);if(!cellsAt.length)return;
    const counts=new Map<number,number>();for(const v of cellsAt)counts.set(v.color,(counts.get(v.color)||0)+1);const c=[...counts].sort((a,b)=>b[1]-a[1])[0][0];
    const o=tiePlate(options,c),p=o.part==='3958'?[6,6]:o.part==='3032'?(o.rot?[6,4]:[4,6]):o.part==='3031'?[4,4]:o.part==='3795'?(o.rot?[6,2]:[2,6]):[2,4];
    // Cells in this layer outside the plate are left open (a small bevel), then the layer above covers them.
    groups.set(g,(groups.get(g)??[]).filter(v=>v.y!==y||(v.x>=o.x&&v.x<o.x+p[0]&&v.z>=o.z&&v.z<o.z+p[1])));
    fixed.push({part:o.part,color:c,x:o.x,y,z:o.z,rot:o.rot,group:g,key:`tie-${g}`})};
  tie('head',18+lift,[{part:'3958',x:-3,z:-3},{part:'3032',x:-2,z:-3},{part:'3031',x:-2,z:-2}]);
  if(fancy)tie(torsoGroup,10,[{part:'3032',x:-3,z:-2,rot:true},{part:'3031',x:-2,z:-2}]);
  // Fixed joint pieces replace the voxels they sit on.
  const extras=spec.minifig&&spec.kind!=='animal'?minifigFor(spec).parts:[];
  if(extras.length)notes.push('Includes a matching minifigure made from real plain parts.');
  if(long)notes.push('Long robes and dresses keep the legs fixed; arms, head'+(fancy?' and waist':'')+' still move.');
  return assemble(spec.name,`Posable character · ${fancy?'deluxe: ball joints and waist turntable':'basic: Technic pins and neck turntable'}`,groups,fixed,joints,extras,notes);
}

// ---------- Vehicles ----------
export type DoorStyle='fixed'|'basic'|'fancy';
export type VehicleSpec={name:string;body:number;accent:number;chassis:number;windows:number;wheels:number;doors:DoorStyle;hood:boolean;trunk:boolean;stripe:boolean};
const car:VehicleSpec={name:'City car',body:4,accent:15,chassis:72,windows:47,wheels:71,doors:'basic',hood:false,trunk:false,stripe:false};
export const VEHICLE_PRESETS:Record<string,VehicleSpec>={
  basic:{...car,name:'City car'},
  deluxe:{...car,name:'Deluxe car',body:1,accent:15,doors:'fancy',hood:true,trunk:true,stripe:true},
  police:{...car,name:'Police car',body:15,accent:1,chassis:0,doors:'fancy',hood:true,trunk:false,stripe:true},
  taxi:{...car,name:'Taxi',body:14,accent:0,doors:'basic',stripe:true},
  sports:{...car,name:'Sports car',body:4,accent:0,chassis:0,windows:40,wheels:0,doors:'fancy',hood:true,trunk:true,stripe:true},
};
export const VEHICLE_PALETTE=[4,1,14,15,0,2,25,71,72,272,320,19,321,22,10];
export function normalizeVehicle(raw:Partial<VehicleSpec>):VehicleSpec{
  const s={...car,...raw} as VehicleSpec;for(const k of ['body','accent','chassis','windows','wheels'] as const)if(!COLORS.some(c=>c.id===s[k]))s[k]=car[k];
  if(!['fixed','basic','fancy'].includes(s.doors))s.doors='basic';s.hood=!!s.hood;s.trunk=!!s.trunk;s.stripe=!!s.stripe;s.name=String(s.name||'My car').slice(0,80);return s;
}
/**
 * A 4-wide town car (11 long) on two wheel-holder plates. Doors: basic uses 1 × 4 swivel hinge
 * plates (2429/2430), deluxe uses 1 × 4 hinge bricks (3831/3830). Deluxe hood and trunk lift on
 * 1 × 2 hinge bricks (3937/3938). Moving sections sit one plate clear of fixed studs.
 */
export function vehicleModel(raw:Partial<VehicleSpec>):Model{
  const s=normalizeVehicle(raw),groups=new Map<string,Voxel[]>(),fixed:Fixed[]=[],joints:Parameters<typeof assemble>[4]=[];
  const cells=new Map<string,{g:string;c:number}>(),set=(g:string,x:number,y:number,z:number,c:number)=>cells.set(`${x},${y},${z}`,{g,c}),del=(x:number,y:number,z:number)=>cells.delete(`${x},${y},${z}`);
  const box=(g:string,x0:number,x1:number,y0:number,y1:number,z0:number,z1:number,c:number)=>{for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++)set(g,x,y,z,c)};
  const wheelZ=new Set([-4,-3,2,3]),sides=[-2,1];
  // Chassis on wheel holders; wheel wells stay open under the fenders.
  box('chassis',-1,0,3,4,-5,5,s.chassis);for(const x of sides)for(let z=-5;z<=5;z++)if(!wheelZ.has(z))box('chassis',x,x,3,4,z,z,s.chassis);
  box('chassis',-2,1,5,5,-5,5,s.body);
  // Engine bay, rear block, bumpers and lights.
  box('chassis',-2,1,6,8,-5,-2,s.body);box('chassis',-2,1,6,8,3,5,s.body);
  box('chassis',-2,1,6,6,-5,-5,s.chassis);box('chassis',-2,1,6,6,5,5,s.chassis);
  for(const x of sides){set('chassis',x,7,-5,47);set('chassis',x,7,5,36)}set('chassis',-1,7,-5,72);set('chassis',0,7,-5,72);
  if(s.stripe)for(const x of sides)for(const z of [-5,-4,-3,-2,3,4,5])set('chassis',x,8,z,s.accent);
  // Cowl, pillars, windscreen, rear window, roof, seats.
  box('chassis',-2,1,9,9,-2,-2,s.body);for(const x of sides){box('chassis',x,x,10,11,-2,-2,s.body);box('chassis',x,x,9,11,3,3,s.body)}
  box('chassis',-1,0,10,11,-2,-2,s.windows);box('chassis',-1,0,9,11,3,3,s.windows);
  box('chassis',-2,1,12,12,-2,3,s.stripe?s.accent:s.body);
  box('chassis',-1,0,6,7,1,2,0);box('chassis',-1,0,8,9,2,2,0);
  // Doors.
  for(const [x,side] of [[-2,'r'],[1,'l']] as const){
    const g=`door-${side}`,outer=x<0?-2:2,lim:[number,number]=x<0?[-85,0]:[0,85];
    if(s.doors==='fixed'){box('chassis',x,x,6,8,-1,2,s.body);box('chassis',x,x,9,10,-1,2,s.windows);continue}
    for(let z=-1;z<=2;z++)del(x,5,z);
    if(s.doors==='basic'){for(let z=-4;z<=-1;z++)del(x,5,z);fixed.push({part:'2429',color:s.body,x,y:5,z:-4,group:'chassis',key:`hinge-${side}`},{part:'2430',color:s.body,x,y:6,z:-1,group:g,key:`door-${side}`});box(g,x,x,7,9,-1,2,s.body);box(g,x,x,10,10,-1,2,s.windows)}
    else{for(let z=-5;z<=-2;z++)for(let y=6;y<=8;y++)del(x,y,z);fixed.push({part:'3831',color:s.body,x,y:6,z:-5,group:'chassis',key:`hinge-${side}`},{part:'3830',color:s.body,x,y:6,z:-1,group:g,key:`door-${side}`});box(g,x,x,9,10,-1,2,s.windows)}
    joints.push({id:g,label:side==='r'?'Right door':'Left door',role:x<0?'doorL':'doorR',kind:'hinge',parent:'chassis',child:g,parentKey:`hinge-${side}`,childKey:`door-${side}`,pivot:[outer,6,-1],axes:['y'],limits:[lim]});
  }
  // Hood and trunk: fixed deck plates, or lids on hinge bricks.
  if(s.hood){for(let y=6;y<=8;y++){del(-1,y,-3);del(0,y,-3)}fixed.push({part:'3937',color:s.body,x:-1,y:6,z:-3,rot:true,group:'chassis',key:'hood-base'},{part:'3938',color:s.body,x:-1,y:9,z:-3,rot:true,group:'hood',key:'hood-top'});box('hood',-2,1,10,10,-5,-3,s.stripe?s.accent:s.body);
    joints.push({id:'hood',label:'Hood',role:'hood',kind:'hinge',parent:'chassis',child:'hood',parentKey:'hood-base',childKey:'hood-top',pivot:[0,11,-2],axes:['x'],limits:[[0,85]]});}
  else box('chassis',-2,1,9,9,-5,-3,s.stripe?s.accent:s.body);
  if(s.trunk){for(let y=6;y<=8;y++){del(-1,y,4);del(0,y,4)}fixed.push({part:'3937',color:s.body,x:-1,y:6,z:4,rot:true,group:'chassis',key:'trunk-base'},{part:'3938',color:s.body,x:-1,y:9,z:4,rot:true,group:'trunk',key:'trunk-top'});box('trunk',-2,1,10,10,4,5,s.body);
    joints.push({id:'trunk',label:'Trunk',role:'trunk',kind:'hinge',parent:'chassis',child:'trunk',parentKey:'trunk-base',childKey:'trunk-top',pivot:[0,11,4],axes:['x'],limits:[[-85,0]]});}
  else box('chassis',-2,1,9,9,4,5,s.body);
  // Wheel holders and four free-rolling wheels.
  fixed.push({part:'4600',color:s.chassis,x:-1,y:2,z:-4,group:'chassis',key:'axle-front'},{part:'4600',color:s.chassis,x:-1,y:2,z:2,group:'chassis',key:'axle-rear'});
  const wheel=real('4624',s.wheels);
  for(const [axle,z] of [['front',-3],['rear',3]] as const)for(const side of [-1,1]){const id=`wheel-${axle}-${side<0?'r':'l'}`;
    joints.push({id,label:`${axle==='front'?'Front':'Rear'} ${side<0?'right':'left'} wheel`,role:'wheel',kind:'axle',parent:'chassis',child:id,parentKey:`axle-${axle}`,pivot:[side*1.375,2.5,z],axes:['x'],limits:[[-360,360]],hardware:[hw('4624',wheel),hw('3641',0)],wheel:{radius:.94,width:.75,side,wheel,tire:0}});}
  for(const [k,v] of cells){const [x,y,z]=k.split(',').map(Number);if(!groups.has(v.g))groups.set(v.g,[]);groups.get(v.g)!.push({x,y,z,color:v.c})}
  const notes=[`Doors: ${s.doors==='fixed'?'fixed':s.doors==='basic'?'swivel hinge plates (basic)':'hinge bricks (deluxe)'}. ${s.hood?'Opening hood. ':''}${s.trunk?'Opening trunk. ':''}Wheels roll on real wheel-holder plates.`];
  return assemble(s.name,`Vehicle · ${s.doors==='fancy'||s.hood||s.trunk?'deluxe moving parts':'basic moving parts'}`,groups,fixed,joints,[],notes);
}
export const jointKindLabel:Record<string,string>={pin:'Technic pin',ball:'Ball joint',turntable:'Turntable',hinge:'Hinge',axle:'Wheel axle',minifig:'Minifigure joint'};
export const describeHardware=(j:Joint)=>(j.hardware??[]).map(h=>`${h.qty}× ${partName(h.part,h.name)} (${color(h.color).name})`).join(', ');

/** Brick-built statue, posable figure, or minifigure, depending on the spec. */
export function buildCharacter(raw:Partial<CharacterSpec>):Model{const spec=normalizeSpec(raw);if(spec.format==='minifig')return minifigModel(spec);return spec.rig&&spec.rig!=='none'?posableCharacter(spec):characterModel(spec)}

/**
 * Minifigure version: the matching minifigure from real plain parts, standing on a 4 × 4 display
 * plate. Its own joints (head, arms, legs) pose like a real minifigure.
 */
export function minifigModel(raw:Partial<CharacterSpec>):Model{
  const spec=normalizeSpec(raw);
  if(spec.kind==='animal')throw new Error('Animal minifigures need special printed heads that are not plain parts. Use the brick figure for animals.');
  const fig=minifigFor(spec),plate={id:'stand',part:'3031',color:real('3031',spec.base),x:-2,y:0,z:-2,rot:false};
  const j=(id:string,label:string,role:string,kind:'minifig',axes:('x'|'y')[],limits:[number,number][]):Joint=>({id,label,role,kind,parent:'stand',child:id,parentBrick:'stand',pivot:[0,0,0],axes,limits});
  const joints=[j('fig-head','Head turn','neck','minifig',['y'],[[-180,180]]),j('fig-arm-r','Right arm','shoulderR','minifig',['x'],[[-180,180]]),j('fig-arm-l','Left arm','shoulderL','minifig',['x'],[[-180,180]]),j('fig-leg-r','Right leg','hipR','minifig',['x'],[[-90,90]]),j('fig-leg-l','Left leg','hipL','minifig',['x'],[[-90,90]])];
  return{version:1,name:spec.name,source:'Minifigure · real plain parts on a display plate',format:'minifig',bricks:[plate],extras:fig.parts,figures:[{x:-1,y:1,z:-1}],joints,pose:{},
    notes:['Minifigure made from real plain parts: head, torso with arms and hands, hips and legs'+(fig.parts.length>3?', plus headwear and accessories':'')+'.',...fig.notes,'Arms, legs and head move like any minifigure.']};
}

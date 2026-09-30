import {Model,Voxel,packMixed,checks,COLORS} from './brick-engine';
import {interlockModel} from './build-planner';
import {buildMinifig} from './minifig';

// Brick-built character figures in a chunky "brick head" style: an oversized head,
// short body, arms resting on a belt ledge and a two-plate display base. Coordinates are
// studs on X/Z (front is -Z) and plate heights on Y. Every detail sits on something below
// it, so the figure passes the bottom-up stud support check without extra columns.
export type HairStyle='short'|'long'|'bob'|'spiky'|'bun'|'curly'|'mohawk'|'bald';
export type Headwear='none'|'cap'|'police'|'firefighter'|'hardhat'|'knight'|'space'|'wizard'|'witch'|'crown'|'cowboy'|'tophat'|'chef'|'pirate'|'viking'|'ninja'|'bow'|'antenna';
export type Outfit='plain'|'stripe'|'jacket'|'overalls'|'emblem'|'robe'|'dress'|'suit';
export type Accessory='none'|'sword'|'staff'|'wand'|'shield'|'backpack'|'cape'|'guitar';
export type Ears='none'|'cat'|'bear'|'bunny'|'dog'|'fox'|'mouse';
export type CharacterKind='person'|'animal'|'robot';
export type CharacterSpec={
  name:string;kind:CharacterKind;
  skin:number;eyes:number;hair:number;hairStyle:HairStyle;
  headwear:Headwear;hat:number;
  shirt:number;outfit:Outfit;accent:number;pants:number;shoes:number;
  accessory:Accessory;cape:boolean;beard:boolean;glasses:boolean;
  ears:Ears;tail:boolean;muzzle:number|null;
  base:number;minifig:boolean;
};
export const HAIR_STYLES:{value:HairStyle;label:string}[]=[{value:'short',label:'Short'},{value:'long',label:'Long'},{value:'bob',label:'Bob'},{value:'spiky',label:'Spiky'},{value:'bun',label:'Bun'},{value:'curly',label:'Curly'},{value:'mohawk',label:'Mohawk'},{value:'bald',label:'Bald'}];
export const HEADWEAR:{value:Headwear;label:string}[]=[{value:'none',label:'None'},{value:'cap',label:'Baseball cap'},{value:'police',label:'Police cap'},{value:'firefighter',label:'Fire helmet'},{value:'hardhat',label:'Hard hat'},{value:'knight',label:'Knight helmet'},{value:'space',label:'Space helmet'},{value:'wizard',label:'Wizard hat'},{value:'witch',label:'Witch hat'},{value:'crown',label:'Crown'},{value:'cowboy',label:'Cowboy hat'},{value:'tophat',label:'Top hat'},{value:'chef',label:'Chef hat'},{value:'pirate',label:'Pirate hat'},{value:'viking',label:'Viking helmet'},{value:'ninja',label:'Ninja mask'},{value:'bow',label:'Hair bow'},{value:'antenna',label:'Antenna'}];
export const OUTFITS:{value:Outfit;label:string}[]=[{value:'plain',label:'Plain top'},{value:'stripe',label:'Striped'},{value:'jacket',label:'Open jacket'},{value:'suit',label:'Suit & tie'},{value:'overalls',label:'Overalls'},{value:'emblem',label:'Hero emblem'},{value:'robe',label:'Long robe'},{value:'dress',label:'Dress'}];
export const ACCESSORIES:{value:Accessory;label:string}[]=[{value:'none',label:'None'},{value:'sword',label:'Sword'},{value:'staff',label:'Staff'},{value:'wand',label:'Wand'},{value:'shield',label:'Shield'},{value:'backpack',label:'Backpack'},{value:'guitar',label:'Guitar'}];
export const EARS:{value:Ears;label:string}[]=[{value:'none',label:'None'},{value:'cat',label:'Cat'},{value:'fox',label:'Fox'},{value:'bear',label:'Bear'},{value:'bunny',label:'Bunny'},{value:'dog',label:'Floppy dog'},{value:'mouse',label:'Mouse'}];

const person:CharacterSpec={name:'My character',kind:'person',skin:78,eyes:0,hair:70,hairStyle:'short',headwear:'none',hat:4,shirt:4,outfit:'plain',accent:15,pants:272,shoes:0,accessory:'none',cape:false,beard:false,glasses:false,ears:'none',tail:false,muzzle:null,base:72,minifig:true};
const animal=(name:string,fur:number,ears:Ears,muzzle:number|null,extra:Partial<CharacterSpec>={}):CharacterSpec=>({...person,name,kind:'animal',skin:fur,hair:fur,hairStyle:'bald',shirt:fur,pants:fur,shoes:fur,ears,tail:true,muzzle,accent:muzzle??15,minifig:false,base:2,...extra});
export const PRESETS:Record<string,CharacterSpec>={
  hero:{...person,name:'Everyday hero'},
  astronaut:{...person,name:'Astronaut',shirt:15,pants:15,shoes:72,accent:25,headwear:'space',hat:15,outfit:'emblem',accessory:'backpack',base:0},
  knight:{...person,name:'Knight',shirt:71,pants:72,shoes:0,accent:4,headwear:'knight',hat:71,outfit:'emblem',accessory:'sword',base:72},
  wizard:{...person,name:'Wizard',skin:78,hair:15,shirt:85,pants:85,accent:14,headwear:'wizard',hat:85,outfit:'robe',accessory:'staff',beard:true,base:288},
  witch:{...person,name:'Witch',hair:4,hairStyle:'long',shirt:0,pants:0,accent:22,headwear:'witch',hat:0,outfit:'dress',accessory:'wand',base:288},
  pirate:{...person,name:'Pirate',skin:92,hair:0,shirt:15,outfit:'jacket',accent:4,pants:70,shoes:0,headwear:'pirate',hat:0,accessory:'sword',beard:true,base:19},
  ninja:{...person,name:'Ninja',shirt:0,pants:0,shoes:0,accent:4,headwear:'ninja',hat:0,accessory:'sword',base:72},
  princess:{...person,name:'Princess',hair:191,hairStyle:'long',shirt:13,accent:15,outfit:'dress',pants:13,headwear:'crown',hat:297,accessory:'wand',base:30},
  king:{...person,name:'King',hair:70,shirt:320,accent:14,outfit:'robe',headwear:'crown',hat:297,beard:true,cape:true,accessory:'staff',base:72},
  firefighter:{...person,name:'Firefighter',shirt:0,accent:14,outfit:'stripe',pants:0,headwear:'firefighter',hat:4,accessory:'none',base:72},
  police:{...person,name:'Police officer',shirt:272,pants:0,accent:14,outfit:'emblem',headwear:'police',hat:272,base:72},
  builder:{...person,name:'Builder',shirt:25,accent:14,outfit:'stripe',pants:272,headwear:'hardhat',hat:14},
  chef:{...person,name:'Chef',shirt:15,pants:0,accent:0,outfit:'jacket',headwear:'chef',hat:15,base:71},
  scientist:{...person,name:'Scientist',hair:71,hairStyle:'curly',shirt:15,outfit:'jacket',accent:212,pants:72,glasses:true,base:71},
  cowboy:{...person,name:'Cowboy',skin:92,hair:70,shirt:4,outfit:'plain',pants:272,shoes:70,headwear:'cowboy',hat:70,base:28},
  superhero:{...person,name:'Superhero',hair:0,shirt:1,pants:1,shoes:4,accent:14,outfit:'emblem',cape:true,base:72},
  rockstar:{...person,name:'Rock star',hair:0,hairStyle:'spiky',shirt:0,outfit:'jacket',accent:4,pants:72,glasses:true,accessory:'guitar',base:0},
  viking:{...person,name:'Viking',hair:25,hairStyle:'long',shirt:70,pants:72,accent:19,headwear:'viking',hat:71,beard:true,accessory:'shield',base:72},
  explorer:{...person,name:'Explorer',hair:70,shirt:19,pants:28,shoes:70,outfit:'jacket',accent:15,headwear:'cap',hat:28,accessory:'backpack',base:2},
  zombie:{...person,name:'Zombie',skin:378,hair:0,hairStyle:'spiky',shirt:72,outfit:'plain',pants:272,base:72},
  robot:{...person,name:'Robot',kind:'robot',skin:71,eyes:212,hairStyle:'bald',shirt:71,accent:4,outfit:'emblem',pants:72,shoes:72,headwear:'antenna',hat:4,base:0,minifig:false},
  alien:{...person,name:'Alien',skin:10,eyes:0,hairStyle:'bald',shirt:22,pants:22,accent:14,outfit:'emblem',headwear:'antenna',hat:27,base:0},
  cat:animal('Cat',25,'cat',15),
  fox:animal('Fox',25,'fox',15,{shoes:0}),
  dog:animal('Dog',19,'dog',15,{ears:'dog',hair:70}),
  bear:animal('Bear',70,'bear',19),
  panda:animal('Panda',15,'bear',15,{hair:0,shoes:0,pants:0,tail:false}),
  bunny:animal('Bunny',15,'bunny',13,{tail:true}),
  mouse:animal('Mouse',71,'mouse',13),
  penguin:animal('Penguin',0,'none',15,{shirt:15,shoes:25,tail:false,base:212}),
  frog:animal('Frog',10,'none',27,{tail:false,base:2}),
  owl:animal('Owl',70,'cat',19,{shirt:19,eyes:0,tail:false}),
};
export const PRESET_GROUPS:{label:string;keys:string[]}[]=[
  {label:'People',keys:['hero','astronaut','firefighter','police','builder','chef','scientist','explorer','cowboy','rockstar']},
  {label:'Fantasy',keys:['wizard','witch','knight','pirate','ninja','princess','king','viking','superhero','zombie']},
  {label:'Robots & aliens',keys:['robot','alien']},
  {label:'Animals',keys:['cat','fox','dog','bear','panda','bunny','mouse','penguin','frog','owl']},
];
export const presetLabel=(k:string)=>PRESETS[k]?.name??k;

const valid=(id:number)=>COLORS.some(c=>c.id===id);
export function normalizeSpec(raw:Partial<CharacterSpec>):CharacterSpec{
  const s={...person,...raw} as CharacterSpec;
  const oneOf=<T,>(v:T,list:{value:T}[],d:T)=>list.some(o=>o.value===v)?v:d;
  s.hairStyle=oneOf(s.hairStyle,HAIR_STYLES,'short');s.headwear=oneOf(s.headwear,HEADWEAR,'none');s.outfit=oneOf(s.outfit,OUTFITS,'plain');s.accessory=oneOf(s.accessory,ACCESSORIES,'none');s.ears=oneOf(s.ears,EARS,'none');
  if(!['person','animal','robot'].includes(s.kind))s.kind='person';for(const k of ['cape','beard','glasses','tail','minifig'] as const)s[k]=!!s[k];
  for(const k of ['skin','eyes','hair','hat','shirt','accent','pants','shoes','base'] as const)if(!valid(s[k]))s[k]=person[k];
  if(s.muzzle!==null&&!valid(s.muzzle))s.muzzle=null;
  s.name=String(s.name||'My character').slice(0,80);
  return s;
}

export function characterVoxels(spec:CharacterSpec):Voxel[]{
  const cells=new Map<string,Voxel>();
  const set=(x:number,y:number,z:number,color:number)=>cells.set(`${x},${y},${z}`,{x,y,z,color});
  const has=(x:number,y:number,z:number)=>cells.has(`${x},${y},${z}`);
  // Fill inclusive ranges.
  const box=(x0:number,x1:number,y0:number,y1:number,z0:number,z1:number,c:number)=>{for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++)set(x,y,z,c)};
  // Recolor only cells that already exist (surface paint on the head or body).
  const paint=(x0:number,x1:number,y0:number,y1:number,z0:number,z1:number,c:number)=>{for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++)if(has(x,y,z))set(x,y,z,c)};
  const long=spec.outfit==='robe'||spec.outfit==='dress';

  // Display base, two plates thick so the courses cross and lock together.
  box(-5,4,0,1,-4,3,spec.base);
  // Legs and shoes, or a floor-length robe/dress.
  if(long){box(-3,2,2,8,-2,1,spec.shirt);if(spec.outfit==='robe')paint(-1,0,2,8,-2,-2,spec.accent);}
  else{
    for(const x0 of [-3,1]){box(x0,x0+1,2,3,-2,0,spec.shoes);box(x0,x0+1,4,8,-1,0,spec.pants)}
  }
  // Belt ledge: wider than the torso so the hands rest on it.
  const belt=long?spec.shirt:spec.outfit==='suit'?0:spec.pants;
  box(-4,3,9,9,-2,1,belt);
  // Torso and arms (sleeves in the shirt color, hands at the bottom).
  box(-3,2,10,17,-2,1,spec.shirt);
  for(const x of [-4,3]){box(x,x,10,11,-1,0,spec.skin);box(x,x,12,17,-1,0,spec.kind==='animal'?spec.skin:spec.shirt)}
  if(spec.kind==='robot')for(const x of [-4,3])box(x,x,10,11,-1,0,72);
  switch(spec.outfit){
    case 'stripe':paint(-4,3,13,14,-2,1,spec.accent);break;
    case 'jacket':paint(-1,0,10,17,-2,-2,spec.accent);break;
    case 'suit':paint(-1,0,10,17,-2,-2,15);paint(0,0,11,16,-2,-2,spec.accent);break;
    case 'overalls':paint(-3,2,10,13,-2,1,spec.pants);paint(-2,-2,14,17,-2,-2,spec.pants);paint(1,1,14,17,-2,-2,spec.pants);break;
    case 'emblem':paint(-1,0,13,15,-2,-2,spec.accent);break;
    case 'robe':paint(-1,0,10,17,-2,-2,spec.accent);break;
    case 'dress':paint(-3,2,10,11,-2,1,spec.accent);break;
  }
  if(spec.kind==='animal'&&spec.muzzle!==null&&spec.shirt===spec.skin)paint(-2,1,10,15,-2,-2,spec.muzzle);

  // Head: 8 studs wide, 7 deep, 18 plates tall, overhanging the torso front and back.
  const H0=18,H1=35;
  box(-4,3,H0,H1,-4,2,spec.skin);
  const front=-4;
  // Face details.
  if(spec.kind==='animal'&&spec.muzzle!==null){paint(-2,1,H0+1,H0+6,front,front,spec.muzzle);paint(-1,0,H0+5,H0+6,front,front,0)}
  if(spec.kind==='robot'){paint(-2,1,H0+2,H0+3,front,front,72);paint(-3,2,H0+11,H0+11,front,front,72)}
  if(spec.beard){paint(-4,3,H0+1,H0+5,front,front,spec.hair);paint(-4,-4,H0+1,H0+8,front,-1,spec.hair);paint(3,3,H0+1,H0+8,front,-1,spec.hair);paint(-1,0,H0+4,H0+4,front,front,spec.skin)}
  paint(-2,-2,H0+7,H0+8,front,front,spec.eyes);paint(1,1,H0+7,H0+8,front,front,spec.eyes);
  if(spec.glasses)paint(-3,2,H0+7,H0+8,front,front,0);

  // Hair (paints the head shell, then adds a cap on top).
  const top=H1+1;let crown=top; // first free layer above the head
  const hair=spec.hair;
  const hasHat=!['none','bow','antenna','ninja'].includes(spec.headwear);
  if(spec.hairStyle!=='bald'&&spec.kind==='person'){
    paint(-4,3,H1-1,H1,-4,2,hair);paint(-4,3,H1-9,H1,2,2,hair);paint(-4,-4,H1-7,H1,-1,2,hair);paint(3,3,H1-7,H1,-1,2,hair);paint(-4,3,H1-2,H1,front,front,hair);
    if(spec.hairStyle==='long'){paint(-4,3,H0+1,H1,2,2,hair);paint(-4,-4,H0+3,H1,-2,2,hair);paint(3,3,H0+3,H1,-2,2,hair)}
    if(spec.hairStyle==='bob'){paint(-4,3,H0+5,H1,2,2,hair);paint(-4,-4,H0+5,H1,-3,2,hair);paint(3,3,H0+5,H1,-3,2,hair)}
    if(spec.hairStyle==='mohawk'){paint(-4,3,H1-9,H1,-4,2,spec.skin);box(-1,0,top,top+3,-3,2,hair);crown=top+4}
    else if(!hasHat){
      box(-4,3,top,top+1,-4,2,hair);crown=top+2;
      if(spec.hairStyle==='spiky')for(const [x,z] of [[-3,-3],[0,-2],[2,-3],[-2,0],[1,1],[-4,2],[3,1]])box(x,x,crown,crown+2+((x+z)&1),z,z,hair);
      if(spec.hairStyle==='curly'){for(let x=-4;x<=3;x+=2)for(let z=-4;z<=2;z+=2)box(x,x,crown,crown,z,z,hair);crown+=1}
      if(spec.hairStyle==='bun'){box(-2,1,crown,crown+3,-1,1,hair);crown+=4}
    }
  }
  // Headwear.
  const hc=spec.hat;
  switch(spec.headwear){
    case 'cap':box(-4,3,top,top+2,-4,2,hc);box(-3,2,top,top,-6,-5,hc);paint(-1,0,top+1,top+2,front,front,spec.accent);break;
    case 'police':box(-4,3,top,top+3,-4,2,hc);box(-3,2,top,top,-5,-4,0);box(-1,0,top+2,top+3,-4,-4,14);break;
    case 'hardhat':case 'firefighter':box(-4,3,top,top+1,-5,3,hc);box(-3,2,top+2,top+3,-4,2,hc);box(-2,1,top+4,top+4,-3,1,hc);if(spec.headwear==='firefighter')box(-1,0,top+2,top+3,-4,-4,14);break;
    case 'knight':paint(-4,3,H0+2,H1,-4,2,hc);paint(-3,2,H0+7,H0+8,front,front,0);box(-4,3,top,top+1,-4,2,hc);box(-1,0,top+2,top+6,-1,1,spec.accent);break;
    case 'space':{
      for(let x=-4;x<=3;x++)for(let y=H0;y<=H1;y++)for(let z=-4;z<=2;z++){const edge=x===-4||x===3||z===2||z===-4||y===H1||y===H0;const window=z===-4&&x>=-3&&x<=2&&y>=H0+3&&y<=H0+11;if(edge&&!window)set(x,y,z,hc)}
      paint(-2,-2,H0+7,H0+8,front,front,spec.eyes);paint(1,1,H0+7,H0+8,front,front,spec.eyes);
      box(-4,3,top,top+1,-4,2,hc);box(-2,1,top+2,top+2,-3,1,hc);break;}
    case 'wizard':case 'witch':{
      box(-5,4,top,top,-5,3,hc);box(-3,2,top+1,top+4,-3,1,hc);box(-2,1,top+5,top+8,-2,0,hc);box(-1,0,top+9,top+12,-2,-1,hc);box(-1,-1,top+13,top+15,-1,-1,hc);
      if(spec.headwear==='wizard'){paint(-1,0,top+2,top+3,-3,-3,spec.accent)}else paint(-3,2,top+1,top+1,-3,1,spec.accent);
      break;}
    case 'crown':{
      for(let x=-4;x<=3;x++)for(let z=-4;z<=2;z++)if(x===-4||x===3||z===-4||z===2)box(x,x,top,top+1,z,z,hc);
      for(const [x,z] of [[-4,-4],[3,-4],[-4,2],[3,2],[-1,-4],[0,-4],[-4,-1],[3,-1],[0,2]])box(x,x,top+2,top+3,z,z,hc);
      paint(-1,0,top,top+1,-4,-4,4);break;}
    case 'cowboy':box(-6,5,top,top,-5,3,hc);box(-3,2,top+1,top+4,-3,1,hc);paint(-3,2,top+1,top+1,-3,1,spec.accent);break;
    case 'tophat':box(-5,4,top,top,-5,3,hc);box(-3,2,top+1,top+9,-3,1,hc);paint(-3,2,top+1,top+2,-3,1,spec.accent);break;
    case 'chef':box(-4,3,top,top+2,-4,2,hc);box(-5,4,top+3,top+9,-5,3,hc);box(-4,3,top+10,top+10,-4,2,hc);break;
    case 'pirate':box(-5,4,top,top+1,-4,2,hc);box(-3,2,top+2,top+5,-3,1,hc);box(-1,0,top+3,top+4,-3,-3,15);break;
    case 'viking':{
      paint(-4,3,H1-3,H1,-4,2,hc);box(-5,4,H1-3,H1-3,-1,0,hc);box(-4,3,top,top+1,-4,2,hc);box(-2,1,top+2,top+3,-3,1,hc);
      box(-5,-5,H1-2,H1+3,-1,0,15);box(4,4,H1-2,H1+3,-1,0,15);box(-5,-5,H1+4,H1+5,0,0,15);box(4,4,H1+4,H1+5,0,0,15);break;}
    case 'ninja':paint(-4,3,H0,H1,-4,2,hc);paint(-3,2,H0+6,H0+9,front,front,spec.skin);paint(-2,-2,H0+7,H0+8,front,front,spec.eyes);paint(1,1,H0+7,H0+8,front,front,spec.eyes);paint(-4,3,H0+10,H0+11,-4,2,spec.accent);paint(-3,2,H0+7,H0+8,front,front,spec.skin);paint(-2,-2,H0+7,H0+8,front,front,spec.eyes);paint(1,1,H0+7,H0+8,front,front,spec.eyes);box(-4,3,top,top+1,-4,2,hc);break;
    case 'bow':box(0,3,crown,crown+1,-1,0,spec.accent);box(1,2,crown+2,crown+2,-1,0,spec.accent);break;
    case 'antenna':box(-1,-1,crown,crown+4,0,0,71);box(-1,-1,crown+5,crown+6,0,0,hc);break;
  }
  // Ears on top of the head (fur color with an inner accent).
  const fur=spec.skin,inner=spec.muzzle??spec.accent;
  switch(spec.ears){
    case 'cat':for(const x0 of [-4,2]){box(x0,x0+1,top,top+2,-2,-1,fur);box(x0===-4?-4:3,x0===-4?-4:3,top+3,top+4,-2,-2,fur);paint(x0===-4?-3:2,x0===-4?-3:2,top,top+1,-2,-2,inner)}break;
    case 'fox':for(const x0 of [-4,2]){box(x0,x0+1,top,top+3,-2,-1,fur);box(x0===-4?-4:3,x0===-4?-4:3,top+4,top+5,-2,-2,0);paint(x0===-4?-3:2,x0===-4?-3:2,top,top+2,-2,-2,inner)}break;
    case 'bear':for(const x0 of [-4,2]){box(x0,x0+1,top,top+3,-1,0,fur);paint(x0===-4?-3:2,x0===-4?-3:2,top+1,top+2,-1,-1,inner)}break;
    case 'bunny':for(const x0 of [-3,1]){box(x0,x0+1,top,top+11,0,0,fur);paint(x0,x0+1,top+2,top+10,0,0,inner)}break;
    case 'mouse':for(const x0 of [-4,1]){box(x0,x0+2,top,top+5,0,0,fur);paint(x0+1,x0+1,top+1,top+4,0,0,inner)}break;
    case 'dog':paint(-4,-4,H0+5,H1,-2,1,spec.hair);paint(3,3,H0+5,H1,-2,1,spec.hair);break;
  }
  // Back and side extras that stand on the base.
  if(spec.cape)box(-3,2,2,17,2,2,spec.headwear==='ninja'?spec.hat:spec.accent===spec.shirt?4:spec.accent);
  if(spec.tail&&!spec.cape){const tip=spec.ears==='fox'?15:fur,h=spec.ears==='bunny'?2:8;box(-1,0,2,2+h,3,3,fur);box(-1,0,3+h,4+h,3,3,tip)}
  switch(spec.accessory){
    case 'sword':box(-5,-5,2,8,-1,-1,71);box(-5,-5,9,9,-2,0,72);box(-5,-5,10,12,-1,-1,70);break;
    case 'staff':box(-5,-5,2,22,-1,-1,70);box(-5,-5,23,25,-1,-1,spec.accent);break;
    case 'wand':box(-5,-5,2,13,-1,-1,0);box(-5,-5,14,14,-1,-1,15);break;
    case 'shield':box(-5,-5,2,14,-3,1,spec.accent===spec.shirt?72:spec.accent);paint(-5,-5,6,10,-2,0,spec.shirt===spec.accent?4:spec.shirt);break;
    case 'backpack':if(spec.cape)break;box(-2,1,9,9,2,3,belt);box(-2,1,10,16,2,3,spec.accent===spec.shirt?25:spec.accent);break;
    case 'guitar':box(4,4,2,6,-2,1,70);box(4,4,7,17,-1,0,70);box(4,4,18,19,-1,0,0);break;
  }
  return [...cells.values()];
}

export function characterModel(raw:Partial<CharacterSpec>):Model{
  const spec=normalizeSpec(raw);
  let model=packMixed(characterVoxels(spec),spec.name,`Character · ${spec.kind==='animal'?'animal':spec.kind==='robot'?'robot':'figure'} · brick-built`);
  // Rebuild with interlocking checks; supports and raft only where needed.
  model=interlockModel(model);
  const notes=[...model.notes];
  let extras=undefined;
  if(spec.minifig&&spec.kind!=='animal'){
    const fig=buildMinifig({skin:spec.skin,hair:spec.hair,hairStyle:spec.hairStyle,headwear:spec.headwear,hat:spec.hat,shirt:spec.shirt,pants:spec.pants,neck:spec.cape?'cape':spec.beard?'beard':spec.accessory==='backpack'?'backpack':spec.headwear==='ninja'?'ninja':undefined,neckColor:spec.cape?spec.accent:spec.beard?spec.hair:spec.accent,tool:['sword','staff','wand','shield','guitar'].includes(spec.accessory)?spec.accessory:undefined,toolColor:spec.accessory==='shield'?spec.accent:71});
    extras=fig.parts;notes.push('Includes a matching minifigure made from real plain parts.',...fig.notes);
  }
  const report=checks(model.bricks);
  notes.push(report.passed?'Character passes stud connection, collision and support checks.':'Review highlighted issues before building.');
  return{...model,name:spec.name,notes,...(extras?{extras}:{})};
}

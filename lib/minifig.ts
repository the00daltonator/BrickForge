import data from './minifig-data.json';
import {Stock,color} from './brick-engine';
import {colorDistance,closestColor} from './color';

// Matching minifigure built only from real, plain catalog assemblies. Each choice is the
// closest available part/color combination observed in the bundled set inventories.
export type MinifigSpec={skin:number;hair:number;hairStyle:string;headwear:string;hat:number;shirt:number;pants:number;neck?:string;neckColor?:number;tool?:string;toolColor?:number;short?:boolean};
export type MinifigLook={head:number;hair?:{id:string;color:number;style:string};hat?:{id:string;color:number;kind:string};torso:number;arms:number;hands:number;hips:number;legs:number;neck?:{id:string;color:number;kind:string};tool?:{id:string;color:number;kind:string};short:boolean};
type Row={id:string;key:string;name:string;colors:number[]};

const HAIR_FOR:Record<string,string[]>={short:['short','tousled'],spiky:['spiky'],long:['long','mid'],bob:['mid','wavy'],bun:['ponytail','braid'],curly:['curly'],mohawk:['spiky'],ponytail:['ponytail']};
const HAT_FOR:Record<string,string[]>={cap:['cap'],police:['police'],firefighter:['firefighter'],knight:['knight'],helmet:['knight','helmet'],space:['helmet','astronaut'],hardhat:['builder'],cowboy:['cowboy'],tophat:['tophat','bowler'],wizard:['wizard'],witch:['wizard'],pirate:['pirate'],chef:['chef'],crown:['crown'],viking:['viking','knight']};
const NECK_FOR:Record<string,string[]>={beard:['beard'],cape:['cape'],backpack:['backpack'],airtanks:['airtanks'],bandana:['bandana'],ninja:['ninja']};
const TOOL_FOR:Record<string,string[]>={sword:['sword','dagger'],staff:['staff'],wand:['wand'],shield:['shield'],guitar:['guitar'],camera:['camera'],hook:['hook'],mug:['mug'],microphone:['microphone']};

function pick(rows:Row[],keys:string[]|undefined,target:number){
  if(!keys)return undefined;
  let best:{id:string;color:number;kind:string}|undefined,score=Infinity;
  for(const k of keys)for(const r of rows.filter(r=>r.key===k)){
    const c=closestColor(target,r.colors),s=colorDistance(c,target)+keys.indexOf(k)*4;
    if(s<score){score=s;best={id:r.id,color:c,kind:k}}
  }
  return best;
}

export function buildMinifig(spec:MinifigSpec):{parts:Stock[];look:MinifigLook;notes:string[]}{
  const head=closestColor(spec.skin,data.head.colors);
  // Torso: body color, sleeves and hands all matter; the body color counts most.
  let torso=data.torsos[0],torsoColor=torso.colors[0],best=Infinity;
  for(const t of data.torsos){const c=closestColor(spec.shirt,t.colors);const s=colorDistance(c,spec.shirt)+.7*colorDistance(t.arms,spec.shirt)+.5*colorDistance(t.hands,head);if(s<best){best=s;torso=t;torsoColor=c}}
  let legs=data.legs[0],hips=legs.colors[0];best=Infinity;
  for(const l of data.legs){const c=closestColor(spec.pants,l.colors);const s=colorDistance(l.legs,spec.pants)+.6*colorDistance(c,spec.pants);if(s<best){best=s;legs=l;hips=c}}
  const hat=spec.headwear!=='none'?pick(data.hats as Row[],HAT_FOR[spec.headwear],spec.hat):undefined;
  const hair=!hat&&spec.hairStyle!=='bald'?pick(data.hair as Row[],HAIR_FOR[spec.hairStyle]??HAIR_FOR.short,spec.hair):undefined;
  const neck=spec.neck?pick(data.neck as Row[],NECK_FOR[spec.neck],spec.neckColor??spec.shirt):undefined;
  const tool=spec.tool?pick(data.tools as Row[],TOOL_FOR[spec.tool],spec.toolColor??71):undefined;
  const short=!!spec.short&&data.shortLegs.colors.length>0;
  const shortColor=closestColor(spec.pants,data.shortLegs.colors);
  const name=(id:string)=>(data.names as Record<string,string>)[id];
  const parts:Stock[]=[
    {part:data.head.id,color:head,qty:1,name:data.head.name},
    {part:torso.id,color:torsoColor,qty:1,name:name(torso.id)},
    short?{part:data.shortLegs.id,color:shortColor,qty:1,name:data.shortLegs.name}:{part:legs.id,color:hips,qty:1,name:name(legs.id)},
  ];
  const rowName=(rows:Row[],id:string)=>rows.find(r=>r.id===id)?.name;
  if(hair)parts.push({part:hair.id,color:hair.color,qty:1,name:rowName(data.hair as Row[],hair.id)});
  if(hat)parts.push({part:hat.id,color:hat.color,qty:1,name:rowName(data.hats as Row[],hat.id)});
  if(neck)parts.push({part:neck.id,color:neck.color,qty:1,name:rowName(data.neck as Row[],neck.id)});
  if(tool)parts.push({part:tool.id,color:tool.color,qty:1,name:rowName(data.tools as Row[],tool.id)});
  const notes:string[]=[];
  const drift=(label:string,want:number,got:number)=>{if(colorDistance(want,got)>18)notes.push(`${label}: ${color(got).name} is the closest real match to ${color(want).name}.`)};
  drift('Torso',spec.shirt,torsoColor);drift('Legs',spec.pants,short?shortColor:legs.legs);drift('Head',spec.skin,head);
  if(hat)drift('Headwear',spec.hat,hat.color);if(hair)drift('Hair',spec.hair,hair.color);
  notes.push('Plain printed-free parts. Faces and torso prints are not included; add stickers or printed parts if you want them.');
  return{parts,notes,look:{head,hair:hair&&{...hair,style:spec.hairStyle},hat,torso:torsoColor,arms:torso.arms,hands:torso.hands,hips:short?shortColor:hips,legs:short?shortColor:legs.legs,neck,tool,short}};
}

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

/** Front-view illustration of the chosen minifigure, drawn in the exact real part colors. */
export function minifigSvg(look:MinifigLook,size=120){
  const h=(id:number)=>color(id).hex,W=100,H=160;const o:string[]=[];
  const dark=(hex:string)=>'#'+[1,3,5].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*.72).toString(16).padStart(2,'0')).join('');
  const shape=(d:string,fill:string)=>o.push(`<path d="${d}" fill="${fill}" stroke="${dark(fill)}" stroke-width="1.2" stroke-linejoin="round"/>`);
  if(look.neck?.kind==='cape')shape('M30 52 L70 52 L82 128 L18 128Z',h(look.neck.color));
  const legTop=look.short?112:100,legH=look.short?30:45;
  shape(`M26 ${legTop} h23 v${legH} h-23Z`,h(look.legs));shape(`M51 ${legTop} h23 v${legH} h-23Z`,h(look.legs));
  shape(`M25 92 h50 v${legTop-92} h-50Z`,h(look.hips));
  // Arms and hands.
  shape('M30 54 L22 56 L13 86 L21 89 L28 66Z',h(look.arms));shape('M70 54 L78 56 L87 86 L79 89 L72 66Z',h(look.arms));
  o.push(`<circle cx="16" cy="92" r="6" fill="${h(look.hands)}" stroke="${dark(h(look.hands))}" stroke-width="1.2"/><circle cx="84" cy="92" r="6" fill="${h(look.hands)}" stroke="${dark(h(look.hands))}" stroke-width="1.2"/>`);
  shape('M32 50 L68 50 L75 92 L25 92Z',h(look.torso));
  if(look.neck?.kind==='backpack'||look.neck?.kind==='airtanks')o.push(`<path d="M36 50 L40 92 M64 50 L60 92" stroke="${dark(h(look.neck.color))}" stroke-width="4"/>`);
  if(look.neck?.kind==='bandana'||look.neck?.kind==='ninja')shape('M34 48 h32 l-4 8 h-24Z',h(look.neck.color));
  // Head with stud, face.
  shape('M43 11 h14 v7 h-14Z',h(look.head));shape('M36 17 h28 a5 5 0 0 1 5 5 v22 a5 5 0 0 1 -5 5 h-28 a5 5 0 0 1 -5 -5 v-22 a5 5 0 0 1 5 -5Z',h(look.head));
  o.push('<circle cx="44" cy="30" r="2.4" fill="#1b1b1b"/><circle cx="56" cy="30" r="2.4" fill="#1b1b1b"/><path d="M43 38 Q50 44 57 38" stroke="#1b1b1b" stroke-width="2" fill="none" stroke-linecap="round"/>');
  if(look.neck?.kind==='beard')shape('M33 36 Q50 64 67 36 L67 44 Q50 70 33 44Z',h(look.neck.color));
  if(look.hair){const c=h(look.hair.color),long=['long','bob','bun','curly'].includes(look.hair.style);
    shape(long?'M29 34 Q27 8 50 8 Q73 8 71 34 L71 58 L64 58 L64 22 L36 22 L36 58 L29 58Z':'M30 30 Q28 8 50 8 Q72 8 70 30 L66 24 Q50 18 34 24Z',c);
    if(look.hair.style==='spiky')shape('M32 16 L36 2 L42 12 L50 0 L58 12 L64 2 L68 16Z',c);}
  if(look.hat){const c=h(look.hat.color),k=look.hat.kind;
    if(k==='wizard')shape('M24 22 L76 22 L60 16 L54 -8 L46 16Z',c);
    else if(k==='cowboy'||k==='tophat'||k==='pirate')shape(`M20 22 h60 v-5 h-12 v-${k==='tophat'?20:12} h-36 v${k==='tophat'?20:12} h-12Z`,c);
    else if(k==='chef')shape('M32 22 h36 v-8 q10 -6 2 -14 q-4 -8 -20 -4 q-16 -4 -20 4 q-8 8 2 14Z',c);
    else if(k==='crown')shape('M32 20 L32 6 L39 13 L45 3 L50 12 L55 3 L61 13 L68 6 L68 20Z',c);
    else if(k==='cap'||k==='police')shape('M30 24 Q30 6 50 6 Q70 6 70 24 L80 26 L80 29 L30 26Z',c);
    else shape('M28 34 Q26 6 50 6 Q74 6 72 34 L68 34 L68 22 L32 22 L32 34Z',c);}
  if(look.tool){const c=h(look.tool.color),k=look.tool.kind;
    if(k==='shield')shape('M4 70 h22 v20 q-11 14 -22 0Z',c);
    else if(k==='wand'||k==='staff')o.push(`<path d="M84 ${k==='staff'?40:74} L84 112" stroke="${c}" stroke-width="${k==='staff'?4:2.5}" stroke-linecap="round"/>`);
    else o.push(`<path d="M84 60 L84 104" stroke="${c}" stroke-width="4" stroke-linecap="round"/><path d="M78 88 h12" stroke="${dark(c)}" stroke-width="4"/>`);}
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -10 ${W+8} ${H+12}" width="${size}" height="${Math.round(size*(H+12)/(W+8))}" role="img" aria-label="Minifigure preview">${o.join('')}</svg>`;
}

/** Rebuilds the illustration inputs from a parts list (e.g. a saved model's extras). */
export function lookFromParts(parts:Stock[]):MinifigLook|null{
  const find=(test:(id:string)=>boolean)=>parts.find(p=>test(p.part));
  const head=find(id=>id.startsWith('3626')),torsoPart=find(id=>/^973c\d+h\d+$/.test(id)),legPart=find(id=>/^970c\d+$/.test(id)||id.startsWith('41879'));
  if(!head||!torsoPart||!legPart)return null;
  const torso=data.torsos.find(t=>t.id===torsoPart.part),legs=data.legs.find(l=>l.id===legPart.part),short=legPart.part.startsWith('41879');
  const inRows=(rows:Row[])=>{const p=parts.find(p=>rows.some(r=>r.id===p.part));return p?{id:p.part,color:p.color,kind:rows.find(r=>r.id===p.part)!.key}:undefined};
  const hair=inRows(data.hair as Row[]);
  return{head:head.color,torso:torsoPart.color,arms:torso?.arms??torsoPart.color,hands:torso?.hands??head.color,hips:legPart.color,legs:short?legPart.color:legs?.legs??legPart.color,short,
    hair:hair&&{id:hair.id,color:hair.color,style:['long','mid','wavy'].includes(hair.kind)?'long':hair.kind==='spiky'?'spiky':'short'},hat:inRows(data.hats as Row[]),neck:inRows(data.neck as Row[]),tool:inRows(data.tools as Row[])};
}
export const isMinifigPart=(id:string)=>/^3626|^973c|^970c|^41879/.test(id)||[...data.hair,...data.hats,...data.neck,...data.tools].some(r=>r.id===id);

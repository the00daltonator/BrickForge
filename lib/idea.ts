import {CharacterSpec,PRESETS,HairStyle,Headwear,Outfit,Accessory,Ears,normalizeSpec} from './character';
import {VehicleSpec,VEHICLE_PRESETS,normalizeVehicle} from './rigs';

// Offline idea interpreter: turns a short description into a character spec using a
// vocabulary of subjects, colors, clothing, hair and props. It never invents parts; the
// spec is built by the same deterministic character engine as the designer.
export type IdeaResult={kind:'character';spec:CharacterSpec;understood:string[]}|{kind:'vehicle';spec:VehicleSpec;understood:string[]}|{kind:'starter';starter:string;understood:string[]};
const VEHICLE=/\b(car|cars|truck|van|taxi|cab|pickup|hatchback|sedan|coupe|jeep|automobile)\b/;
const DELUXE=/\b(deluxe|fancy|luxury|premium|advanced|detailed)\b/;
function interpretVehicle(text:string):IdeaResult{
  const understood:string[]=[];const base=/\bpolice\b/.test(text)?'police':/\b(taxi|cab)\b/.test(text)?'taxi':/\b(race|racing|sports?)\b/.test(text)?'sports':DELUXE.test(text)?'deluxe':'basic';
  const spec=normalizeVehicle({...VEHICLE_PRESETS[base]});understood.push(VEHICLE_PRESETS[base].name.toLowerCase());
  const word=COLOR_WORDS.find(([re])=>re.test(text));if(word&&!/\b(taxi|police)\b/.test(text)){spec.body=word[1];understood.push(`${text.match(word[0])?.[0]??'custom'} body`)}
  if(/\b(opening doors?|doors? (that )?open|working doors?)\b/.test(text)&&spec.doors==='fixed')spec.doors='basic';
  if(DELUXE.test(text)){spec.doors='fancy';spec.hood=true;spec.trunk=true}
  if(/\b(hood|bonnet|engine)\b/.test(text)){spec.hood=true;understood.push('opening hood')}
  if(/\b(trunk|boot|tailgate)\b/.test(text)){spec.trunk=true;understood.push('opening trunk')}
  if(/\b(no (moving|opening)|fixed doors?|simple)\b/.test(text)){spec.doors='fixed';spec.hood=false;spec.trunk=false}
  if(/\bstripes?\b/.test(text))spec.stripe=true;
  understood.push(spec.doors==='fixed'?'fixed doors':spec.doors==='basic'?'doors on hinge plates':'doors on hinge bricks');
  const named=text.match(/\b(?:named|called)\s+([a-z][\w'-]{1,24})/);if(named)spec.name=named[1][0].toUpperCase()+named[1].slice(1);
  return{kind:'vehicle',spec,understood};
}

const COLOR_WORDS:[RegExp,number][]=[
  [/\bdark ?red|maroon|burgundy|crimson\b/,320],[/\bred\b/,4],[/\bdark ?orange|rust\b/,484],[/\borange|ginger\b/,25],
  [/\bgold(en)?\b/,297],[/\bblond(e)?|light yellow|pale yellow\b/,191],[/\byellow\b/,14],[/\bdark ?tan|khaki|olive\b/,28],[/\btan|beige|sand\b/,19],
  [/\bdark ?brown|chocolate\b/,308],[/\bbrown|brunette|wood(en)?\b/,70],
  [/\bnavy|dark ?blue\b/,272],[/\bsky ?blue|light ?blue|baby blue\b/,212],[/\bazure|cyan\b/,321],[/\bmedium blue\b/,73],[/\bblue|denim\b/,1],
  [/\bteal|turquoise\b/,3],[/\bdark ?green|forest green\b/,288],[/\blime\b/,27],[/\bbright green|neon green\b/,10],[/\bsage|mint\b/,378],[/\bgreen\b/,2],
  [/\blavender|lilac\b/,30],[/\bdark ?purple|violet|indigo\b/,85],[/\bpurple\b/,22],[/\bmagenta\b/,26],[/\bhot pink|dark pink\b/,5],[/\bpink\b/,13],
  [/\bwhite|snow(y)?\b/,15],[/\bblack|jet\b/,0],[/\bdark ?gr[ae]y|charcoal|dark silver\b/,72],[/\bsilver|gr[ae]y|metal(lic)?|steel\b/,71],
];
const SKIN_WORDS:[RegExp,number][]=[[/\b(dark|deep|brown|black) skin(ned)?\b/,308],[/\b(tan|olive|medium) skin(ned)?\b/,84],[/\b(light|fair|pale) skin(ned)?\b/,78],[/\bclassic yellow|lego yellow|yellow skin\b/,14]];
const SUBJECTS:[RegExp,string][]=[
  [/\bastronaut|spaceman|cosmonaut\b/,'astronaut'],[/\bknight|paladin\b/,'knight'],[/\bwizard|sorcerer|mage|merlin\b/,'wizard'],[/\bwitch\b/,'witch'],
  [/\bpirate|captain\b/,'pirate'],[/\bninja|samurai\b/,'ninja'],[/\bprincess|queen\b/,'princess'],[/\bking|emperor|prince\b/,'king'],
  [/\bfire ?fighter|fireman\b/,'firefighter'],[/\bpolice|cop|officer|detective\b/,'police'],[/\bbuilder|construction|engineer|worker\b/,'builder'],
  [/\bchef|cook|baker\b/,'chef'],[/\bscientist|doctor|professor|inventor\b/,'scientist'],[/\bcowboy|cowgirl|sheriff|ranger\b/,'cowboy'],
  [/\bsuper ?hero|hero with a cape\b/,'superhero'],[/\brock ?star|guitarist|musician|singer\b/,'rockstar'],[/\bviking|warrior|barbarian\b/,'viking'],
  [/\bexplorer|adventurer|hiker|archaeologist\b/,'explorer'],[/\bzombie|monster\b/,'zombie'],[/\brobot|android|droid|cyborg|mech\b/,'robot'],[/\balien|martian\b/,'alien'],
  [/\bkitten|kitty|cat\b/,'cat'],[/\bfox\b/,'fox'],[/\bpuppy|dog\b/,'dog'],[/\bpanda\b/,'panda'],[/\bteddy|bear\b/,'bear'],[/\bbunny|rabbit|hare\b/,'bunny'],
  [/\bmouse|rat|hamster\b/,'mouse'],[/\bpenguin\b/,'penguin'],[/\bfrog|toad\b/,'frog'],[/\bowl|bird\b/,'owl'],
];
const STARTERS:[RegExp,string][]=[[/\brocket|spaceship|space ship\b/,'Rocket'],[/\bcastle|fortress|tower\b/,'Castle'],[/\bdinosaur|dino|t-?rex|dragon\b/,'Dinosaur']];
const HAIR:[RegExp,HairStyle][]=[[/\bbald|no hair\b/,'bald'],[/\bponytail|bun\b/,'bun'],[/\bspiky|spikey|punk\b/,'spiky'],[/\bcurly|afro|curls\b/,'curly'],[/\bmohawk\b/,'mohawk'],[/\bbob\b/,'bob'],[/\blong hair|long (\w+ )?hair|braid/,'long'],[/\bshort hair\b/,'short']];
const HATS:[RegExp,Headwear][]=[[/\bcrown|tiara\b/,'crown'],[/\bwizard hat|pointy hat\b/,'wizard'],[/\bwitch hat\b/,'witch'],[/\btop hat\b/,'tophat'],[/\bcowboy hat\b/,'cowboy'],[/\bchef hat\b/,'chef'],[/\bhard ?hat\b/,'hardhat'],[/\bhelmet\b/,'knight'],[/\b(baseball )?cap\b/,'cap'],[/\bpirate hat|tricorn\b/,'pirate'],[/\bbow\b/,'bow'],[/\bantenna\b/,'antenna']];
const OUTFIT:[RegExp,Outfit][]=[[/\bdress|gown|skirt\b/,'dress'],[/\brobe|cloak\b/,'robe'],[/\bstripe(d|s)?\b/,'stripe'],[/\bjacket|coat|hoodie|lab coat\b/,'jacket'],[/\bsuit|tie|tuxedo\b/,'suit'],[/\boveralls|dungarees\b/,'overalls'],[/\blogo|emblem|badge\b/,'emblem']];
const PROPS:[RegExp,Accessory][]=[[/\bsword|blade|katana\b/,'sword'],[/\bstaff|cane|spear\b/,'staff'],[/\bwand\b/,'wand'],[/\bshield\b/,'shield'],[/\bbackpack|rucksack|jetpack\b/,'backpack'],[/\bguitar\b/,'guitar']];
const EAR_WORDS:[RegExp,Ears][]=[[/\bcat ears\b/,'cat'],[/\bbunny ears|rabbit ears\b/,'bunny'],[/\bbear ears\b/,'bear'],[/\bfox ears\b/,'fox'],[/\bmouse ears\b/,'mouse']];
// Garment nouns → which spec field a color before them should set.
const TARGETS:[RegExp,keyof CharacterSpec][]=[
  [/hair|beard|mustache|fur/,'hair'],[/hat|cap|helmet|crown|hood|mask|bandana/,'hat'],[/eyes?/,'eyes'],
  [/shirt|top|jacket|coat|hoodie|robe|dress|gown|sweater|armou?r|suit|uniform|tunic|cloak|body|outfit|clothes/,'shirt'],
  [/pants|trousers|jeans|legs|shorts|skirt/,'pants'],[/shoes|boots|sneakers|feet/,'shoes'],[/cape|scarf|belt|stripe|stripes|logo|emblem|trim|tie|backpack|shield/,'accent'],
  [/base|ground|stand|grass/,'base'],[/skin|face/,'skin'],
];
const HAT_COLORS:Partial<Record<Headwear,number>>={crown:297,wizard:85,witch:0,tophat:0,cowboy:70,chef:15,hardhat:14,firefighter:4,police:272,cap:4,knight:71,space:15,pirate:0,viking:71,ninja:0,bow:13,antenna:4};
const firstMatch=<T,>(text:string,list:[RegExp,T][])=>list.find(([re])=>re.test(text))?.[1];
const colorIn=(s:string)=>firstMatch(s,COLOR_WORDS);

export function interpretIdea(input:string):IdeaResult{
  const text=` ${input.toLowerCase().replace(/[^a-z0-9' -]+/g,' ').replace(/\s+/g,' ')} `;
  const understood:string[]=[];
  if(VEHICLE.test(text))return interpretVehicle(text);
  const subject=firstMatch(text,SUBJECTS);
  if(!subject){const starter=firstMatch(text,STARTERS);if(starter)return{kind:'starter',starter,understood:[`${starter.toLowerCase()} starter build`]};}
  const spec:CharacterSpec=normalizeSpec({...PRESETS[subject??'hero']});
  understood.push(subject?PRESETS[subject].name.toLowerCase():'a character');
  // "<color> <garment>" pairs, e.g. "purple robe", "long white beard", "red and white striped shirt".
  const pair=/\b(?:(?:long|short|big|little|flowing|shiny|messy|curly|spiky|fluffy|bushy|tiny|cool|fancy|a|an|the|with) )?((?:(?:dark|light|bright|medium|hot|sky|baby|forest|pale|neon|navy) )?[a-z]+)(?: and ((?:(?:dark|light|bright|medium|hot|sky|baby|forest|pale|neon|navy) )?[a-z]+))? (?:(?:striped|long|short|big|little|flowing|shiny|messy|curly|spiky|fluffy|bushy|leather|denim|fancy|pointy|pointed|tall|round|magic|puffy|lab) )?(hair|beard|mustache|fur|hat|cap|helmet|crown|hood|mask|bandana|eyes|shirt|top|jacket|coat|hoodie|robe|dress|gown|sweater|armou?r|suit|uniform|tunic|cloak|body|outfit|clothes|pants|trousers|jeans|legs|shorts|skirt|shoes|boots|sneakers|feet|cape|scarf|belt|stripes?|logo|emblem|trim|tie|backpack|shield|base|ground|stand|grass|skin|face)\b/g;
  for(const m of text.matchAll(pair)){
    const c=colorIn(` ${m[1]} `)??(m[2]?colorIn(` ${m[2]} `):undefined);if(c===undefined)continue;const garment=m[3];
    const field=TARGETS.find(([re])=>re.test(garment))?.[1];if(!field)continue;
    (spec as Record<string,unknown>)[field]=c;understood.push(`${colorIn(` ${m[1]} `)!==undefined?m[1]:m[2]} ${garment}`);
    if(field==='hair'&&/beard|mustache/.test(garment))spec.beard=true;
    if(field==='shirt'&&/robe|cloak/.test(garment))spec.outfit='robe';
    if(field==='shirt'&&/dress|gown/.test(garment))spec.outfit='dress';
    if(field==='accent'&&/cape/.test(garment))spec.cape=true;
    if(field==='accent'&&/stripe/.test(garment))spec.outfit='stripe';
    if(field==='hair'&&/fur/.test(garment)){spec.skin=c;spec.hair=c}
  }
  // A lone color with an animal ("an orange cat") sets the fur.
  if(spec.kind==='animal'&&!understood.some(u=>/fur/.test(u))){const c=colorIn(text);if(c!==undefined){spec.skin=c;spec.hair=c;spec.shirt=c;spec.pants=c;understood.push(`${Object.entries({c}).length&&''}fur color`)}}
  const skin=firstMatch(text,SKIN_WORDS);if(skin!==undefined&&spec.kind==='person'){spec.skin=skin;understood.push('skin tone')}
  const hair=firstMatch(text,HAIR);if(hair&&spec.kind==='person'){spec.hairStyle=hair;understood.push(`${hair} hair`)}
  // Generic words ("helmet", "cap") keep a subject's own headwear; specific hats replace it.
  const hat=firstMatch(text,HATS),generic=hat==='knight'||hat==='cap';
  if(hat&&!(generic&&spec.headwear!=='none')){const colored=understood.some(u=>/(hat|cap|helmet|crown|hood|mask|bandana)$/.test(u));spec.headwear=hat;if(!colored)spec.hat=HAT_COLORS[hat]??spec.hat;understood.push(hat==='knight'?'helmet':hat)}
  const outfit=firstMatch(text,OUTFIT);if(outfit&&spec.kind!=='animal'){spec.outfit=outfit;understood.push(outfit)}
  const prop=firstMatch(text,PROPS);if(prop){spec.accessory=prop;understood.push(prop)}
  const ears=firstMatch(text,EAR_WORDS);if(ears){spec.ears=ears;understood.push(`${ears} ears`)}
  if(/\bcape\b/.test(text)&&!/\bno cape\b/.test(text)){spec.cape=true;if(!understood.includes('cape'))understood.push('cape')}
  if(/\bbeard|bearded|mustache\b/.test(text)&&spec.kind==='person'){spec.beard=true;if(!understood.some(u=>/beard/.test(u)))understood.push('beard')}
  if(/\bglasses|goggles|spectacles|sunglasses\b/.test(text)){spec.glasses=true;understood.push('glasses')}
  if(/\bno beard|clean ?shaven\b/.test(text))spec.beard=false;
  if(/\bno hat\b/.test(text))spec.headwear='none';
  if(/\btail\b/.test(text)){spec.tail=true}
  if(/\b(ball[- ]joints?|deluxe|super[- ]?posable|fully posable)\b/.test(text)){spec.rig='fancy';understood.push('ball joints')}
  else if(/\b(posable|poseable|movable|moveable|moving (arms|legs|parts)|articulated|action figure|joints?|bendy)\b/.test(text)){spec.rig='basic';understood.push('posable joints')}
  const named=input.match(/\b(?:named|called)\s+([A-Z][\w'-]{1,24})/);
  spec.name=named?named[1]:subject?PRESETS[subject].name:'My character';
  return{kind:'character',spec:normalizeSpec(spec),understood:understood.filter(Boolean)};
}

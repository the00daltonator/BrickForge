// Builds lib/minifig-data.json from the bundled Rebrickable snapshot in public/catalog.
// Every minifigure part and color written here is a real catalog record observed in at
// least one set inventory. Run after refreshing the catalog:
//   node scripts/build-minifig-data.mjs
import {readFileSync,writeFileSync,existsSync} from 'node:fs';

const root=new URL('../',import.meta.url);
const read=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
const parts=read('public/catalog/parts.json');
const colors=read('public/catalog/colors.json');
const byId=new Map(parts.map(p=>[p[0],p]));
const colorByName=new Map(colors.map(c=>[c.name.toLowerCase().replace(/grey/g,'gray'),c.id]));
const colorCache=new Map();
function observed(id){
  const p=byId.get(id);if(!p)return [];
  const file=`public/catalog/part-colors-${p[2]}.json`;
  if(!colorCache.has(file))colorCache.set(file,existsSync(new URL(file,root))?read(file):{});
  return colorCache.get(file)[id]||[];
}
const named=s=>colorByName.get(s.toLowerCase().replace(/grey/g,'gray'));

// Plain torso assemblies: "Torso, <Arm color> Arms, <Hand color> Hands" / "<Color> Arms and Hands".
const torsos=[];
for(const p of parts){
  if(!/^973c\d+h\d+$/.test(p[0]))continue;
  const name=p[1].replace(/^Torso,\s*/,'').replace(/\s*\[plain\]\s*/i,'');
  let m=name.match(/^(.+?) Arms and Hands$/i),arms,hands;
  if(m){arms=hands=named(m[1]);}else if((m=name.match(/^(.+?) Arms?, (.+?) Hands?$/i))){arms=named(m[1]);hands=named(m[2]);}
  const cs=observed(p[0]);
  if(arms!==undefined&&hands!==undefined&&cs.length)torsos.push({id:p[0],arms,hands,colors:cs});
}
// Plain hips-and-legs assemblies: "Hips and <Color> Legs"; the part color is the hip color.
const legs=[];
for(const p of parts){
  if(!/^970c\d+$/.test(p[0]))continue;
  const m=p[1].match(/^Hips and (.+?) Legs$/i);const leg=m&&named(m[1]);const cs=observed(p[0]);
  if(leg!==undefined&&leg!==null&&cs.length)legs.push({id:p[0],legs:leg,colors:cs});
}
const curated=(list)=>list.map(([id,key])=>({id,key,name:byId.get(id)?.[1],colors:observed(id)})).filter(r=>r.name&&r.colors.length);
const hair=curated([
  ['3901','short'],['62810','tousled'],['98385','spiky'],['92081','combed'],['11256','wavy'],['40251','mid'],
  ['85974','long'],['62696','ponytail'],['87990','ponytail'],['59363','braid'],['24072','mullet'],['12890','long'],['2632','curly'],['1685','curly'],
]);
const hats=curated([
  ['3624','police'],['3834','firefighter'],['3844','knight'],['2446','helmet'],['49663','astronaut'],['4485','cap'],['3833','builder'],
  ['3629','cowboy'],['95674','bowler'],['3878','tophat'],['6131','wizard'],['90460','wizard'],['2544','pirate'],['2528','pirate'],
  ['3898','chef'],['18165','crown'],['10909','viking'],['10301','bat'],
]);
const neck=curated([['6132','beard'],['4524','cape'],['2524','backpack'],['3838','airtanks'],['30133','bandana'],['15619','ninja']]);
const tools=curated([
  ['6124','wand'],['3846','shield'],['60752','sword'],['98370','sword'],['37','dagger'],['2561','musket'],['3899','mug'],['90370','microphone'],
  ['88704','whip'],['60849','hose'],['11640','guitar'],['30089b','camera'],['2665b','staff'],['2531','hook'],
]);
const head={id:'3626c',name:byId.get('3626c')[1],colors:observed('3626c')};
// Short legs for children and small characters.
const shortLegs={id:'41879a',name:byId.get('41879a')?.[1]||'Legs Short',colors:observed('41879a')};
const names=Object.fromEntries([...torsos,...legs].map(r=>[r.id,byId.get(r.id)[1]]));
const out={source:'Rebrickable snapshot in public/catalog',head,shortLegs,torsos,legs,hair,hats,neck,tools,names};
writeFileSync(new URL('lib/minifig-data.json',root),JSON.stringify(out));
console.log(`torsos ${torsos.length}, legs ${legs.length}, hair ${hair.length}, hats ${hats.length}, neck ${neck.length}, tools ${tools.length}`);

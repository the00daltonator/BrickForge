import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PRESETS,characterModel,characterVoxels,normalizeSpec} from '../lib/character';
import {interpretIdea} from '../lib/idea';
import {buildMinifig,lookFromParts,minifigSvg} from '../lib/minifig';
import {subjectMask,characterColors,figureVoxels,mosaicVoxels,plateColors,Pixels} from '../lib/photo';
import {checks,observedColor,packMixed,pack,bom,mergeStock,subtractStock,COLORS,color,validateModel,Stock} from '../lib/brick-engine';
import {interlockModel} from '../lib/build-planner';
import {instructions,buildSteps,boxArtSvg,csv,xml,parseStock,inventoryCsv,inventoryXml} from '../lib/exports';
import {deltaE} from '../lib/color';

// Catalog ground truth for "real parts" assertions.
const parts=new Map((JSON.parse(readFileSync('public/catalog/parts.json','utf8')) as [string,string,number,string][]).map(p=>[p[0],p]));
const observedIn=(id:string,c:number)=>{const p=parts.get(id);if(!p)return false;const d=JSON.parse(readFileSync(`public/catalog/part-colors-${p[2]}.json`,'utf8')) as Record<string,number[]>;return (d[id]||[]).includes(c)};

// Every preset builds a single connected, supported, collision-free figure from real part/color combinations.
let supports=0;
for(const [key,spec] of Object.entries(PRESETS)){
  const m=characterModel(spec),c=checks(m.bricks);
  assert(c.passed,`${key} passes connection checks`);assert.equal(c.overlaps,0,key);
  supports+=m.bricks.filter(b=>b.id.startsWith('support')||b.id.startsWith('raft')).length;
  for(const b of m.bricks)assert(observedColor(b.part,b.color)||b.part==='3024',`${key}: ${b.part} in color ${b.color} is a real catalog combination`);
  for(const e of m.extras||[]){assert(parts.has(e.part),`${key}: minifig part ${e.part} exists`);assert(observedIn(e.part,e.color),`${key}: ${e.part} observed in ${color(e.color).name}`)}
  if(spec.minifig&&spec.kind!=='animal')assert(m.extras?.some(e=>e.part.startsWith('973c'))&&m.extras.some(e=>e.part.startsWith('3626')),`${key} includes torso and head`);
}
assert(supports<=10,`overhang-aware packing keeps support columns rare (got ${supports})`);
// Packing alone (before repair) leaves almost nothing floating.
let floating=0;for(const spec of Object.values(PRESETS))floating+=checks(packMixed(characterVoxels(normalizeSpec(spec)),'t','t').bricks).unsupported.length;
assert(floating<=4,`packMixed leaves ${floating} floating pieces across all presets`);
console.log(`PASS: ${Object.keys(PRESETS).length} character presets are connected, supported and use real part colors; ${supports} support pieces in total.`);

// Minifigure: nearest real assemblies, and the illustration can be rebuilt from the parts list.
const fig=buildMinifig({skin:78,hair:70,hairStyle:'short',headwear:'wizard',hat:85,shirt:85,pants:85,neck:'beard',neckColor:15,tool:'wand'});
assert(fig.parts.some(p=>p.part==='6131'||p.part==='90460'),'wizard hat chosen');assert(!fig.parts.some(p=>p.part==='3901'),'hat replaces hair');
const look=lookFromParts(fig.parts);assert(look&&look.torso===fig.look.torso&&look.hat?.kind==='wizard');assert(minifigSvg(look!).startsWith('<svg'));
console.log('PASS: minifigure assemblies, headwear/hair rules, illustration round trip.');

// Offline idea interpretation.
const wiz=interpretIdea('A wizard with a purple robe and a long white beard holding a staff');
assert(wiz.kind==='character'&&wiz.spec.headwear==='wizard'&&wiz.spec.shirt===22&&wiz.spec.hair===15&&wiz.spec.beard&&wiz.spec.accessory==='staff'&&wiz.spec.outfit==='robe');
const cat=interpretIdea('an orange cat');assert(cat.kind==='character'&&cat.spec.kind==='animal'&&cat.spec.skin===25);
const fire=interpretIdea('a firefighter with a red helmet');assert(fire.kind==='character'&&fire.spec.headwear==='firefighter','generic helmet keeps the subject headwear');
const punk=interpretIdea('guy with spiky green hair, sunglasses and black leather jacket');assert(punk.kind==='character'&&punk.spec.hair===2&&punk.spec.hairStyle==='spiky'&&punk.spec.shirt===0&&punk.spec.glasses);
const named=interpretIdea('Pirate captain named Redbeard with a black hat and red coat');assert(named.kind==='character'&&named.spec.name==='Redbeard'&&named.spec.shirt===4&&named.spec.hat===0);
assert.deepEqual(interpretIdea('a rocket to the moon'),{kind:'starter',starter:'Rocket',understood:['rocket starter build']});
console.log('PASS: offline idea interpreter (subjects, color/garment pairs, props, names, starters).');

// Photo processing on a synthetic full-body picture on a light gradient wall.
const w=120,h=240,data=new Uint8ClampedArray(w*h*4);
const put=(x:number,y:number,c:number[])=>{const i=(y*w+x)*4;data[i]=c[0];data[i+1]=c[1];data[i+2]=c[2];data[i+3]=255};
for(let y=0;y<h;y++)for(let x=0;x<w;x++)put(x,y,[235-y/12,238-y/12,240-y/14]);
const rect=(x0:number,y0:number,x1:number,y1:number,c:number[])=>{for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)put(x,y,c)};
const ell=(cx:number,cy:number,rx:number,ry:number,c:number[])=>{for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(((x-cx)/rx)**2+((y-cy)/ry)**2<=1)put(x,y,c)};
ell(60,40,22,26,[241,199,163]);ell(60,20,23,12,[90,50,20]);rect(38,10,82,24,[90,50,20]);
rect(36,66,84,130,[200,30,30]);rect(20,70,36,120,[200,30,30]);rect(84,70,100,120,[200,30,30]);
rect(40,130,58,222,[20,40,110]);rect(62,130,80,222,[20,40,110]);rect(38,222,60,236,[20,20,20]);rect(60,222,82,236,[20,20,20]);
const photo:Pixels={w,h,data},mask=subjectMask(photo);
assert(mask.removed&&mask.box.x===20&&mask.box.w===80&&mask.box.y<=10,'background removed around the figure');
const cc=characterColors(photo,mask);
assert.equal(cc.skin,78);assert.equal(cc.hair,70);assert.equal(cc.shirt,4);assert.equal(cc.shoes,0);assert([272,1,85].includes(cc.pants));
for(const mode of ['sculpture','standee'] as const){const m=interlockModel(packMixed(figureVoxels(photo,mask,16,mode),'photo','t'));assert(checks(m.bricks).passed,mode)}
const mosaic=pack(mosaicVoxels(photo,mask,24,{dither:true}),'mosaic','t',true);const real=new Set(plateColors());assert(mosaic.bricks.every(b=>real.has(b.color)||b.color===71),'mosaic uses real 1 × 1 plate colors');
console.log('PASS: background removal, outfit colors, photo sculptures/standees and real-color mosaics.');

// CIEDE2000 reference pair (Sharma et al. 2005, pair 1).
assert(Math.abs(deltaE([50,2.6772,-79.7751],[50,0,-82.7485])-2.0425)<1e-3);

// Set packaging and booklet.
const wizard=characterModel(PRESETS.wizard),html=instructions({...wizard,name:'<b>Wiz</b>'},[]);
assert(html.includes('BRICKFORGE')&&html.includes('Minifigure')&&html.includes('Parts in this set')&&!html.includes('<b>Wiz</b>')&&html.includes('&lt;b&gt;Wiz&lt;/b&gt;'));
assert.equal((html.match(/class="step"/g)||[]).length,buildSteps(wizard).length);
assert(buildSteps(wizard).every(s=>s.bricks.length<=10));
assert(boxArtSvg(wizard).includes('includes minifigure'));
assert(csv(wizard,[]).includes('973c')&&xml(wizard,[]).includes('<ITEMID>3626c</ITEMID>'),'loose minifig parts appear in CSV and BrickLink XML');
assert.equal(bom(wizard.bricks,[],wizard.extras).reduce((n,r)=>n+r.qty,0),wizard.bricks.length+wizard.extras!.length);
assert.deepEqual(validateModel(JSON.parse(JSON.stringify(wizard))).extras,wizard.extras,'extras survive project save/load');
console.log('PASS: box art, step booklet with part callouts, minifig page, exports include minifigure parts.');

// Inventory management.
const a:Stock[]=[{part:'3001',color:4,qty:5,location:'Drawer A3'}],merged=mergeStock(a,[{part:'3001',color:4,qty:2}]);
assert.deepEqual(merged,[{part:'3001',color:4,qty:7,location:'Drawer A3'}],'merging keeps storage bins');
assert.deepEqual(subtractStock(merged,[{part:'3001',color:4,qty:3},{part:'3003',color:1,qty:9}]),[{part:'3001',color:4,qty:4,location:'Drawer A3'}]);
assert.deepEqual(subtractStock(merged,[{part:'3001',color:4,qty:99}]),[],'never below zero');
assert.deepEqual(parseStock(inventoryCsv(merged),'csv').stock,merged,'CSV round trip keeps bins');
const inv=inventoryXml([...merged,{part:'3003',color:COLORS.find(c=>c.bl<0)!.id,qty:1}]);assert.equal(inv.skipped,1);assert(inv.xml.includes('<ITEMID>3001</ITEMID><COLOR>5</COLOR><QTY>7</QTY><REMARKS>Drawer A3</REMARKS>'),'BrickLink XML keeps quantities, BrickLink colors and bins');
console.log('PASS: storage bins, merge/subtract, inventory CSV and BrickLink XML round trips.');

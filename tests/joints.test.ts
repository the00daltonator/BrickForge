import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PRESETS} from '../lib/character';
import {posableCharacter,vehicleModel,VEHICLE_PRESETS,buildCharacter} from '../lib/rigs';
import {checks,validateModel,bom,observedColor,partName,Model} from '../lib/brick-engine';
import {groupTransforms,applyXf,jointRanges,animatedPose,applyPreset,jointIssues,withoutJoints} from '../lib/joints';
import {ldraw,instructions,buildSteps,csv} from '../lib/exports';
import {planBuild} from '../lib/build-planner';
import {interpretIdea} from '../lib/idea';

const catalog=new Set((JSON.parse(readFileSync('public/catalog/parts.json','utf8')) as [string][]).map(p=>p[0]));
const range=(m:Model,id:string,axis=0)=>{const j=m.joints!.find(j=>j.id===id)!;return j.limits[axis][1]-j.limits[axis][0]};

// Every character works as a basic (pins) and deluxe (ball joints) posable figure.
for(const rig of ['basic','fancy'] as const)for(const [key,spec] of Object.entries(PRESETS)){
  const m=posableCharacter({...spec,rig}),c=checks(m.bricks,m.joints),long=spec.outfit==='robe'||spec.outfit==='dress';
  assert(c.passed,`${key}/${rig} passes joint-aware checks`);assert.equal(c.locked.length,0,`${key}/${rig} has no joint locked by studs`);
  assert.deepEqual(jointIssues(m,c.locked),[]);
  for(const b of m.bricks)assert(observedColor(b.part,b.color)||b.part==='3024',`${key}/${rig}: ${b.part} in ${b.color} is a real combination`);
  for(const j of m.joints!){assert(catalog.has(m.bricks.find(b=>b.id===j.parentBrick)!.part));for(const h of j.hardware??[])assert(catalog.has(h.part))}
  if(!long){assert(range(m,'hip-r')>=60&&range(m,'hip-l')>=60,`${key}/${rig} legs swing`)}
  assert(range(m,'shoulder-r')>=120&&range(m,'shoulder-l')>=120,`${key}/${rig} arms swing`);
  assert(range(m,'neck')>=240,`${key}/${rig} head turns`);
  if(rig==='fancy'){assert(m.joints!.some(j=>j.kind==='ball')===!long||long);assert(m.joints!.some(j=>j.id==='waist'))}
  else if(!long)assert.equal(m.bricks.filter(b=>b.part==='3700').length,8,'four Technic pin joints use eight pin bricks');
}
console.log(`PASS: ${Object.keys(PRESETS).length*2} posable characters are connected, unlocked and move through useful ranges.`);

// Vehicles: every door, hood and trunk opens; wheels roll; basic and deluxe hinge parts differ.
for(const [key,spec] of Object.entries(VEHICLE_PRESETS)){
  const m=vehicleModel(spec);assert(checks(m.bricks,m.joints).passed,key);
  assert.equal(m.joints!.filter(j=>j.kind==='axle').length,4);
  for(const j of m.joints!.filter(j=>j.kind==='hinge'))assert(range(m,j.id)>=70,`${key}: ${j.label} opens`);
  const parts=new Set(m.bricks.map(b=>b.part));
  if(spec.doors==='basic')assert(parts.has('2429')&&parts.has('2430'));if(spec.doors==='fancy')assert(parts.has('3831')&&parts.has('3830'));
  if(spec.hood)assert(parts.has('3937')&&parts.has('3938'));
  const loose=bom([],[],m.extras);assert.equal(loose.find(r=>r.part==='4624')!.qty,4);assert.equal(loose.find(r=>r.part==='3641')!.qty,4);
}
const fixedCar=vehicleModel({...VEHICLE_PRESETS.basic,doors:'fixed'});assert.equal(fixedCar.joints!.filter(j=>j.kind!=='axle').length,0);assert(checks(fixedCar.bricks,fixedCar.joints).passed);
console.log('PASS: cars with basic/deluxe doors, opening hood and trunk, and four rolling wheels.');

// Transforms: a quarter turn about Y at the origin maps +Z to +X; children follow parents.
const car=vehicleModel(VEHICLE_PRESETS.deluxe),door=car.joints!.find(j=>j.id==='door-r')!;
const t=groupTransforms(car.joints,{[door.id]:[-60]}).get('door-r')!;const p=applyXf(t,[door.pivot[0],door.pivot[1],door.pivot[2]+2]);
assert(Math.abs(p[0]-(door.pivot[0]-2*Math.sin(Math.PI/3)))<1e-9&&Math.abs(p[2]-(door.pivot[2]+1))<1e-9&&Math.abs(p[1]-door.pivot[1])<1e-9,'door swings outward about its hinge');
const clamped=applyXf(groupTransforms(car.joints,{[door.id]:[-400]}).get('door-r')!,[door.pivot[0],door.pivot[1],door.pivot[2]+2]);assert(clamped[0]>door.pivot[0]-2,'poses are clamped to the joint range');
const hero=posableCharacter({...PRESETS.hero,rig:'fancy'});const tw=groupTransforms(hero.joints,{waist:[90]});
assert(tw.get('head')&&tw.get('arm-r')&&Math.abs(tw.get('head')!.m[2]-tw.get('torso')!.m[2])<1e-9,'head and arms turn with the waist');
// Poses and animations stay inside each joint's range.
const r=jointRanges(hero);for(const k of ['walk','wave','dance']){for(let s=0;s<3;s+=.37){const pose=animatedPose(hero.joints!,r,k,s);for(const j of hero.joints!)pose[j.id].forEach((v,i)=>assert(v>=r[j.id][i][0]-1e-9&&v<=r[j.id][i][1]+1e-9,`${k} ${j.id}`))}}
const wave=applyPreset(hero.joints!,r,'wave');assert(wave['shoulder-r'][0]>90,'wave raises the arm');
console.log('PASS: rigid transforms, nested sections, presets and animations within limits.');

// Saving, CAD export and instructions.
const posed={...hero,pose:wave},loaded=validateModel(JSON.parse(JSON.stringify(posed)));
assert.deepEqual(loaded.joints,hero.joints);assert.deepEqual(loaded.pose,wave);assert(loaded.bricks.every(b=>b.group));
const rest=ldraw(hero).split('\r\n').filter(l=>l.startsWith('1 ')),moved=ldraw(posed).split('\r\n').filter(l=>l.startsWith('1 '));
assert.equal(rest.length,hero.bricks.length);assert.equal(moved.length,rest.length);assert.notDeepEqual(moved,rest);
for(const l of moved){const n=l.split(' ').slice(5,14).map(Number),rows=[0,3,6].map(i=>n.slice(i,i+3));for(const row of rows)assert(Math.abs(Math.hypot(...row)-1)<1e-3,'CAD rotation rows are unit length')}
const steps=buildSteps(hero);assert.equal(steps.flatMap(s=>s.bricks).length,hero.bricks.length,'every brick appears in exactly one step');
assert.equal(steps.filter(s=>s.joint).length,hero.joints!.length,'one attach step per joint');
const basic=posableCharacter({...PRESETS.hero,rig:'basic'}),guide=instructions(basic,[]);
assert(guide.includes('Attach: Right hip')&&guide.includes('Moving parts')&&guide.includes('Push the Technic pin'));
assert(csv(basic,[]).includes('2780'),'friction pins are in the parts list');assert.equal(partName('2780'),'Technic Pin with Friction Ridges Lengthwise and Center Slots');
assert(instructions(car,[]).includes('Attach: Front right wheel'));
console.log('PASS: jointed projects save and reload, posed LDraw export, sub-assembly steps with attach steps and hardware.');

// Inventory fitting makes a static copy; statues are unchanged; ideas pick the right build.
const everything=bom(basic.bricks,[],basic.extras).map(({part,color,qty})=>({part,color,qty}));
const asDesigned=planBuild(basic,everything,{mode:'owned',swap:true,budget:0});assert(asDesigned.length===1&&asDesigned[0].model.joints?.length,'owning every part keeps the joints');
assert.throws(()=>planBuild(basic,everything.slice(0,3),{mode:'owned',swap:true,budget:0}),/moving build/,'a partial inventory explains why');
const statue=planBuild(car,bom(car.bricks).map(({part,color,qty})=>({part,color,qty:qty*2})).filter(s=>!['4600','2429','2430','3831','3830','3937','3938'].includes(s.part)),{mode:'owned',swap:true,budget:0});
assert(statue.every(v=>!v.model.joints&&v.model.notes.some(n=>n.includes('joints were removed'))),'otherwise a static copy is fitted');
assert(!withoutJoints(basic).bricks.some(b=>b.group));assert(!buildCharacter(PRESETS.hero).joints);
const idea=interpretIdea('a posable knight');assert(idea.kind==='character'&&idea.spec.rig==='basic');
const idea2=interpretIdea('deluxe red car');assert(idea2.kind==='vehicle'&&idea2.spec.doors==='fancy'&&idea2.spec.hood&&idea2.spec.body===4);
console.log('PASS: inventory fitting keeps a static copy, statues unchanged, ideas choose posable figures and cars.');

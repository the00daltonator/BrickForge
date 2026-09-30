import assert from 'node:assert/strict';
import {recipe,checks,modelChecks,validateModel,bom,observedColor,Model} from '../lib/brick-engine';
import {interlockModel,withSupportRule,weaveBase} from '../lib/build-planner';
import {buildSteps,instructions,ldraw} from '../lib/exports';
import {PRESETS} from '../lib/character';
import {buildCharacter,minifigModel} from '../lib/rigs';
import {figuresOf,minifigFaces} from '../lib/minifig-3d';
import {sceneFaces} from '../lib/render';
import {unpack} from '../lib/brick-engine';

const added=(m:Model)=>m.bricks.filter(b=>/^(support|tie|raft)/.test(b.id)).length;
// Flat display bases are woven from crossed plates with staggered joints: one connected piece.
for(const s of ['Astronaut','Castle','Rocket','Dinosaur','Cat','Robot'])for(const size of [1,2]){
  const u=unpack(recipe(s,size)),cells=u.voxels.flatMap(v=>(v.y===0?[0,1]:[0,1,2].map(d=>v.y*3-1+d)).map(y=>({...v,y})));
  const w=weaveBase(cells);assert.equal(checks(w).components.length,1,`${s} ${size} woven base is one piece`);assert(w.every(b=>observedColor(b.part,b.color)),'real plate colors');
}
// Rebuilding no longer needs giant backing rafts for the starter sculptures.
const before:Record<string,number>={'Castle 2':1396,'Rocket 2':1012,'Cat 2':676,'Dinosaur 2':1510};
for(const [k,raft] of Object.entries(before)){const [s,n]=k.split(' ');const m=interlockModel({...recipe(s,Number(n)),hang:true});
  assert(modelChecks(m).passed,k);assert.equal(m.bricks.filter(b=>b.id.startsWith('raft')).length,0,`${k} needs no raft (was ${raft} raft plates)`);}
for(const s of ['Castle','Rocket'])for(const size of [1,2])assert.equal(added(interlockModel({...recipe(s,size),hang:true})),0,`${s} ${size} needs no added pieces`);
// Minimal supports use fewer added pieces than the strict rule, and switching rules round-trips.
let strict=0,minimal=0;for(const s of ['Astronaut','Cat','Dinosaur']){const a=interlockModel({...recipe(s),hang:false}),b=interlockModel({...recipe(s),hang:true});assert(modelChecks(a).passed&&modelChecks(b).passed);strict+=added(a);minimal+=added(b)}
assert(minimal<strict,`minimal supports add fewer pieces (${minimal} vs ${strict})`);
const cat=interlockModel({...recipe('Cat'),hang:true}),catStrict=withSupportRule(cat,false);assert(modelChecks(catStrict).passed&&!catStrict.hang&&added(catStrict)>=added(cat));
const back=withSupportRule(catStrict,true);assert(modelChecks(back).passed&&back.hang);
// Hanging pieces are attached right after the piece they clip under, and appear exactly once.
const dino=interlockModel({...recipe('Dinosaur'),hang:true}),report=modelChecks(dino),steps=buildSteps(dino);
assert(report.hanging.length>0);const order=steps.flatMap(s=>s.bricks.map(b=>b.id));assert.equal(new Set(order).size,dino.bricks.length);
for(const h of report.hanging){const above=report.contacts.filter(c=>c.lower===h).map(c=>c.upper);assert(above.every(a=>order.indexOf(a)<order.indexOf(h)),'hanging piece comes after its support')}
assert(steps.some(s=>s.title==='Attach underneath'));assert.equal(validateModel(JSON.parse(JSON.stringify(dino))).hang,true);
// A floating island is never accepted: hanging must lead back to the main build.
assert(!checks([{id:'a',part:'3005',color:15,x:0,y:0,z:0,rot:false},{id:'b',part:'3005',color:15,x:5,y:3,z:0,rot:false},{id:'c',part:'3005',color:15,x:5,y:6,z:0,rot:false}],[],{hang:true}).passed);
console.log('PASS: woven bases, no rafts on starter sculptures, minimal supports, rule switching, hanging steps.');

// Minifigure versions.
const fig=minifigModel(PRESETS.wizard);assert.equal(fig.format,'minifig');assert.equal(fig.bricks.length,1);assert(modelChecks(fig).passed);
assert(fig.extras!.some(e=>e.part.startsWith('973c'))&&fig.extras!.some(e=>e.part.startsWith('970c'))&&fig.extras!.some(e=>e.part==='3626c'));
assert.deepEqual(fig.joints!.map(j=>j.role),['neck','shoulderR','shoulderL','hipR','hipL']);
assert.throws(()=>minifigModel(PRESETS.cat),/Animal/);
assert.equal(buildCharacter({...PRESETS.knight,format:'minifig'}).format,'minifig');
const figs=figuresOf(fig,{'fig-arm-r':[90]});assert.equal(figs.length,1);let n=0;minifigFaces(figs[0],()=>n++);assert(n>60,'minifigure drawn in 3D');
const faces=sceneFaces(fig.bricks,{width:300,height:300,figures:figs}).faces;assert(faces.some(f=>f.id==='minifig'));
const reloaded=validateModel(JSON.parse(JSON.stringify(fig)));assert.equal(reloaded.format,'minifig');assert.deepEqual(reloaded.figures,fig.figures);assert.equal(reloaded.joints!.length,5);
const guide=instructions(fig,[]);assert(guide.includes('Minifigure')&&!guide.includes('Attach: Right arm'));assert(ldraw(fig).includes('3031.dat'));
assert.equal(bom(fig.bricks,[],fig.extras).reduce((s,r)=>s+r.qty,0),1+fig.extras!.length);
const statue=buildCharacter(PRESETS.knight);assert.deepEqual(statue.figures,[{x:3,y:2,z:-4}],'statues show their minifigure on the base corner');
console.log('PASS: minifigure versions with real parts, poseable joints, 3D rendering, save/load, instructions.');
import {interpretIdea} from '../lib/idea';
const idea=interpretIdea('a pirate minifigure with a sword');assert(idea.kind==='character'&&idea.spec.format==='minifig'&&idea.spec.accessory==='sword');
console.log('PASS: typed ideas can ask for a minifigure.');

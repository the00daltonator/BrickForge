import assert from 'node:assert/strict';
import {Brick,Model,checks,recipe,bom,PARTS,part,tileFinish} from '../lib/brick-engine';
import {planBuild,exportProblems,backingRaft,missingCost} from '../lib/build-planner';
const brick=(id:string,x:number,y:number,z:number,p='3005',rot=false):Brick=>({id,part:p,color:15,x,y,z,rot});
const model=(bricks:Brick[]):Model=>({version:1,name:'test',source:'test',bricks,notes:[]});
assert.equal(checks([brick('a',0,0,0),brick('b',1,0,0)]).components.length,2,'Side contact is not a joint');
assert.equal(checks([brick('a',0,5,0)]).unsupported.length,1,'Floating lowest layer is unsupported');
assert(checks([brick('a',0,0,0),brick('b',0,3,0)]).passed);
assert(checks([brick('a',0,0,0),brick('b',1,0,0),brick('bridge',0,3,0,'3004',true)]).passed,'Top brick joins two legs');
assert(!checks([brick('a',0,0,0,'3070b'),brick('b',0,1,0)]).passed,'Tiles do not provide studs');
assert(checks([brick('s',0,0,0,'3039'),brick('high',0,3,1)]).passed,'Slope back row connects');
assert(!checks([brick('s',0,0,0,'3039'),brick('low',0,3,0)]).passed,'Slope low row does not connect');
assert(checks([brick('s',0,0,0,'3039',true),brick('high',1,3,0)]).passed,'Rotated slope back row');
assert(checks([brick('r',0,0,0,'3941'),brick('cap',0,3,0,'3022')]).passed);
const raft=backingRaft(model([brick('a',0,0,0),brick('b',5,0,5)]));assert(checks(raft.bricks).passed,'Crossed raft connects separated ground pieces');
const stock=PARTS.filter(p=>!p.shape&&p.w*p.d<=8).flatMap(p=>[15,4,0].map(color=>({part:p.id,color,qty:12})));
for(const subject of ['Cat','Robot','Rocket']){const variants=planBuild(recipe(subject),stock,{mode:'owned',swap:true,budget:0});assert(variants.length);for(const v of variants){assert(checks(v.model.bricks).passed);assert.equal(bom(v.model.bricks,stock).reduce((n,r)=>n+r.missing,0),0);assert.equal(v.spent,0);assert.equal(exportProblems(v.model,stock,'owned',0).length,0)}console.log(subject,variants.map(v=>`${v.label}: ${v.model.bricks.length} pieces, ${Math.round(v.coverage*100)}%`).join('; '))}
const plates=[{part:'3023',color:4,qty:60},{part:'3022',color:4,qty:25}];const mixed=planBuild(recipe('Cat'),plates,{mode:'owned',swap:true,budget:0});assert(mixed.some(v=>v.model.bricks.length>1));assert(mixed.every(v=>v.model.bricks.every(b=>part(b.part).h===1)),'Plates can substitute for brick layers');
const budget=planBuild(recipe('Robot'),[],{mode:'budget',swap:true,budget:3});assert(budget.length);for(const v of budget){assert(v.spent<=3);assert(checks(v.model.bricks).passed);assert.equal(v.spent,missingCost(v.model,[]))}
assert(exportProblems(recipe('Cat'),[],'owned',0).length);
assert(exportProblems(model([brick('a',0,0,0)]),[],'budget',0).some(s=>s.includes('budget')));
assert.throws(()=>planBuild(recipe('Cat'),[{part:'unknown',color:15,qty:100}],{mode:'owned',swap:true,budget:0}));
assert.throws(()=>planBuild(recipe('Cat'),[],{mode:'budget',swap:true,budget:NaN}));
console.log('PASS: actual stud contacts, component graph, floating ground, slope rotation, tiles, round pieces, raft, strict stock counts, plate substitution, budgets, and export gates.');
// Independent coordinate fixtures from the official LDraw parts, not just a
// round-trip through our own exporter/importer. 3001 is 80×40 LDU in X/Z.
const {ldraw,fromLdraw,cadPose,topSvg}=await import('../lib/exports');
for(const rot of [false,true]){
 const b=brick('a',3,0,5,'3001',rot),pose=cadPose(b);const native=[[-30,-10],[-10,-10],[10,-10],[30,-10],[-30,10],[-10,10],[10,10],[30,10]];
 const actual=native.map(([x,z])=>`${(pose.x+(pose.rot?z:x))/20},${(pose.z+(pose.rot?-x:z))/20}`).sort();const expected=(await import('../lib/brick-engine')).studCells(b).map(c=>`${c.x},${c.z}`).sort();assert.deepEqual(actual,expected,'LDraw 3001 stud positions match editor');
 const slope=brick('s',3,0,5,'3039',rot),sp=cadPose(slope);const slopeActual=[-10,10].map(x=>`${(sp.x+(sp.rot?0:x))/20},${(sp.z+(sp.rot?-x:0))/20}`).sort();assert.deepEqual(slopeActual,(await import('../lib/brick-engine')).studCells(slope).map(c=>`${c.x},${c.z}`).sort(),'Slope origin at back stud row');
 assert.deepEqual(fromLdraw(ldraw(model([slope])),'test').bricks.map(({id,...b})=>b),[slope].map(({id,...b})=>b));
}
assert(!topSvg([brick('tile',0,0,0,'3068b')]).includes('<circle'),'Instructions do not draw studs on tiles');
console.log('PASS: independent official LDraw 3001/3039 stud-coordinate fixtures and tile instruction diagrams.');
const {pack}=await import('../lib/brick-engine');const mosaic=pack(Array.from({length:128},(_,i)=>({x:i%8,z:Math.floor(i/8)%8,y:Math.floor(i/64),color:4})),'photo','photo',true);
const mosaicPlans=planBuild(mosaic,plates,{mode:'owned',swap:true,budget:0});assert(mosaicPlans.every(v=>v.label!=='Front-view relief'),'Flat mosaics retain their image plane');

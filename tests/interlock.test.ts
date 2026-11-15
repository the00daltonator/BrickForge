import assert from 'node:assert/strict';
import {pack,checks,recipe,unpack,bom,Stock} from '../lib/brick-engine';
import {interlockModel,planBuild} from '../lib/build-planner';
import {instructions,ldraw} from '../lib/exports';
const voxels=[];for(let y=0;y<5;y++)for(let x=0;x<12;x++)for(let z=0;z<4;z++)voxels.push({x,y,z,color:15});
const wall=pack(voxels,'Staggered wall','test');const report=checks(wall.bricks);assert(report.passed,'Wall must be one connected assembly without a repair raft');assert(report.seamBridges.length>=4,'Layers must bridge lower brick seams');assert.equal(unpack(wall).voxels.length,voxels.length,'No shape cells lost');
for(const name of ['Astronaut','Robot','Cat','Castle','Rocket','Dinosaur']){const m=interlockModel(recipe(name));const c=checks(m.bricks);assert(c.passed,name);assert(c.seamBridges.length>0,name+' has cross-brick joints');console.log(name,m.bricks.length,'pieces',c.seamBridges.length,'seam bridges')}
const source=JSON.stringify(wall);const mono=instructions(wall,[],true);assert(mono.includes('filter:grayscale(1)'));assert(mono.includes('choose your own colors'));assert(!instructions(wall,[]).includes('filter:grayscale(1)'));assert.equal(JSON.stringify(wall),source,'Grayscale does not alter model data');assert.equal(ldraw(wall),ldraw(JSON.parse(source)));
const stock:Stock[]=[{part:'3004',color:4,qty:80},{part:'3005',color:4,qty:20},{part:'3001',color:4,qty:30}];for(const v of planBuild(wall,stock,{mode:'owned',swap:true,budget:0})){assert(checks(v.model.bricks).passed);assert(bom(v.model.bricks,stock).every(r=>r.missing===0))}
console.log('PASS: staggered wall interlocks without raft, all starters connected, exact inventory preserved, grayscale guide preserves original model.');

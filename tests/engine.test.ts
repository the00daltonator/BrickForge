import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {recipe,pack,unpack,bom,stockMap,key,checks,PARTS,validateModel,shapesModel} from '../lib/brick-engine';
import {ldraw,fromLdraw,buildPack,instructions,csv,xml} from '../lib/exports';
import {meshToModel} from '../lib/mesh';
for(const type of ['Astronaut','Robot','Cat','Castle','Rocket','Dinosaur'])for(const size of [1,2]){
 const m=recipe(type,size);assert(m.bricks.length>0);assert.equal(checks(m.bricks).overlaps,0);const u=unpack(m);const repack=pack(u.voxels,m.name,m.source,u.plate);assert.equal(unpack(repack).voxels.length,u.voxels.length);const round=fromLdraw(ldraw(m),m.name);assert.deepEqual(round.bricks,m.bricks);assert.equal(bom(m.bricks).reduce((n,r)=>n+r.qty,0),m.bricks.length);assert.equal(ldraw(m).split('\r\n').filter(l=>l.startsWith('1 ')).length,m.bricks.length);
 console.log(type,size,`${m.bricks.length} pieces`,`${checks(m.bricks).unsupported.length} unsupported`);
}
const v=Array.from({length:8},(_,i)=>({x:i%4,y:0,z:Math.floor(i/4),color:15}));const p=pack(v,'rotation','test');assert.equal(p.bricks.length,1);assert.equal(p.bricks[0].part,'3001');assert.equal(p.bricks[0].rot,true);
const m=recipe('Astronaut');const inventory=[{part:'3001',color:15,qty:2},{part:'3005',color:4,qty:7},{part:'3004',color:15,qty:1}];const {voxels}=unpack(m);const fitted=pack(voxels,'test','test',false,inventory,true);const available=stockMap(inventory);for(const r of bom(fitted.bricks))assert(r.qty<=(available.get(key(r.part,r.color))||0));assert(fitted.notes.some(n=>n.includes('partial')));assert.equal(bom(fitted.bricks,inventory).reduce((n,r)=>n+r.missing,0),0);
const enough=bom(m.bricks).map(({part,color,qty})=>({part,color,qty}));assert.equal(bom(m.bricks,enough).reduce((n,r)=>n+r.missing,0),0);assert(!xml(m,enough).includes('<ITEM>'));assert.equal((xml(m,[]).match(/<ITEM>/g)||[]).length,bom(m.bricks).length);
assert.throws(()=>validateModel({...m,bricks:[{...m.bricks[0],part:'unknown'}]}));assert.throws(()=>shapesModel({shapes:[{x:0,y:0,z:0,w:500,h:2,d:3,color:15,type:'box'}]},'unsafe'));
const escaped=instructions({...m,name:'<script>alert(1)</script>'},[]);assert(!escaped.includes('<script>'));assert(escaped.includes('&lt;script&gt;'));assert(escaped.includes('Print / Save as PDF'));assert(csv(m,[]).includes('missing'));
const obj='v 0 0 0\nv 2 0 0\nv 2 2 0\nv 0 2 0\nv 0 0 2\nv 2 0 2\nv 2 2 2\nv 0 2 2\nf 1 2 3 4\nf 5 8 7 6\nf 1 5 6 2\nf 4 3 7 8\nf 1 4 8 5\nf 2 6 7 3';
const mesh=meshToModel(new TextEncoder().encode(obj).buffer,'obj','Cube',8,71);assert(mesh.bricks.length);assert.equal(checks(mesh.bricks).overlaps,0);assert.equal(checks(mesh.bricks).unsupported.length,0);
const plate=pack([{x:0,y:0,z:0,color:71},{x:0,y:1,z:0,color:15},{x:1,y:0,z:0,color:71},{x:1,y:1,z:0,color:4}],'mosaic','test',true);assert.deepEqual(fromLdraw(ldraw(plate),'mosaic').bricks,plate.bricks);
await writeFile(join(tmpdir(),'brickforge-test-pack.zip'),Buffer.from(await buildPack(m,inventory).arrayBuffer()));
console.log('PASS: packing, rotated bricks, six starters, LDraw round trips, plate units, inventory limits, BOM/XML, escaped instructions, mesh voxelization, ZIP generated.');
const {addSupports}=await import('../lib/brick-engine');for(const type of ['Astronaut','Robot','Cat','Dinosaur']){const supported=addSupports(recipe(type));assert.equal(checks(supported.bricks).unsupported.length,0);assert.equal(checks(supported.bricks).overlaps,0);}console.log('PASS: support repair eliminates unsupported pieces without collisions.');
const {COLORS,part:lookupPart,ldrawColor,tileFinish}=await import('../lib/brick-engine');
assert.equal(COLORS.length,275);assert.equal(lookupPart('3039').shape,'slope');assert.equal(lookupPart('3062b').shape,'round');assert.equal(lookupPart('3068b').shape,'tile');
const extended=COLORS.find(c=>c.id>1000&&c.id<9999)!;assert(extended);const unusual={...plate,bricks:plate.bricks.map(b=>({...b,color:extended.id}))};assert.deepEqual(fromLdraw(ldraw(unusual),'colors').bricks,unusual.bricks);assert(ldraw(unusual).includes('!COLOUR'));assert(ldrawColor(extended.id)>100000);
const tiled=tileFinish(plate);assert(tiled.bricks.some(b=>lookupPart(b.part).shape==='tile'));assert.equal(checks(tiled.bricks).unsupported.length,0);
const tileStack={version:1 as const,name:'Tile stack',source:'test',notes:[],bricks:[{id:'tile',part:'3070b',color:15,x:0,y:0,z:0,rot:false},{id:'above',part:'3005',color:15,x:0,y:1,z:0,rot:false}]};assert(checks(tileStack.bricks).unsupported.includes('above'));
console.log('PASS: expanded color identity, custom LDraw colors, specialty-part metadata, tile finish, and smooth-tile support rejection.');

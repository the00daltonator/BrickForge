import {withoutJoints,jointIssues} from './joints';
import {Model,Brick,Stock,Voxel,Part,PARTS,part,partCost,modelChecks,tieComponents,color,dims,unpack,stockMap,key,checks,studCells,distance,bom,observedColor,bounds,pack,packMixed,addSupports} from './brick-engine';
export type BuildOptions={mode:'owned'|'budget';swap:boolean;budget:number;prices?:Record<string,number>};
export type BuildVariant={label:string;model:Model;coverage:number;scale:number;spent:number;swaps:number;removed:number};
export const unitPrice=(p:string,c:number,prices:Record<string,number>={})=>Math.max(0,prices[key(p,c)]??partCost(p));
export const missingCost=(m:Model,s:Stock[],prices:Record<string,number>={})=>bom(m.bricks,s,m.extras).reduce((n,r)=>n+r.missing*unitPrice(r.part,r.color,prices),0);
const cellKey=(x:number,y:number,z:number)=>`${x},${y},${z}`;
function targetCells(m:Model,scale:number,relief:boolean){
 const {voxels,plate}=unpack(m);const map=new Map<string,{x:number;y:number;z:number;color:number}>();
 const minX=Math.min(...voxels.map(v=>v.x)),minY=Math.min(...voxels.map(v=>v.y)),minZ=Math.min(...voxels.map(v=>v.z));
 // A relief projects the front silhouette upright, retaining its frontmost color.
 const ordered=relief?[...voxels].sort((a,b)=>b.z-a.z):voxels;
 for(const v of ordered){const x=Math.floor((v.x-minX)*scale),z=relief?0:Math.floor((v.z-minZ)*scale),layer=Math.floor((v.y-minY)*scale);for(let h=0;h<(plate?1:3);h++){const y=layer*(plate?1:3)+h;map.set(cellKey(x,y,z),{x,y,z,color:v.color})}}
 return map;
}
function assemble(target:ReturnType<typeof targetCells>,stock:Stock[],options:BuildOptions,reverse:boolean){
 const remaining=stockMap(stock),occupied=new Map<string,string>(),tops=new Map<string,string>(),bricks:Brick[]=[];
 const palette=[...new Set([...target.values()].map(v=>v.color))];
 const cents=Math.floor(options.budget*100+1e-6);let spent=0;
 const lots=new Map<string,Stock>();for(const s of stock)if(part(s.part)&&s.qty>0)lots.set(key(s.part,s.color),s);
 if(options.mode==='budget')for(const p of PARTS.filter(p=>!p.shape))for(const c of palette)if(observedColor(p.id,c))lots.set(key(p.id,c),{part:p.id,color:c,qty:0});
 const byPart=new Map<string,Stock[]>();for(const s of lots.values())byPart.set(s.part,[...(byPart.get(s.part)||[]),s]);
 const entries=[...byPart].map(([id,colors])=>({p:part(id),colors}));
 const minX=Math.min(...[...target.values()].map(v=>v.x)),minZ=Math.min(...[...target.values()].map(v=>v.z));
 const ordered=[...target.values()].sort((a,b)=>a.y-b.y||(a.y%2?b.z-a.z:a.z-b.z)||(reverse?b.x-a.x:a.x-b.x));
 for(const cell of ordered){if(bricks.length>=1800)break;if(occupied.has(cellKey(cell.x,cell.y,cell.z)))continue;
 let best:{b:Brick;p:Part;score:number;pay:number}|undefined;
 for(const {p,colors} of entries){
 // Select the closest available color for this shape, preferring stock over purchases.
 const candidates=colors.filter(s=>(options.swap||s.color===cell.color)&&((remaining.get(key(s.part,s.color))||0)>0||options.mode==='budget')).map(s=>({s,owned:(remaining.get(key(s.part,s.color))||0)>0})).sort((a,b)=>Number(b.owned)-Number(a.owned)||distance(color(a.s.color).hex,color(cell.color).hex)-distance(color(b.s.color).hex,color(cell.color).hex));
 const lot=candidates[0];if(!lot)continue;const pay=lot.owned?0:Math.ceil(unitPrice(p.id,lot.s.color,options.prices)*100-1e-6);if(spent+pay>cents)continue;
 for(const rot of p.w===p.d?[false]:[!!(cell.y%2),!(cell.y%2)]){const w=rot?p.d:p.w,d=rot?p.w:p.d;
 const x=reverse?cell.x-w+1:cell.x,z=cell.y%2?cell.z-d+1:cell.z,y=cell.y;let valid=true,matching=0,contacts=0;const below=new Set<string>();
 for(let dx=0;dx<w&&valid;dx++)for(let dz=0;dz<d&&valid;dz++){const t=tops.get(cellKey(x+dx,y,z+dz));if(t){contacts++;below.add(t)}for(let dy=0;dy<p.h;dy++){const k=cellKey(x+dx,y+dy,z+dz),v=target.get(k);if(!v||occupied.has(k)||(!options.swap&&v.color!==lot.s.color)){valid=false;break}if(v.color===lot.s.color)matching++;}if(p.shape==='tile'&&target.has(cellKey(x+dx,y+p.h,z+dz)))valid=false;}
 if(!valid||(y>0&&!contacts))continue;
 const volume=w*d*p.h;const stagger=y>0&&Math.floor(y/3)%2===1?((x===minX&&w===1?20:0)+(z===minZ&&d===1?20:0)):0;const score=volume*(.6+.4*matching/volume)+Math.max(0,below.size-1)*200+stagger+(lot.owned?2:0)-pay*.03;
 if(!best||score>best.score)best={p,pay,score,b:{id:`fit-${bricks.length}`,part:p.id,color:lot.s.color,x,y,z,rot}};
 }}
 if(!best)continue;const b=best.b,d=dims(b);bricks.push(b);spent+=best.pay;const k=key(b.part,b.color);remaining.set(k,Math.max(0,(remaining.get(k)||0)-1));for(let x=0;x<d.w;x++)for(let z=0;z<d.d;z++)for(let y=0;y<d.h;y++)occupied.set(cellKey(b.x+x,b.y+y,b.z+z),b.id);for(const c of studCells(b))tops.set(cellKey(c.x,b.y+d.h,c.z),b.id);
 }
 // Side-by-side pieces on the table are not connected. Keep only a connected
 // component and disclose the lost coverage; never invent a joining piece.
 const report=checks(bricks),byId=new Map(bricks.map(b=>[b.id,b]));const groups=report.components.map(ids=>ids.map(id=>byId.get(id)!));groups.sort((a,b)=>b.reduce((n,p)=>n+dims(p).w*dims(p).d*dims(p).h,0)-a.reduce((n,p)=>n+dims(p).w*dims(p).d*dims(p).h,0));
 const kept=groups[0]||[];let filled=0,swaps=0;for(const b of kept){const d=dims(b);filled+=d.w*d.d*d.h;const c=target.get(cellKey(b.x,b.y,b.z));if(c&&c.color!==b.color)swaps++}
 return{bricks:kept,coverage:target.size?filled/target.size:0,swaps,removed:bricks.length-kept.length};
}
export function planBuild(m:Model,stock:Stock[],options:BuildOptions):BuildVariant[]{
 // A moving build is offered as designed when the bricks or budget cover it. Otherwise a
 // static reinterpretation is tried (reshaping cannot keep joints).
 if(m.joints?.length){
  const spent=missingCost(m,stock,options.prices),owned=!bom(m.bricks,stock,m.extras).some(r=>r.missing);
  if(options.mode==='owned'?owned:spent<=options.budget+.00001)return[{label:'As designed, with moving parts',model:m,coverage:1,scale:1,spent,swaps:0,removed:0}];
  try{return planBuild(withoutJoints(m),stock,options).map(v=>({...v,model:{...v.model,notes:[...v.model.notes,'Fitted to your bricks as a static build; joints were removed.']}}))}
  catch{throw new Error(options.mode==='owned'?'Your bricks do not cover this moving build, and a static version cannot connect its separate arms and legs. Add the missing pieces (including joint parts) or switch to Full build.':'This moving build is over the parts allowance, and a static version cannot connect its separate arms and legs. Raise the allowance or switch to Full build.')}
 }
 if(!m.bricks.length)throw new Error('Create or import a model first.');
 if(options.mode==='owned'&&!stock.some(s=>part(s.part)&&s.qty>0))throw new Error('Add supported bricks or plates to your inventory first. Specialty parts stay in inventory, but unmodeled connections cannot be used automatically.');
 if(!Number.isFinite(options.budget)||options.budget<0||options.budget>10000)throw new Error('Enter a budget from $0 to $10,000.');
 const stockVolume=stock.filter(s=>part(s.part)).reduce((n,s)=>{const p=part(s.part);return n+s.qty*p.w*p.d*p.h},0);
 const sourceVolume=m.bricks.reduce((n,b)=>{const d=dims(b);return n+d.w*d.d*d.h},0);
 const preferred=options.mode==='owned'?Math.min(1,Math.cbrt(stockVolume/Math.max(1,sourceVolume))*.9):1;
 const flatMosaic=m.bricks.every(b=>part(b.part).h===1)&&bounds(m.bricks).h<=3;
 const specs=[{label:'Closest shape',scale:Math.max(.2,preferred),relief:false},{label:'Mini interpretation',scale:Math.max(.15,preferred*.7),relief:false},{label:flatMosaic?'Compact mosaic':'Front-view relief',scale:flatMosaic?Math.max(.15,preferred*.5):Math.min(.85,Math.max(.25,preferred)),relief:!flatMosaic}];
 const variants:BuildVariant[]=[];
 for(let i=0;i<specs.length;i++){const spec=specs[i],target=targetCells(m,spec.scale,spec.relief);let result=assemble(target,stock,options,i%2===1);if(result.coverage<.9){const alt=assemble(target,stock,options,i%2!==1);if(alt.coverage>result.coverage)result=alt}if(!result.bricks.length)continue;
 const candidate:Model={...m,name:m.name,source:`${options.mode==='owned'?'Only my bricks':'Budget build'} · ${spec.label}`,bricks:result.bricks,notes:[]};const report=checks(candidate.bricks);if(!report.passed)continue;
 const spent=missingCost(candidate,stock,options.prices);if(options.mode==='owned'&&bom(candidate.bricks,stock).some(r=>r.missing))throw new Error('Inventory verification failed. No design was applied.');if(spent>options.budget+.00001)continue;
 candidate.notes=[`${spec.label}: ${Math.round(spec.scale*100)}% grid scale; ${Math.round(result.coverage*100)}% of this target volume retained. ${spec.relief?'Depth flattened to a front-view relief.':''}`,`${result.swaps} pieces use an alternative color; ${result.removed} disconnected pieces omitted. ${options.mode==='owned'?'No purchases or extra support pieces.':`Estimated missing-part cost $${spent.toFixed(2)}; excludes shipping and tax.`}`,result.coverage<.8?'Rough interpretation: substantial details are missing. Compare with your request before building.':'Compare the preview with your request; shape coverage is not a recognition score.',`Stud connections and bottom-up support checked. Physical strength and stability are not certified.`];
 variants.push({label:spec.label,model:candidate,coverage:result.coverage,scale:spec.scale,spent,swaps:result.swaps,removed:result.removed});
 }
 if(!variants.length)throw new Error('These pieces cannot form a supported interpretation of this design. Try a simpler subject, allow color swaps, or add compatible bricks to inventory. Nothing has been purchased.');
 return variants.sort((a,b)=>b.coverage*Math.pow(b.scale,.2)-a.coverage*Math.pow(a.scale,.2));
}
export function exportProblems(m:Model,stock:Stock[],mode:string,budget:number,prices:Record<string,number>={}){const c=modelChecks(m),problems:string[]=[];if(!m.bricks.length)problems.push('The model is empty.');if(c.overlaps)problems.push(`${c.overlaps} overlapping volume cells`);if(c.unsupported.length)problems.push(`${c.unsupported.length} pieces lack a stud connection underneath`);if(c.components.length>1)problems.push(`${c.components.length} separate assemblies`);problems.push(...jointIssues(m,c.locked));if(mode==='owned'&&bom(m.bricks,stock,m.extras).some(r=>r.missing))problems.push('Some required pieces are not in your inventory');if(mode==='budget'&&missingCost(m,stock,prices)>budget+.00001)problems.push('Estimated missing-part cost exceeds your budget');return problems;}

// Four crossed plate courses join neighboring columns along both axes, including
// seams between courses. Existing pieces are lifted, preserving their geometry.
export function backingRaft(m:Model):Model{
 const b=bounds(m.bricks);if(b.w*b.d>1600)throw new Error('This footprint is too large for automatic backing. Reduce the model size first.');
 const bricks:Brick[]=[];for(let y=0;y<4;y++){const alongX=y%2===0,offset=y>=2?1:0,outer=alongX?b.d:b.w,length=alongX?b.w:b.d;
 for(let row=0;row<outer;row++){for(let pos=0;pos<length;){const n=(pos===0&&offset)||pos+1===length?1:2;bricks.push({id:`raft-${crypto.randomUUID()}`,part:n===1?'3024':'3023',color:71,x:b.x+(alongX?pos:row),z:b.z+(alongX?row:pos),y,rot:alongX});pos+=n}}}
 return{...m,bricks:[...bricks,...m.bricks.map(p=>({...p,y:p.y+4}))],notes:[...m.notes,`${bricks.length} plates added in a crossed backing raft. The model is four plates taller. Review the updated cost and inventory.`]};
}

/**
 * Two crossed plate layers for a flat display base: rows along X underneath, columns along Z on
 * top, split where the color changes. Every column crosses several rows, so the base is one
 * connected piece without a backing raft.
 */
export function weaveBase(cells:Voxel[]):Brick[]{
 // Try a few joint offsets for alternate lines; keep the first weave that is one connected piece.
 let best:Brick[]=[],parts=Infinity;
 for(const offset of [2,3,4,1,5,6]){const w=weaveWith(cells,offset),n=checks(w).components.length;if(n<parts){best=w;parts=n}if(n===1)break}
 return best;
}
function weaveWith(cells:Voxel[],offset:number):Brick[]{
 const lens=[12,10,8,6,4,3,2,1],id:Record<number,string>={12:'60479',10:'4477',8:'3460',6:'3666',4:'3710',3:'3623',2:'3023',1:'3024'},out:Brick[]=[];
 for(const y of [0,1]){const layer=new Map(cells.filter(v=>v.y===y).map(v=>[`${v.x},${v.z}`,v.color]));const alongX=y===0;const lines=new Map<number,number[]>();
  for(const k of layer.keys()){const [x,z]=k.split(',').map(Number);const line=alongX?z:x,pos=alongX?x:z;lines.set(line,[...(lines.get(line)??[]),pos])}
  for(const [line,positions] of lines){positions.sort((a,b)=>a-b);let i=0;
   while(i<positions.length){const at=(p:number)=>layer.get(alongX?`${p},${line}`:`${line},${p}`);const c=at(positions[i])!;let run=1;while(i+run<positions.length&&positions[i+run]===positions[i]+run&&at(positions[i+run])===c)run++;
    // Split the run into real plate lengths (no lone 1-long end piece); alternate lines take
    // the pieces in reverse order so the joints are staggered and the layers interlock.
    // Split the run into real plate lengths with no lone 1-long end piece. Odd lines start with a
    // 2-long piece so every joint is offset from its neighbors and the two layers interlock.
    const split=(total:number)=>{const out:number[]=[];let left=total;while(left>0){const n=lens.find(l=>l<=left&&left-l!==1&&observedColor(id[l],c))??lens.find(l=>l<=left&&observedColor(id[l],c))??1;out.push(n);left-=n}return out};
    const sizes=Math.abs(line)%2===1&&run>offset+1&&observedColor(id[offset],c)?[offset,...split(run-offset)]:split(run);
    let pos=positions[i];for(const n of sizes){out.push({id:`base-${y}-${out.length}`,part:id[n],color:c,x:alongX?pos:line,y,z:alongX?line:pos,rot:alongX===(part(id[n]).w<part(id[n]).d)});pos+=n}
    i+=run}}}
 return out;
}
export function interlockModel(m:Model):Model{
 // Jointed builds are packed per moving section already; repacking would merge sections.
 if(m.joints?.length){if(!checks(m.bricks,m.joints).passed)throw new Error('This moving build has connection problems. Check the highlighted pieces.');return m}
 let next=m;
 if(m.bricks.every(b=>!part(b.part).shape)){
  // Try several packings and keep the one that needs the fewest added supports: brick courses,
  // and plate-level packing (bricks where three layers line up, plates elsewhere) at three
  // course offsets. Plates can reach under overhangs and cross seams that bricks cannot.
  const u=unpack(m);
  // A flat bottom layer covering most of the footprint is a display base: make it two crossed
  // plate layers (which lock together) instead of one course of loose bricks side by side.
  const foot=new Set(u.voxels.map(v=>`${v.x},${v.z}`)).size,bottom=u.voxels.filter(v=>v.y===0).length,base=!u.plate&&bottom>=foot*.6;
  const plateCells=u.plate?u.voxels:u.voxels.flatMap(v=>base?(v.y===0?[0,1]:[0,1,2].map(d=>v.y*3-1+d)).map(y=>({...v,y})):[0,1,2].map(d=>({...v,y:v.y*3+d})));
  const woven=base?weaveBase(plateCells):null,rest=woven?plateCells.filter(v=>v.y>1):plateCells;
  const options=[...(u.plate?[]:[pack(u.voxels,m.name,m.source,false)]),...[0,1,2].map(phase=>packMixed(rest,m.name,m.source,woven??[],phase))];
  let best:{model:Model;cost:number;ok:boolean}|undefined;
  for(const o of options){let c=tieComponents(addSupports({...o,extras:m.extras,hang:m.hang,figures:m.figures}));const added=c.bricks.filter(b=>b.id.startsWith('support')||b.id.startsWith('tie')).length;const split=modelChecks(c).components.length>1;if(split)c=backingRaft(c);
   const cost=added*3+(split?c.bricks.filter(b=>b.id.startsWith('raft')).length*3:0)+c.bricks.length*.05;const ok=modelChecks(c).passed;if(!best||(ok&&!best.ok)||(ok===best.ok&&cost<best.cost))best={model:c,cost,ok}}
  next={...best!.model,notes:[...m.notes,...best!.model.notes.filter(n=>!m.notes.includes(n)),'Rebuilt with staggered courses and pieces that span neighboring bricks.']};
 }else{next=tieComponents(addSupports(next));if(modelChecks(next).components.length>1)next=backingRaft(next)}
 const report=modelChecks(next);if(!report.passed)throw new Error('This design could not be connected automatically. Simplify it or edit the draft. The previous model has been kept.');
 // Rebuilding an already interlocked model must not repeat its notes.
 const notes=[...next.notes.filter(n=>!/pieces bridge two or more bricks below/.test(n)),`${report.seamBridges.length} pieces bridge two or more bricks below. Stud connections checked; physical strength still needs a real build test.`];
 return{...next,notes:[...new Set(notes)]};
}

/** Re-applies support repair under a support rule; pieces added by an earlier repair are removed first. */
export function withSupportRule(m:Model,hang:boolean):Model{
 const base={...m,hang,bricks:m.bricks.filter(b=>!b.id.startsWith('support')&&!b.id.startsWith('tie')),notes:m.notes.filter(n=>!/support bricks\/plates added|tie plates join/.test(n))};
 const fixed=m.joints?.length?base:tieComponents(addSupports(base)),c=modelChecks(fixed);
 if(!c.passed&&!m.joints?.length)throw new Error('This model needs support columns under the stricter rule but they could not be added. Keep minimal supports or edit the model.');
 return fixed;
}

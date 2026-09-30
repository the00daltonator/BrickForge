import {PRESETS,characterModel} from '../lib/character';
import {checks,bom} from '../lib/brick-engine';
for(const [k,p] of Object.entries(PRESETS)){const t=Date.now();const m=characterModel(p);const c=checks(m.bricks);const supports=m.bricks.filter(b=>b.id.startsWith('support')).length;const raft=m.bricks.filter(b=>b.id.startsWith('raft')).length;
console.log(k.padEnd(12),String(m.bricks.length).padStart(4),'pcs',c.passed?'PASS':'FAIL',`unsup=${c.unsupported.length} comps=${c.components.length} supports=${supports} raft=${raft} weak=${c.weak.length} tip=${c.tippingRisk}`,`${Date.now()-t}ms`,'extras',(m.extras||[]).map(e=>e.part+'/'+e.color).join(' '))}

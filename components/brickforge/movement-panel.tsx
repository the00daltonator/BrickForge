'use client';
import {Move3D,Pause,Play,RotateCcw} from 'lucide-react';
import {Slider} from '@/components/ui/slider';
import {Joint} from '@/lib/brick-engine';
import {ANIMATIONS,applyPreset,presetsFor,Pose} from '@/lib/joints';
import {jointKindLabel,describeHardware} from '@/lib/rigs';

const AXIS_LABEL:Record<string,Record<string,string>>={
  pin:{x:'Swing'},ball:{x:'Swing',z:'Spread'},turntable:{y:'Turn'},hinge:{x:'Lift',y:'Open'},
};
/** Pose sliders, presets and looping animations for a model with joints. */
export default function MovementPanel({joints,ranges,pose,onPose,animation,onAnimation}:{joints:Joint[];ranges:Record<string,[number,number][]>;pose:Pose;onPose:(p:Pose)=>void;animation:string;onAnimation:(a:string)=>void}){
  const movable=joints.filter(j=>j.kind!=='axle'),wheels=joints.filter(j=>j.kind==='axle');
  const set=(j:Joint,i:number,v:number)=>{const cur=j.axes.map((_,k)=>pose[j.id]?.[k]??0);cur[i]=v;onPose({...pose,[j.id]:cur})};
  return <section className="inspector-section movement">
    <div className="between"><h3>Movement</h3><Move3D size={17}/></div>
    <p className="caption">{movable.length} joint{movable.length===1?'':'s'}{wheels.length?` and ${wheels.length} rolling wheels`:''}. Ranges stop where parts would collide.</p>
    <div className="pose-presets">{presetsFor(joints).map(p=><button key={p.value} className="chip" onClick={()=>{onAnimation('');onPose(applyPreset(joints,ranges,p.value))}}>{p.label}</button>)}</div>
    {ANIMATIONS(joints).length>0&&<div className="pose-presets">{ANIMATIONS(joints).map(a=><button key={a.value} className={`chip ${animation===a.value?'on':''}`} onClick={()=>onAnimation(animation===a.value?'':a.value)}>{animation===a.value?<Pause size={12}/>:<Play size={12}/>} {a.label}</button>)}</div>}
    {movable.map(j=><div className="joint-row" key={j.id}>
      <div className="between"><strong>{j.label}</strong><small>{jointKindLabel[j.kind]}</small></div>
      {j.axes.map((axis,i)=>{const [lo,hi]=ranges[j.id]?.[i]??j.limits[i],v=Math.max(lo,Math.min(hi,pose[j.id]?.[i]??0));
        return <label className="joint-axis" key={axis}><span>{AXIS_LABEL[j.kind]?.[axis]??axis.toUpperCase()}</span>
          <Slider aria-label={`${j.label} ${AXIS_LABEL[j.kind]?.[axis]??axis}`} min={Math.round(lo)} max={Math.round(hi)} step={1} value={[Math.round(v)]} disabled={hi-lo<1||!!animation} onValueChange={x=>set(j,i,x[0])}/>
          <em>{Math.round(v)}°</em></label>})}
      {j.hardware?.length?<small className="muted">{describeHardware(j)}</small>:null}
    </div>)}
    <button className="text-link mt" onClick={()=>{onAnimation('');onPose({})}}><RotateCcw size={14}/> Reset pose</button>
    <p className="micro">The pose is saved with the build and used for box art and CAD export. Instructions are drawn in the rest pose.</p>
  </section>;
}

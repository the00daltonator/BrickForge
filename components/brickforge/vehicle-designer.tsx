'use client';
import {useMemo} from 'react';
import {Switch} from '@/components/ui/switch';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import Viewer from '@/components/brickforge/viewer';
import {Swatches} from '@/components/brickforge/character-designer';
import {observedColors} from '@/lib/brick-engine';
import {applyPreset} from '@/lib/joints';
import {VehicleSpec,VEHICLE_PRESETS,VEHICLE_PALETTE,vehicleModel,normalizeVehicle,DoorStyle} from '@/lib/rigs';

const DOORS:{value:DoorStyle;label:string;note:string}[]=[
  {value:'fixed',label:'Fixed doors',note:'Simplest build; doors do not open.'},
  {value:'basic',label:'Basic · hinge plates',note:'1 × 4 swivel hinge plates (2429/2430) under each door.'},
  {value:'fancy',label:'Deluxe · hinge bricks',note:'1 × 4 hinge bricks (3831/3830) for sturdier full-height doors.'},
];
export default function VehicleDesigner({spec,onChange,grayscale}:{spec:VehicleSpec;onChange:(s:VehicleSpec)=>void;grayscale:boolean}){
  const set=<K extends keyof VehicleSpec>(k:K,v:VehicleSpec[K])=>onChange({...spec,[k]:v});
  const preview=useMemo(()=>{try{const m=vehicleModel(spec);return{m,pose:applyPreset(m.joints??[],{},'all')}}catch{return null}},[spec]);
  const wheelColors=observedColors('4624');
  return <div className="designer">
    <div className="designer-preview single"><div className="designer-3d">{preview&&<Viewer grayscale={grayscale} bricks={preview.m.bricks} joints={preview.m.joints} pose={preview.pose} selected={null} onSelect={()=>{}}/>}</div></div>
    <p className="caption centered">{preview?`${preview.m.bricks.length} bricks + ${(preview.m.extras??[]).reduce((n,e)=>n+e.qty,0)} wheel parts · ${preview.m.joints!.filter(j=>j.kind!=='axle').length} opening parts shown open`:'Preview unavailable'}</p>
    <span className="starter-label">PRESETS</span>
    <div className="preset-chips">{Object.entries(VEHICLE_PRESETS).map(([k,p])=><button type="button" key={k} className={spec.name===p.name?'chosen':''} onClick={()=>onChange(normalizeVehicle(p))}>{p.name}</button>)}</div>
    <label className="field-label" htmlFor="vehicle-name">Name</label><input id="vehicle-name" className="text-input" value={spec.name} maxLength={80} onChange={e=>set('name',e.target.value)}/>
    <label className="field-label tight">Doors</label>
    <Select value={spec.doors} onValueChange={v=>set('doors',v as DoorStyle)}><SelectTrigger className="pick" aria-label="Door style"><SelectValue/></SelectTrigger><SelectContent>{DOORS.map(d=><SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent></Select>
    <p className="caption">{DOORS.find(d=>d.value===spec.doors)?.note}</p>
    <div className="toggle-grid">
      <label className="switch-row"><span>Opening hood</span><Switch checked={spec.hood} onCheckedChange={v=>set('hood',v)}/></label>
      <label className="switch-row"><span>Opening trunk</span><Switch checked={spec.trunk} onCheckedChange={v=>set('trunk',v)}/></label>
      <label className="switch-row"><span>Accent stripe</span><Switch checked={spec.stripe} onCheckedChange={v=>set('stripe',v)}/></label>
    </div>
    <p className="caption">Hood and trunk lift on 1 × 2 hinge bricks (3937/3938). Wheels are real 8 × 6 wheels with tires on wheel-holder plates, and they roll.</p>
    <Swatches label="Body" value={spec.body} onChange={v=>set('body',v)} palette={VEHICLE_PALETTE}/>
    <Swatches label="Accent" value={spec.accent} onChange={v=>set('accent',v)} palette={VEHICLE_PALETTE}/>
    <Swatches label="Chassis" value={spec.chassis} onChange={v=>set('chassis',v)} palette={[72,0,71,15]}/>
    <Swatches label="Windows" value={spec.windows} onChange={v=>set('windows',v)} palette={[47,41,40,0]}/>
    <Swatches label="Wheels" value={spec.wheels} onChange={v=>set('wheels',v)} palette={wheelColors}/>
  </div>;
}

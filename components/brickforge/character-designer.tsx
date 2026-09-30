'use client';
import {useMemo,useRef,useState} from 'react';
import {Camera,LoaderCircle,Shuffle} from 'lucide-react';
import {toast} from 'sonner';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Switch} from '@/components/ui/switch';
import Viewer from '@/components/brickforge/viewer';
import {color} from '@/lib/brick-engine';
import {CHARACTER_PALETTE,SKIN_TONES} from '@/lib/color';
import {CharacterSpec,PRESETS,PRESET_GROUPS,HAIR_STYLES,HEADWEAR,OUTFITS,ACCESSORIES,EARS,normalizeSpec,Rig} from '@/lib/character';
import {buildCharacter} from '@/lib/rigs';
import {applyPreset} from '@/lib/joints';
import {buildMinifig,minifigSvg} from '@/lib/minifig';
import {loadPixels,subjectMask,characterColors} from '@/lib/photo';

export function Swatches({label,value,onChange,palette}:{label:string;value:number;onChange:(id:number)=>void;palette:number[]}){
  return <div className="swatch-field"><div className="swatch-label"><span>{label}</span><small>{color(value).name}</small></div>
    <div className="swatch-row" role="radiogroup" aria-label={label}>{palette.map(id=><button key={id} type="button" role="radio" aria-checked={value===id} aria-label={color(id).name} title={color(id).name} data-selected={value===id} style={{background:color(id).hex}} onClick={()=>onChange(id)}/>)}</div></div>;
}
function Choice<T extends string>({label,value,onChange,items}:{label:string;value:T;onChange:(v:T)=>void;items:{value:T;label:string}[]}){
  return <label className="choice-field"><span className="field-label tight">{label}</span><Select value={value} onValueChange={v=>onChange(v as T)}><SelectTrigger className="pick" aria-label={label}><SelectValue/></SelectTrigger><SelectContent>{items.map(i=><SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent></Select></label>;
}

export default function CharacterDesigner({spec,onChange,grayscale}:{spec:CharacterSpec;onChange:(s:CharacterSpec)=>void;grayscale:boolean}){
  const set=<K extends keyof CharacterSpec>(k:K,v:CharacterSpec[K])=>onChange({...spec,[k]:v});
  const photoInput=useRef<HTMLInputElement>(null);const [reading,setReading]=useState(false);
  const preview=useMemo(()=>{try{return buildCharacter(spec)}catch{return null}},[spec]);
  const previewPose=useMemo(()=>preview?.joints?.length?applyPreset(preview.joints,{},'wave'):undefined,[preview]);
  const fig=useMemo(()=>spec.minifig&&spec.kind!=='animal'?minifigSvg(buildMinifig({skin:spec.skin,hair:spec.hair,hairStyle:spec.hairStyle,headwear:spec.headwear,hat:spec.hat,shirt:spec.shirt,pants:spec.pants,neck:spec.cape?'cape':spec.beard?'beard':spec.accessory==='backpack'?'backpack':undefined,neckColor:spec.cape?spec.accent:spec.hair,tool:['sword','staff','wand','shield','guitar'].includes(spec.accessory)?spec.accessory:undefined,toolColor:spec.accessory==='shield'?spec.accent:71}).look,92):'',[spec]);
  const animal=spec.kind==='animal';
  const fromPhoto=async(f?:File)=>{if(!f)return;setReading(true);try{if(f.size>12000000)throw new Error('Image limit: 12 MB.');const url=URL.createObjectURL(f);try{const p=await loadPixels(url,280);const m=subjectMask(p);const c=characterColors(p,m);
    onChange(normalizeSpec({...spec,skin:animal?c.shirt:c.skin,hair:c.hair,shirt:c.shirt,pants:c.portrait?spec.pants:c.pants,shoes:c.portrait?spec.shoes:c.shoes,hairStyle:c.bald&&!animal?'bald':spec.hairStyle===('bald' as const)&&!c.bald?'short':spec.hairStyle}));
    toast.success(`Colors from your photo: ${[c.hair,c.skin,c.shirt,...(c.portrait?[]:[c.pants,c.shoes])].map(id=>color(id).name).join(', ')}.${m.removed?'':' The background could not be separated; results may include background colors.'}`);}finally{URL.revokeObjectURL(url)}}catch(e){toast.error(e instanceof Error?e.message:'Could not read this photo.')}finally{setReading(false);if(photoInput.current)photoInput.current.value=''}};
  const surprise=()=>{const pick=<T,>(a:T[])=>a[Math.floor(Math.random()*a.length)];const keys=Object.keys(PRESETS);const base=PRESETS[pick(keys)];onChange(normalizeSpec({...base,shirt:pick(CHARACTER_PALETTE),accent:pick(CHARACTER_PALETTE),pants:pick(CHARACTER_PALETTE),hair:pick(CHARACTER_PALETTE),name:base.name}))};
  return <div className="designer">
    <input ref={photoInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e=>fromPhoto(e.target.files?.[0])}/>
    <div className="designer-preview">
      <div className="designer-3d">{preview&&<Viewer grayscale={grayscale} bricks={preview.bricks} joints={preview.joints} pose={previewPose} selected={null} onSelect={()=>{}}/>}</div>
      {fig&&<div className="designer-fig" title="Matching minifigure in the closest real part colors" dangerouslySetInnerHTML={{__html:fig}}/>}
    </div>
    <p className="caption centered">{preview?`${preview.bricks.length} bricks${spec.minifig&&spec.kind!=='animal'?' + matching minifigure':''}${preview.joints?.length?` · ${preview.joints.length} joints`:''} · real part colors only`:'Preview unavailable'}</p>
    <Choice label="Movement" value={spec.rig??'none'} onChange={(v:Rig)=>set('rig',v)} items={[{value:'none',label:'Statue · no moving parts'},{value:'basic',label:'Posable · Technic pins + turning head'},{value:'fancy',label:'Deluxe · ball joints, waist and head turn'}]}/>
    {spec.rig&&spec.rig!=='none'&&<p className="caption">{spec.rig==='basic'?'Hips and shoulders swing on Technic pin bricks (3700) with friction pins (2780); the head turns on a 2 × 2 turntable.':'Hips and shoulders use ball-joint plates (14417/14704) that swing and spread; the waist and head turn on 2 × 2 turntables.'} No display base, so legs can move.</p>}
    <div className="preset-groups">{PRESET_GROUPS.map(g=><div key={g.label}><span className="starter-label">{g.label.toUpperCase()}</span><div className="preset-chips">{g.keys.map(k=><button type="button" key={k} className={spec.name===PRESETS[k].name&&spec.kind===PRESETS[k].kind?'chosen':''} onClick={()=>onChange(normalizeSpec({...PRESETS[k]}))}>{PRESETS[k].name}</button>)}</div></div>)}</div>
    <div className="designer-actions"><button type="button" className="outline" disabled={reading} onClick={()=>photoInput.current?.click()}>{reading?<LoaderCircle className="spin" size={15}/>:<Camera size={15}/>} Colors from a photo</button><button type="button" className="outline" onClick={surprise}><Shuffle size={15}/> Surprise me</button></div>
    <label className="field-label" htmlFor="character-name">Name</label><input id="character-name" className="text-input" value={spec.name} maxLength={80} onChange={e=>set('name',e.target.value)}/>
    <Swatches label={animal?'Fur':'Skin'} value={spec.skin} onChange={v=>animal?onChange({...spec,skin:v,hair:spec.hair===spec.skin?v:spec.hair,shirt:spec.shirt===spec.skin?v:spec.shirt,pants:spec.pants===spec.skin?v:spec.pants}):set('skin',v)} palette={animal?CHARACTER_PALETTE:SKIN_TONES}/>
    {!animal&&<Swatches label="Hair" value={spec.hair} onChange={v=>set('hair',v)} palette={CHARACTER_PALETTE}/>}
    <Swatches label={animal?'Body':'Top'} value={spec.shirt} onChange={v=>set('shirt',v)} palette={CHARACTER_PALETTE}/>
    <Swatches label="Accent" value={spec.accent} onChange={v=>set('accent',v)} palette={CHARACTER_PALETTE}/>
    <Swatches label={animal?'Legs':'Pants'} value={spec.pants} onChange={v=>set('pants',v)} palette={CHARACTER_PALETTE}/>
    <Swatches label={animal?'Feet':'Shoes'} value={spec.shoes} onChange={v=>set('shoes',v)} palette={CHARACTER_PALETTE}/>
    {animal&&<Swatches label="Muzzle" value={spec.muzzle??15} onChange={v=>set('muzzle',v)} palette={CHARACTER_PALETTE}/>}
    <div className="two-fields">
      {!animal&&<Choice label="Hair style" value={spec.hairStyle} onChange={v=>set('hairStyle',v)} items={HAIR_STYLES}/>}
      <Choice label="Headwear" value={spec.headwear} onChange={v=>set('headwear',v)} items={HEADWEAR}/>
      {!animal&&<Choice label="Outfit" value={spec.outfit} onChange={v=>set('outfit',v)} items={OUTFITS}/>}
      <Choice label="Holding" value={spec.accessory} onChange={v=>set('accessory',v)} items={ACCESSORIES}/>
      <Choice label="Ears" value={spec.ears} onChange={v=>set('ears',v)} items={EARS}/>
      <Choice label="Kind" value={spec.kind} onChange={v=>set('kind',v)} items={[{value:'person',label:'Person'},{value:'animal',label:'Animal'},{value:'robot',label:'Robot'}]}/>
    </div>
    {spec.headwear!=='none'&&<Swatches label="Headwear color" value={spec.hat} onChange={v=>set('hat',v)} palette={CHARACTER_PALETTE}/>}
    <Swatches label="Eyes" value={spec.eyes} onChange={v=>set('eyes',v)} palette={[0,72,1,2,212,70,15,4,14]}/>
    <Swatches label="Display base" value={spec.base} onChange={v=>set('base',v)} palette={[72,71,0,15,2,10,288,19,28,212,1,30,4]}/>
    <div className="toggle-grid">
      <label className="switch-row"><span>Cape</span><Switch checked={spec.cape} onCheckedChange={v=>set('cape',v)}/></label>
      {!animal&&<label className="switch-row"><span>Beard</span><Switch checked={spec.beard} onCheckedChange={v=>set('beard',v)}/></label>}
      <label className="switch-row"><span>Glasses</span><Switch checked={spec.glasses} onCheckedChange={v=>set('glasses',v)}/></label>
      <label className="switch-row"><span>Tail</span><Switch checked={spec.tail} onCheckedChange={v=>set('tail',v)}/></label>
      {!animal&&<label className="switch-row"><span>Matching minifigure</span><Switch checked={spec.minifig} onCheckedChange={v=>set('minifig',v)}/></label>}
    </div>
  </div>;
}

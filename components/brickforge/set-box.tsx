'use client';
import {useMemo} from 'react';
import {BookOpen,Download,Image as ImageIcon,Trash2} from 'lucide-react';
import {Model,bounds,color,partName} from '@/lib/brick-engine';
import {boxArtSvg,buildSteps,setNumber,ageFor} from '@/lib/exports';
import {lookFromParts,minifigSvg} from '@/lib/minifig';
import PartThumb from '@/components/brickforge/part-thumb';

export async function svgToPng(svg:string,width:number,height:number){
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  try{const img=new Image();await new Promise<void>((ok,no)=>{img.onload=()=>ok();img.onerror=()=>no(new Error('Could not render the box art.'));img.src=url});
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d')!.drawImage(img,0,0,width,height);
    return await new Promise<Blob>((ok,no)=>canvas.toBlob(b=>b?ok(b):no(new Error('Could not create the image.')),'image/png'));}
  finally{URL.revokeObjectURL(url)}
}

export default function SetBox({model,grayscale,estimate,onDownloadArt,onInstructions,onRemoveMinifig}:{model:Model;grayscale:boolean;estimate:number;onDownloadArt:()=>void;onInstructions:()=>void;onRemoveMinifig:()=>void}){
  const art=useMemo(()=>model.bricks.length?boxArtSvg(model,{grayscale}):'',[model,grayscale]);
  const steps=useMemo(()=>buildSteps(model).length,[model]);const b=bounds(model.bricks);
  const extras=model.extras||[],look=extras.length?lookFromParts(extras):null,pieces=model.bricks.length+extras.reduce((n,e)=>n+e.qty,0);
  return <div className="set-view">
    <div className="set-art" dangerouslySetInnerHTML={{__html:art}}/>
    <div className="set-facts">
      <div><strong>#{setNumber(model)}</strong><span>set number</span></div>
      <div><strong>{pieces.toLocaleString()}</strong><span>pieces</span></div>
      <div><strong>{steps}</strong><span>build steps</span></div>
      <div><strong>{ageFor(pieces)}</strong><span>suggested age</span></div>
      <div><strong>{(b.w*.8).toFixed(1)} × {(b.d*.8).toFixed(1)} × {(b.h*.32).toFixed(1)}</strong><span>cm (W × D × H)</span></div>
      <div><strong>${estimate.toFixed(2)}</strong><span>est. to complete</span></div>
    </div>
    <div className="set-actions"><button className="primary" onClick={onDownloadArt}><ImageIcon size={16}/> Download box art</button><button className="dark-button" onClick={onInstructions}><BookOpen size={16}/> Instruction booklet</button></div>
    {extras.length>0&&<section className="set-minifig">
      {look&&<div className="set-fig" dangerouslySetInnerHTML={{__html:minifigSvg(look,110)}}/>}
      <div className="set-fig-parts"><div className="between"><h3>Matching minifigure</h3><button className="icon-btn light" title="Remove minifigure from this set" aria-label="Remove minifigure from this set" onClick={onRemoveMinifig}><Trash2 size={16}/></button></div>
        <ul>{extras.map(e=><li key={e.part+':'+e.color}><PartThumb id={e.part} color={e.color} size={34}/><span><strong>{partName(e.part,e.name)}</strong><small>#{e.part} · {color(e.color).name}</small></span></li>)}</ul>
        <p className="micro">Real plain parts matched to your character. Printed faces and torso designs are not included.</p></div>
    </section>}
    <p className="micro">Box art is generated from your model for personal use. <Download size={11}/> exports keep exact part IDs and colors.</p>
  </div>;
}

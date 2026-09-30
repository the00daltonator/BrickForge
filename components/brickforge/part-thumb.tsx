'use client';
import {useMemo,useState} from 'react';
import {Boxes} from 'lucide-react';
import {part} from '@/lib/brick-engine';
import {partIconSvg} from '@/lib/render';
import {partImageUrl} from '@/lib/exports';
import {isStaticSite} from '@/lib/site';

// Grid parts draw instantly from local geometry. Other catalog parts (minifigure pieces,
// Technic, specialty elements) load Rebrickable's rendered image, trying fallback colors.
export default function PartThumb({id,color,size=40,fallbackColors=[71,0,15]}:{id:string;color:number;size?:number;fallbackColors?:number[]}){
  const local=useMemo(()=>part(id)?partIconSvg(id,color,size*2):'',[id,color,size]);
  const colors=useMemo(()=>[color,...fallbackColors.filter(c=>c!==color)],[color,fallbackColors]);
  const [attempt,setAttempt]=useState(0);
  const [key,setKey]=useState(`${id}:${color}`);
  if(key!==`${id}:${color}`){setKey(`${id}:${color}`);setAttempt(0)}
  if(local)return <span className="part-thumb" style={{width:size,height:size}} aria-hidden="true" dangerouslySetInnerHTML={{__html:local}}/>;
  // The static site cannot load third-party images.
  if(attempt>=colors.length||isStaticSite())return <span className="part-thumb part-thumb-empty" style={{width:size,height:size}} aria-hidden="true"><Boxes size={Math.round(size*.55)}/></span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <span className="part-thumb" style={{width:size,height:size}}><img src={partImageUrl(id,colors[attempt])} alt="" width={size} height={size} loading="lazy" referrerPolicy="no-referrer" onError={()=>setAttempt(a=>a+1)}/></span>;
}

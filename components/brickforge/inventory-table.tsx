'use client';
import {useMemo,useState} from 'react';
import {ChevronLeft,ChevronRight,Download,Search,Trash2} from 'lucide-react';
import {toast} from 'sonner';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '@/components/ui/table';
import {Stock,part,partName,color,key} from '@/lib/brick-engine';
import {isMinifigPart} from '@/lib/minifig';
import {download,inventoryCsv,inventoryXml} from '@/lib/exports';
import PartThumb from '@/components/brickforge/part-thumb';

const PAGE=50;
type Filter='all'|'ready'|'specialty'|'minifig'|'unsorted';
export default function InventoryTable({inventory,onChange}:{inventory:Stock[];onChange:(next:Stock[])=>void}){
  const [search,setSearch]=useState(''),[filter,setFilter]=useState<Filter>('all'),[colorFilter,setColorFilter]=useState('all'),[sort,setSort]=useState('qty'),[page,setPage]=useState(0);
  const colors=useMemo(()=>{const m=new Map<number,number>();for(const s of inventory)m.set(s.color,(m.get(s.color)||0)+s.qty);return [...m].sort((a,b)=>b[1]-a[1])},[inventory]);
  const total=inventory.reduce((n,s)=>n+s.qty,0);
  const rows=useMemo(()=>{const words=search.toLowerCase().split(/\s+/).filter(Boolean);
    const out=inventory.filter(r=>{if(colorFilter!=='all'&&String(r.color)!==colorFilter)return false;
      if(filter==='ready'&&!part(r.part))return false;if(filter==='specialty'&&(part(r.part)||isMinifigPart(r.part)))return false;if(filter==='minifig'&&!isMinifigPart(r.part))return false;if(filter==='unsorted'&&r.location)return false;
      const text=`${r.part} ${partName(r.part,r.name)} ${color(r.color).name} ${r.location??''}`.toLowerCase();return words.every(w=>text.includes(w))});
    const by:Record<string,(a:Stock,b:Stock)=>number>={qty:(a,b)=>b.qty-a.qty,part:(a,b)=>partName(a.part,a.name).localeCompare(partName(b.part,b.name)),color:(a,b)=>color(a.color).name.localeCompare(color(b.color).name),location:(a,b)=>(a.location??'~').localeCompare(b.location??'~')};
    return out.sort(by[sort]);},[inventory,search,filter,colorFilter,sort]);
  const pages=Math.max(1,Math.ceil(rows.length/PAGE)),current=Math.min(page,pages-1),shown=rows.slice(current*PAGE,current*PAGE+PAGE);
  const update=(r:Stock,patch:Partial<Stock>)=>onChange(inventory.map(a=>key(a.part,a.color)===key(r.part,r.color)?{...a,...patch}:a));
  const remove=(r:Stock)=>{const old=inventory;onChange(inventory.filter(a=>key(a.part,a.color)!==key(r.part,r.color)));toast('Inventory lot removed',{action:{label:'Undo',onClick:()=>onChange(old)}})};
  const exportXml=()=>{const r=inventoryXml(inventory);download('my-inventory-bricklink.xml',r.xml,'application/xml');toast.success(r.skipped?`BrickLink XML ready. ${r.skipped} lots skipped: their colors have no verified BrickLink mapping (they remain in the CSV).`:'BrickLink XML ready.')};
  return <section className="white-card inventory-table">
    <div className="between wrap"><h2>Your pieces</h2><div className="action-row"><button className="outline" onClick={()=>download('my-inventory.csv',inventoryCsv(inventory),'text/csv')} disabled={!inventory.length}><Download size={15}/> CSV</button><button className="outline" onClick={exportXml} disabled={!inventory.length}><Download size={15}/> BrickLink XML</button></div></div>
    {colors.length>0&&<div className="color-breakdown" aria-label="Pieces by color">{colors.slice(0,14).map(([id,n])=><button key={id} title={`${color(id).name}: ${n.toLocaleString()} pieces`} aria-label={`Filter ${color(id).name}`} style={{flexGrow:n,background:color(id).hex}} onClick={()=>{setColorFilter(colorFilter===String(id)?'all':String(id));setPage(0)}} data-selected={colorFilter===String(id)}/>)}{colors.length>14&&<span style={{flexGrow:colors.slice(14).reduce((a,[,n])=>a+n,0)}} className="more-colors" title={`${colors.length-14} more colors`}/>}</div>}
    <div className="inventory-controls">
      <label className="search-box"><Search size={17}/><input placeholder="Search part, color or bin…" aria-label="Search inventory" value={search} onChange={e=>{setSearch(e.target.value);setPage(0)}}/></label>
      <Select value={filter} onValueChange={v=>{setFilter(v as Filter);setPage(0)}}><SelectTrigger className="pick" aria-label="Filter lots"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All lots</SelectItem><SelectItem value="ready">Build-ready bricks & plates</SelectItem><SelectItem value="minifig">Minifigure parts</SelectItem><SelectItem value="specialty">Specialty parts</SelectItem><SelectItem value="unsorted">No storage bin yet</SelectItem></SelectContent></Select>
      <Select value={colorFilter} onValueChange={v=>{setColorFilter(v);setPage(0)}}><SelectTrigger className="pick" aria-label="Filter by color"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All colors</SelectItem>{colors.map(([id,n])=><SelectItem key={id} value={String(id)}>{color(id).name} ({n.toLocaleString()})</SelectItem>)}</SelectContent></Select>
      <Select value={sort} onValueChange={setSort}><SelectTrigger className="pick" aria-label="Sort lots"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="qty">Most pieces first</SelectItem><SelectItem value="part">Part name</SelectItem><SelectItem value="color">Color</SelectItem><SelectItem value="location">Storage bin</SelectItem></SelectContent></Select>
    </div>
    <p className="caption">{rows.length.toLocaleString()} of {inventory.length.toLocaleString()} lots · {total.toLocaleString()} pieces. Storage bins are your own labels (e.g. “Drawer A3”) and export with CSV and XML.</p>
    <Table><TableHeader><TableRow><TableHead/><TableHead>Part</TableHead><TableHead>Color</TableHead><TableHead>Quantity</TableHead><TableHead>Storage bin</TableHead><TableHead>Use</TableHead><TableHead/></TableRow></TableHeader>
      <TableBody>{shown.map(r=><TableRow key={key(r.part,r.color)}>
        <TableCell><PartThumb id={r.part} color={r.color} size={36}/></TableCell>
        <TableCell><strong>{partName(r.part,r.name)}</strong><small>#{r.part}</small></TableCell>
        <TableCell><span className="color-dot" style={{background:color(r.color).hex}}/>{color(r.color).name}</TableCell>
        <TableCell><input className="qty-input" aria-label={`Quantity for ${r.part} ${color(r.color).name}`} type="number" min={0} max={100000} value={r.qty} onChange={e=>{const qty=Number(e.target.value);if(Number.isInteger(qty)&&qty>=0&&qty<=100000)update(r,{qty})}}/></TableCell>
        <TableCell><input className="bin-input" aria-label={`Storage bin for ${r.part} ${color(r.color).name}`} placeholder="Add bin" maxLength={40} value={r.location??''} onChange={e=>update(r,{location:e.target.value.slice(0,40)||undefined})}/></TableCell>
        <TableCell><span className={part(r.part)?'green-text':'muted'}>{part(r.part)?'Ready to build':isMinifigPart(r.part)?'Minifigure':'Stored · external CAD'}</span></TableCell>
        <TableCell><button className="icon-btn" aria-label={`Remove ${r.part} ${color(r.color).name}`} onClick={()=>remove(r)}><Trash2 size={16}/></button></TableCell>
      </TableRow>)}</TableBody></Table>
    {!rows.length&&<p className="empty-small">No pieces match these filters.</p>}
    {pages>1&&<div className="catalog-pager"><button className="outline" disabled={!current} onClick={()=>setPage(current-1)}><ChevronLeft size={16}/> Previous</button><span>{current+1} / {pages}</span><button className="outline" disabled={current>=pages-1} onClick={()=>setPage(current+1)}>Next <ChevronRight size={16}/></button></div>}
  </section>;
}

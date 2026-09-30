"""Build a versioned, local Rebrickable catalog. Source CSV archives are downloads,
not migrations. Retain all colors and specialty parts; expand minifigs/subsets.
Usage: python scripts/build-catalog.py /absolute/path/to/csv-archives
"""
import gzip,csv,json,sys,pathlib,collections,datetime,re
src=pathlib.Path(sys.argv[1]);out=pathlib.Path('public/catalog');out.mkdir(exist_ok=True,parents=True)
def rows(n):return csv.DictReader(gzip.open(src/(n+'.csv.gz'),'rt',encoding='utf-8'))
def save(n,v): (out/n).write_text(json.dumps(v,separators=(',',':'),ensure_ascii=False))
colors=[{'id':int(r['id']),'name':r['name'],'hex':'#'+r['rgb'].lower(),'transparent':r['is_trans']=='True','count':int(r['num_parts'])} for r in rows('colors')]
parts=[[r['part_num'],r['name'],int(r['part_cat_id']),r['part_material']] for r in rows('parts')]
categories={r['id']:r['name'] for r in rows('part_categories')}
latest={}
for r in rows('inventories'):
 k=r['set_num'];v=(int(r['version']),int(r['id']))
 if k not in latest or v>latest[k]:latest[k]=v
byid={v[1]:k for k,v in latest.items()};direct=collections.defaultdict(list);children=collections.defaultdict(list)
for r in rows('inventory_parts'):
 k=byid.get(int(r['inventory_id']))
 if k:direct[k].append([r['part_num'],int(r['color_id']),int(r['quantity']),int(r['is_spare']=='True')])
for file,idfield in [('inventory_minifigs','fig_num'),('inventory_sets','set_num')]:
 for r in rows(file):
  k=byid.get(int(r['inventory_id']))
  if k:children[k].append((r[idfield],int(r['quantity'])))
cache={}
def expand(k,stack=()):
 if k in cache:return cache[k]
 if k in stack:raise RuntimeError('Cyclic inventory reference: '+k)
 merged=collections.Counter();unresolved=[]
 for p,c,q,s in direct.get(k,[]):merged[(p,c,s)]+=q
 for child,qty in children.get(k,[]):
  if child not in latest:unresolved.append(child);continue
  items,missing=expand(child,stack+(k,));unresolved.extend(missing)
  for p,c,q,s in items:merged[(p,c,s)]+=q*qty
 result=([[p,c,q,s] for (p,c,s),q in merged.items()],sorted(set(unresolved)))
 cache[k]=result;return result
sets=[];buckets=collections.defaultdict(dict);combinations=collections.defaultdict(set);stockItems=0
for r in rows('sets'):
 k=r['set_num'];items,missing=expand(k)
 if not items and k not in children:continue
 bucket=sum((i+1)*ord(c) for i,c in enumerate(k))%256
 buckets[bucket][k]={'name':r['name'],'year':int(r['year']),'total':int(r['num_parts']),'parts':items,'unresolved':missing}
 sets.append([k,r['name'],int(r['year']),int(r['num_parts']),bucket])
 for p,c,q,s in items:combinations[p].add(c)
 stockItems+=len(items)
for b,values in buckets.items():save(f'sets-{b:03d}.json',values)
save('parts.json',parts);save('colors.json',colors);save('categories.json',categories);save('sets.json',sets)
# Keep availability grouped by category to avoid a monolithic download when browsing.
bycat=collections.defaultdict(dict)
for p,name,category,material in parts:bycat[category][p]=sorted(combinations.get(p,[]))
for c,data in bycat.items():save(f'part-colors-{c}.json',data)
summary={'source':'Rebrickable public downloads','sourceUrl':'https://rebrickable.com/downloads/','snapshotDate':datetime.datetime.now(datetime.timezone.utc).date().isoformat(),'parts':len(parts),'colors':len(colors),'categories':len(categories),'sets':len(sets),'inventoryLots':stockItems,'notes':'Latest inventory per set; includes exploded minifigure and nested-set parts where source records are available. Availability means observed in a catalog set, not current seller stock.'}
save('manifest.json',summary)
# A compact color registry is shared by browser/server for exact inventory identity.
pathlib.Path('lib/catalog-colors.json').write_text(json.dumps(colors,separators=(',',':')))
# Rectangular geometry is deliberately restricted to unambiguous unprinted base parts.
rect=[]
for p,name,category,material in parts:
 match=re.fullmatch(r'(Brick|Plate) (\d+) x (\d+)',name)
 if match and category in (11,14) and re.fullmatch(r'\d+',p):
  w,d=int(match[2]),int(match[3]);h=3 if match[1]=='Brick' else 1
  if w<=48 and d<=48:rect.append({'id':p,'name':name.replace(' x ',' × '),'w':w,'d':d,'h':h,'cost':round(.07+w*d*(.021 if h==3 else .012),2)})
pathlib.Path('lib/catalog-bricks.json').write_text(json.dumps(rect,separators=(',',':')))
print(json.dumps(summary,indent=2));print('Rectangular editor shapes:',len(rect));print('Asset bytes:',sum(p.stat().st_size for p in out.glob('*.json')))

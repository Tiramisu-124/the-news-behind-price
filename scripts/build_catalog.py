"""Regenerate flat observations, coverage, and availability from the verified database."""
import csv
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data'
NAMES={'beef':'Beef','crude':'Crude oil','gold':'Gold','copper':'Copper','beans':'Coffee','cotton':'Cotton','memory':'RAM / DDR4','milk':'Milk','shirt':'T-shirts','shuttle':'Shuttlecocks'}

def build():
    db=json.loads((DATA/'prices.json').read_text(encoding='utf-8'))
    registry=json.loads((DATA/'source-registry.json').read_text(encoding='utf-8'))
    policy=json.loads((DATA/'source-policy.json').read_text(encoding='utf-8'))
    registry['sources_reviewed']=policy['sources_reviewed']
    registry['availability']=[]
    coverage=['# Imported coverage','', 'Generated from `prices.json`; unavailable means not imported and verified, not that no data exists anywhere. Reporting periods are retained.','', '| Product | Market | Imported series and actual coverage | Status / limitation |','|---|---|---|---|']
    for product,name in NAMES.items():
        for market in ['Global','Australia','China']:
            matches=[s for s in db['series'] if s['product_id']==product and s['market']==market and s['observations']]
            reason=policy['limitations'][product][market]
            entry=dict(product_id=product,market=market,status='available' if matches else 'unavailable',reason=reason,series_ids=[s['series_id'] for s in matches])
            registry['availability'].append(entry)
            ranges='; '.join(f"{s['series_id']}: {s['observations'][0]['period']} to {s['observations'][-1]['period']} ({len(s['observations'])} observations; {s['frequency']}; {s['price_type']})" for s in matches) or 'None'
            coverage.append(f'| {name} | {market} | {ranges} | {reason} |')
    (DATA/'source-registry.json').write_text(json.dumps(registry,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (ROOT/'COVERAGE.md').write_text('\n'.join(coverage)+'\n',encoding='utf-8')
    keys=['series_id','product_id','market','region','specification','currency','unit','price_type','frequency','source_name']
    fields=keys+['period','observation_date','period_end','price','source_url','publication_date','last_checked','verification_status','source_sha256','source_locator']
    with (DATA/'observations.csv').open('w',encoding='utf-8',newline='') as stream:
        writer=csv.DictWriter(stream,fieldnames=fields,lineterminator='\n')
        writer.writeheader()
        for s in db['series']:
            for o in s['observations']:
                writer.writerow({**{k:s[k] for k in keys},**o})

if __name__=='__main__':build()

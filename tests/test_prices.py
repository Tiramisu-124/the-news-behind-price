import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
import price_data as p
TODAY=datetime.now(timezone.utc).date().isoformat()

class Prices(unittest.TestCase):
    def setUp(self):
        self.db=p.read_json(p.DATA/'prices.json')
        self.series=copy.deepcopy(self.db['series'][0])

    def test_real_database_and_thirty_market_statuses(self):
        self.assertTrue(p.validate(self.db,TODAY))
        registry=p.read_json(p.DATA/'source-registry.json')
        self.assertEqual(len(registry['availability']),30)
        self.assertEqual(len({(s['product_id'],s['market']) for s in registry['availability']}),30)

    def test_no_fabricated_dates_or_duplicates(self):
        for field,value in [('price',float('nan')),('price',0),('price',True),('observation_date','2099-01-01'),('period_end','2026-01-30')]:
            db=copy.deepcopy(self.db)
            db['series'][0]['observations'][0][field]=value
            with self.subTest(field=field,value=value),self.assertRaises(ValueError):p.validate(db,TODAY)
        self.series['observations'].append(self.series['observations'][0])
        with self.assertRaises(ValueError):p.validate({'series':[self.series]},TODAY)

    def test_revision_never_replaces_verified_history(self):
        incoming=copy.deepcopy(self.series)
        incoming['observations'][0]['price']+=1
        merged,revisions,added=p.merge([self.series],[incoming])
        self.assertEqual(merged[0],self.series)
        self.assertEqual(len(revisions),1)
        self.assertEqual(added,0)

    def test_unit_or_specification_change_quarantined(self):
        for key,value in [('currency','AUD'),('unit','pound'),('specification','Different grade'),('source_series_id','REPLACEMENT-ID')]:
            incoming=copy.deepcopy(self.series);incoming[key]=value
            merged,revisions,added=p.merge([self.series],[incoming])
            self.assertEqual(merged,[self.series]);self.assertEqual(len(revisions),1)

    def test_repeat_import_is_idempotent_and_omissions_keep_history(self):
        result,revisions,added=p.merge([self.series],[self.series])
        self.assertEqual(result,[self.series]);self.assertEqual(revisions,[]);self.assertEqual(added,0)
        short=copy.deepcopy(self.series);short['observations']=short['observations'][-1:]
        self.assertEqual(p.merge([self.series],[short])[0],[self.series])

    def test_new_observations_append_without_mutating_input(self):
        old=copy.deepcopy(self.series);old['observations']=old['observations'][:-1]
        before=copy.deepcopy(old)
        result,revisions,added=p.merge([old],[self.series])
        self.assertEqual(old,before);self.assertEqual(result,[self.series]);self.assertEqual(added,1)

    def test_duplicate_incoming_rejected(self):
        self.series['observations']*=2
        with self.assertRaises(ValueError):p.merge([],[self.series])

    def test_index_has_no_currency(self):
        db=copy.deepcopy(self.db)
        next(s for s in db['series'] if s['price_type']=='price_index')['currency']='AUD'
        with self.assertRaises(ValueError):p.validate(db,TODAY)

    def test_failed_downloads_preserve_database(self):
        p.CACHE.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=p.CACHE) as tmp:
            data=Path(tmp)
            p.write_json(data/'prices.json',self.db)
            with patch.object(p,'DATA',data),patch.object(p,'fetch',side_effect=TimeoutError('fixture timeout')),patch('build_catalog.build'):
                self.assertFalse(p.refresh(TODAY))
            self.assertEqual(p.read_json(data/'prices.json')['series'],self.db['series'])
            self.assertTrue(all(x['status']=='failed' for x in p.read_json(data/'update-report.json')['sources']))

    def test_dry_run_stages_all_writes_and_retains_diagnostics(self):
        p.CACHE.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=p.CACHE) as tmp:
            data=Path(tmp)/'published';cache=Path(tmp)/'cache'
            p.write_json(data/'prices.json',self.db)
            before=(data/'prices.json').read_bytes()
            def simulated_refresh(checked, data_dir=None):
                self.assertNotEqual(data_dir,data)
                p.write_json(data_dir/'prices.json',{'test_only':'staged update'})
                p.write_json(data_dir/'update-report.json',{'sources':[{'status':'ok'}]})
                return True
            with patch.object(p,'DATA',data),patch.object(p,'CACHE',cache),patch.object(p,'refresh',side_effect=simulated_refresh):
                self.assertTrue(p.dry_run(TODAY))
            self.assertEqual((data/'prices.json').read_bytes(),before)
            self.assertEqual(p.read_json(cache/'dry-run-report.json')['status'],'passed')

    def test_dry_run_failure_does_not_change_published_data(self):
        p.CACHE.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=p.CACHE) as tmp:
            data=Path(tmp)/'published';cache=Path(tmp)/'cache'
            p.write_json(data/'prices.json',self.db)
            before=(data/'prices.json').read_bytes()
            with patch.object(p,'DATA',data),patch.object(p,'CACHE',cache),patch.object(p,'refresh',side_effect=RuntimeError('export failed')):
                with self.assertRaisesRegex(RuntimeError,'export failed'):p.dry_run(TODAY)
            self.assertEqual((data/'prices.json').read_bytes(),before)
            self.assertEqual(p.read_json(cache/'dry-run-report.json')['status'],'failed')

    def test_csv_retains_original_metadata_and_values(self):
        import csv
        with (p.DATA/'observations.csv').open(encoding='utf-8',newline='') as stream:rows=list(csv.DictReader(stream))
        self.assertEqual(len(rows),sum(len(s['observations']) for s in self.db['series']))
        for s in self.db['series']:
            actual=[r for r in rows if r['series_id']==s['series_id']]
            self.assertEqual([float(r['price']) for r in actual],[o['price'] for o in s['observations']])

if __name__=='__main__':unittest.main()

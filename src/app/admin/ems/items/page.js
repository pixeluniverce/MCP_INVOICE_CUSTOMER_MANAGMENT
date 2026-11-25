import { sql, inr } from '@/ems/lib/db';
import { addItem, importItems, updateItem, toggleItem } from '@/ems/actions';
import { Head } from '@/ems/components/ui';

export default async function Items({ searchParams }) {
  const q = (searchParams.q || '').toLowerCase();
  const [all, hist] = await Promise.all([
    sql`select * from items order by code`,
    sql`select item_id, rate, changed_at::date::text d from item_rate_history order by id desc`,
  ]);
  const items = all.filter((i) => !q || i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q));
  const h = {}; hist.forEach((x) => (h[x.item_id] ||= []).push(x));
  return (
    <>
      <Head t="Items & rates">
        <a href="/admin/ems/items/csv" className="btn">Export CSV</a>
      </Head>
      <form className="card mb-4 flex gap-2"><input name="q" defaultValue={searchParams.q} placeholder="Search items" className="input max-w-xs" /><button className="btn">Search</button></form>
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <details className="card" open={all.length === 0}>
          <summary className="cursor-pointer font-medium text-gray-900">Add one item</summary>
          <form action={addItem} className="mt-3 grid grid-cols-2 gap-3">
            <div><label className="label">Code</label><input name="code" required className="input" placeholder="ITM001" /></div>
            <div><label className="label">Rate per piece (₹)</label><input name="rate" type="number" step="0.01" min="0" required className="input" /></div>
            <div><label className="label">Name</label><input name="name" required className="input" /></div>
            <div><label className="label">Unit</label><input name="unit" defaultValue="pcs" className="input" /></div>
            <div className="col-span-2"><label className="label">Description</label><input name="description" className="input" /></div>
            <div><button className="btn-primary">Save item</button></div>
          </form>
        </details>
        <details className="card">
          <summary className="cursor-pointer font-medium text-gray-900">Bulk import (paste from Excel or CSV)</summary>
          <form action={importItems} className="mt-3 space-y-2">
            <p className="text-xs text-gray-500">One item per line: <code>CODE,Name,Rate</code>. Existing codes are skipped. In Excel, save as CSV and paste the lines here.</p>
            <textarea name="lines" rows="5" className="input font-mono" placeholder={'ITM001,Item A,5\nITM002,Item B,8'} />
            <button className="btn-primary">Import items</button>
          </form>
        </details>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="tbl">
          <thead><tr><th>Code</th><th>Name and current rate</th><th>Status</th><th>Rate history</th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className={i.active ? '' : 'opacity-50'}>
                <td>{i.code}</td>
                <td>
                  <form action={updateItem} className="flex gap-2">
                    <input type="hidden" name="id" value={i.id} />
                    <input name="name" defaultValue={i.name} className="input min-w-[8rem]" />
                    <input name="rate" type="number" step="0.01" min="0" defaultValue={i.rate} className="input w-24" />
                    <button className="btn">Update</button>
                  </form>
                </td>
                <td><form action={toggleItem}><input type="hidden" name="id" value={i.id} /><button className="text-sm text-primary">{i.active ? 'Deactivate' : 'Activate'}</button></form></td>
                <td><details><summary className="cursor-pointer text-xs text-gray-500">{(h[i.id] || []).length} change(s)</summary>
                  {(h[i.id] || []).map((x, k) => (<div key={k} className="text-xs">{x.d}: {inr(x.rate)}</div>))}</details></td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan="4" className="py-6 text-center text-gray-500">No items yet. Add one or bulk import above.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

export const dynamic = 'force-dynamic';

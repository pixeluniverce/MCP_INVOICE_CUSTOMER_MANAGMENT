import Link from 'next/link';
import { balances } from '@/ems/lib/data';
import { sql, inr, today } from '@/ems/lib/db';
import { addEmployee } from '@/ems/actions';
import { Head } from '@/ems/components/ui';

export default async function Employees({ searchParams }) {
  const q = (searchParams.q || '').toLowerCase(), st = searchParams.s || '';
  const [all, groups, [uf]] = await Promise.all([balances(), sql`select id, name from employee_groups where active order by name`,
    sql`select count(*) n from daily_groups g where not g.finalized and exists (select 1 from production_batches b where b.daily_group_id=g.id)`]);
  const rows = all.filter((e) => (!q || e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q)) && (!st || (st === 'active') === e.active));
  return (
    <>
      <Head t="Employees" />
      {+uf.n > 0 && <p className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">{uf.n} group(s) have production that is not finalized yet. Earnings appear here only after you finalize them on <Link className="underline" href="/admin/ems/distribution">Earnings Distribution</Link>.</p>}
      <form className="card mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={searchParams.q} placeholder="Search by name or ID" className="input max-w-xs" />
        <select name="s" defaultValue={st} className="input max-w-[10rem]"><option value="">All</option><option value="active">Active</option><option value="inactive">Inactive / archived</option></select>
        <button className="btn">Search</button>
      </form>
      <details className="card mb-4" open={all.length === 0}>
        <summary className="cursor-pointer font-medium text-gray-900">Add employee</summary>
        <form action={addEmployee} className="mt-3 grid gap-3 md:grid-cols-3">
          <div><label className="label">Full name</label><input name="name" required className="input" /></div>
          <div><label className="label">Mobile</label><input name="mobile" className="input" inputMode="tel" /></div>
          <div><label className="label">Joining date</label><input name="joining_date" type="date" defaultValue={today()} className="input" /></div>
          <div><label className="label">Permanent group (reference)</label><select name="perm_group_id" className="input" defaultValue=""><option value="">None</option>{groups.map((g) => (<option key={g.id} value={g.id}>{g.name}</option>))}</select></div>
          <div className="md:col-span-2"><label className="label">Address</label><input name="address" className="input" /></div>
          <div><label className="label">Opening balance (₹ already owed)</label><input name="opening_balance" type="number" step="0.01" defaultValue="0" className="input" /></div>
          <div className="md:col-span-2"><label className="label">Notes</label><input name="notes" className="input" /></div>
          <div className="flex items-end"><button className="btn-primary">Save employee</button></div>
        </form>
      </details>
      <div className="card overflow-x-auto p-0">
        <table className="tbl">
          <thead><tr><th>ID</th><th>Name</th><th>Mobile</th><th>Perm. group</th><th>Period</th><th>Earnings (this period)</th><th>Lifetime</th><th>Advance</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id}>
                <td>{e.code}</td><td><Link className="font-medium text-primary" href={`/admin/ems/employees/${e.id}`}>{e.name}</Link></td>
                <td>{e.mobile}</td><td>{e.gname || '–'}</td><td>{e.cycle_no}</td><td>{inr(e.earned)}</td><td>{inr(e.lifetime)}</td><td>{inr(e.adv)}</td><td>{inr(e.paid)}</td>
                <td className="font-medium">{inr(e.balance)}</td><td>{e.active ? 'Active' : 'Inactive'}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan="11" className="py-6 text-center text-gray-500">No employees found.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

export const dynamic = 'force-dynamic';

'use server';
import { Client } from 'pg';
import { revalidatePath } from 'next/cache';
import { pool, tx } from '@/lib/db';
import { requireAdmin } from '@/ems/lib/db';

// [table, order column, optional]. Order matters (foreign keys).
const TABLES = [
  ['business_settings', 'key'], ['employee_groups', 'id'], ['employees', 'id'], ['items', 'id'], ['item_rate_history', 'id'],
  ['daily_groups', 'id'], ['daily_group_members', 'id'], ['production_batches', 'id'], ['production_batch_items', 'id'],
  ['employee_daily_distributions', 'id'], ['employee_advances', 'id'], ['employee_payments', 'id'],
  ['employee_cycles', 'id', true], ['audit_logs', 'id', true],
];
const SERIAL = TABLES.map((t) => t[0]).filter((t) => t !== 'business_settings');
const TOTALS = `select (select coalesce(sum(share),0) from employee_daily_distributions)::float earned,
  (select coalesce(sum(amount),0) from employee_advances)::float adv, (select coalesce(sum(amount),0) from employee_payments)::float paid`;

// Copies all Employee Management data from your OLD database into this app's database. The connection string is used once and never stored.
export async function importOldEms(fd) {
  await requireAdmin();
  const url = String(fd.get('url') || '').trim(), replace = String(fd.get('replace') || '').trim() === 'REPLACE';
  if (fd.get('agree') !== 'on') return { ok: false, msg: 'Please tick the confirmation box.' };
  if (!/^postgres(ql)?:\/\//i.test(url)) return { ok: false, msg: 'Paste the full connection string. It starts with postgresql://' };
  let src, dst;
  try { src = new URL(url); dst = new URL(process.env.DATABASE_URL); } catch { return { ok: false, msg: 'The connection string is not valid.' }; }
  const norm = (u) => u.hostname.replace('-pooler', '') + u.pathname;
  if (norm(src) === norm(dst)) return { ok: false, msg: 'That is this app\'s own database. If your old employee tables are already in this database, there is nothing to import. Open Employees to check.' };

  // 1) read everything from the old database
  const data = {}, notes = [];
  let srcTotals;
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 15000 });
  try {
    await client.connect();
    for (const [t, key, optional] of TABLES) {
      try {
        const rows = []; let off = 0;
        for (;;) {
          const r = await client.query(`select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) j from (select * from ${t} order by ${key} limit 5000 offset ${off}) x`);
          const chunk = r.rows[0].j; rows.push(...chunk);
          if (chunk.length < 5000) break; off += 5000;
        }
        data[t] = rows;
      } catch (e) {
        if (e.code === '42P01' && optional) { data[t] = []; notes.push(`${t}: not found in the old database (skipped)`); }
        else if (e.code === '42P01') return { ok: false, msg: `The old database has no "${t}" table. Please check that this is your old Employee Management database.` };
        else throw e;
      }
    }
    srcTotals = (await client.query(TOTALS)).rows[0];
  } catch (e) { return { ok: false, msg: 'Could not read the old database: ' + e.message }; }
  finally { await client.end().catch(() => {}); }
  if (!data.employees.length && !data.items.length) return { ok: false, msg: 'The old database has no employees or items to import.' };

  // 2) this app must have no employee data yet (unless the admin explicitly chose to replace it)
  const cur = (await pool.query(`select (select count(*) from employees)::int emp, (select count(*) from items)::int itm, (select count(*) from daily_groups)::int dg, (select count(*) from employee_groups)::int gr`)).rows[0];
  if ((cur.emp || cur.itm || cur.dg || cur.gr) && !replace)
    return { ok: false, needReplace: true, msg: `This app already has employee data (${cur.emp} employees, ${cur.itm} items, ${cur.dg} daily groups). To REPLACE it with the old data, type REPLACE in the box below. Otherwise do not import.` };

  // 3) write everything in ONE transaction: all or nothing
  try {
    await tx(async (c) => {
      if (replace) await c.query(`truncate ${SERIAL.join(', ')} restart identity cascade`);
      for (const [t] of TABLES) {
        const rows = data[t], conflict = t === 'business_settings' ? ' on conflict (key) do update set value = excluded.value' : '';
        for (let i = 0; i < rows.length; i += 1000)
          await c.query(`insert into ${t} select * from jsonb_populate_recordset(null::${t}, $1::jsonb)${conflict}`, [JSON.stringify(rows.slice(i, i + 1000))]);
      }
      for (const t of SERIAL) await c.query(`select setval(pg_get_serial_sequence('${t}', 'id'), greatest(coalesce((select max(id) from ${t}), 0), 1), (select count(*) > 0 from ${t}))`);
      await c.query(`select setval('emp_seq', greatest(coalesce((select max(nullif(regexp_replace(code, '\\D', '', 'g'), '')::int) from employees), 0), 1), (select count(*) > 0 from employees))`);
    });
  } catch (e) { return { ok: false, msg: 'Import failed and nothing was changed: ' + e.message }; }

  // 4) verify
  const rows = [];
  for (const [t] of TABLES) rows.push({ t, old: data[t].length, now: (await pool.query(`select count(*)::int n from ${t}`)).rows[0].n });
  const dstTotals = (await pool.query(TOTALS)).rows[0];
  revalidatePath('/admin/ems', 'layout');
  const same = ['earned', 'adv', 'paid'].every((k) => Math.abs(srcTotals[k] - dstTotals[k]) < 0.005);
  return { ok: true, rows, srcTotals, dstTotals, same, notes };
}

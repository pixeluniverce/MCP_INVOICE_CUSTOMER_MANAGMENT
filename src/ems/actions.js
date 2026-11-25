'use server';
import { sql, today, requireAdmin } from '@/ems/lib/db';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { balances } from '@/ems/lib/data';
import { loadGroup } from '@/ems/lib/engine';
import { fromPaise } from '@/ems/lib/split.mjs';

const ok = () => requireAdmin();
const done = () => revalidatePath('/admin/ems', 'layout');
const s = (f, k) => String(f.get(k) ?? '').trim();
const n = (f, k) => Number(f.get(k) || 0);
const ST = ['Present', 'Half Day', 'Absent', 'Leave'];
const audit = (a, d) => sql`insert into audit_logs(action,detail) values(${a},${d})`;

// ---------- employees & permanent groups ----------
export async function addEmployee(f) {
  await ok();
  await sql`insert into employees(name,mobile,address,joining_date,notes,opening_balance,perm_group_id)
    values(${s(f,'name')},${s(f,'mobile')},${s(f,'address')},${s(f,'joining_date') || null},${s(f,'notes')},${n(f,'opening_balance')},${n(f,'perm_group_id') || null})`;
  done();
}
export async function updateEmployee(f) {
  await ok();
  await sql`update employees set name=${s(f,'name')}, mobile=${s(f,'mobile')}, address=${s(f,'address')}, notes=${s(f,'notes')},
    active=${f.get('active') === 'on'}, opening_balance=${n(f,'opening_balance')}, perm_group_id=${n(f,'perm_group_id') || null} where id=${n(f,'id')}`;
  done();
}
// Employees with any history are archived (made inactive), never deleted.
export async function deleteEmployee(f) {
  await ok();
  const id = n(f, 'id');
  const [h] = await sql`select (exists(select 1 from daily_group_members where employee_id=${id}) or exists(select 1 from employee_daily_distributions where employee_id=${id})
    or exists(select 1 from employee_advances where employee_id=${id}) or exists(select 1 from employee_payments where employee_id=${id})) as has`;
  if (h.has) await sql`update employees set active=false where id=${id}`; else await sql`delete from employees where id=${id}`;
  await audit('employee_remove', `id ${id} ${h.has ? 'archived' : 'deleted'}`);
  done(); redirect('/admin/ems/employees');
}
export async function addGroup(f) { await ok(); await sql`insert into employee_groups(name,description) values(${s(f,'name')},${s(f,'description')}) on conflict (name) do nothing`; done(); }
export async function updateGroup(f) { await ok(); await sql`update employee_groups set name=${s(f,'name')}, description=${s(f,'description')} where id=${n(f,'id')}`; done(); }
export async function toggleGroup(f) { await ok(); await sql`update employee_groups set active = not active where id=${n(f,'id')}`; done(); }

// ---------- items ----------
export async function addItem(f) {
  await ok();
  const r = await sql`insert into items(code,name,description,unit,rate) values(${s(f,'code').toUpperCase()},${s(f,'name')},${s(f,'description')},${s(f,'unit') || 'pcs'},${n(f,'rate')}) on conflict (code) do nothing returning id, rate`;
  if (r[0]) await sql`insert into item_rate_history(item_id,rate) values(${r[0].id},${r[0].rate})`;
  done();
}
export async function importItems(f) {
  await ok();
  for (const line of s(f, 'lines').split('\n')) {
    const [code, name, rate] = line.split(',').map((x) => x.trim());
    if (!code || !name || isNaN(+rate)) continue;
    const r = await sql`insert into items(code,name,rate) values(${code.toUpperCase()},${name},${+rate}) on conflict (code) do nothing returning id, rate`;
    if (r[0]) await sql`insert into item_rate_history(item_id,rate) values(${r[0].id},${r[0].rate})`;
  }
  done();
}
export async function updateItem(f) {
  await ok();
  const id = n(f, 'id'), rate = n(f, 'rate');
  const cur = await sql`select rate from items where id=${id}`;
  await sql`update items set name=${s(f,'name')}, rate=${rate} where id=${id}`;
  if (cur[0] && +cur[0].rate !== rate) await sql`insert into item_rate_history(item_id,rate) values(${id},${rate})`;
  done();
}
export async function toggleItem(f) { await ok(); await sql`update items set active = not active where id=${n(f,'id')}`; done(); }

// ---------- daily groups & attendance ----------
export async function createDailyGroup(f) {
  await ok();
  const date = s(f, 'date'), name = s(f, 'name'), pg = n(f, 'perm_group_id') || null, tmp = f.get('temp') === 'on';
  if (!date || !name) return;
  const r = await sql`insert into daily_groups(work_date,name,perm_group_id,is_temporary) values(${date}::date,${name},${pg},${tmp}) on conflict (work_date,name) do nothing returning id`;
  if (r[0] && pg) await sql`insert into daily_group_members(daily_group_id,employee_id,work_date,status)
    select ${r[0].id}::int, e.id, ${date}::date, 'Present' from employees e where e.active and e.perm_group_id=${pg} on conflict (work_date,employee_id) do nothing`;
  done();
}
export async function deleteDailyGroup(f) {
  await ok();
  await sql`delete from daily_groups where id=${n(f,'id')} and not finalized`;
  done();
}
export async function copyPrevious(f) {
  await ok();
  const date = s(f, 'date');
  await sql.transaction((t) => [
    t`insert into daily_groups(work_date,name,perm_group_id,is_temporary)
      select ${date}::date, g.name, g.perm_group_id, g.is_temporary from daily_groups g
      where g.work_date=(select max(work_date) from daily_groups where work_date<${date}::date) on conflict (work_date,name) do nothing`,
    t`insert into daily_group_members(daily_group_id,employee_id,work_date,status)
      select ng.id, m.employee_id, ${date}::date, 'Present' from daily_groups og
      join daily_group_members m on m.daily_group_id=og.id
      join daily_groups ng on ng.name=og.name and ng.work_date=${date}::date and not ng.finalized
      join employees e on e.id=m.employee_id and e.active
      where og.work_date=(select max(work_date) from daily_groups where work_date<${date}::date)
      on conflict (work_date,employee_id) do nothing`,
  ]);
  done();
}
// One employee can be in only ONE group per date (database unique constraint). Finalized groups are locked.
export async function saveAssign(f) {
  await ok();
  const date = s(f, 'date');
  const emps = (await sql`select id from employees where active`).filter((e) => f.has('g_' + e.id));
  if (!emps.length) return;
  await sql.transaction((t) => emps.map(({ id }) => {
    const g = n(f, 'g_' + id), st = ST.includes(s(f, 's_' + id)) ? s(f, 's_' + id) : 'Present';
    if (!g) return t`delete from daily_group_members m using daily_groups d where m.employee_id=${id} and m.work_date=${date}::date and d.id=m.daily_group_id and not d.finalized`;
    return t`insert into daily_group_members(daily_group_id,employee_id,work_date,status)
      select d.id, ${id}::int, ${date}::date, ${st}::text from daily_groups d where d.id=${g} and not d.finalized and d.work_date=${date}::date
      on conflict (work_date,employee_id) do update set daily_group_id=excluded.daily_group_id, status=excluded.status
      where not exists (select 1 from daily_groups x where x.id=daily_group_members.daily_group_id and x.finalized)`;
  }));
  done();
}

// ---------- production (rates read from DB and frozen into each line) ----------
export async function saveWork(f) {
  await ok();
  const gid = n(f, 'daily_group_id');
  let rows = [];
  try { rows = JSON.parse(s(f, 'rows')); } catch {}
  rows = rows.filter((r) => r.item_id && +r.qty > 0);
  if (!gid || !rows.length) return { ok: false, msg: 'Select a group and add at least one item with a quantity.' };
  const r = await sql`with b as (insert into production_batches(daily_group_id,notes)
      select ${gid}::int, ${s(f,'notes')}::text where exists (select 1 from daily_groups where id=${gid} and not finalized) returning id)
    insert into production_batch_items(batch_id,item_id,qty,rate,amount)
    select b.id, i.id, r.qty, i.rate, round(r.qty*i.rate,2)
    from b cross join jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) as r(item_id int, qty numeric)
    join items i on i.id=r.item_id returning id`;
  if (!r.length) return { ok: false, msg: 'Group not found or already finalized.' };
  done();
  return { ok: true, msg: 'Production saved.' };
}
export async function deleteBatch(f) {
  await ok();
  const id = n(f, 'id');
  await sql`delete from production_batches b using daily_groups d where b.id=${id} and d.id=b.daily_group_id and not d.finalized`;
  await audit('batch_delete', `batch ${id}`);
  done();
}

// ---------- distribution: finalize / reopen ----------
async function doFinalize(id) {
  const L = await loadGroup(id);
  if (!L.g || L.g.finalized) return;
  const poolStr = fromPaise(L.poolPaise);
  await sql.transaction((t) => [
    ...L.split.rows.map((x) => t`insert into employee_daily_distributions(daily_group_id,employee_id,work_date,pool,status,weight,share,cycle)
      select ${id}::int, ${x.employee_id}::int, ${L.g.d}::date, ${poolStr}::numeric, ${x.status}::text, ${x.weight}::numeric, ${fromPaise(x.paise)}::numeric, e.cycle_no
      from employees e where e.id=${x.employee_id}`),
    t`update daily_groups set finalized=true, finalized_at=now(), pool=${poolStr}, undistributed=${fromPaise(L.split.undistributed)} where id=${id} and not finalized`,
    t`insert into audit_logs(action,detail) values('finalize',${`group ${L.g.name} ${L.g.d} pool ${poolStr} undistributed ${fromPaise(L.split.undistributed)}`})`,
  ]);
}
export async function finalizeGroup(f) { await ok(); await doFinalize(n(f, 'id')); done(); }
export async function finalizeDate(f) {
  await ok();
  const ids = await sql`select id from daily_groups where work_date=${s(f,'date')}::date and not finalized order by id`;
  for (const { id } of ids) await doFinalize(id);
  done();
}
// Admin edit of a saved production batch (only while its group is not finalized). Unchanged items keep their saved rate.
export async function updateBatch(f) {
  await ok();
  const id = n(f, 'id');
  let rows = [];
  try { rows = JSON.parse(s(f, 'rows')); } catch {}
  rows = rows.filter((r) => r.item_id && +r.qty > 0);
  if (!id || !rows.length) return { ok: false, msg: 'Add at least one item with a quantity.' };
  const r = await sql`with chk as (select b.id from production_batches b join daily_groups g on g.id=b.daily_group_id where b.id=${id} and not g.finalized),
      old as (select distinct on (item_id) item_id, rate from production_batch_items where batch_id=${id}),
      del as (delete from production_batch_items where batch_id in (select id from chk) returning 1),
      upd as (update production_batches set notes=${s(f,'notes')} where id in (select id from chk) returning id)
    insert into production_batch_items(batch_id,item_id,qty,rate,amount)
    select chk.id, r.item_id, r.qty, coalesce(o.rate,i.rate), round(r.qty*coalesce(o.rate,i.rate),2)
    from chk cross join jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) as r(item_id int, qty numeric)
    join items i on i.id=r.item_id left join old o on o.item_id=r.item_id returning id`;
  if (!r.length) return { ok: false, msg: 'This group is finalized and locked. Reopen it on Earnings Distribution first.' };
  await audit('batch_edit', `batch ${id} edited`);
  done();
  return { ok: true, msg: 'Production updated.' };
}
// Close the employee's current period: record remaining balance as a final payment, save a history row, start next period at 0.
export async function closeCycle(f) {
  await ok();
  const id = n(f, 'id');
  const [b] = await balances(id);
  if (!b) return;
  if (b.balance < 0) redirect(`/admin/ems/employees/${id}?err=` + encodeURIComponent('This employee has taken more advances than earned (negative balance). Recover or settle that before closing the period.'));
  const fin = b.balance, finStr = fin.toFixed(2), d = today();
  await sql.transaction((t) => [
    ...(fin > 0 ? [t`insert into employee_payments(employee_id,tx_date,amount,method,reference,notes,cycle) values(${id},${d}::date,${finStr},'Cash','Settlement',${`Final settlement, period ${b.cycle_no} closed`},${b.cycle_no})`] : []),
    t`insert into employee_cycles(employee_id,cycle_no,closed_on,earned,advances,paid,final_payment) values(${id},${b.cycle_no},${d}::date,${b.earned.toFixed(2)},${b.adv.toFixed(2)},${(b.paid + fin).toFixed(2)},${finStr})`,
    t`update employees set cycle_no = cycle_no + 1 where id=${id}`,
    t`insert into audit_logs(action,detail) values('close_period',${`employee ${id} period ${b.cycle_no} closed, final payment ${finStr}`})`,
  ]);
  done();
  redirect(`/admin/ems/employees/${id}`);
}

export async function reopenGroup(f) {
  await ok();
  const id = n(f, 'id');
  await sql.transaction((t) => [
    t`delete from employee_daily_distributions where daily_group_id=${id}`,
    t`update daily_groups set finalized=false, finalized_at=null, pool=null, undistributed=0 where id=${id}`,
    t`insert into audit_logs(action,detail) values('reopen',${`daily group ${id} reopened by admin`})`,
  ]);
  done();
}

// ---------- advances & payments ----------
export async function addAdvance(f) {
  await ok();
  if (n(f, 'amount') <= 0) return;
  await sql`insert into employee_advances(employee_id,tx_date,amount,method,reference,notes,cycle)
    select e.id, ${s(f,'date')}::date, ${n(f,'amount')}::numeric, ${s(f,'method')}::text, ${s(f,'reference')}::text, ${s(f,'notes')}::text, e.cycle_no from employees e where e.id=${n(f,'employee_id')}`;
  done();
}
export async function deleteAdvance(f) { await ok(); const id = n(f, 'id'); await sql`delete from employee_advances where id=${id}`; await audit('advance_delete', `id ${id}`); done(); }
export async function addPayment(f) {
  await ok();
  const emp = n(f, 'employee_id'), amt = n(f, 'amount');
  if (amt <= 0) return;
  const [b] = await balances(emp);
  if (b && amt > b.balance && f.get('allow_over') !== 'on')
    redirect('/admin/ems/payments?err=' + encodeURIComponent(`Payment ₹${amt} is more than the pending balance ₹${b.balance.toFixed(2)}. Tick "Allow overpayment" to confirm.`));
  await sql`insert into employee_payments(employee_id,tx_date,amount,method,reference,notes,cycle)
    select e.id, ${s(f,'date')}::date, ${amt}::numeric, ${s(f,'method')}::text, ${s(f,'reference')}::text, ${s(f,'notes')}::text, e.cycle_no from employees e where e.id=${emp}`;
  done();
}
export async function deletePayment(f) { await ok(); const id = n(f, 'id'); await sql`delete from employee_payments where id=${id}`; await audit('payment_delete', `id ${id}`); done(); }

// ---------- settings (affect only FUTURE finalizations) ----------
export async function saveSettings(f) {
  await ok();
  const kv = [['business_name', s(f, 'business_name') || 'Mahadev Cement Product'], ['weight_present', String(n(f, 'weight_present') || 1)], ['weight_half', String(n(f, 'weight_half'))]];
  await sql.transaction((t) => kv.map(([k, v]) => t`insert into business_settings(key,value) values(${k},${v}) on conflict (key) do update set value=excluded.value`));
  done();
}

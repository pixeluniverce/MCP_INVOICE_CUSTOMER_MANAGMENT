import { sql } from './db';
// Current-period balance = (opening balance, period 1 only) + earnings - advances - payments, all within the employee's current period.
// "lifetime" is earnings across all periods.
export async function balances(id = null) {
  const r = await sql`select e.id, e.code, e.name, e.mobile, e.address, e.joining_date::text as joining_date, e.notes, e.active,
    e.perm_group_id, g.name as gname, e.opening_balance, e.cycle_no,
    coalesce((select sum(x.share) from employee_daily_distributions x where x.employee_id=e.id and x.cycle=e.cycle_no),0) earned,
    coalesce((select sum(x.share) from employee_daily_distributions x where x.employee_id=e.id),0) lifetime,
    coalesce((select sum(amount) from employee_advances a where a.employee_id=e.id and a.cycle=e.cycle_no),0) adv,
    coalesce((select sum(amount) from employee_payments y where y.employee_id=e.id and y.cycle=e.cycle_no),0) paid
    from employees e left join employee_groups g on g.id=e.perm_group_id
    where (${id}::int is null or e.id=${id}::int) order by e.id`;
  return r.map((x) => {
    const opening = x.cycle_no === 1 ? +x.opening_balance : 0;
    return { ...x, opening, earned: +x.earned, lifetime: +x.lifetime, adv: +x.adv, paid: +x.paid, balance: Math.round((opening + +x.earned - +x.adv - +x.paid) * 100) / 100 };
  });
}

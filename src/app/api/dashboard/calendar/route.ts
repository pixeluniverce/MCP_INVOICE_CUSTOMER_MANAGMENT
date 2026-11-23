import { q } from "@/lib/db";
import { route, qs, HttpError } from "@/lib/api";

// ?month=YYYY-MM  -> per-day invoice count / net sales / received.   ?date=YYYY-MM-DD -> that day's invoices + totals.   Optional &branch=ID
export const GET = route(["admin"], async (req) => {
  const p = qs(req), br = Number(p.get("branch")) || 0, month = p.get("month") || "", date = p.get("date") || "";
  const bi = br ? " AND i.branch_id=$2" : "";
  if (/^\d{4}-\d{2}$/.test(month)) {
    const a = br ? [month, br] : [month], first = `($1||'-01')::date`, rng = (col: string) => `${col} >= ${first} AND ${col} < (${first} + interval '1 month')`;
    const [inv, rec] = await Promise.all([
      q(`SELECT i.date, COUNT(*) invoices, COALESCE(SUM(i.grand_total),0) sales FROM invoices i WHERE i.status='ACTIVE' AND ${rng("i.date")}${bi} GROUP BY i.date`, a),
      br ? q(`SELECT p.date, SUM(pa.amount) received FROM payment_allocations pa JOIN payments p ON p.id=pa.payment_id AND p.status='ACTIVE' JOIN invoices i ON i.id=pa.invoice_id AND i.status='ACTIVE' WHERE ${rng("p.date")}${bi} GROUP BY p.date`, a)
         : q(`SELECT p.date, SUM(p.amount) received FROM payments p WHERE p.status='ACTIVE' AND ${rng("p.date")} GROUP BY p.date`, a),
    ]);
    const days: Record<string, any> = {};
    for (const r of inv) days[r.date] = { date: r.date, invoices: r.invoices, sales: r.sales, received: 0 };
    for (const r of rec) (days[r.date] ||= { date: r.date, invoices: 0, sales: 0, received: 0 }).received = r.received;
    return { days: Object.values(days) };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const a = br ? [date, br] : [date];
    const [list, rec] = await Promise.all([
      q(`SELECT i.id, i.number, i.grand_total, COALESCE(i.gross_total, i.grand_total) gross_total, i.less_amount, c.name customer_name, i.branch_snapshot->>'name' branch FROM invoices i JOIN customers c ON c.id=i.customer_id WHERE i.status='ACTIVE' AND i.date=$1${bi} ORDER BY i.id`, a),
      br ? q(`SELECT COALESCE(SUM(pa.amount),0) v FROM payment_allocations pa JOIN payments p ON p.id=pa.payment_id AND p.status='ACTIVE' JOIN invoices i ON i.id=pa.invoice_id AND i.status='ACTIVE' WHERE p.date=$1${bi}`, a)
         : q(`SELECT COALESCE(SUM(amount),0) v FROM payments WHERE status='ACTIVE' AND date=$1`, a),
    ]);
    const sum = (k: string) => Math.round(list.reduce((s: number, r: any) => s + Number(r[k]), 0) * 100) / 100;
    return { date, count: list.length, net: sum("grand_total"), gross: sum("gross_total"), less: sum("less_amount"), received: rec[0].v, invoices: list };
  }
  throw new HttpError(400, "month or date required");
});

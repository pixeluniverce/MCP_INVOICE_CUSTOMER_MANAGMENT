import { q } from "@/lib/db";
import { route, qs, isDate } from "@/lib/api";
import { INV_WRAP, summarySql } from "@/lib/data";

function rangeFor(r: string, f: string | null, t: string | null): [string, string] {
  const now = new Date(Date.now() + 19800000), y = now.getUTCFullYear(), m = now.getUTCMonth(), d = now.getUTCDate();
  const D = (yy: number, mm: number, dd: number) => new Date(Date.UTC(yy, mm, dd)).toISOString().slice(0, 10);
  const dow = (now.getUTCDay() + 6) % 7;
  switch (r) {
    case "today": return [D(y, m, d), D(y, m, d)];
    case "yesterday": return [D(y, m, d - 1), D(y, m, d - 1)];
    case "week": return [D(y, m, d - dow), D(y, m, d - dow + 6)];
    case "lastmonth": return [D(y, m - 1, 1), D(y, m, 0)];
    case "year": return [D(y, 0, 1), D(y, 11, 31)];
    case "custom": if (isDate(f) && isDate(t)) return [f!, t!];
    default: return [D(y, m, 1), D(y, m + 1, 0)];
  }
}
const THIS_MONTH = `to_char(p.date,'YYYY-MM')=to_char(now() AT TIME ZONE 'Asia/Kolkata','YYYY-MM')`;
const LAST12 = `(date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata')::date - interval '11 months')`;
// Payments are linked to a branch through the invoices they were allocated to.
const ALLOC = `FROM payment_allocations pa JOIN payments p ON p.id=pa.payment_id AND p.status='ACTIVE' JOIN invoices i ON i.id=pa.invoice_id AND i.status='ACTIVE' WHERE i.branch_id=$1`;

export const GET = route(["admin"], async (req) => {
  const p = qs(req); const [from, to] = rangeFor(p.get("range") || "month", p.get("from"), p.get("to"));
  const br = Number(p.get("branch")) || 0;

  if (br) {
    const branch = (await q("SELECT id,name FROM branches WHERE id=$1", [br]))[0];
    const [sales, rec, out, month, counts, monthly, mix, top, recent] = await Promise.all([
      q(`SELECT COALESCE(SUM(grand_total),0) v, COUNT(*) n FROM invoices WHERE status='ACTIVE' AND branch_id=$1 AND date BETWEEN $2 AND $3`, [br, from, to]),
      q(`SELECT COALESCE(SUM(pa.amount),0) v ${ALLOC} AND p.date BETWEEN $2 AND $3`, [br, from, to]),
      q(`SELECT COALESCE(SUM(pending),0) v, COUNT(DISTINCT customer_id) customers FROM (${INV_WRAP}) t WHERE t.branch_id=$1`, [br]),
      q(`SELECT COALESCE(SUM(pa.amount),0) v ${ALLOC} AND ${THIS_MONTH}`, [br]),
      q(`SELECT COUNT(*) total, COUNT(*) FILTER (WHERE pay_status='PAID') paid, COUNT(*) FILTER (WHERE pay_status<>'PAID') pending FROM (${INV_WRAP}) t WHERE t.branch_id=$1`, [br]),
      q(`SELECT to_char(p.date,'YYYY-MM') m, SUM(pa.amount) v ${ALLOC} AND p.date >= ${LAST12} GROUP BY 1 ORDER BY 1`, [br]),
      q(`SELECT pay_status, COALESCE(SUM(grand_total),0) v, COUNT(*) n FROM (${INV_WRAP}) t WHERE t.branch_id=$1 GROUP BY pay_status`, [br]),
      q(`SELECT customer_id id, customer_name name, SUM(pending) outstanding FROM (${INV_WRAP}) t WHERE t.branch_id=$1 AND pending>0.004 GROUP BY customer_id, customer_name ORDER BY 3 DESC LIMIT 8`, [br]),
      q(`SELECT * FROM ((SELECT 'invoice' kind, 'Invoice ' || number text, created_at at FROM invoices WHERE branch_id=$1 ORDER BY created_at DESC LIMIT 8)
          UNION ALL (SELECT 'payment', 'Payment ' || p.receipt_no || ' Rs ' || pa.amount, p.created_at ${ALLOC} ORDER BY p.created_at DESC LIMIT 8)) x ORDER BY at DESC LIMIT 15`, [br]),
    ]);
    return { branch, from, to, sales: sales[0].v, sales_count: sales[0].n, received: rec[0].v, outstanding: out[0].v, customers: out[0].customers, received_month: month[0].v, invoices: counts[0], monthly, mix, top, recent };
  }

  const [sales, rec, tot, month, counts, monthly, mix, top, recent] = await Promise.all([
    q(`SELECT COALESCE(SUM(grand_total),0) v, COUNT(*) n FROM invoices WHERE status='ACTIVE' AND date BETWEEN $1 AND $2`, [from, to]),
    q(`SELECT COALESCE(SUM(amount),0) v FROM payments WHERE status='ACTIVE' AND date BETWEEN $1 AND $2`, [from, to]),
    q(`SELECT (SELECT COALESCE(SUM(opening_balance),0) FROM customers)+(SELECT COALESCE(SUM(grand_total),0) FROM invoices WHERE status='ACTIVE')-(SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='ACTIVE') v, (SELECT COUNT(*) FROM customers) customers`),
    q(`SELECT COALESCE(SUM(amount),0) v FROM payments p WHERE status='ACTIVE' AND ${THIS_MONTH}`),
    q(`SELECT COUNT(*) total, COUNT(*) FILTER (WHERE pay_status='PAID') paid, COUNT(*) FILTER (WHERE pay_status<>'PAID') pending FROM (${INV_WRAP}) t`),
    q(`SELECT to_char(date,'YYYY-MM') m, SUM(amount) v FROM payments WHERE status='ACTIVE' AND date >= ${LAST12} GROUP BY 1 ORDER BY 1`),
    q(`SELECT pay_status, COALESCE(SUM(grand_total),0) v, COUNT(*) n FROM (${INV_WRAP}) t GROUP BY pay_status`),
    q(`SELECT s.id,s.name,s.outstanding FROM (${summarySql(false)}) s WHERE s.outstanding>0.004 ORDER BY s.outstanding DESC LIMIT 8`),
    q(`SELECT * FROM (
        (SELECT 'invoice' kind, 'Invoice ' || number text, created_at at FROM invoices ORDER BY created_at DESC LIMIT 5)
        UNION ALL (SELECT 'customer', 'New customer ' || name, created_at FROM customers ORDER BY created_at DESC LIMIT 5)
        UNION ALL (SELECT 'payment', 'Payment ' || receipt_no || ' Rs ' || amount, created_at FROM payments ORDER BY created_at DESC LIMIT 5)
        UNION ALL (SELECT 'whatsapp', 'WhatsApp ' || type || ' to ' || mobile || ' (' || status || ')', created_at FROM whatsapp_messages ORDER BY created_at DESC LIMIT 5)
        UNION ALL (SELECT 'challan', 'Challan ' || number, created_at FROM delivery_challans ORDER BY created_at DESC LIMIT 5)) x ORDER BY at DESC LIMIT 15`),
  ]);
  return { branch: null, from, to, sales: sales[0].v, sales_count: sales[0].n, received: rec[0].v, outstanding: tot[0].v, customers: tot[0].customers, received_month: month[0].v, invoices: counts[0], monthly, mix, top, recent };
});

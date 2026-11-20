import { q } from "@/lib/db";
import { route, body, num, qs, HttpError, log } from "@/lib/api";

// Customer-specific product prices (override the product's default rate on new invoices)
export const GET = route(["admin"], async (_r, { params }) => ({
  rows: await q(`SELECT cp.product_id, p.name, p.unit, p.rate default_rate, cp.rate FROM customer_prices cp JOIN products p ON p.id=cp.product_id WHERE cp.customer_id=$1 ORDER BY lower(p.name)`, [Number(params.id)]),
}));
export const POST = route(["admin"], async (req, { s, params }) => {
  const b = await body(req); const rate = num(b.rate, -1);
  if (!(rate >= 0)) throw new HttpError(400, "Enter a valid rate");
  await q(`INSERT INTO customer_prices(customer_id,product_id,rate) VALUES($1,$2,$3) ON CONFLICT (customer_id,product_id) DO UPDATE SET rate=EXCLUDED.rate, updated_at=now()`, [Number(params.id), Number(b.product_id), rate]);
  await log(s.uid, "CUSTOMER_PRICE_SET", `${params.id}/${b.product_id}`); return { ok: true };
});
export const DELETE = route(["admin"], async (req, { s, params }) => {
  await q("DELETE FROM customer_prices WHERE customer_id=$1 AND product_id=$2", [Number(params.id), Number(qs(req).get("product_id"))]);
  await log(s.uid, "CUSTOMER_PRICE_REMOVED", String(params.id)); return { ok: true };
});

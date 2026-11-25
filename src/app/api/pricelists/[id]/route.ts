import { q, tx } from "@/lib/db";
import { route, body, num, HttpError, log } from "@/lib/api";

// Rename / activate and/or save many rates at once. A null/blank rate removes the entry (falls back to the product's default rate).
export const PUT = route(["admin"], async (req, { s, params }) => {
  const b = await body(req), id = Number(params.id);
  await tx(async (c) => {
    if (!(await c.query("SELECT 1 FROM price_lists WHERE id=$1", [id])).rowCount) throw new HttpError(404, "Price list not found");
    if (typeof b.name === "string" && b.name.trim()) await c.query("UPDATE price_lists SET name=$1 WHERE id=$2", [b.name.trim(), id]);
    if (typeof b.active === "boolean") await c.query("UPDATE price_lists SET active=$1 WHERE id=$2", [b.active, id]);
    if (Array.isArray(b.rates)) {
      if (b.rates.length > 2000) throw new HttpError(400, "Too many rows");
      for (const r of b.rates) {
        if (r.rate === null || r.rate === "" || r.rate === undefined) { await c.query("DELETE FROM price_list_items WHERE price_list_id=$1 AND product_id=$2", [id, Number(r.product_id)]); continue; }
        const rate = num(r.rate, -1); if (!(rate >= 0)) throw new HttpError(400, "Enter valid rates (0 or more)");
        await c.query("INSERT INTO price_list_items(price_list_id,product_id,rate) VALUES($1,$2,$3) ON CONFLICT (price_list_id,product_id) DO UPDATE SET rate=EXCLUDED.rate", [id, Number(r.product_id), rate]);
      }
    }
  });
  await log(s.uid, "PRICELIST_UPDATED", String(id)); return { ok: true };
});
export const DELETE = route(["admin"], async (_r, { s, params }) => {
  const r = await q("DELETE FROM price_lists WHERE id=$1 RETURNING name", [Number(params.id)]);
  if (!r.length) throw new HttpError(404, "Price list not found");
  await log(s.uid, "PRICELIST_DELETED", r[0].name); return { ok: true };
});

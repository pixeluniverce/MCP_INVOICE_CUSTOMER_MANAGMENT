import { q } from "@/lib/db";
import { route, body, need, qs, log } from "@/lib/api";

export const GET = route(["admin"], async (req) => {
  const lists = await q("SELECT pl.id, pl.name, pl.active, (SELECT COUNT(*)::int FROM customers c WHERE c.price_list_id=pl.id) customers FROM price_lists pl ORDER BY pl.id");
  if (qs(req).get("lite") === "1") return { rows: lists.filter((l: any) => l.active) };
  const products = await q("SELECT id,name,unit,rate,category FROM products WHERE active ORDER BY lower(name) LIMIT 1000");
  const items = await q("SELECT price_list_id, product_id, rate FROM price_list_items");
  const rates: Record<string, Record<string, number>> = {};
  for (const i of items) (rates[i.price_list_id] ||= {})[i.product_id] = i.rate;
  return { lists, products, rates };
});
export const POST = route(["admin"], async (req, { s }) => {
  const b = await body(req); need(String(b.name || "").trim(), "List name is required");
  const r = await q("INSERT INTO price_lists(name) VALUES($1) RETURNING id", [b.name.trim()]);
  await log(s.uid, "PRICELIST_CREATED", b.name.trim()); return { id: r[0].id };
});

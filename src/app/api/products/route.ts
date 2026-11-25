import { q } from "@/lib/db";
import { route, body, need, num, qs, HttpError, log } from "@/lib/api";

import { IMG_RE } from "@/lib/img";
const COLS = "id,name,description,hsn,rate,unit,gst_rate,active,category,show_in_catalog,image_v,(image IS NOT NULL) has_image";

export const GET = route(["admin"], async (req) => {
  const p = qs(req); const w: string[] = [], a: any[] = [];
  if (p.get("active") === "1") w.push("active");
  if (p.get("search")) { a.push(`%${p.get("search")}%`); w.push(`(name ILIKE $${a.length} OR hsn ILIKE $${a.length} OR category ILIKE $${a.length})`); }
  return { rows: await q(`SELECT ${COLS} FROM products ${w.length ? "WHERE " + w.join(" AND ") : ""} ORDER BY lower(name) LIMIT 1000`, a) };
});
export const POST = route(["admin"], async (req, { s }) => {
  const b = await body(req); need(String(b.name || "").trim(), "Product name is required");
  if (b.image && (!IMG_RE.test(b.image) || b.image.length > 400000)) throw new HttpError(400, "Image must be a PNG, JPG or WebP under 300 KB");
  const r = await q("INSERT INTO products(name,description,hsn,rate,unit,gst_rate,category,show_in_catalog,image,image_v) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id",
    [b.name.trim(), b.description || null, b.hsn || null, num(b.rate), b.unit || "Nos", b.gst_rate === "" || b.gst_rate == null ? null : num(b.gst_rate), b.category || null, b.show_in_catalog !== false, b.image || null, b.image ? 1 : 0]);
  await log(s.uid, "PRODUCT_CREATED", String(r[0].id)); return { id: r[0].id };
});

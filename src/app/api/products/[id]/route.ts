import { q } from "@/lib/db";
import { route, body, need, num, HttpError, log } from "@/lib/api";
import { IMG_RE } from "@/lib/img";

export const PUT = route(["admin"], async (req, { s, params }) => {
  const b = await body(req); need(String(b.name || "").trim(), "Product name is required"); const id = Number(params.id);
  const r = await q("UPDATE products SET name=$1,description=$2,hsn=$3,rate=$4,unit=$5,gst_rate=$6,active=$7,category=$8,show_in_catalog=$9 WHERE id=$10 RETURNING id",
    [b.name.trim(), b.description || null, b.hsn || null, num(b.rate), b.unit || "Nos", b.gst_rate === "" || b.gst_rate == null ? null : num(b.gst_rate), b.active !== false, b.category || null, b.show_in_catalog !== false, id]);
  if (!r.length) throw new HttpError(404, "Product not found");
  if ("image" in b) { // "" removes the picture, a data URL replaces it, undefined/absent leaves it unchanged
    if (!b.image) await q("UPDATE products SET image=NULL, image_v=image_v+1 WHERE id=$1", [id]);
    else if (IMG_RE.test(b.image) && b.image.length <= 400000) await q("UPDATE products SET image=$1, image_v=image_v+1 WHERE id=$2", [b.image, id]);
    else throw new HttpError(400, "Image must be a PNG, JPG or WebP under 300 KB");
  }
  await log(s.uid, "PRODUCT_UPDATED", String(id)); return { ok: true };
});

// Deleting a product is safe for old invoices (they keep their own copy of the item name, rate and tax).
export const DELETE = route(["admin"], async (_r, { s, params }) => {
  const r = await q("DELETE FROM products WHERE id=$1 RETURNING name", [Number(params.id)]);
  if (!r.length) throw new HttpError(404, "Product not found");
  await log(s.uid, "PRODUCT_DELETED", r[0].name); return { ok: true };
});

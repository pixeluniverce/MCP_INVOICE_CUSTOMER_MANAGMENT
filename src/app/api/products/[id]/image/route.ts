import { q } from "@/lib/db";
import { route } from "@/lib/api";
export const GET = route(["admin", "customer"], async (_r, { s, params }) => {
  const r = (await q(`SELECT image, active, show_in_catalog FROM products WHERE id=$1`, [Number(params.id)]))[0];
  const m = r?.image && /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(r.image);
  if (!m || (s.role === "customer" && !(r.active && r.show_in_catalog))) return new Response("No image", { status: 404 });
  return new Response(Buffer.from(m[2], "base64"), { headers: { "Content-Type": m[1], "Cache-Control": "private, max-age=3600" } });
});

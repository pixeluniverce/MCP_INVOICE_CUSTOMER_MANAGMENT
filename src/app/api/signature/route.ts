import { q } from "@/lib/db";
import { route } from "@/lib/api";
// Signature image is only served to logged-in users (admin or customer viewing an invoice).
export const GET = route(["admin", "customer"], async () => {
  const r = (await q("SELECT signature FROM company_settings WHERE id=1"))[0];
  const m = r?.signature && /^data:(image\/(?:png|jpeg));base64,(.+)$/.exec(r.signature);
  if (!m) return new Response("No signature", { status: 404 });
  return new Response(Buffer.from(m[2], "base64"), { headers: { "Content-Type": m[1], "Cache-Control": "private, max-age=60" } });
});

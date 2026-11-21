import { q } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const r = (await q("SELECT logo FROM company_settings WHERE id=1"))[0];
    const m = r?.logo && /^data:(image\/(?:png|jpeg));base64,(.+)$/.exec(r.logo);
    if (!m) return new Response("No logo", { status: 404 });
    return new Response(Buffer.from(m[2], "base64"), { headers: { "Content-Type": m[1], "Cache-Control": "public, max-age=60" } });
  } catch { return new Response("Error", { status: 500 }); }
}

import { q } from "@/lib/db";
import { getSettings } from "@/lib/data";
export const dynamic = "force-dynamic";
const RANK: any = { PENDING: 0, SENT: 1, DELIVERED: 2, READ: 3 };
// Called by the linked-phone service with delivery / read receipts (authenticated by the shared key).
export async function POST(req: Request) {
  const s: any = await getSettings();
  if (!s.wa_bridge_key || req.headers.get("x-api-key") !== s.wa_bridge_key) return new Response("Forbidden", { status: 403 });
  const b = await req.json().catch(() => ({})); const next = String(b.status || "").toUpperCase();
  const row = (await q("SELECT id,status FROM whatsapp_messages WHERE wa_message_id=$1", [String(b.id || "")]))[0];
  if (row) {
    if (next === "FAILED") await q("UPDATE whatsapp_messages SET status='FAILED', error=$1, updated_at=now() WHERE id=$2", [String(b.error || "Failed").slice(0, 300), row.id]);
    else if (next in RANK && RANK[next] > (RANK[row.status] ?? -1)) await q("UPDATE whatsapp_messages SET status=$1, updated_at=now() WHERE id=$2", [next, row.id]);
  }
  return new Response("ok");
}

import { route, body, HttpError } from "@/lib/api";
import { waConfig, bridge } from "@/lib/wa";

// Admin-only proxy to the linked-phone service (so the key and QR never go to the public internet from the browser).
export const GET = route(["admin"], async () => {
  const c = await waConfig();
  if (c.mode !== "device") return { mode: "cloud" };
  try { return { mode: "device", ...(await bridge(c, "/status")) }; }
  catch (e: any) { return { mode: "device", state: "unreachable", error: e.message }; }
});
export const POST = route(["admin"], async (req) => {
  const b = await body(req), c = await waConfig();
  if (c.mode !== "device") throw new HttpError(400, "Linked phone mode is not enabled");
  if (b.action === "logout") { await bridge(c, "/logout", { method: "POST", body: "{}" }); return { ok: true }; }
  throw new HttpError(400, "Unknown action");
});

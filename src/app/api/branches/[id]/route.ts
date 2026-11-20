import { q } from "@/lib/db";
import { route, body, need, HttpError, log } from "@/lib/api";
export const PUT = route(["admin"], async (req, { s, params }) => {
  const b = await body(req); need(String(b.name || "").trim(), "Branch name is required");
  const r = await q("UPDATE branches SET name=$1,address=$2,mobile=$3,gstin=$4,active=$5 WHERE id=$6 RETURNING id", [b.name.trim(), b.address || null, b.mobile || null, (b.gstin || "").toUpperCase() || null, b.active !== false, Number(params.id)]);
  if (!r.length) throw new HttpError(404, "Branch not found");
  await log(s.uid, "BRANCH_UPDATED", String(params.id)); return { ok: true };
});

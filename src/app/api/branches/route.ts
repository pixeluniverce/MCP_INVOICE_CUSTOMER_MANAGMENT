import { q } from "@/lib/db";
import { route, body, need, qs, log } from "@/lib/api";
export const GET = route(["admin"], async (req) => ({ rows: await q(`SELECT * FROM branches ${qs(req).get("active") === "1" ? "WHERE active" : ""} ORDER BY id`) }));
export const POST = route(["admin"], async (req, { s }) => {
  const b = await body(req); need(String(b.name || "").trim(), "Branch name is required");
  const r = await q("INSERT INTO branches(name,address,mobile,gstin) VALUES($1,$2,$3,$4) RETURNING id", [b.name.trim(), b.address || null, b.mobile || null, (b.gstin || "").toUpperCase() || null]);
  await log(s.uid, "BRANCH_CREATED", String(r[0].id)); return { id: r[0].id };
});

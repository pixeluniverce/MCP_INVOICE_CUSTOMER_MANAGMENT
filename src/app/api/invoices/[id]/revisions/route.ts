import { q } from "@/lib/db";
import { route } from "@/lib/api";
export const GET = route(["admin"], async (_r, { params }) => ({
  rows: await q(`SELECT r.id,r.edited_at,r.reason,r.before_total,r.after_total,r.snapshot,u.username FROM invoice_revisions r LEFT JOIN users u ON u.id=r.edited_by WHERE r.invoice_id=$1 ORDER BY r.id DESC`, [Number(params.id)]),
}));

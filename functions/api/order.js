// GET /api/order?session_id=cs_...  ->  the clips this payment unlocked, with download links.
import { json, loadClips, paidSession } from "./_lib.js";

export async function onRequestGet(context) {
  const sid = new URL(context.request.url).searchParams.get("session_id");
  const check = await paidSession(context.env, sid);
  if (check.error) return check.error;

  const clips = await loadClips(context);
  const byId = new Map(clips.map((c) => [c.id, c]));
  const list = check.ids.filter((id) => byId.has(id)).map((id) => ({
    id,
    title: byId.get(id).title,
    url: `/api/download?session_id=${encodeURIComponent(sid)}&clip=${encodeURIComponent(id)}`,
  }));
  return json({ clips: list, expires_at: check.expiresAt });
}

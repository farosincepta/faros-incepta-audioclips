// GET /api/download?session_id=cs_...&clip=FV-0001
// Sends the full clip from the private R2 bucket, only if that payment included that clip.
import { json, loadClips, paidSession } from "./_lib.js";

export async function onRequestGet(context) {
  const q = new URL(context.request.url).searchParams;
  const check = await paidSession(context.env, q.get("session_id"));
  if (check.error) return check.error;

  const clipId = q.get("clip");
  if (!check.ids.includes(clipId)) return json({ error: "This clip is not part of your order." }, 403);

  const clips = await loadClips(context);
  const clip = clips.find((c) => c.id === clipId);
  if (!clip) return json({ error: "Clip not found." }, 404);

  const key = clip.file || `${clip.id}.mp3`;
  const obj = await context.env.CLIPS.get(key);
  if (!obj) return json({ error: "File missing. Please contact support." }, 404);

  const ext = key.split(".").pop();
  const safeTitle = clip.title.normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 40);
  const filename = `${clip.id}${safeTitle ? "-" + safeTitle : ""}.${ext}`;

  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType || (ext === "wav" ? "audio/wav" : "audio/mpeg"),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

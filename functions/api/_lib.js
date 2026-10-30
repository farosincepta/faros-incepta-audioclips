// Shared helpers for the /api routes. Files starting with "_" are not routes.

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// The catalog lives in public/clips.json, the same file the shop page reads.
export async function loadClips(context) {
  const url = new URL("/clips.json", context.request.url);
  const res = await context.env.ASSETS.fetch(url);
  if (!res.ok) throw new Error("clips.json not found");
  return res.json();
}

// Look up a Stripe Checkout Session and check it was paid and is still within the download window.
export async function paidSession(env, sessionId) {
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId || "")) {
    return { error: json({ error: "Invalid order link." }, 400) };
  }
  const res = await fetch(
    "https://api.stripe.com/v1/checkout/sessions/" + encodeURIComponent(sessionId),
    { headers: { Authorization: "Bearer " + env.STRIPE_SECRET_KEY } }
  );
  const session = await res.json();
  if (!res.ok) return { error: json({ error: "Order not found." }, 404) };
  if (session.payment_status !== "paid") {
    return { error: json({ error: "Payment not completed." }, 402) };
  }
  const hours = Number(env.DOWNLOAD_HOURS || 24);
  const expiresAt = (session.created + hours * 3600) * 1000;
  if (Date.now() > expiresAt) {
    return { error: json({ error: "Download link expired." }, 410) };
  }
  const ids = (session.metadata?.clip_ids || "").split(",").filter(Boolean);
  return { session, ids, expiresAt };
}

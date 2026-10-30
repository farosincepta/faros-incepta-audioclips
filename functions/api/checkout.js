// POST /api/checkout  { ids: ["FV-0001", ...] }  ->  { url: "https://checkout.stripe.com/..." }
// Builds a Stripe Checkout Session from the cart. Prices come from clips.json, never from the browser.
import { json, loadClips } from "./_lib.js";

const MAX_CART = 20;

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); } catch { return json({ error: "Bad request." }, 400); }

  const clips = await loadClips(context);
  const byId = new Map(clips.map((c) => [c.id, c]));
  const ids = [...new Set(Array.isArray(body.ids) ? body.ids : [])].slice(0, MAX_CART);
  const chosen = ids.map((id) => byId.get(id)).filter(Boolean);
  if (!chosen.length) return json({ error: "Your cart is empty." }, 400);

  const origin = new URL(request.url).origin;
  const p = new URLSearchParams();
  p.set("mode", "payment");
  p.set("success_url", origin + "/?session_id={CHECKOUT_SESSION_ID}");
  p.set("cancel_url", origin + "/");
  p.set("metadata[clip_ids]", chosen.map((c) => c.id).join(","));
  p.set("customer_creation", "if_required");
  chosen.forEach((c, i) => {
    p.set(`line_items[${i}][quantity]`, "1");
    p.set(`line_items[${i}][price_data][currency]`, "usd");
    p.set(`line_items[${i}][price_data][unit_amount]`, String(c.price_cents || 100));
    p.set(`line_items[${i}][price_data][product_data][name]`, `${c.id} · ${c.title}`);
  });
  // Optional: let Stripe Tax calculate sales tax (set STRIPE_TAX=on after enabling Stripe Tax).
  if (env.STRIPE_TAX === "on") p.set("automatic_tax[enabled]", "true");

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + env.STRIPE_SECRET_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: p,
  });
  const session = await res.json();
  if (!res.ok) return json({ error: session.error?.message || "Payment service error." }, 502);
  return json({ url: session.url });
}

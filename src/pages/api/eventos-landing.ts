import type { APIRoute } from "astro";
import { apiFetch } from "@/lib/api";

export const prerender = false;

/**
 * POST /api/eventos-landing
 * Proxy to NestJS: POST /api/public/eventos-landing
 * Body: evento suelto o { events: [...] }
 *
 * Devuelve siempre 204 al cliente, incluso si el backend falla. La telemetría
 * nunca debe bloquear ni romper la UX del cliente.
 */
export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 204 });
  }

  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null;
  const ua = request.headers.get("user-agent") || null;

  // Forwardear IP/UA en headers para que el backend los use (los headers
  // los lee el controller via request.headers, no via body).
  const forwardHeaders: Record<string, string> = {};
  if (ip) forwardHeaders["x-forwarded-for"] = ip;
  if (ua) forwardHeaders["user-agent"] = ua;

  // Fire-and-forget hacia el backend; no bloqueamos al cliente.
  apiFetch("/eventos-landing", {
    method: "POST",
    body: JSON.stringify(body),
    headers: forwardHeaders,
  }).catch(() => {
    // swallow — la telemetría no debe romper nada
  });

  return new Response(null, { status: 204 });
};

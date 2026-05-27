import type { APIRoute } from "astro";
import { apiFetch } from "@/lib/api";
import { PUBLIC_PLAN_IDS } from "@/lib/public-plans";

export const prerender = false;

/**
 * POST /api/registro-vehiculo
 * Proxy to NestJS: POST /api/public/registro-vehiculo
 * Used when an existing client wants to add a new vehicle with a new membership.
 */
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!body?.idPlan || !PUBLIC_PLAN_IDS.has(body.idPlan)) {
    return new Response(
      JSON.stringify({ error: "Plan no disponible. Seleccioná un plan válido." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { data, error, errorBody, status } = await apiFetch("/registro-vehiculo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (error) {
    // Propagar campos útiles del backend (code, chapa, field) para que el
    // frontend pueda detectar chapa duplicada y ofrecer reintento con sufijo "*".
    const errorPayload: Record<string, unknown> = { error };
    if (errorBody && typeof errorBody === "object") {
      const safe = errorBody as Record<string, unknown>;
      if (safe.code) errorPayload.code = safe.code;
      if (safe.chapa) errorPayload.chapa = safe.chapa;
      if (safe.field) errorPayload.field = safe.field;
    }
    return new Response(JSON.stringify(errorPayload), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

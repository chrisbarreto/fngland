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

  const { data, error, status } = await apiFetch("/registro-vehiculo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (error) {
    return new Response(JSON.stringify({ error }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

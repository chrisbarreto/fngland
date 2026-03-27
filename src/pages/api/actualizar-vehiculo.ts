import type { APIRoute } from "astro";
import { apiFetch } from "@/lib/api";

export const prerender = false;

/**
 * PATCH /api/actualizar-vehiculo
 * Proxy to NestJS: PATCH /api/public/actualizar-vehiculo
 */
export const PATCH: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);

  const { data, error, status } = await apiFetch("/actualizar-vehiculo", {
    method: "PATCH",
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

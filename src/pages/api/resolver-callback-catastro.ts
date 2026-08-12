import type { APIRoute } from "astro";
import { apiFetch } from "@/lib/api";

export const prerender = false;

/**
 * POST /api/resolver-callback-catastro
 * Intercambia el state corto retornado por Bancard por el contexto V2 que el
 * backend validó y almacenó al iniciar el catastro.
 */
export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Cuerpo inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data, error, status } = await apiFetch(
    "/pagopar/resolver-callback-catastro",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );

  return new Response(JSON.stringify(error ? { error } : data), {
    status: error ? status : 200,
    headers: { "Content-Type": "application/json" },
  });
};

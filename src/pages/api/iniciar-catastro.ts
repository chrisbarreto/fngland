import type { APIRoute } from "astro";
import { apiFetch } from "@/lib/api";

export const prerender = false;

/**
 * POST /api/iniciar-catastro
 * Proxy to NestJS: POST /api/public/pagopar/iniciar-catastro
 * Body: { idCliente, token, proveedor, idMembresia? }
 *
 * Mantiene API_KEY_LANDING en el servidor (apiFetch añade x-api-key). El
 * backend valida el token HMAC y devuelve { processId, proveedor, contexto }
 * para renderizar el iframe de Bancard/uPay en /tarjetas/registrar.
 */
export const POST: APIRoute = async ({ request }) => {
  let body: any;

  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Cuerpo de la solicitud inválido" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { data, error, status } = await apiFetch("/pagopar/iniciar-catastro", {
    method: "POST",
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

import type { APIRoute } from "astro";
import { apiFetch } from "@/lib/api";

export const prerender = false;

/**
 * POST /api/consultar-rechazo
 * Proxy a NestJS: POST /api/public/pagopar/consultar-rechazo
 * Body: { idCliente, token }
 *
 * Tras un fallo en el iframe de Bancard sin `description`, este endpoint
 * pregunta al backend el motivo real del rechazo (lo que Pagopar reporta
 * en `confirmar-tarjeta`).
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

  const { data, error, status } = await apiFetch("/pagopar/consultar-rechazo", {
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

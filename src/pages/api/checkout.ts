import type { APIRoute } from "astro";
import { apiFetch } from "@/lib/api";

export const prerender = false;

/**
 * POST /api/checkout
 * Proxy to NestJS: POST /api/public/pagopar/iniciar
 * Body: { idCliente, diaDebito, urlRedirect? }
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

  const { data, error, status } = await apiFetch("/pagopar/iniciar", {
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
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};

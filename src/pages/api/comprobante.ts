import type { APIRoute } from "astro";
import { apiFetch } from "@/lib/api";

export const prerender = false;

/**
 * GET /api/comprobante?numero=N
 * Proxy a NestJS: GET /api/public/pagopar/comprobantes/:numero
 *
 * Devuelve datos JSON del comprobante recién generado para que /gracias
 * pueda construir el PDF client-side.
 */
export const GET: APIRoute = async ({ url }) => {
  const numero = url.searchParams.get("numero");
  if (!numero || !/^\d+$/.test(numero)) {
    return new Response(
      JSON.stringify({ error: "Número de comprobante inválido" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { data, error, status } = await apiFetch(
    `/pagopar/comprobantes/${numero}`,
    { method: "GET" },
  );

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

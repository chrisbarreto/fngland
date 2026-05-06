import type { APIRoute } from "astro";
import { apiFetch } from "@/lib/api";

export const prerender = false;

/**
 * POST /api/confirmar
 * Proxy to NestJS: POST /api/public/pagopar/confirmar
 * Body: { idCliente }
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

  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null;
  const ua = request.headers.get("user-agent") || null;
  if (ip) body.ipAddress = ip;
  if (ua) body.userAgent = ua;

  const { data, error, errorBody, status } = await apiFetch("/pagopar/confirmar", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (error) {
    // Pasar al frontend el detalle estructurado (pagoparErrorMessage,
    // bancardReason, idTransaccion) para que la telemetría capture el motivo
    // real del rechazo en vez de "Cobro rechazado" genérico.
    return new Response(
      JSON.stringify({
        error,
        pagoparErrorMessage: errorBody?.pagoparErrorMessage ?? null,
        bancardReason: errorBody?.bancardReason ?? null,
        idTransaccion: errorBody?.idTransaccion ?? null,
      }),
      {
        status,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

import type { APIRoute } from "astro";
import { apiFetch } from "@/lib/api";
import { PUBLIC_PLAN_IDS } from "@/lib/public-plans";

export const prerender = false;

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

  if (!body?.idPlan || !PUBLIC_PLAN_IDS.has(body.idPlan)) {
    return new Response(
      JSON.stringify({ error: "Plan no disponible. Seleccioná un plan válido." }),
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

  const { data, error, errorBody, status } = await apiFetch("/registro-cliente", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (error) {
    // Propagar campos útiles del backend (idCliente, code, chapa, etc.) para que
    // el frontend pueda recuperar el flujo automáticamente en casos como:
    //  - 409 CI duplicada → reintentar como cliente existente con /api/registro-vehiculo
    //  - 409 chapa duplicada → mostrar diálogo de confirmación con sufijo "*"
    const errorPayload: Record<string, unknown> = { error };
    if (errorBody && typeof errorBody === "object") {
      // Whitelist explícita — no exponer detalles sensibles del backend
      const safe = errorBody as Record<string, unknown>;
      if (safe.idCliente) errorPayload.idCliente = safe.idCliente;
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
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};

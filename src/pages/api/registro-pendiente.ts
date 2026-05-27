import type { APIRoute } from "astro";
import { apiFetch } from "@/lib/api";
import { PUBLIC_PLAN_IDS } from "@/lib/public-plans";

export const prerender = false;

/**
 * GET /api/registro-pendiente?ci=xxx
 * Proxy to NestJS: GET /api/public/registro-pendiente?ci=xxx
 * No Turnstile required for lookup — only censored data is returned.
 * Turnstile verification happens at form submission (paso 3).
 */
export const GET: APIRoute = async ({ url }) => {
  const ci = url.searchParams.get("ci") ?? "";
  // forceClient=true → pedir al backend que retorne idCliente aunque NO haya
  // membresía activa ni registro pendiente. Se usa como fallback después de un
  // 409 por CI duplicada para recuperar el flujo sin pedirle al usuario que
  // vuelva a empezar. Si el backend ignora el flag, el endpoint responde igual.
  const forceClient = url.searchParams.get("forceClient") === "true";
  const qs = new URLSearchParams();
  if (ci) qs.set("ci", ci);
  if (forceClient) qs.set("forceClient", "true");

  const { data, error, status } = await apiFetch(
    `/registro-pendiente?${qs.toString()}`,
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

/**
 * POST /api/registro-pendiente
 * Proxy to NestJS: POST /api/public/registro-pendiente
 * Body: { idCliente, idVehiculo, idPlan }
 * Crea un RegistroPendiente para un cliente existente cuando activa débito
 * automático con un plan distinto al actual desde la landing page.
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

  if (!body?.idPlan || !PUBLIC_PLAN_IDS.has(body.idPlan)) {
    return new Response(
      JSON.stringify({ error: "Plan no disponible. Seleccioná un plan válido." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { data, error, status } = await apiFetch("/registro-pendiente", {
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

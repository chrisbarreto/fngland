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

  const { data, error, status } = await apiFetch("/registro-cliente", {
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

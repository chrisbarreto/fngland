import type { APIRoute } from "astro";
import { apiFetch } from "@/lib/api";

export const prerender = false;

const GET_ROUTES = new Map([
  ["disponibilidad", "/membresias-v2/disponibilidad"],
]);

const POST_ROUTES = new Map([
  ["altas/cotizar", "/membresias-v2/altas/cotizar"],
  ["altas/cambiar-plan", "/membresias-v2/altas/cambiar-plan"],
  ["reactivaciones/cotizar", "/membresias-v2/reactivaciones/cotizar"],
  ["catastro/preparar", "/membresias-v2/catastro/preparar"],
  ["catastro/confirmar", "/membresias-v2/catastro/confirmar"],
  [
    "catastro/confirmar-obligacion",
    "/membresias-v2/catastro/confirmar-obligacion",
  ],
  ["catastro/finalizar", "/membresias-v2/catastro/finalizar"],
  ["tarjetas/preparar", "/membresias-v2/tarjetas/preparar"],
  ["cobros/estado", "/membresias-v2/cobros/estado"],
  [
    "cobros/estado-obligacion",
    "/membresias-v2/cobros/estado-obligacion",
  ],
  ["cobros/reintentar", "/membresias-v2/cobros/reintentar"],
]);

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export const GET: APIRoute = async ({ url }) => {
  const target = GET_ROUTES.get(url.searchParams.get("accion") ?? "");
  if (!target) return json({ error: "Ruta V2 no encontrada." }, 404);
  const { data, error, errorBody, status } = await apiFetch(target);
  return error ? json(errorBody ?? { error }, status) : json(data, status);
};

export const POST: APIRoute = async ({ url, request }) => {
  const target = POST_ROUTES.get(url.searchParams.get("accion") ?? "");
  if (!target) return json({ error: "Ruta V2 no encontrada." }, 404);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Cuerpo de la solicitud invalido." }, 400);
  }

  const { data, error, errorBody, status } = await apiFetch(target, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return error ? json(errorBody ?? { error }, status) : json(data, status);
};

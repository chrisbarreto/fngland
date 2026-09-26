import type { APIRoute } from "astro";
import { apiFetch } from "@/lib/api";

export const prerender = false;
const GET_ROUTES = new Map([["disponibilidad", "/membresias-financiadas/disponibilidad"]]);
const POST_ROUTES = new Map([
  ["registro", "/membresias-financiadas/registro"],
  ["cotizaciones", "/membresias-financiadas/cotizaciones"],
  ["contratos", "/membresias-financiadas/contratos"],
  ["contratos/recuperar", "/membresias-financiadas/contratos/recuperar"],
  ["catastro/preparar", "/membresias-financiadas/catastro/preparar"],
  ["catastro/finalizar", "/membresias-financiadas/catastro/finalizar"],
  ["contratos/estado", "/membresias-financiadas/contratos/estado"],
  ["contratos/comprobante-primera-cuota", "/membresias-financiadas/contratos/comprobante-primera-cuota"],
]);
function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
export const GET: APIRoute = async ({ url }) => {
  const target = GET_ROUTES.get(url.searchParams.get("accion") ?? "");
  if (!target) return json({ error: "Ruta financiada no encontrada" }, 404);
  const result = await apiFetch(target);
  return json(result.error ? result.errorBody ?? { error: result.error } : result.data, result.status);
};
export const POST: APIRoute = async ({ url, request }) => {
  const target = POST_ROUTES.get(url.searchParams.get("accion") ?? "");
  if (!target) return json({ error: "Ruta financiada no encontrada" }, 404);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "Solicitud inválida" }, 400); }
  const result = await apiFetch(target, { method: "POST", body: JSON.stringify(body) });
  return json(result.error ? result.errorBody ?? { error: result.error } : result.data, result.status);
};

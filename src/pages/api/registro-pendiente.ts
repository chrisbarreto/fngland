import type { APIRoute } from "astro";
import { apiFetch } from "@/lib/api";

export const prerender = false;

/**
 * GET /api/registro-pendiente?ci=xxx
 * Proxy to NestJS: GET /api/public/registro-pendiente?ci=xxx
 * No Turnstile required for lookup — only censored data is returned.
 * Turnstile verification happens at form submission (paso 3).
 */
export const GET: APIRoute = async ({ url }) => {
  const ci = url.searchParams.get("ci") ?? "";

  const { data, error, status } = await apiFetch(
    `/registro-pendiente?ci=${encodeURIComponent(ci)}`,
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

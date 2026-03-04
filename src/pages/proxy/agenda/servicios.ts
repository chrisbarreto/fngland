import type { APIRoute } from "astro";
import { apiFetch } from "@/lib/api";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const codigo = url.searchParams.get("codigoMembresia")?.trim();
  const query = codigo ? `?codigoMembresia=${encodeURIComponent(codigo)}` : "";

  const { data, error, status } = await apiFetch(`/agenda/servicios${query}`);

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

import type { APIRoute } from "astro";
import { apiFetch } from "@/lib/api";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const cedula = (url.searchParams.get("cedula") || "").replace(/\D/g, "");

  if (!cedula) {
    return new Response(
      JSON.stringify({ error: "Parámetro 'cedula' es requerido" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { data, error, status } = await apiFetch(
    `/agenda/membresias?cedula=${encodeURIComponent(cedula)}`,
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

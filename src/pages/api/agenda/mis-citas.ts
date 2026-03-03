import type { APIRoute } from "astro";
import { apiFetch } from "@/lib/api";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const codigo = url.searchParams.get("codigoMembresia");

  if (!codigo) {
    return new Response(
      JSON.stringify({ error: "Parámetro 'codigoMembresia' es requerido" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { data, error, status } = await apiFetch(
    `/agenda/mis-citas?codigoMembresia=${encodeURIComponent(codigo)}`,
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

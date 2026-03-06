import type { APIRoute } from "astro";
import { apiFetch } from "@/lib/api";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const fecha = url.searchParams.get("fecha");
  const idSede = url.searchParams.get("idSede");

  if (!fecha) {
    return new Response(
      JSON.stringify({ error: "Parámetro 'fecha' es requerido" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!idSede) {
    return new Response(
      JSON.stringify({ error: "Parámetro 'idSede' es requerido" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { data, error, status } = await apiFetch(
    `/agenda/slots?fecha=${encodeURIComponent(fecha)}&idSede=${encodeURIComponent(idSede)}`,
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

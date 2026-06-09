import type { APIRoute } from "astro";
import { apiFetch } from "@/lib/api";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const fecha = url.searchParams.get("fecha");
  const idSede = url.searchParams.get("idSede");
  const domicilio = url.searchParams.get("domicilio");
  const soloTraslado = url.searchParams.get("soloTraslado");

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

  const domicilioParam =
    domicilio === "true" ? "&domicilio=true" : "";
  const soloTrasladoParam =
    soloTraslado === "true" ? "&soloTraslado=true" : "";

  const { data, error, status } = await apiFetch(
    `/agenda/slots?fecha=${encodeURIComponent(fecha)}&idSede=${encodeURIComponent(idSede)}${domicilioParam}${soloTrasladoParam}`,
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

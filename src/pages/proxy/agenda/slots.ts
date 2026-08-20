import type { APIRoute } from "astro";
import { apiFetch } from "@/lib/api";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const fecha = url.searchParams.get("fecha");
  const idSede = url.searchParams.get("idSede");
  const domicilio = url.searchParams.get("domicilio");
  const soloTraslado = url.searchParams.get("soloTraslado");
  const codigoMembresia = url.searchParams.get("codigoMembresia");
  const idMiembro = url.searchParams.get("idMiembro");
  const idServicios = url.searchParams.get("idServicios");

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
  const publicContextParam =
    domicilio === "true"
      ? ""
      : `${codigoMembresia ? `&codigoMembresia=${encodeURIComponent(codigoMembresia)}` : ""}${idMiembro ? `&idMiembro=${encodeURIComponent(idMiembro)}` : ""}${idServicios ? `&idServicios=${encodeURIComponent(idServicios)}` : ""}`;

  const { data, error, status } = await apiFetch(
    `/agenda/slots?fecha=${encodeURIComponent(fecha)}&idSede=${encodeURIComponent(idSede)}${domicilioParam}${soloTrasladoParam}${publicContextParam}`,
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

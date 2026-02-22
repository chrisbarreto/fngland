import type { APIRoute } from "astro";
import { apiFetch } from "@/lib/api";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const idMarca = url.searchParams.get("idMarca");

  if (!idMarca) {
    return new Response(JSON.stringify({ error: "idMarca es requerido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data, error, status } = await apiFetch(
    `/modelos-vehiculo/marca/${idMarca}`,
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

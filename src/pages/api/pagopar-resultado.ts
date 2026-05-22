import type { APIRoute } from "astro";
import { apiFetch } from "@/lib/api";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const hashPedido = url.searchParams.get("hash") || "";

  if (!hashPedido) {
    return new Response(
      JSON.stringify({ error: "Parámetro hash requerido." }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const { data, error, status } = await apiFetch<{
    hashPedido: string;
    pagado: boolean;
    cancelado: boolean;
    monto: number | null;
    formaPago: string | null;
    respuesta: boolean;
  }>(`/pagopar/resultado/${encodeURIComponent(hashPedido)}`);

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

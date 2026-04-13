import type { APIRoute } from "astro";
import { apiFetch } from "@/lib/api";

export const prerender = false;

export const GET: APIRoute = async () => {
  const { data, error, status } = await apiFetch("/planes-membresia");

  if (error) {
    return new Response(JSON.stringify({ error }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const plans = Array.isArray(data) ? data : [];

  return new Response(JSON.stringify(plans), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

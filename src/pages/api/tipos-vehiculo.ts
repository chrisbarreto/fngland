import type { APIRoute } from "astro";
import { apiFetch } from "@/lib/api";

export const prerender = false;

export const GET: APIRoute = async () => {
  const { data, error, status } = await apiFetch("/tipos-vehiculo");
  return new Response(JSON.stringify(error ? { error } : data), {
    status: error ? status : 200,
    headers: { "Content-Type": "application/json" },
  });
};

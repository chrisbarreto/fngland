import type { APIRoute } from "astro";
import { apiFetch } from "@/lib/api";

export const prerender = false;

function normalizePlanText(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isPublicPlan(plan: any): boolean {
  const price = Number(plan?.precio || 0);
  const name = normalizePlanText(plan?.nombre);

  return price === 200000 && (name.includes("premium") || name.includes("premiun"));
}

export const GET: APIRoute = async () => {
  const { data, error, status } = await apiFetch("/planes-membresia");

  if (error) {
    return new Response(JSON.stringify({ error }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const plans = Array.isArray(data) ? data : [];
  const publicPlans = plans.filter(isPublicPlan);
  const responsePlans = publicPlans.length ? publicPlans : plans.slice(0, 1);

  return new Response(JSON.stringify(responsePlans), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

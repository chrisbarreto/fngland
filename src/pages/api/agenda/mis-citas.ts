import type { APIRoute } from "astro";
import { apiFetch } from "@/lib/api";

export const prerender = false;

function normalizeCodigoMembresia(value: unknown): string {
  return String(value || "").trim().toUpperCase();
}

function extractMembresias(payload: any[]): Array<{ codigoMembresia: string }> {
  return (Array.isArray(payload) ? payload : [])
    .map((item) => normalizeCodigoMembresia(
      item?.codigoMembresia ||
      item?.codigo ||
      item?.numeroMembresia ||
      item?.numero ||
      item?.nroMembresia,
    ))
    .filter(Boolean)
    .map((codigoMembresia) => ({ codigoMembresia }));
}

async function fetchByCodigo(codigo: string) {
  const { data, error, status } = await apiFetch(
    `/agenda/mis-citas?codigoMembresia=${encodeURIComponent(codigo)}`,
  );

  if (error) {
    return { ok: false as const, error, status };
  }

  return { ok: true as const, data };
}

export const GET: APIRoute = async ({ url }) => {
  const codigo = normalizeCodigoMembresia(url.searchParams.get("codigoMembresia"));

  if (!codigo) {
    return new Response(
      JSON.stringify({ error: "Parámetro 'codigoMembresia' es requerido" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const result = await fetchByCodigo(codigo);

  if (!result.ok) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: result.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(result.data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => ({}));
  const cedula = String(body?.cedula || "").replace(/\D/g, "");
  const turnstileToken = String(body?.turnstileToken || "").trim();

  if (!cedula) {
    return new Response(
      JSON.stringify({ error: "Parámetro 'cedula' es requerido" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!turnstileToken) {
    return new Response(
      JSON.stringify({ error: "Verificá el captcha para continuar." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const membresiasRes = await apiFetch<any[]>(`/agenda/membresias?cedula=${encodeURIComponent(cedula)}`);

  if (membresiasRes.error) {
    return new Response(JSON.stringify({ error: membresiasRes.error }), {
      status: membresiasRes.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const membresias = extractMembresias(membresiasRes.data || []);
  if (!membresias.length) {
    return new Response(JSON.stringify({
      cedula,
      totalMembresias: 0,
      totalCitas: 0,
      membresias: [],
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const citasPorMembresia = await Promise.all(
    membresias.map(async ({ codigoMembresia }) => {
      const result = await fetchByCodigo(codigoMembresia);
      if (!result.ok) {
        return {
          codigoMembresia,
          vehiculo: null,
          citas: [],
          error: result.error,
        };
      }

      return {
        codigoMembresia,
        vehiculo: result.data?.vehiculo || null,
        citas: Array.isArray(result.data?.citas) ? result.data.citas : [],
        error: null,
      };
    }),
  );

  const totalCitas = citasPorMembresia.reduce((acc, item) => acc + item.citas.length, 0);

  return new Response(JSON.stringify({
    cedula,
    totalMembresias: citasPorMembresia.length,
    totalCitas,
    membresias: citasPorMembresia,
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

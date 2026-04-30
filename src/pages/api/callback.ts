import type { APIRoute } from "astro";
import { apiFetch } from "@/lib/api";

export const prerender = false;

/**
 * GET /api/callback?status=add_new_card_success|add_new_card_fail&description=...&idCliente=UUID&idRegistroPendiente=UUID
 *
 * Pagopar/uPay redirige aquí tras el catastro de tarjeta.
 * - Bancard (responseHandler): nunca llega acá desde el modal (el SDK captura la respuesta en browser).
 * - uPay: redirige el frame completo acá, necesita confirmar server-side.
 */
export const GET: APIRoute = async ({ url, request }) => {
  try {
    const status = url.searchParams.get("status") || "";
    const description = url.searchParams.get("description") || "";
    const idCliente = url.searchParams.get("idCliente") || "";
    const idRegistroPendiente = url.searchParams.get("idRegistroPendiente") || "";

    const isSuccess = status === "add_new_card_success";

    // Flujo uPay: confirmar tarjeta server-side si llegó idCliente y fue exitoso
    if (idCliente && isSuccess) {
      const ip =
        request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        null;
      const ua = request.headers.get("user-agent") || null;

      const idMembresiaActivar = url.searchParams.get("idMembresiaActivar") || "";
      const idsMembresiasActivarRaw = url.searchParams.get("idsMembresiasActivar") || "";
      let idsMembresiasActivar: string[] = [];
      try {
        idsMembresiasActivar = idsMembresiasActivarRaw
          ? (JSON.parse(idsMembresiasActivarRaw) as string[])
          : [];
      } catch { idsMembresiasActivar = []; }

      const confirmBody: Record<string, unknown> = {
        idCliente,
        acceptTerminos: true,
      };
      if (idRegistroPendiente) confirmBody.idRegistroPendiente = idRegistroPendiente;
      if (idsMembresiasActivar.length > 0) confirmBody.idsMembresiasActivar = idsMembresiasActivar;
      else if (idMembresiaActivar) confirmBody.idMembresiaActivar = idMembresiaActivar;
      if (ip) confirmBody.ipAddress = ip;
      if (ua) confirmBody.userAgent = ua;

      await apiFetch("/pagopar/confirmar", {
        method: "POST",
        body: JSON.stringify(confirmBody),
      });
    }

    const checkout = isSuccess ? "ok" : "error";
    const params = new URLSearchParams({ checkout });
    if (description) params.set("checkout_msg", description);

    return new Response(null, {
      status: 302,
      headers: { Location: `/membresia?${params.toString()}` },
    });
  } catch {
    return new Response(null, {
      status: 302,
      headers: { Location: "/membresia?checkout=error" },
    });
  }
};

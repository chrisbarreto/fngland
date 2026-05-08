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

    // Si Pagopar/uPay reportó fallo en el catastro, propagar el motivo
    if (!isSuccess) {
      const params = new URLSearchParams({ checkout: "error" });
      if (description) params.set("checkout_msg", description);
      return new Response(null, {
        status: 302,
        headers: { Location: `/membresia?${params.toString()}` },
      });
    }

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

      const { data: confirmData, error: confirmError } = await apiFetch<{
        idMembresia?: string;
        comprobante?: { numeroComprobante?: number };
        cobroDiferido?: boolean;
      }>("/pagopar/confirmar", {
        method: "POST",
        body: JSON.stringify(confirmBody),
      });

      if (confirmError) {
        const params = new URLSearchParams({ checkout: "error" });
        params.set("checkout_msg", confirmError);
        return new Response(null, {
          status: 302,
          headers: { Location: `/gracias?${params.toString()}` },
        });
      }

      // Éxito en uPay: redirigir a /gracias con datos del catastro
      const params = new URLSearchParams({ checkout: "ok" });
      if (description) params.set("checkout_msg", description);
      if (confirmData?.idMembresia) params.set("idMembresia", confirmData.idMembresia);
      if (confirmData?.comprobante?.numeroComprobante) {
        params.set("numeroComprobante", String(confirmData.comprobante.numeroComprobante));
      }
      if ((confirmData as any)?.cobroDiferido) params.set("cobroDiferido", "true");

      // Datos del catastro para mostrar en /gracias
      const cat = (confirmData as any)?.catastro;
      if (cat) {
        if (cat.cliente?.nombre) params.set("nombre", cat.cliente.nombre);
        if (cat.cliente?.ci) params.set("ci", cat.cliente.ci);
        if (cat.membresia?.codigo) params.set("codigo", cat.membresia.codigo);
        if (cat.membresia?.plan) params.set("plan", cat.membresia.plan);
        if (cat.vehiculo?.chapa) params.set("chapa", cat.vehiculo.chapa);
        if (cat.vehiculo?.descripcion) params.set("vehiculo", cat.vehiculo.descripcion);
        if (cat.tarjeta?.numero) params.set("tarjeta", cat.tarjeta.numero);
        if (cat.tarjeta?.marca) params.set("tarjetaMarca", cat.tarjeta.marca);
        if (cat.fechaProximoDebito) params.set("fechaProximoDebito", cat.fechaProximoDebito);
      }

      return new Response(null, {
        status: 302,
        headers: { Location: `/gracias?${params.toString()}` },
      });
    }

    const params = new URLSearchParams({ checkout: "ok" });
    if (description) params.set("checkout_msg", description);

    return new Response(null, {
      status: 302,
      headers: { Location: `/gracias?${params.toString()}` },
    });
  } catch {
    return new Response(null, {
      status: 302,
      headers: { Location: "/membresia?checkout=error" },
    });
  }
};

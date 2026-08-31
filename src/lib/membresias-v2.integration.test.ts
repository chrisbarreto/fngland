import { describe, expect, it, vi } from "vitest";
import {
  confirmarCallbackMembresiaV2,
  consultarEstadoObligacionMembresiaV2,
} from "./membresias-v2";

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const contextoBase = {
  idCliente: "cliente-1810793",
  idMembresia: "membresia-prepaga",
  idCotizacion: "",
  idObligacion: "",
  token: "mct2.contexto.signature",
  tokenVersion: "V2",
};

describe("flujo integral de catastro prepago V2", () => {
  it("registra la tarjeta de una membresia cubierta sin iniciar un cobro", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      response({
        success: true,
        billingVersion: "V2",
        finalizado: true,
        confirmacionProveedor: true,
      }),
    );

    const resultado = await confirmarCallbackMembresiaV2(
      {
        ...contextoBase,
        purpose: "AGREGAR_TARJETA_MEMBRESIA",
      },
      fetcher,
    );

    expect(resultado.flujo).toBe("CATASTRO_SIMPLE");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe(
      "/api/membresias-v2?accion=catastro%2Ffinalizar",
    );
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({
      idCliente: contextoBase.idCliente,
      idMembresia: contextoBase.idMembresia,
      token: contextoBase.token,
    });
  });

  it("confirma una obligacion y luego solo consulta su estado hasta PAGADO", async () => {
    const estadoBase = {
      success: true,
      billingVersion: "V2",
      idObligacion: "obligacion-pendiente",
      idMembresia: contextoBase.idMembresia,
      definitivo: false,
      puedeReintentar: false,
      mensaje: "El pago se esta procesando.",
      totalCobrarAhora: "64516",
      membresia: {
        estadoCobertura: "GRACIA_CON_COBERTURA",
        fechaFin: "2026-08-31",
      },
      obligacion: {
        idObligacion: "obligacion-pendiente",
        estado: "PENDIENTE",
        fechaVencimiento: "2026-08-21",
      },
      intento: null,
      trabajo: null,
    };
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        response({ success: true, billingVersion: "V2" }),
      )
      .mockResolvedValueOnce(
        response({ ...estadoBase, estado: "PROCESANDO" }),
      )
      .mockResolvedValueOnce(
        response({
          ...estadoBase,
          estado: "PAGADO",
          definitivo: true,
          mensaje: "Pago confirmado.",
          obligacion: { ...estadoBase.obligacion, estado: "PAGADA" },
          intento: {
            numeroIntento: 1,
            estadoTecnico: "COMPLETADO",
            estadoFinanciero: "PAGADO",
            creadoEn: "2026-08-31T12:00:00.000Z",
          },
        }),
      );
    const input = {
      ...contextoBase,
      purpose: "PAGAR_OBLIGACION_MEMBRESIA_V2",
      idObligacion: "obligacion-pendiente",
    };

    const confirmacion = await confirmarCallbackMembresiaV2(input, fetcher);
    const procesando = await consultarEstadoObligacionMembresiaV2(
      input,
      fetcher,
    );
    const pagado = await consultarEstadoObligacionMembresiaV2(input, fetcher);

    expect(confirmacion.flujo).toBe("OBLIGACION");
    expect(procesando.estado).toBe("PROCESANDO");
    expect(pagado.estado).toBe("PAGADO");
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      "/api/membresias-v2?accion=catastro%2Fconfirmar-obligacion",
      "/api/membresias-v2?accion=cobros%2Festado-obligacion",
      "/api/membresias-v2?accion=cobros%2Festado-obligacion",
    ]);
    expect(
      fetcher.mock.calls.some(([url]) => String(url).includes("reintentar")),
    ).toBe(false);
  });

  it("confirma el catastro asociado a una cotizacion V2", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(response({ success: true, billingVersion: "V2" }));

    const resultado = await confirmarCallbackMembresiaV2(
      {
        ...contextoBase,
        purpose: "ALTA_MEMBRESIA_V2",
        idCotizacion: "cotizacion-alta",
      },
      fetcher,
    );

    expect(resultado.flujo).toBe("COTIZACION");
    expect(fetcher.mock.calls[0][0]).toBe(
      "/api/membresias-v2?accion=catastro%2Fconfirmar",
    );
  });

  it("falla cerrado si un callback V2 llega sin la obligacion requerida", async () => {
    const fetcher = vi.fn();

    await expect(
      confirmarCallbackMembresiaV2(
        {
          ...contextoBase,
          purpose: "PAGAR_OBLIGACION_MEMBRESIA_V2",
        },
        fetcher,
      ),
    ).rejects.toThrow("contexto V2");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("delega el callback legacy sin mutarlo ni llamar rutas V2", async () => {
    const fetcher = vi.fn();

    const resultado = await confirmarCallbackMembresiaV2(
      {
        ...contextoBase,
        token: "legacy-hmac",
        tokenVersion: "",
        purpose: "",
        idMembresia: "",
      },
      fetcher,
    );

    expect(resultado).toEqual({ flujo: "LEGACY", data: null });
    expect(fetcher).not.toHaveBeenCalled();
  });
});

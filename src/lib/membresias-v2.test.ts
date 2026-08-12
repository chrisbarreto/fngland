import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MEMBRESIA_V2_CONTEXT_KEY,
  cambiarPlanAltaPendienteMembresiaV2,
  consultarDisponibilidadMembresiasV2,
  consultarEstadoCobroMembresiaV2,
  cotizarAltaMembresiaV2,
  cotizarReactivacionMembresiaV2,
  guardarContextoMembresiaV2,
  idempotencyKeyAlta,
  idempotencyKeyReactivacion,
  idempotencyKeyReintentoCobro,
  leerContextoMembresiaV2,
  prepararCatastroMembresiaV2,
  prepararCambioTarjetaMembresiaV2,
  reintentarCobroMembresiaV2,
  type StorageLike,
} from "./membresias-v2";

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function storageMock(): StorageLike {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

describe("membresias V2 landing", () => {
  beforeEach(() => vi.useRealTimers());

  it("genera claves idempotentes estables por operacion", () => {
    expect(idempotencyKeyAlta("registro-1", new Date(2026, 7, 12, 14, 0))).toBe(
      "landing:alta:registro-1:2026-08-12",
    );
    expect(
      idempotencyKeyReactivacion("membresia-1", new Date(2026, 7, 7, 23, 30)),
    ).toBe("landing:reactivacion:membresia-1:2026-08-07");
  });

  it("persiste y recupera el contexto que permite reanudar el modal", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-07T15:00:00.000Z"));
    const storage = storageMock();

    guardarContextoMembresiaV2(storage, {
      idCliente: "cliente-1",
      idMembresia: "membresia-1",
      idCotizacion: "cotizacion-1",
      token: "mct2.payload.signature",
      tipoOperacion: "ALTA",
    });

    expect(leerContextoMembresiaV2(storage)).toEqual({
      idCliente: "cliente-1",
      idMembresia: "membresia-1",
      idCotizacion: "cotizacion-1",
      token: "mct2.payload.signature",
      tipoOperacion: "ALTA",
      actualizadoEn: "2026-08-07T15:00:00.000Z",
    });
  });

  it("descarta un contexto corrupto", () => {
    const storage = storageMock();
    storage.setItem(MEMBRESIA_V2_CONTEXT_KEY, "{invalido");

    expect(leerContextoMembresiaV2(storage)).toBeNull();
    expect(storage.getItem(MEMBRESIA_V2_CONTEXT_KEY)).toBeNull();
  });

  it("consulta disponibilidad y falla cerrado ante errores de red", async () => {
    const enabledFetch = vi
      .fn()
      .mockResolvedValue(response({ enabled: true, billingVersion: "V2" }));
    await expect(
      consultarDisponibilidadMembresiasV2(enabledFetch),
    ).resolves.toBe(true);
    expect(enabledFetch).toHaveBeenCalledWith(
      "/api/membresias-v2?accion=disponibilidad",
      expect.objectContaining({ method: "GET" }),
    );

    const failedFetch = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(
      consultarDisponibilidadMembresiasV2(failedFetch),
    ).rejects.toThrow("offline");
  });

  it("cotiza altas y reactivaciones con sus claves estables", async () => {
    const cotizacion = {
      idCotizacion: "cot-1",
      tipoOperacion: "ALTA",
    };
    const fetcher = vi
      .fn()
      .mockResolvedValue(response({ success: true, cotizacion }));

    await expect(
      cotizarAltaMembresiaV2(
        { idCliente: "cli-1", idRegistroPendiente: "rp-1" },
        fetcher,
      ),
    ).resolves.toEqual(cotizacion);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
      idCliente: "cli-1",
      idRegistroPendiente: "rp-1",
      idempotencyKey: expect.stringMatching(
        /^landing:alta:rp-1:\d{4}-\d{2}-\d{2}$/,
      ),
      fechaInicio: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });

    fetcher.mockClear();
    await cotizarReactivacionMembresiaV2(
      { idCliente: "cli-1", idMembresia: "mem-1" },
      fetcher,
    );
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
      idCliente: "cli-1",
      idMembresia: "mem-1",
      idempotencyKey: expect.stringMatching(
        /^landing:reactivacion:mem-1:\d{4}-\d{2}-\d{2}$/,
      ),
    });
  });

  it("cambia el plan de un alta pendiente sin crear otro cliente o vehiculo", async () => {
    const cambio = {
      success: true,
      billingVersion: "V2",
      idRegistroPendiente: "rp-nuevo",
      idCliente: "cli-1",
      idVehiculo: "veh-1",
      idMembresiaAnterior: "mem-1",
      idPlanAnterior: "plan-1",
      idPlanNuevo: "plan-2",
      reemplazada: true,
      idempotente: false,
    };
    const fetcher = vi.fn().mockResolvedValue(response(cambio));

    await expect(
      cambiarPlanAltaPendienteMembresiaV2(
        {
          idCliente: "cli-1",
          idMembresia: "mem-1",
          idPlanNuevo: "plan-2",
        },
        fetcher,
      ),
    ).resolves.toEqual(cambio);
    expect(fetcher.mock.calls[0][0]).toBe(
      "/api/membresias-v2?accion=altas%2Fcambiar-plan",
    );
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
      idCliente: "cli-1",
      idMembresia: "mem-1",
      idPlanNuevo: "plan-2",
    });
  });

  it("prepara catastro y cambio de tarjeta por endpoints separados", async () => {
    const preparado = {
      success: true,
      billingVersion: "V2",
      catastro: { url: "https://example.com/tarjetas/registrar" },
    };
    const fetcher = vi.fn().mockResolvedValue(response(preparado));

    await prepararCatastroMembresiaV2(
      { idCliente: "cli-1", idCotizacion: "cot-1" },
      fetcher,
    );
    expect(fetcher.mock.calls[0][0]).toBe(
      "/api/membresias-v2?accion=catastro%2Fpreparar",
    );

    fetcher.mockClear();
    await prepararCambioTarjetaMembresiaV2(
      { idCliente: "cli-1", idMembresia: "mem-1" },
      fetcher,
    );
    expect(fetcher.mock.calls[0][0]).toBe(
      "/api/membresias-v2?accion=tarjetas%2Fpreparar",
    );
  });

  it("propaga el mensaje normalizado del backend", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(response({ message: "Cotizacion vencida" }, 422));

    await expect(
      prepararCatastroMembresiaV2(
        { idCliente: "cli-1", idCotizacion: "cot-1" },
        fetcher,
      ),
    ).rejects.toThrow("Cotizacion vencida");
  });

  it("consulta el estado por POST sin ordenar un nuevo cobro", async () => {
    const seguimiento = {
      success: true,
      billingVersion: "V2",
      estado: "PROCESANDO",
    };
    const fetcher = vi.fn().mockResolvedValue(response(seguimiento));

    await expect(
      consultarEstadoCobroMembresiaV2(
        {
          idCliente: "cli-1",
          idMembresia: "mem-1",
          idCotizacion: "cot-1",
          token: "mct2.payload.signature",
        },
        fetcher,
      ),
    ).resolves.toEqual(seguimiento);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe(
      "/api/membresias-v2?accion=cobros%2Festado",
    );
  });

  it("usa una clave estable para duplicados del mismo reintento", async () => {
    const token = "mct2.payload.signature-reintento-1234567890";
    const key = idempotencyKeyReintentoCobro("cot-1", token);
    expect(key).toBe(idempotencyKeyReintentoCobro("cot-1", token));
    const fetcher = vi.fn().mockResolvedValue(
      response({
        success: true,
        billingVersion: "V2",
        trabajo: { idTrabajo: "job-2", numeroIntento: 2 },
      }),
    );

    await reintentarCobroMembresiaV2(
      {
        idCliente: "cli-1",
        idMembresia: "mem-1",
        idCotizacion: "cot-1",
        token,
      },
      fetcher,
    );
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
      idCotizacion: "cot-1",
      idempotencyKey: key,
    });
  });
});

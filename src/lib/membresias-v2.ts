export type AccionFlujoMembresiaV2 =
  | "COTIZAR_ALTA"
  | "COTIZAR_REACTIVACION"
  | "PREPARAR_CATASTRO"
  | "CONTINUAR_CATASTRO"
  | "ESPERAR_COBRO"
  | "GESTIONAR_TARJETA"
  | "ACTIVAR_DEBITO_AUTOMATICO"
  | "PAGAR_OBLIGACION"
  | "SIN_ACCION";

export type ModoCatastroMembresiaV2 =
  | "SOLO_CATASTRO"
  | "PAGO_OBLIGACION_PENDIENTE";

export type FlujoCallbackMembresiaV2 =
  | "COTIZACION"
  | "CATASTRO_SIMPLE"
  | "OBLIGACION"
  | "LEGACY"
  | "INVALIDO_V2";

export function clasificarCallbackMembresiaV2(input: {
  token: string;
  tokenVersion: string;
  purpose: string;
  idMembresia: string;
  idCotizacion: string;
  idObligacion: string;
}): FlujoCallbackMembresiaV2 {
  const esTokenV2 =
    input.tokenVersion === "V2" || input.token.startsWith("mct2.");
  if (!esTokenV2) return "LEGACY";
  if (
    input.purpose === "PAGAR_OBLIGACION_MEMBRESIA_V2" &&
    input.idMembresia &&
    input.idObligacion
  ) {
    return "OBLIGACION";
  }
  if (
    input.purpose === "AGREGAR_TARJETA_MEMBRESIA" &&
    input.idMembresia
  ) {
    return "CATASTRO_SIMPLE";
  }
  if (
    (input.purpose === "ALTA_MEMBRESIA_V2" ||
      input.purpose === "REACTIVACION_MEMBRESIA_V2") &&
    input.idMembresia &&
    input.idCotizacion
  ) {
    return "COTIZACION";
  }
  return "INVALIDO_V2";
}

export interface FlujoMembresiaV2 {
  accion: AccionFlujoMembresiaV2;
  idCotizacion: string | null;
  idMembresia: string | null;
  idObligacion: string | null;
  tipoOperacion: "ALTA" | "REACTIVACION" | null;
  estadoCotizacion: string | null;
  expiresAt: string | null;
  confirmadaEn?: string | null;
  totalCobrarAhora: string | null;
  modo: ModoCatastroMembresiaV2 | null;
  montoCobrarAhora: string | null;
  periodoDesde: string | null;
  periodoHasta: string | null;
}

export interface CotizacionPublicaMembresiaV2 {
  idCotizacion: string;
  idMembresia: string | null;
  tipoOperacion: "ALTA" | "REACTIVACION";
  tipoCobroInicial: string;
  fechas: {
    inicio: { iso: string; presentacion: string };
    finCoberturaInicial: { iso: string; presentacion: string };
    vencimientoProximoCiclo: { iso: string; presentacion: string };
  };
  importes: {
    precioMensual: string;
    montoCoberturaInicial: string;
    cargoUnicoIncorporacion: string;
    totalCobrarAhora: string;
  };
  expiresAt: string;
}

export interface CambioPlanAltaPendienteMembresiaV2 {
  success: true;
  billingVersion: "V2";
  idRegistroPendiente: string;
  idCliente: string;
  idVehiculo: string;
  idMembresiaAnterior: string;
  idPlanAnterior: string;
  idPlanNuevo: string;
  expiresAt: string;
  reemplazada: true;
  idempotente: boolean;
}

export interface CatastroPreparadoMembresiaV2 {
  success: true;
  billingVersion: "V2";
  materializacion?: {
    idMembresia: string;
    idCotizacion: string;
    tipoOperacion: "ALTA" | "REACTIVACION";
  };
  catastro: {
    token: string;
    tokenVersion: "V2";
    expiresAt: string;
    idCotizacion?: string | null;
    idObligacion?: string | null;
    modo?: ModoCatastroMembresiaV2;
    url: string;
  };
}

export interface ContextoPersistidoMembresiaV2 {
  idCliente: string;
  idMembresia: string;
  idCotizacion: string | null;
  token: string;
  tipoOperacion: "ALTA" | "REACTIVACION" | "CAMBIO_TARJETA";
  actualizadoEn: string;
}

export type EstadoCobroPublicoMembresiaV2 =
  | "PENDIENTE"
  | "PROCESANDO"
  | "PAGADO"
  | "RECHAZADO"
  | "REINTENTABLE"
  | "INDETERMINADO"
  | "FALLIDO_DEFINITIVO";

export interface SeguimientoCobroMembresiaV2 {
  success: true;
  billingVersion: "V2";
  idCotizacion: string;
  idMembresia: string;
  estado: EstadoCobroPublicoMembresiaV2;
  definitivo: boolean;
  puedeReintentar: boolean;
  mensaje: string;
  totalCobrarAhora: string;
  membresia: {
    estadoCobertura: string | null;
    fechaFin: string | null;
  };
  intento: {
    numeroIntento: number;
    estadoTecnico: string | null;
    estadoFinanciero: string | null;
    creadoEn: string;
  } | null;
  trabajo: {
    tipo: string;
    estado: string;
    intentos: number;
    maxIntentos: number;
    disponibleEn: string;
  } | null;
}

export interface SeguimientoObligacionMembresiaV2 {
  success: true;
  billingVersion: "V2";
  idObligacion: string;
  idMembresia: string;
  estado: EstadoCobroPublicoMembresiaV2;
  definitivo: boolean;
  puedeReintentar: boolean;
  mensaje: string;
  totalCobrarAhora: string;
  membresia: {
    estadoCobertura: string | null;
    fechaFin: string | null;
  };
  obligacion: {
    idObligacion: string;
    estado: string;
    fechaVencimiento: string;
  };
  intento: {
    numeroIntento: number;
    estadoTecnico: string | null;
    estadoFinanciero: string | null;
    creadoEn: string;
  } | null;
  trabajo: {
    tipo: string;
    estado: string;
    intentos: number;
    maxIntentos: number;
    disponibleEn: string;
  } | null;
}

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export const MEMBRESIA_V2_CONTEXT_KEY = "formulang_membresiaV2Context";

function fechaLocalIso(fecha = new Date()): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

export function idempotencyKeyAlta(
  idRegistroPendiente: string,
  fecha = new Date(),
): string {
  return `landing:alta:${idRegistroPendiente}:${fechaLocalIso(fecha)}`;
}

export function idempotencyKeyReactivacion(
  idMembresia: string,
  fecha = new Date(),
): string {
  return `landing:reactivacion:${idMembresia}:${fechaLocalIso(fecha)}`;
}

export function guardarContextoMembresiaV2(
  storage: StorageLike,
  contexto: Omit<ContextoPersistidoMembresiaV2, "actualizadoEn">,
): void {
  storage.setItem(
    MEMBRESIA_V2_CONTEXT_KEY,
    JSON.stringify({ ...contexto, actualizadoEn: new Date().toISOString() }),
  );
}

export function leerContextoMembresiaV2(
  storage: StorageLike,
): ContextoPersistidoMembresiaV2 | null {
  const raw = storage.getItem(MEMBRESIA_V2_CONTEXT_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ContextoPersistidoMembresiaV2>;
    if (
      typeof value.idCliente !== "string" ||
      typeof value.idMembresia !== "string" ||
      typeof value.token !== "string" ||
      !["ALTA", "REACTIVACION", "CAMBIO_TARJETA"].includes(
        String(value.tipoOperacion),
      ) ||
      typeof value.actualizadoEn !== "string"
    ) {
      throw new Error("contexto invalido");
    }
    return value as ContextoPersistidoMembresiaV2;
  } catch {
    storage.removeItem(MEMBRESIA_V2_CONTEXT_KEY);
    return null;
  }
}

export function limpiarContextoMembresiaV2(storage: StorageLike): void {
  storage.removeItem(MEMBRESIA_V2_CONTEXT_KEY);
}

async function requestV2<T>(
  path: string,
  body: Record<string, unknown> | undefined,
  fetcher: FetchLike,
): Promise<T> {
  const response = await fetcher(
    `/api/membresias-v2?accion=${encodeURIComponent(path)}`,
    {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.error ||
        data?.message ||
        `No se pudo completar la operacion (${response.status}).`,
    );
  }
  return data as T;
}

export async function consultarDisponibilidadMembresiasV2(
  fetcher: FetchLike = fetch,
): Promise<boolean> {
  const result = await requestV2<{
    enabled: boolean;
    billingVersion: "V2";
  }>("disponibilidad", undefined, fetcher);
  return result.enabled === true && result.billingVersion === "V2";
}

export async function cotizarAltaMembresiaV2(
  input: { idCliente: string; idRegistroPendiente: string },
  fetcher: FetchLike = fetch,
): Promise<CotizacionPublicaMembresiaV2> {
  const result = await requestV2<{
    success: true;
    billingVersion: "V2";
    cotizacion: CotizacionPublicaMembresiaV2;
  }>(
    "altas/cotizar",
    {
      ...input,
      idempotencyKey: idempotencyKeyAlta(input.idRegistroPendiente),
      fechaInicio: fechaLocalIso(),
    },
    fetcher,
  );
  return result.cotizacion;
}

export async function cambiarPlanAltaPendienteMembresiaV2(
  input: {
    idCliente: string;
    idMembresia: string;
    idPlanNuevo: string;
  },
  fetcher: FetchLike = fetch,
): Promise<CambioPlanAltaPendienteMembresiaV2> {
  return requestV2<CambioPlanAltaPendienteMembresiaV2>(
    "altas/cambiar-plan",
    input,
    fetcher,
  );
}

export async function cotizarReactivacionMembresiaV2(
  input: { idCliente: string; idMembresia: string },
  fetcher: FetchLike = fetch,
): Promise<CotizacionPublicaMembresiaV2> {
  const result = await requestV2<{
    success: true;
    billingVersion: "V2";
    cotizacion: CotizacionPublicaMembresiaV2;
  }>(
    "reactivaciones/cotizar",
    {
      ...input,
      idempotencyKey: idempotencyKeyReactivacion(input.idMembresia),
    },
    fetcher,
  );
  return result.cotizacion;
}

export async function prepararCatastroMembresiaV2(
  input: { idCliente: string; idCotizacion: string },
  fetcher: FetchLike = fetch,
): Promise<CatastroPreparadoMembresiaV2> {
  return requestV2<CatastroPreparadoMembresiaV2>(
    "catastro/preparar",
    input,
    fetcher,
  );
}

export async function confirmarCatastroMembresiaV2(
  input: {
    idCliente: string;
    idMembresia: string;
    idCotizacion: string;
    token: string;
  },
  fetcher: FetchLike = fetch,
): Promise<{ success: true; billingVersion: "V2" }> {
  return requestV2("catastro/confirmar", input, fetcher);
}

export async function confirmarCatastroObligacionMembresiaV2(
  input: {
    idCliente: string;
    idMembresia: string;
    idObligacion: string;
    token: string;
  },
  fetcher: FetchLike = fetch,
): Promise<{ success: true; billingVersion: "V2" }> {
  return requestV2("catastro/confirmar-obligacion", input, fetcher);
}

export async function finalizarCatastroMembresiaV2(
  input: {
    idCliente: string;
    idMembresia: string;
    idCotizacion?: string;
    token: string;
  },
  fetcher: FetchLike = fetch,
): Promise<{
  success: true;
  billingVersion: "V2";
  finalizado: true;
  confirmacionProveedor: boolean;
}> {
  return requestV2("catastro/finalizar", input, fetcher);
}

export async function confirmarCallbackMembresiaV2(
  input: {
    token: string;
    tokenVersion: string;
    purpose: string;
    idCliente: string;
    idMembresia: string;
    idCotizacion: string;
    idObligacion: string;
  },
  fetcher: FetchLike = fetch,
): Promise<{
  flujo: Exclude<FlujoCallbackMembresiaV2, "INVALIDO_V2">;
  data: { success: true; billingVersion: "V2" } | null;
}> {
  const flujo = clasificarCallbackMembresiaV2(input);
  if (flujo === "INVALIDO_V2") {
    throw new Error(
      "El contexto V2 del registro de tarjeta está incompleto o no es válido.",
    );
  }
  if (flujo === "LEGACY") {
    return { flujo, data: null };
  }
  if (flujo === "COTIZACION") {
    const data = await confirmarCatastroMembresiaV2(
      {
        idCliente: input.idCliente,
        idMembresia: input.idMembresia,
        idCotizacion: input.idCotizacion,
        token: input.token,
      },
      fetcher,
    );
    return { flujo, data };
  }
  if (flujo === "OBLIGACION") {
    const data = await confirmarCatastroObligacionMembresiaV2(
      {
        idCliente: input.idCliente,
        idMembresia: input.idMembresia,
        idObligacion: input.idObligacion,
        token: input.token,
      },
      fetcher,
    );
    return { flujo, data };
  }
  const data = await finalizarCatastroMembresiaV2(
    {
      idCliente: input.idCliente,
      idMembresia: input.idMembresia,
      ...(input.idCotizacion
        ? { idCotizacion: input.idCotizacion }
        : {}),
      token: input.token,
    },
    fetcher,
  );
  return { flujo, data };
}

export async function prepararCambioTarjetaMembresiaV2(
  input: {
    idCliente: string;
    idMembresia: string;
    idCotizacion?: string;
    idObligacion?: string;
  },
  fetcher: FetchLike = fetch,
): Promise<CatastroPreparadoMembresiaV2> {
  return requestV2<CatastroPreparadoMembresiaV2>(
    "tarjetas/preparar",
    input,
    fetcher,
  );
}

export async function consultarEstadoCobroMembresiaV2(
  input: {
    idCliente: string;
    idMembresia: string;
    idCotizacion: string;
    token: string;
  },
  fetcher: FetchLike = fetch,
): Promise<SeguimientoCobroMembresiaV2> {
  return requestV2<SeguimientoCobroMembresiaV2>(
    "cobros/estado",
    input,
    fetcher,
  );
}

export async function consultarEstadoObligacionMembresiaV2(
  input: {
    idCliente: string;
    idMembresia: string;
    idObligacion: string;
    token: string;
  },
  fetcher: FetchLike = fetch,
): Promise<SeguimientoObligacionMembresiaV2> {
  return requestV2<SeguimientoObligacionMembresiaV2>(
    "cobros/estado-obligacion",
    input,
    fetcher,
  );
}

export function idempotencyKeyReintentoCobro(
  idCotizacion: string,
  token: string,
): string {
  return `landing:reintento:${idCotizacion}:${token.slice(-32)}`;
}

export async function reintentarCobroMembresiaV2(
  input: {
    idCliente: string;
    idMembresia: string;
    idCotizacion: string;
    token: string;
  },
  fetcher: FetchLike = fetch,
) {
  return requestV2<{
    success: true;
    billingVersion: "V2";
    trabajo: {
      idTrabajo: string;
      numeroIntento: number;
      estado: string;
      encoladoAhora: boolean;
    };
  }>(
    "cobros/reintentar",
    {
      ...input,
      idempotencyKey: idempotencyKeyReintentoCobro(
        input.idCotizacion,
        input.token,
      ),
    },
    fetcher,
  );
}

export type AccionFlujoMembresiaV2 =
  | "COTIZAR_ALTA"
  | "COTIZAR_REACTIVACION"
  | "PREPARAR_CATASTRO"
  | "CONTINUAR_CATASTRO"
  | "ESPERAR_COBRO"
  | "GESTIONAR_TARJETA"
  | "SIN_ACCION";

export interface FlujoMembresiaV2 {
  accion: AccionFlujoMembresiaV2;
  idCotizacion: string | null;
  tipoOperacion: "ALTA" | "REACTIVACION" | null;
  estadoCotizacion: string | null;
  expiresAt: string | null;
  confirmadaEn?: string | null;
  totalCobrarAhora: string | null;
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

export function idempotencyKeyAlta(idRegistroPendiente: string): string {
  return `landing:alta:${idRegistroPendiente}`;
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
    },
    fetcher,
  );
  return result.cotizacion;
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

export async function prepararCambioTarjetaMembresiaV2(
  input: {
    idCliente: string;
    idMembresia: string;
    idCotizacion?: string;
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

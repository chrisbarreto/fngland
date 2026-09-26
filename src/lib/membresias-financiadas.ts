export interface DisponibilidadFinanciada {
  habilitado: boolean;
  idPlan?: string;
  cuota?: string;
  numeroCuotas?: number;
  mesesCobertura?: number;
  versionTerminos?: { idVersion: string; hashDocumento: string; documento: string };
}
export interface CotizacionFinanciada {
  idCotizacionFinanciada: string;
  expiresAt: string;
  fechaAltaPrevista: string;
  numeroCuotas: number;
  importeCuota: string;
  importeTotal: string;
  segundoVencimiento: string;
  calendario: Array<{ numero: number; importe: string; vencimiento: string }>;
  coberturaPrevista: unknown;
  versionTerminos: { idVersion: string; hashDocumento: string; documento: string };
  documentoExacto: string;
  hashOferta: string;
}
export interface EstadoFinanciado {
  idContratoFinanciado: string;
  estadoContrato: string;
  estadoCobertura: string;
  estadoPrimeraCuota: string | null;
  estadoIntento: string | null;
  importeCuota: string;
  importeTotal: string;
  numeroCuotas: number;
  cuotasPagadas: number;
  segundoVencimiento: string | null;
  coberturaDesde: string | null;
  coberturaHastaExclusiva: string | null;
}
export async function solicitudFinanciada<T>(accion: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/membresias-financiadas?accion=${encodeURIComponent(accion)}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = result?.message ?? result?.error ?? `Error ${response.status}`;
    throw new Error(Array.isArray(message) ? message.join(". ") : String(message));
  }
  return result as T;
}

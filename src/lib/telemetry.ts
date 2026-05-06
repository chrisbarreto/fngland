/**
 * Telemetría client-side de la landing page.
 *
 * Acumula eventos en memoria y los flushea cada 3s (o al cerrar la pestaña
 * vía sendBeacon). Siempre fire-and-forget: nunca bloquea ni rompe la UX.
 */

export type PasoLanding =
  | "load_planes"
  | "select_plan"
  | "wizard_step"
  | "validation_fail"
  | "submit_registro"
  | "registro_vehiculo"
  | "actualizar_vehiculo"
  | "checkout"
  | "confirmar"
  | "bancard_response"
  | "fetch_error"
  | "js_error"
  | "unhandled_rejection";

export type SeveridadLanding = "info" | "warn" | "error";

export interface EventoLandingPayload {
  paso: PasoLanding;
  severidad: SeveridadLanding;
  codigo?: string;
  mensaje?: string;
  contexto?: Record<string, unknown>;
  idCliente?: string;
  idMembresia?: string;
}

interface EventoLandingWire extends EventoLandingPayload {
  sessionId: string;
  url?: string;
  ts: number;
}

const SESSION_STORAGE_KEY = "formulang_telemetry_session";
const FLUSH_INTERVAL_MS = 3000;
const MAX_BUFFER = 50;
const MAX_MENSAJE_LEN = 1000;
const MAX_CONTEXTO_BYTES = 4096;
const ENDPOINT = "/api/eventos-landing";

let sessionId: string | null = null;
let buffer: EventoLandingWire[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let installed = false;

function getSessionId(): string {
  if (sessionId) return sessionId;
  if (typeof window === "undefined") {
    sessionId = "ssr";
    return sessionId;
  }
  try {
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) {
      sessionId = existing;
      return existing;
    }
  } catch {
    // sessionStorage puede estar bloqueado (private mode, cookies disabled)
  }

  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `s-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, id);
  } catch {
    // ignore
  }
  sessionId = id;
  return id;
}

function readSessionContext(): { idCliente?: string; idMembresia?: string } {
  if (typeof window === "undefined") return {};
  try {
    const idCliente = window.sessionStorage.getItem("formulang_idCliente") || undefined;
    const idMembresia =
      window.sessionStorage.getItem("formulang_idMembresiaActivar") ||
      window.sessionStorage.getItem("formulang_idRegistroPendiente") ||
      undefined;
    return { idCliente, idMembresia };
  } catch {
    return {};
  }
}

function isUuid(s: string | undefined): s is string {
  return !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function sanitize(ev: EventoLandingPayload): EventoLandingWire | null {
  let contexto: Record<string, unknown> | undefined;
  if (ev.contexto) {
    try {
      const json = JSON.stringify(ev.contexto);
      if (json.length > MAX_CONTEXTO_BYTES) {
        contexto = { _truncated: true, _bytes: json.length };
      } else {
        contexto = JSON.parse(json) as Record<string, unknown>;
      }
    } catch {
      contexto = { _serializeError: true };
    }
  }

  const ctx = readSessionContext();
  const idCliente = ev.idCliente ?? ctx.idCliente;
  const idMembresia = ev.idMembresia ?? ctx.idMembresia;

  const wire: EventoLandingWire = {
    sessionId: getSessionId(),
    paso: ev.paso,
    severidad: ev.severidad,
    codigo: ev.codigo?.slice(0, 64),
    mensaje: ev.mensaje?.slice(0, MAX_MENSAJE_LEN),
    contexto,
    ts: Date.now(),
  };
  if (isUuid(idCliente)) wire.idCliente = idCliente;
  if (isUuid(idMembresia)) wire.idMembresia = idMembresia;
  if (typeof window !== "undefined" && window.location) {
    wire.url = window.location.href.slice(0, 500);
  }
  return wire;
}

function flushSync(useBeacon = false): void {
  if (buffer.length === 0) return;
  const events = buffer;
  buffer = [];
  const body = JSON.stringify({ events });

  if (useBeacon && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    try {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon(ENDPOINT, blob);
      if (ok) return;
    } catch {
      // fallthrough to fetch
    }
  }

  try {
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      /* swallow */
    });
  } catch {
    /* swallow */
  }
}

export function logEvent(ev: EventoLandingPayload): void {
  if (typeof window === "undefined") return;
  installHandlers();
  const wire = sanitize(ev);
  if (!wire) return;
  buffer.push(wire);
  if (buffer.length >= MAX_BUFFER) flushSync();
}

function installHandlers(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  flushTimer = setInterval(() => flushSync(false), FLUSH_INTERVAL_MS);

  const flushOnHide = () => flushSync(true);
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushOnHide();
  });
  window.addEventListener("pagehide", flushOnHide);
  window.addEventListener("beforeunload", flushOnHide);

  window.addEventListener("error", (e) => {
    logEvent({
      paso: "js_error",
      severidad: "error",
      mensaje: e.message,
      contexto: {
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        stack: e.error instanceof Error ? e.error.stack : undefined,
      },
    });
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : (() => {
              try {
                return JSON.stringify(reason);
              } catch {
                return String(reason);
              }
            })();
    logEvent({
      paso: "unhandled_rejection",
      severidad: "error",
      mensaje: message,
      contexto: {
        stack: reason instanceof Error ? reason.stack : undefined,
      },
    });
  });
}

export function getTelemetrySessionId(): string {
  return getSessionId();
}

export function flushTelemetry(): void {
  flushSync(true);
}

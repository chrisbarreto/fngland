import type { ModoCatastroMembresiaV2 } from "./membresias-v2";

export interface ContextoCatastroPublico {
  clienteNombre: string;
  codigoMembresia: string;
  planNombre: string;
  planPrecio: string;
  montoCobrarAhora: string | null;
  vigenciaCobroDesde: string | null;
  vigenciaCobroHasta: string | null;
  modo?: ModoCatastroMembresiaV2 | null;
  cobraAhora?: boolean;
  requiereConciliacion?: boolean;
}

export interface PresentacionContextoCatastro {
  titulo: string;
  mensaje: string;
  montoLabel: string;
  montoValor: string;
}

export interface PresentacionResultadoCatastro {
  titulo: string;
  mensaje: string;
}

function guaranies(monto: string | null): string {
  const numero = Number(monto ?? 0);
  return `${new Intl.NumberFormat("es-PY").format(
    Number.isFinite(numero) ? Math.round(numero) : 0,
  )} Gs.`;
}

export function describirContextoCatastro(
  contexto: ContextoCatastroPublico,
): PresentacionContextoCatastro {
  if (contexto.requiereConciliacion === true) {
    return {
      titulo: "Registro sin nuevo cobro",
      mensaje:
        "Registraremos tu nueva tarjeta. Hay un pago en verificación, por lo que no realizaremos otro cobro ni alteraremos ese proceso.",
      montoLabel: "Débito ahora",
      montoValor: "Sin cobro",
    };
  }

  const cobraAhora = contexto.cobraAhora ?? contexto.montoCobrarAhora !== null;
  if (!cobraAhora || contexto.modo === "SOLO_CATASTRO") {
    return {
      titulo: "Solo registro de tarjeta",
      mensaje:
        "Registraremos tu nueva tarjeta y activaremos el débito automático. No realizaremos ningún cobro ahora.",
      montoLabel: "Débito ahora",
      montoValor: "Sin cobro",
    };
  }

  const monto = guaranies(contexto.montoCobrarAhora);
  switch (contexto.modo) {
    case "PAGO_OBLIGACION_PENDIENTE":
      return {
        titulo: "Registro y pago pendiente",
        mensaje: `Luego de registrar la tarjeta procesaremos la obligación pendiente por ${monto}`,
        montoLabel: "Obligación a cobrar",
        montoValor: monto,
      };
    case "REACTIVACION_PRORRATEADA":
      return {
        titulo: "Registro y reactivación",
        mensaje: `Luego de registrar la tarjeta procesaremos la reactivación prorrateada por ${monto}`,
        montoLabel: "Reactivación a cobrar",
        montoValor: monto,
      };
    case "ALTA_PENDIENTE":
      return {
        titulo: "Registro y activación",
        mensaje: `Luego de registrar la tarjeta procesaremos la activación de la membresía por ${monto}`,
        montoLabel: "Activación a cobrar",
        montoValor: monto,
      };
    default:
      return {
        titulo: "Registro y pago",
        mensaje: `Luego de registrar la tarjeta procesaremos el pago indicado por ${monto}`,
        montoLabel: "Monto a cobrar ahora",
        montoValor: monto,
      };
  }
}

export function describirResultadoCatastro(input: {
  conCobro: boolean;
  debitoAutomatico?: boolean;
  requiereConciliacion?: boolean;
  tarjetasCount: number;
}): PresentacionResultadoCatastro {
  if (input.conCobro) {
    return {
      titulo: "¡Pago realizado!",
      mensaje:
        "Tu tarjeta fue registrada y el cobro de tu membresía se realizó correctamente.",
    };
  }
  if (input.requiereConciliacion === true) {
    return {
      titulo: "Tarjeta registrada",
      mensaje:
        "Tu tarjeta fue registrada. Hay un pago en verificación; no realizamos un nuevo cobro ni alteramos ese proceso.",
    };
  }
  if (input.debitoAutomatico === true) {
    const extra =
      input.tarjetasCount > 0
        ? ` Tienes ${input.tarjetasCount} tarjeta${input.tarjetasCount > 1 ? "s" : ""} activa${input.tarjetasCount > 1 ? "s" : ""}.`
        : "";
    return {
      titulo: "Tarjeta registrada",
      mensaje: `Tu tarjeta quedó habilitada para el débito automático.${extra}`,
    };
  }
  return {
    titulo: "Tarjeta registrada",
    mensaje:
      "Tu tarjeta quedó registrada correctamente. No se realizó ningún cobro.",
  };
}

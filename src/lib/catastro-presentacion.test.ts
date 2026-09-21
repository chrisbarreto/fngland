import { describe, expect, it } from "vitest";
import {
  describirContextoCatastro,
  describirResultadoCatastro,
  type ContextoCatastroPublico,
} from "./catastro-presentacion";

function contexto(
  cambios: Partial<ContextoCatastroPublico> = {},
): ContextoCatastroPublico {
  return {
    clienteNombre: "Cliente",
    codigoMembresia: "NG28",
    planNombre: "Fórmula",
    planPrecio: "200000",
    montoCobrarAhora: null,
    vigenciaCobroDesde: null,
    vigenciaCobroHasta: null,
    modo: "SOLO_CATASTRO",
    cobraAhora: false,
    requiereConciliacion: false,
    ...cambios,
  };
}

describe("presentación pública del catastro", () => {
  it("no muestra el precio del plan como un cobro inmediato", () => {
    expect(describirContextoCatastro(contexto())).toMatchObject({
      titulo: "Solo registro de tarjeta",
      montoLabel: "Débito ahora",
      montoValor: "Sin cobro",
    });
  });

  it("muestra la obligación exacta a cobrar", () => {
    const resultado = describirContextoCatastro(
      contexto({
        modo: "PAGO_OBLIGACION_PENDIENTE",
        cobraAhora: true,
        montoCobrarAhora: "200000",
      }),
    );

    expect(resultado.montoLabel).toBe("Obligación a cobrar");
    expect(resultado.montoValor).toBe("200.000 Gs.");
  });

  it("advierte que la conciliación no genera otro cobro", () => {
    const resultado = describirContextoCatastro(
      contexto({ requiereConciliacion: true }),
    );

    expect(resultado.titulo).toBe("Registro sin nuevo cobro");
    expect(resultado.mensaje).toContain("no realizaremos otro cobro");
  });

  it("no afirma que el débito quedó activo durante la conciliación", () => {
    const resultado = describirResultadoCatastro({
      conCobro: false,
      debitoAutomatico: false,
      requiereConciliacion: true,
      tarjetasCount: 0,
    });

    expect(resultado.mensaje).toContain("pago en verificación");
    expect(resultado.mensaje).not.toContain("habilitada");
  });
});

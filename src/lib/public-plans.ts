// Los IDs pertenecen al ambiente y se configuran exclusivamente mediante .env.
// Si falta uno, la oferta permanece visible pero su contratación queda deshabilitada.
function planId(configured: string | undefined): string {
  return configured?.trim() || "";
}
export const PUBLIC_PLANS = [
  {
    key: "essential",
    minimumTermMonths: 12,
    id: planId(import.meta.env.PUBLIC_ESSENTIAL_PLAN_ID),
    name: "Fórmula Essential",
    monthlyPrice: 200000,
    badge: "",
    note: "",
    services: [
      "4 lavados al mes, hasta 1 por semana",
      "Prelavado y lavado exterior con shampoo pH neutro",
      "Aspirado profundo, desinfección interior y revitalización de neumáticos",
    ],
    bonuses: [
      "1 cera con protección de hasta 30 días",
      "1 hidratación de plásticos interiores",
    ],
  },
  {
    key: "plus",
    minimumTermMonths: 12,
    id: planId(import.meta.env.PUBLIC_PLUS_PLAN_ID),
    name: "Fórmula Plus",
    monthlyPrice: 250000,
    badge: "MÁS POPULAR",
    note: "",
    services: [
      "6 lavados al mes",
      "Shampoo pH neutro, aspirado, desinfección y revitalización de neumáticos",
      "Higienización del sistema de ventilación",
    ],
    bonuses: [
      "1 cera líquida con protección de hasta 60 días",
      "1 lavado profesional de motor y 1 hidratación de plásticos interiores",
      "1 pick up en Asunción o Gran Asunción",
    ],
  },
  {
    key: "black",
    minimumTermMonths: 12,
    id: planId(import.meta.env.PUBLIC_BLACK_PLAN_ID),
    name: "Fórmula Black",
    monthlyPrice: 300000,
    badge: "RECOMENDADO",
    note: "Elegí hasta 2 servicios logísticos por mes en total, en cualquier combinación.",
    services: [
      "Lavados ilimitados durante la vigencia de la membresía",
      "Shampoo pH neutro, aspirado, desinfección y revitalización de neumáticos",
      "Higienización del sistema de ventilación",
    ],
    bonuses: [
      "1 cera líquida con protección de hasta 4 meses",
      "1 lavado profesional de motor y 1 hidratación de plásticos interiores",
      "Pick up o lavado a domicilio en Asunción y Gran Asunción",
    ],
  },
  {
    key: "domicilio",
    minimumTermMonths: 1,
    id: planId(import.meta.env.PUBLIC_DOMICILIO_PLAN_ID),
    name: "Plan Domicilio",
    monthlyPrice: 500000,
    badge: "",
    note: "Todo el servicio se realiza en tu casa u oficina.",
    services: [
      "4 servicios de detailing a domicilio al mes",
      "Lavado exterior con shampoo pH neutro",
      "Aspirado profundo y desinfección de interiores",
      "Revitalización de neumáticos",
      "Hidratación de plásticos interiores",
    ],
    bonuses: [],
  },
] as const;

// Gold usa un flujo de contratación financiada separado y no entra en
// PUBLIC_PLAN_IDS, que corresponde a membresías prepagas.
export const FINANCED_GOLD_PLAN = {
  key: "gold",
  id: planId(import.meta.env.PUBLIC_GOLD_PLAN_ID),
  name: "Plan Gold",
  installmentPrice: 400000,
  installments: 15,
  totalPrice: 6000000,
  badge: "PLAN FINANCIADO",
  services: [
    "Tratamiento nanocerámico premium inicial incluido en el precio",
  ],
  bonuses: [
    "Hasta 4 lavados exteriores por mes, máximo 1 por semana",
    "Mantenimiento nanocerámico en cada lavado semanal, sin cita adicional",
    "Aspirado profundo y desinfección de interiores",
    "Pulido comercial y aplicación de PPF en bordes y manijas de puertas",
    "Cuidado de plásticos interiores",
    "Hasta 1 traslado en Gran Asunción por mes",
  ],
} as const;

// Estos planes no se ofrecen en la landing; solo identifican contratos históricos.
export const LEGACY_PLANS = [
  {
    id: planId(import.meta.env.PUBLIC_LEGACY_FORMULA_PLAN_ID),
    name: "Plan Fórmula",
    monthlyPrice: 200000,
  },
  {
    id: planId(import.meta.env.PUBLIC_LEGACY_PREMIUM_PLAN_ID),
    name: "Plan Premium",
    monthlyPrice: 250000,
  },
  {
    id: planId(import.meta.env.PUBLIC_LEGACY_GOLD_PLAN_ID),
    name: "Plan Gold",
    monthlyPrice: 350000,
  },
] as const;
export const PUBLIC_PLAN_IDS = new Set(PUBLIC_PLANS.map((plan) => plan.id).filter(Boolean));
export const PUBLIC_PLAN_IDS_LIST = Array.from(PUBLIC_PLAN_IDS);

export function formatGuaranies(amount: number): string {
  return new Intl.NumberFormat("es-PY").format(amount);
}

export function dailyEquivalent(monthlyPrice: number): number {
  return Math.round(monthlyPrice / 30);
}

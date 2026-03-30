interface ComprobanteData {
  numeroComprobante: number;
  cliente: {
    nombre: string;
    ci: string;
    email: string;
    telefono: string;
  };
  membresia: {
    codigo: string;
    numeroMembresia: number;
    plan: string;
    fechaInicio: string;
    fechaFin: string;
  };
  serviciosIncluidos: Array<{
    nombre: string;
    cantidad: number | null;
  }>;
  pago: {
    monto: number;
    moneda: string;
    fecha: string;
    idTransaccion: string;
    hashPedido: string;
    numeroPedido: string;
  };
  tarjeta: {
    ultimos4: string;
    descripcion: string;
  } | null;
  vehiculo: {
    chapa: string;
    marca: string | null;
    modelo: string | null;
  } | null;
}

function formatGuaranies(amount: number): string {
  return `Gs. ${amount.toLocaleString("es-PY")}`;
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function formatDateShort(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch("/logo-formula-ng.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateReceipt(data: ComprobanteData): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const ml = 20;
  const mr = 20;
  const rightEdge = pageWidth - mr;
  let y = 20;

  // Logo
  const logoDataUrl = await loadLogoDataUrl();
  const logoW = 65;
  const logoH = Math.round((148 / 670) * logoW * 10) / 10; // ~14.4mm
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", ml, y, logoW, logoH);
    y += logoH + 5;
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(249, 38, 6);
    doc.text("Formula NG", ml, y + 8);
    y += 16;
  }

  // Company info
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(249, 38, 6);
  doc.text("Formula NG E.A.S. \u00B7 RUC 80156407-7", ml, y);
  y += 4.5;
  doc.setTextColor(80, 80, 80);
  doc.text("23 de Octubre 687 c/ Toribio Pacheco, Asunci\u00F3n", ml, y);
  y += 4.5;
  doc.text("info@formulang.com.py", ml, y);
  y += 4.5;
  doc.text("0992 789 328", ml, y);
  y += 12;

  // Receipt number
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal");
  doc.text("Comprobante N.\u00B0", ml, y);
  doc.setFont("helvetica", "bold");
  doc.text(String(data.numeroComprobante).padStart(6, "0"), ml + 47, y);
  y += 3;

  // Divider
  function hLine() {
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(ml, y, rightEdge, y);
    y += 7;
  }

  hLine();

  // Row helper: label left, value right-aligned
  function row(label: string, value: string, bold = false) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(label, ml, y);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(30, 30, 30);
    doc.text(value, rightEdge, y, { align: "right" });
    y += 6.5;
  }

  function sectionLabel(label: string) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(label.toUpperCase(), ml, y);
    y += 6;
  }

  // Main data rows
  row("Fecha", formatDate(data.pago.fecha));
  row("Nombre", data.cliente.nombre);
  if (data.cliente.ci) row("RUC / CI", data.cliente.ci);
  row("Plan", data.membresia.plan);
  row("Membres\u00EDa", data.membresia.codigo);
  row(
    "Vigencia",
    `${formatDateShort(data.membresia.fechaInicio)} \u2014 ${formatDateShort(data.membresia.fechaFin)}`
  );
  if (data.vehiculo) {
    const marcaModelo =
      [data.vehiculo.marca, data.vehiculo.modelo].filter(Boolean).join(" ") ||
      "\u2014";
    row("Veh\u00EDculo", marcaModelo);
    row("Chapa", data.vehiculo.chapa);
  }

  hLine();
  sectionLabel("Servicios incluidos");

  for (const s of data.serviciosIncluidos) {
    row(s.nombre, s.cantidad != null ? String(s.cantidad) : "Ilimitado");
  }

  hLine();

  row("Monto", formatGuaranies(data.pago.monto));
  if (data.pago.numeroPedido) row("N\u00B0 Pedido Pagopar", data.pago.numeroPedido);
  row("Referencia", data.pago.hashPedido.slice(0, 20) + "...");

  hLine();

  // Total
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.text("TOTAL", ml, y);
  doc.text(formatGuaranies(data.pago.monto), rightEdge, y, { align: "right" });
  y += 10;

  // Forma de pago
  if (data.tarjeta) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text("Forma de pago:", ml, y);
    doc.setTextColor(30, 30, 30);
    doc.text(data.tarjeta.descripcion, ml + 40, y);
    y += 10;
  }

  hLine();

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    "Este documento no constituye una factura legal.",
    ml,
    y
  );
  y += 4.5;
  doc.text(
    "Comprobante electr\u00F3nico de pago emitido por Formula NG E.A.S. con fines informativos.",
    ml,
    y
  );
  y += 4.5;
  doc.text(`Generado: ${formatDate(new Date().toISOString())}`, ml, y);

  doc.save(`comprobante-${data.membresia.codigo}.pdf`);
}

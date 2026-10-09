import { formatDate, formatRs, GST_RATE, SALES_TAX_RATE, lineAmount } from "./invoice-math";

export type PdfData = {
  business: { name: string; address: string; phones: string };
  invoice_number: number; invoice_date: string;
  client_name: string; client_address: string; client_phone: string;
  items: { description: string; quantity: number; unit_price: number }[];
  gst: boolean; sales_tax: boolean;
  subtotal: number; gstAmount: number; salesTaxAmount: number; grand: number;
};

const BLUE: [number, number, number] = [142, 169, 219];

export async function buildInvoicePdf(d: PdfData) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const W = pdf.internal.pageSize.getWidth();
  const M = 40;
  const CW = W - M * 2;
  const band = (x: number, y: number, w: number, h: number) => {
    pdf.setFillColor(...BLUE);
    pdf.rect(x, y, w, h, "F");
  };
  pdf.setTextColor(0, 0, 0);
  pdf.setDrawColor(0, 0, 0);

  let y = 40;
  band(M, y, CW, 40);
  pdf.setFont("times", "bold"); pdf.setFontSize(22);
  pdf.text(d.business.name, W / 2, y + 27, { align: "center" });
  y += 58;
  pdf.setFontSize(10); pdf.text(d.business.address, W / 2, y, { align: "center" });
  y += 14; pdf.setFontSize(9); pdf.text("CONTACT: " + d.business.phones, W / 2, y, { align: "center" });
  y += 16;
  band(M, y, CW, 26);
  pdf.setFontSize(15); pdf.text("INVOICE", W / 2, y + 18, { align: "center" });
  y += 38;

  const half = CW * 0.58;
  band(M, y, half, 50);
  pdf.setFontSize(10); pdf.text("BILL TO", M + half / 2, y + 16, { align: "center" });
  const bx = M + half + 10, bw = CW - half - 10;
  pdf.setLineWidth(0.5); pdf.rect(bx, y, bw, 50);
  pdf.line(bx, y + 25, bx + bw, y + 25);
  pdf.text("DATE:", bx + 8, y + 16); pdf.setFont("times", "normal"); pdf.text(formatDate(d.invoice_date), bx + 80, y + 16);
  pdf.setFont("times", "bold"); pdf.text("INVOICE#", bx + 8, y + 41); pdf.setFont("times", "normal"); pdf.text(String(d.invoice_number), bx + 80, y + 41);
  y += 64;

  for (const [label, val] of [["NAME:", d.client_name], ["ADDRESS:", d.client_address], ["MOB:", d.client_phone]] as [string, string][]) {
    pdf.setFont("times", "bold"); pdf.text(label, M + 4, y + 13);
    pdf.setFont("times", "normal"); pdf.text(val || "", M + 80, y + 13);
    pdf.line(M + 76, y + 18, M + CW, y + 18);
    y += 22;
  }
  y += 10;

  const cols: [number, number, number, number, number] = [40, CW - 40 - 60 - 80 - 90, 60, 80, 90];
  const heads = ["Sno", "Description", "Qty", "U/Price", "Amount"];
  band(M, y, CW, 22);
  pdf.setFont("times", "bold");
  let x = M;
  heads.forEach((h, i) => { pdf.text(h, x + cols[i]! / 2, y + 15, { align: "center" }); x += cols[i]!; });
  pdf.rect(M, y, CW, 22);
  y += 22;
  const rows = Math.max(10, d.items.length);
  pdf.setFont("times", "normal");
  for (let r = 0; r < rows; r++) {
    const it = d.items[r];
    x = M;
    cols.forEach((c) => { pdf.rect(x, y, c, 20); x += c; });
    if (it) {
      const desc = pdf.splitTextToSize(it.description, cols[1] - 8)[0] ?? "";
      pdf.text(String(r + 1), M + cols[0] / 2, y + 14, { align: "center" });
      pdf.text(desc, M + cols[0] + 4, y + 14);
      pdf.text(String(it.quantity), M + cols[0] + cols[1] + cols[2] / 2, y + 14, { align: "center" });
      pdf.text(it.unit_price.toFixed(2), M + cols[0] + cols[1] + cols[2] + cols[3] - 4, y + 14, { align: "right" });
      pdf.text(lineAmount(it.quantity, it.unit_price).toFixed(2), M + CW - 4, y + 14, { align: "right" });
    } else {
      pdf.text(String(r + 1), M + cols[0] / 2, y + 14, { align: "center" });
    }
    y += 20;
  }
  y += 16;

  const tx = M + CW - 230, tw = 230;
  const trow = (label: string, val: string) => {
    pdf.rect(tx, y, tw, 20);
    pdf.setFont("times", "bold"); pdf.text(label, tx + 6, y + 14);
    pdf.setFont("times", "normal"); pdf.text(val, tx + tw - 6, y + 14, { align: "right" });
    y += 20;
  };
  trow("TOTAL AMOUNT", formatRs(d.subtotal));
  if (d.gst) trow(`GST ${GST_RATE}%`, formatRs(d.gstAmount));
  if (d.sales_tax) trow(`SALES TAX ${SALES_TAX_RATE}%`, formatRs(d.salesTaxAmount));
  band(tx, y, tw, 24);
  pdf.rect(tx, y, tw, 24);
  pdf.setFont("times", "bold"); pdf.setFontSize(11);
  pdf.text("GRAND TOTAL", tx + 6, y + 16);
  pdf.text(formatRs(d.grand).toUpperCase(), tx + tw - 6, y + 16, { align: "right" });
  y += 70;

  const sw = (CW - 40) / 2;
  pdf.setFontSize(9);
  pdf.line(M, y, M + sw, y); pdf.text("CUSTOMER SIGNATURE", M + sw / 2, y + 13, { align: "center" });
  pdf.line(M + sw + 40, y, M + CW, y); pdf.text("AUTHORIZED SIGNATURE", M + sw + 40 + sw / 2, y + 13, { align: "center" });

  return pdf;
}

export function pdfFileName(n: number) {
  return `invoice-${n}.pdf`;
}

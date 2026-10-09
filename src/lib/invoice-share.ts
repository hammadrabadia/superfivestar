import { toast } from "sonner";
import { buildInvoicePdf, pdfFileName, type PdfData } from "./invoice-pdf";
import { formatDate, formatRs, lineAmount, toWhatsAppNumber } from "./invoice-math";

export async function downloadPdf(d: PdfData) {
  const pdf = await buildInvoicePdf(d);
  pdf.save(pdfFileName(d.invoice_number));
}

function summary(d: PdfData) {
  const lines = [
    d.business.name,
    `Invoice #${d.invoice_number} — ${formatDate(d.invoice_date)}`,
    `Customer: ${d.client_name || "-"}`,
    "",
    ...d.items.map((i, n) => `${n + 1}. ${i.description} — ${i.quantity} × ${i.unit_price.toFixed(2)} = ${formatRs(lineAmount(i.quantity, i.unit_price))}`),
    "",
    `Total: ${formatRs(d.grand)}`,
    "Thank you!",
  ];
  return lines.join("\n");
}

export async function shareWhatsApp(d: PdfData) {
  const pdf = await buildInvoicePdf(d);
  const blob = pdf.output("blob");
  const file = new File([blob], pdfFileName(d.invoice_number), { type: "application/pdf" });
  const text = summary(d);
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], text, title: `Invoice #${d.invoice_number}` });
      return;
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
  }
  pdf.save(pdfFileName(d.invoice_number));
  const num = toWhatsAppNumber(d.client_phone);
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, "_blank");
  toast.success("PDF downloaded — attach it in the WhatsApp chat.");
}

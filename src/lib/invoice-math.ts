export const GST_RATE = 18;
export const SALES_TAX_RATE = 5.5;

export type ItemInput = { description: string; quantity: number; unit_price: number };

export function lineAmount(qty: number, price: number) {
  return Math.round((Number(qty) || 0) * (Number(price) || 0) * 100) / 100;
}

export function taxRate(gst: boolean, salesTax: boolean) {
  return (gst ? GST_RATE : 0) + (salesTax ? SALES_TAX_RATE : 0);
}

export function computeTotals(items: ItemInput[], gst: boolean, salesTax: boolean) {
  const subtotal = Math.round(items.reduce((s, i) => s + lineAmount(i.quantity, i.unit_price), 0) * 100) / 100;
  const rate = taxRate(gst, salesTax);
  const gstAmount = gst ? Math.round(subtotal * GST_RATE) / 100 : 0;
  const salesTaxAmount = salesTax ? Math.round(subtotal * SALES_TAX_RATE) / 100 : 0;
  const tax = Math.round((gstAmount + salesTaxAmount) * 100) / 100;
  return { subtotal, rate, gstAmount, salesTaxAmount, tax, grand: Math.round((subtotal + tax) * 100) / 100 };
}

export function isBlankItem(i: ItemInput) {
  return !i.description.trim() && !Number(i.quantity) && !Number(i.unit_price);
}

export function formatRs(n: number) {
  return "Rs " + (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}-${m}-${y}`;
}

export function toWhatsAppNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return "92" + digits.slice(1);
  return digits;
}

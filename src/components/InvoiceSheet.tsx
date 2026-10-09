import { Plus, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { formatRs, lineAmount, GST_RATE, SALES_TAX_RATE, computeTotals, formatDate } from "@/lib/invoice-math";
import type { Business } from "@/lib/invoices.functions";

export type Row = { description: string; quantity: string; unit_price: string };
export type SheetState = {
  invoice_number: number | null;
  invoice_date: string;
  client_name: string;
  client_address: string;
  client_phone: string;
  rows: Row[];
  gst: boolean;
  sales_tax: boolean;
};

export const emptyRow = (): Row => ({ description: "", quantity: "", unit_price: "" });

export function rowsToItems(rows: Row[]) {
  return rows.map((r) => ({ description: r.description, quantity: Number(r.quantity) || 0, unit_price: Number(r.unit_price) || 0 }));
}

type Props = {
  business: Business;
  state: SheetState;
  onChange?: (s: SheetState) => void;
  readOnly?: boolean;
};

export function InvoiceSheet({ business, state, onChange, readOnly }: Props) {
  const set = (patch: Partial<SheetState>) => onChange?.({ ...state, ...patch });
  const setRow = (i: number, patch: Partial<Row>) => set({ rows: state.rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });
  const t = computeTotals(rowsToItems(state.rows), state.gst, state.sales_tax);
  const rows = readOnly && state.rows.length < 10 ? [...state.rows, ...Array.from({ length: 10 - state.rows.length }, emptyRow)] : state.rows;

  return (
    <div className="invoice-paper">
      <div className="invoice-band py-2 text-center text-3xl font-bold tracking-wide">{business.name}</div>
      <div className="mt-4 text-center text-sm font-bold">{business.address}</div>
      <div className="text-center text-xs font-bold">CONTACT: {business.phones}</div>

      <div className="invoice-band mt-5 py-2 text-center text-xl font-bold">INVOICE</div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr]">
        <div className="invoice-band flex justify-center pt-3 text-sm font-bold">BILL TO</div>
        <div className="border border-ink/20 text-sm">
          <div className="flex items-center border-b border-ink/20">
            <span className="w-24 px-3 py-2 font-bold">DATE:</span>
            {readOnly ? (
              <span className="px-3">{formatDate(state.invoice_date)}</span>
            ) : (
              <input type="date" className="invoice-line-input" value={state.invoice_date} onChange={(e) => set({ invoice_date: e.target.value })} />
            )}
          </div>
          <div className="flex items-center">
            <span className="w-24 px-3 py-2 font-bold">INVOICE#</span>
            <span className="px-3">{state.invoice_number ?? "…"}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-1">
        {([
          ["NAME:", "client_name", "Customer name"],
          ["ADDRESS:", "client_address", "Customer address"],
          ["MOB:", "client_phone", "Mobile number"],
        ] as const).map(([label, key, ph]) => (
          <div key={key} className="invoice-field-row">
            <span className="w-28 shrink-0 text-sm font-bold">{label}</span>
            {readOnly ? (
              <span className="px-3 py-2 text-sm">{state[key] || "—"}</span>
            ) : (
              <input className="invoice-line-input" placeholder={ph} value={state[key]} onChange={(e) => set({ [key]: e.target.value })} />
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="invoice-band">
              <th className="invoice-th w-14">Sno</th>
              <th className="invoice-th">Description</th>
              <th className="invoice-th w-24">Qty</th>
              <th className="invoice-th w-28">U/Price</th>
              <th className="invoice-th w-32">Amount</th>
              {!readOnly && <th className="invoice-th w-10" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="invoice-td text-center">{i + 1}</td>
                <td className="invoice-td p-0">
                  {readOnly ? <span className="px-2">{r.description}</span> : <input className="invoice-table-input" value={r.description} onChange={(e) => setRow(i, { description: e.target.value })} />}
                </td>
                <td className="invoice-td p-0">
                  {readOnly ? <span className="block text-center">{r.quantity}</span> : <input type="number" min="0" className="invoice-table-input text-center" value={r.quantity} onChange={(e) => setRow(i, { quantity: e.target.value })} />}
                </td>
                <td className="invoice-td p-0">
                  {readOnly ? <span className="block px-2 text-right">{r.unit_price && Number(r.unit_price).toFixed(2)}</span> : <input type="number" min="0" step="0.01" className="invoice-table-input text-right" value={r.unit_price} onChange={(e) => setRow(i, { unit_price: e.target.value })} />}
                </td>
                <td className="invoice-td px-3 text-right">{readOnly && !r.description && !r.quantity ? "" : lineAmount(Number(r.quantity), Number(r.unit_price)).toFixed(2)}</td>
                {!readOnly && (
                  <td className="invoice-td text-center">
                    <button type="button" aria-label={`Remove row ${i + 1}`} className="p-1 text-ink/70 hover:text-destructive" onClick={() => set({ rows: state.rows.filter((_, idx) => idx !== i) })}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <button type="button" className="mt-3 inline-flex items-center gap-2 border border-ink/20 px-3 py-1.5 text-xs hover:bg-workspace" onClick={() => set({ rows: [...state.rows, emptyRow()] })}>
          <Plus className="h-4 w-4" /> Add row
        </button>
      )}

      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-sm border border-ink/20 text-sm">
          <div className="flex justify-between border-b border-ink/20 px-2 py-1.5"><span className="font-bold">TOTAL AMOUNT</span><span>{formatRs(t.subtotal)}</span></div>
          {(!readOnly || state.gst) && (
            <div className="flex items-center justify-between border-b border-ink/20 px-2 py-1.5">
              <span className="flex items-center gap-2 font-bold">{!readOnly && <Switch checked={state.gst} onCheckedChange={(v) => set({ gst: v })} aria-label="GST" />}GST {GST_RATE}%</span>
              <span>{formatRs(t.gstAmount)}</span>
            </div>
          )}
          {(!readOnly || state.sales_tax) && (
            <div className="flex items-center justify-between border-b border-ink/20 px-2 py-1.5">
              <span className="flex items-center gap-2 font-bold">{!readOnly && <Switch checked={state.sales_tax} onCheckedChange={(v) => set({ sales_tax: v })} aria-label="Sales tax" />}SALES TAX {SALES_TAX_RATE}%</span>
              <span>{formatRs(t.salesTaxAmount)}</span>
            </div>
          )}
          <div className="invoice-band flex justify-between px-2 py-2 font-bold"><span>GRAND TOTAL</span><span>{formatRs(t.grand).toUpperCase()}</span></div>
        </div>
      </div>

      <div className="mt-14 grid grid-cols-2 gap-12 text-xs font-bold">
        <div className="border-t border-ink pt-2 text-center">CUSTOMER SIGNATURE</div>
        <div className="border-t border-ink pt-2 text-center">AUTHORIZED SIGNATURE</div>
      </div>
    </div>
  );
}

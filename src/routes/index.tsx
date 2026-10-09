import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InvoiceSheet, emptyRow, rowsToItems, type SheetState } from "@/components/InvoiceSheet";
import { createInvoice, getBusiness, nextInvoiceNumber, updateBusiness, type Business } from "@/lib/invoices.functions";
import { computeTotals, isBlankItem } from "@/lib/invoice-math";
import type { PdfData } from "@/lib/invoice-pdf";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "New Invoice — Uni Bind Photo Service" },
      { name: "description", content: "Create, save and share printable invoices for Uni Bind Photo Service." },
      { property: "og:title", content: "New Invoice — Uni Bind Photo Service" },
      { property: "og:description", content: "Create, save and share printable invoices." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewInvoice,
});

const today = () => new Date().toISOString().slice(0, 10);
const fresh = (): SheetState => ({
  invoice_number: null, invoice_date: today(), client_name: "", client_address: "", client_phone: "",
  rows: Array.from({ length: 10 }, emptyRow), gst: false, sales_tax: false,
});

export const businessQuery = { queryKey: ["business"] };

function NewInvoice() {
  const fetchBusiness = useServerFn(getBusiness);
  const reserve = useServerFn(nextInvoiceNumber);
  const create = useServerFn(createInvoice);
  const { data: business } = useQuery({ ...businessQuery, queryFn: () => fetchBusiness() });
  const [state, setState] = useState<SheetState>(fresh);
  const [busy, setBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const savedId = useRef<string | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    reserve().then((n) => setState((s) => ({ ...s, invoice_number: n }))).catch(() => toast.error("Couldn't reserve an invoice number"));
  }, [reserve]);

  const change = (s: SheetState) => setState(s);

  async function save(): Promise<string | null> {
    if (state.invoice_number == null) { toast.error("Invoice number not ready yet"); return null; }
    const res = await create({ data: {
      id: savedId.current ?? undefined, invoice_number: state.invoice_number, invoice_date: state.invoice_date,
      client_name: state.client_name, client_address: state.client_address, client_phone: state.client_phone,
      gst: state.gst, sales_tax: state.sales_tax, items: rowsToItems(state.rows),
    } });
    savedId.current = res.id;
    qc.invalidateQueries({ queryKey: ["invoices"] });
    return res.id;
  }

  function pdfData(): PdfData {
    const items = rowsToItems(state.rows).filter((i) => !isBlankItem(i));
    const t = computeTotals(items, state.gst, state.sales_tax);
    return { business: business!, invoice_number: state.invoice_number!, invoice_date: state.invoice_date,
      client_name: state.client_name, client_address: state.client_address, client_phone: state.client_phone,
      items, gst: state.gst, sales_tax: state.sales_tax, subtotal: t.subtotal, gstAmount: t.gstAmount, salesTaxAmount: t.salesTaxAmount, grand: t.grand };
  }

  async function run(kind: "save" | "pdf" | "wa") {
    if (!business) return;
    setBusy(true);
    try {
      const id = await save();
      if (!id) return;
      if (kind === "save") toast.success(`Invoice #${state.invoice_number} saved`);
      if (kind === "pdf") { const { downloadPdf } = await import("@/lib/invoice-share"); await downloadPdf(pdfData()); }
      if (kind === "wa") { const { shareWhatsApp } = await import("@/lib/invoice-share"); await shareWhatsApp(pdfData()); }
    } catch (e) {
      toast.error((e as Error).message || "Something went wrong");
    } finally { setBusy(false); }
  }

  return (
    <div className="invoice-workspace">
      <div className="mx-auto max-w-[860px]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link to="/invoices" className="text-sm text-ink/70 hover:text-ink">Saved invoices</Link>
          <div className="flex flex-wrap gap-2">
            <Button variant="paper" size="icon" aria-label="Settings" onClick={() => setSettingsOpen(true)}><Settings className="h-4 w-4" /></Button>
            <Button variant="paper" disabled={busy || !business} onClick={() => run("wa")}>WhatsApp</Button>
            <Button variant="paper" disabled={busy || !business} onClick={() => run("pdf")}>Download PDF</Button>
            <Button variant="ink" disabled={busy || !business} onClick={() => run("save")}>Save invoice</Button>
          </div>
        </div>
        {business ? <InvoiceSheet business={business} state={state} onChange={change} /> : <div className="invoice-paper h-[1100px] animate-pulse" />}
      </div>
      {business && <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} business={business} />}
    </div>
  );
}

function SettingsDialog({ open, onOpenChange, business }: { open: boolean; onOpenChange: (o: boolean) => void; business: Business }) {
  const [form, setForm] = useState(business);
  const update = useServerFn(updateBusiness);
  const qc = useQueryClient();
  useEffect(() => { if (open) setForm(business); }, [open, business]);
  async function submit() {
    try {
      await update({ data: form });
      await qc.invalidateQueries({ queryKey: ["business"] });
      toast.success("Business details updated");
      onOpenChange(false);
    } catch (e) { toast.error((e as Error).message); }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Business details</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {(["name", "address", "phones"] as const).map((k) => (
            <div key={k} className="space-y-1">
              <Label htmlFor={k} className="capitalize">{k}</Label>
              <Input id={k} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </div>
          ))}
        </div>
        <DialogFooter><Button variant="ink" onClick={submit}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

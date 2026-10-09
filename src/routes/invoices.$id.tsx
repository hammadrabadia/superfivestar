import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { InvoiceSheet, type SheetState } from "@/components/InvoiceSheet";
import { deleteInvoice, getBusiness, getInvoice } from "@/lib/invoices.functions";
import { computeTotals, GST_RATE, SALES_TAX_RATE } from "@/lib/invoice-math";

export const Route = createFileRoute("/invoices/$id")({
  head: () => ({
    meta: [
      { title: "Invoice — Uni Bind Photo Service" },
      { name: "description", content: "View, download or delete a saved invoice." },
      { property: "og:title", content: "Invoice — Uni Bind Photo Service" },
      { property: "og:description", content: "View, download or delete a saved invoice." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InvoiceDetail,
});

function InvoiceDetail() {
  const { id } = Route.useParams();
  const fetchInv = useServerFn(getInvoice);
  const fetchBiz = useServerFn(getBusiness);
  const del = useServerFn(deleteInvoice);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const { data: inv, isLoading } = useQuery({ queryKey: ["invoice", id], queryFn: () => fetchInv({ data: { id } }) });
  const { data: business } = useQuery({ queryKey: ["business"], queryFn: () => fetchBiz() });

  if (isLoading || !business) return <div className="invoice-workspace"><div className="invoice-paper mx-auto h-[600px] max-w-[860px] animate-pulse" /></div>;
  if (!inv) return <div className="invoice-workspace text-center">Invoice not found. <Link to="/invoices" className="underline">Back</Link></div>;

  const rate = Number(inv.tax_rate);
  const gst = rate === GST_RATE || rate === GST_RATE + SALES_TAX_RATE;
  const sales_tax = rate === SALES_TAX_RATE || rate === GST_RATE + SALES_TAX_RATE;
  const items = inv.items.map((i) => ({ description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price) }));
  const state: SheetState = {
    invoice_number: inv.invoice_number, invoice_date: inv.invoice_date, client_name: inv.client_name,
    client_address: inv.client_address, client_phone: inv.client_phone, gst, sales_tax,
    rows: items.map((i) => ({ description: i.description, quantity: String(i.quantity), unit_price: String(i.unit_price) })),
  };

  async function pdf() {
    const t = computeTotals(items, gst, sales_tax);
    const { downloadPdf } = await import("@/lib/invoice-share");
    await downloadPdf({ business: business!, ...state, invoice_number: inv!.invoice_number, items, subtotal: t.subtotal, gstAmount: t.gstAmount, salesTaxAmount: t.salesTaxAmount, grand: t.grand });
  }

  async function remove() {
    setBusy(true);
    try {
      await del({ data: { id } });
      await qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice deleted");
      navigate({ to: "/invoices" });
    } catch (e) { toast.error((e as Error).message); setBusy(false); }
  }

  return (
    <div className="invoice-workspace">
      <div className="mx-auto max-w-[860px]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link to="/invoices" className="text-sm text-ink/70 hover:text-ink">← Saved invoices</Link>
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="paper" disabled={busy}>Delete</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete invoice #{inv.invoice_number}?</AlertDialogTitle>
                  <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={remove}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="ink" onClick={pdf}>Download PDF</Button>
          </div>
        </div>
        <InvoiceSheet business={business} state={state} readOnly />
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listInvoices } from "@/lib/invoices.functions";
import { formatDate, formatRs } from "@/lib/invoice-math";

export const Route = createFileRoute("/invoices/")({
  head: () => ({
    meta: [
      { title: "Saved Invoices — Uni Bind Photo Service" },
      { name: "description", content: "All saved invoices, newest first." },
      { property: "og:title", content: "Saved Invoices — Uni Bind Photo Service" },
      { property: "og:description", content: "All saved invoices, newest first." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InvoiceList,
});

function InvoiceList() {
  const list = useServerFn(listInvoices);
  const { data, isLoading } = useQuery({ queryKey: ["invoices"], queryFn: () => list() });
  return (
    <div className="invoice-workspace">
      <div className="mx-auto max-w-[860px]">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Saved invoices</h1>
          <Link to="/" className="text-sm text-ink/70 hover:text-ink">+ New invoice</Link>
        </div>
        <div className="invoice-paper p-0">
          <table className="w-full text-sm">
            <thead><tr className="invoice-band text-left"><th className="invoice-th">#</th><th className="invoice-th">Customer</th><th className="invoice-th">Date</th><th className="invoice-th text-right">Total</th></tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={4} className="invoice-td p-4 text-center">Loading…</td></tr>}
              {data?.length === 0 && <tr><td colSpan={4} className="invoice-td p-6 text-center text-ink/60">No invoices yet.</td></tr>}
              {data?.map((inv) => (
                <tr key={inv.id} className="hover:bg-workspace">
                  <td className="invoice-td px-3 py-2"><Link to="/invoices/$id" params={{ id: inv.id }} className="font-bold underline-offset-2 hover:underline">{inv.invoice_number}</Link></td>
                  <td className="invoice-td px-3">{inv.client_name || "—"}</td>
                  <td className="invoice-td px-3">{formatDate(inv.invoice_date)}</td>
                  <td className="invoice-td px-3 text-right">{formatRs(Number(inv.grand_total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

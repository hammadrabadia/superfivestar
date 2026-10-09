import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;

export type Business = { name: string; address: string; phones: string };
export type InvoiceItem = { description: string; quantity: number; unit_price: number; amount: number; position: number };
export type Invoice = {
  id: string; invoice_number: number; client_name: string; client_address: string; client_phone: string;
  invoice_date: string; tax_rate: number; notes: string; subtotal: number; tax_amount: number;
  grand_total: number; created_at: string; items: InvoiceItem[];
};

export const getBusiness = createServerFn({ method: "GET" }).handler(async (): Promise<Business> => {
  const db = await admin();
  const { data, error } = await db.from("business_settings").select("name,address,phones").eq("id", 1).single();
  if (error) throw new Error(error.message);
  return data;
});

export const updateBusiness = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ name: z.string().trim().min(1).max(200), address: z.string().trim().max(500), phones: z.string().trim().max(300) }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { error } = await db.from("business_settings").upsert({ id: 1, ...data, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return data;
  });

export const nextInvoiceNumber = createServerFn({ method: "POST" }).handler(async () => {
  const db = await admin();
  const { data, error } = await db.rpc("next_invoice_number");
  if (error) throw new Error(error.message);
  return data as number;
});

const itemSchema = z.object({ description: z.string().max(500), quantity: z.number().min(0).max(1e9), unit_price: z.number().min(0).max(1e12) });
const createSchema = z.object({
  id: z.string().uuid().optional(),
  invoice_number: z.number().int().positive(),
  client_name: z.string().max(200),
  client_address: z.string().max(500),
  client_phone: z.string().max(50),
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gst: z.boolean(),
  sales_tax: z.boolean(),
  items: z.array(itemSchema).max(200),
});

export const createInvoice = createServerFn({ method: "POST" })
  .inputValidator((d) => createSchema.parse(d))
  .handler(async ({ data }) => {
    const { computeTotals, isBlankItem, lineAmount } = await import("./invoice-math");
    const items = data.items.filter((i) => !isBlankItem(i));
    const t = computeTotals(items, data.gst, data.sales_tax);
    const db = await admin();
    const row = {
      invoice_number: data.invoice_number, client_name: data.client_name, client_address: data.client_address,
      client_phone: data.client_phone, invoice_date: data.invoice_date, tax_rate: t.rate,
      subtotal: t.subtotal, tax_amount: t.tax, grand_total: t.grand,
    };
    let id = data.id;
    if (id) {
      const { error } = await db.from("invoices").update(row).eq("id", id);
      if (error) throw new Error(error.message);
      await db.from("invoice_items").delete().eq("invoice_id", id);
    } else {
      const { data: ins, error } = await db.from("invoices").insert(row).select("id").single();
      if (error) throw new Error(error.message);
      id = ins.id;
    }
    if (items.length) {
      const { error } = await db.from("invoice_items").insert(
        items.map((i, idx) => ({ invoice_id: id!, description: i.description, quantity: i.quantity, unit_price: i.unit_price, amount: lineAmount(i.quantity, i.unit_price), position: idx })),
      );
      if (error) throw new Error(error.message);
    }
    return { id: id! };
  });

export const listInvoices = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const { data, error } = await db.from("invoices").select("id,invoice_number,client_name,invoice_date,grand_total").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
});

export const getInvoice = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<Invoice | null> => {
    const db = await admin();
    const { data: inv, error } = await db.from("invoices").select("*, invoice_items(description,quantity,unit_price,amount,position)").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) return null;
    const { invoice_items, ...rest } = inv as any;
    return { ...rest, items: (invoice_items ?? []).sort((a: InvoiceItem, b: InvoiceItem) => a.position - b.position) };
  });

export const deleteInvoice = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { error } = await db.from("invoices").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

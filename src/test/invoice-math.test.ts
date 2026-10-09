import { describe, it, expect } from "vitest";
import { computeTotals, formatRs, formatDate, toWhatsAppNumber, isBlankItem } from "@/lib/invoice-math";

const items = [{ description: "Print", quantity: 2, unit_price: 500 }];

describe("invoice rules", () => {
  it("no tax when toggles off", () => expect(computeTotals(items, false, false).grand).toBe(1000));
  it("GST 18%", () => expect(computeTotals(items, true, false).grand).toBe(1180));
  it("sales tax 5.5%", () => expect(computeTotals(items, false, true).grand).toBe(1055));
  it("both taxes", () => expect(computeTotals(items, true, true).grand).toBe(1235));
  it("formats rupees", () => expect(formatRs(1235)).toBe("Rs 1,235.00"));
  it("formats date DD-MM-YYYY", () => expect(formatDate("2026-10-09")).toBe("09-10-2026"));
  it("converts local number", () => expect(toWhatsAppNumber("0333-1260016")).toBe("923331260016"));
  it("detects blank rows", () => expect(isBlankItem({ description: " ", quantity: 0, unit_price: 0 })).toBe(true));
});

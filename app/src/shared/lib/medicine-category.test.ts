import { describe, expect, it } from "vitest";
import { formatMedicineCategory } from "./medicine-category";

describe("formatMedicineCategory", () => {
  it("formats prescription medicines", () => {
    expect(formatMedicineCategory("Rx")).toBe("RX(处方药)");
  });

  it("defaults to OTC for empty or OTC values", () => {
    expect(formatMedicineCategory("OTC")).toBe("OTC(非处方药)");
    expect(formatMedicineCategory(null)).toBe("OTC(非处方药)");
    expect(formatMedicineCategory(undefined)).toBe("OTC(非处方药)");
  });
});

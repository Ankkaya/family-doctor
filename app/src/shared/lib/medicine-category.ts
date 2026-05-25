import type { Medicine } from "@/shared/mock/app-data";

export function formatMedicineCategory(value?: Medicine["otc"] | null) {
  return value === "Rx" ? "RX(处方药)" : "OTC(非处方药)";
}

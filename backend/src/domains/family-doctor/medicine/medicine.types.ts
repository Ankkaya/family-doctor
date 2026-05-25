export type MedicineCatalogItem = {
  id: string;
  name: string;
  aliases: string[];
  otc: 'OTC' | 'RX';
  indication: string;
  contraindication: string | null;
  adverseReaction: string | null;
  dosage: string | null;
  barcode: string | null;
  approvalNumber: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type UserMedicineCabinetItem = MedicineCatalogItem & {
  inventoryId: string;
  devUserId: string;
  medicineId: string;
  quantity: number;
  expireAt: Date | string | null;
  source: string | null;
  notes: string | null;
  inventoryCreatedAt: Date | string;
  inventoryUpdatedAt: Date | string;
};

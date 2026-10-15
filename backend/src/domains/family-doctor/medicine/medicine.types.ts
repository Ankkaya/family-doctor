export type RecognizedMedicineItem = {
  name: string;
  aliases: string[];
  otc: 'OTC' | 'RX';
  indication: string | null;
  contraindication: string | null;
  adverseReaction: string | null;
  dosage: string | null;
  barcode: string | null;
  approvalNumber: string | null;
  manufacturer: string | null;
  expireAt: string | null;
  confidence: number | null;
  rawText: string | null;
  warnings: string[];
};

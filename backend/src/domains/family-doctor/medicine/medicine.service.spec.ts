import { MedicineService } from "./medicine.service";
import { AgentRecognizeMedicineImageOutput } from "../agent-client/agent-client.types";
import { BufferedFile } from "@/infrastructure/minio/dto/file.dto";

function createService(recognized: AgentRecognizeMedicineImageOutput) {
  const agent = { recognizeMedicineImages: jest.fn().mockResolvedValue(recognized) };
  return { service: new MedicineService(agent as any), agent };
}

describe("MedicineService image recognition", () => {
  it("returns image information directly for household entry, without catalog enrichment", async () => {
    const { service, agent } = createService({
      name: " 自备药 ",
      aliases: [" 别名 ", ""],
      manufacturer: " 图片厂家 ",
      barcode: "6900000000001",
      approvalNumber: "国药准字Z00000001",
      indication: " 图片适应症 ",
      dosage: " 图片用法 ",
      contraindication: null,
      expireAt: "2027/6/30",
      confidence: 0.81,
      rawText: " 包装文字 ",
      warnings: [" 请核对有效期 ", "请核对有效期", ""],
    });
    const file = {
      originalname: "medicine.png",
      mimetype: "image/png",
      buffer: Buffer.from("image-bytes"),
    } as BufferedFile;

    const result = await service.recognizeFromImages([file]);

    expect(agent.recognizeMedicineImages).toHaveBeenCalledWith({
      images: [{ filename: "medicine.png", mimeType: "image/png", dataBase64: file.buffer.toString("base64") }],
    });
    expect(result).toMatchObject({
      name: "自备药",
      aliases: ["别名"],
      manufacturer: "图片厂家",
      indication: "图片适应症",
      dosage: "图片用法",
      contraindication: null,
      expireAt: "2027-06-30",
      confidence: 0.81,
      rawText: "包装文字",
      warnings: ["请核对有效期"],
    });
    expect(result).not.toHaveProperty("catalogMatch");
  });

  it("leaves missing description fields empty so the user can supply them", async () => {
    const { service } = createService({ barcode: "6900000000001", manufacturer: " " });
    expect(await service.recognizeFromImages([])).toEqual({
      name: "未识别药品名称",
      aliases: [],
      otc: "OTC",
      indication: null,
      contraindication: null,
      adverseReaction: null,
      dosage: null,
      barcode: "6900000000001",
      approvalNumber: null,
      manufacturer: null,
      expireAt: null,
      confidence: null,
      rawText: null,
      warnings: [],
    });
  });

  it("propagates recognition failure instead of returning sample medicines", async () => {
    const { service, agent } = createService({});
    agent.recognizeMedicineImages.mockRejectedValueOnce(new Error("Recognition unavailable"));
    await expect(service.recognizeFromImages([])).rejects.toThrow("Recognition unavailable");
  });
});

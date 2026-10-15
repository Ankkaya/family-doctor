import { Injectable } from '@nestjs/common';
import { BufferedFile } from '@/infrastructure/minio/dto/file.dto';
import { AgentClientService } from '../agent-client/agent-client.service';
import { AgentRecognizeMedicineImageOutput } from '../agent-client/agent-client.types';
import { RecognizedMedicineItem } from './medicine.types';

@Injectable()
export class MedicineService {
  constructor(private readonly agentClient: AgentClientService) {}

  async recognizeFromImages(files: BufferedFile[]): Promise<RecognizedMedicineItem> {
    const recognized = await this.agentClient.recognizeMedicineImages({
      images: files.map((file) => ({
        filename: file.originalname,
        mimeType: file.mimetype,
        dataBase64: file.buffer.toString('base64'),
      })),
    });

    return this.normalizeRecognizedMedicine(recognized);
  }

  private normalizeRecognizedMedicine(
    recognized: AgentRecognizeMedicineImageOutput,
  ): RecognizedMedicineItem {
    return {
      name: recognized.name?.trim() || '未识别药品名称',
      aliases: recognized.aliases?.map((item) => item.trim()).filter(Boolean) || [],
      otc: recognized.otc || 'OTC',
      indication: recognized.indication?.trim() || null,
      contraindication: recognized.contraindication?.trim() || null,
      adverseReaction: recognized.adverseReaction?.trim() || null,
      dosage: recognized.dosage?.trim() || null,
      barcode: recognized.barcode?.trim() || null,
      approvalNumber: recognized.approvalNumber?.trim() || null,
      manufacturer: recognized.manufacturer?.trim() || null,
      expireAt: this.normalizeExpireAt(recognized.expireAt),
      confidence: typeof recognized.confidence === 'number' ? recognized.confidence : null,
      rawText: recognized.rawText?.trim() || null,
      warnings: [...new Set(recognized.warnings?.map((item) => item.trim()).filter(Boolean) || [])],
    };
  }

  private normalizeExpireAt(value?: string | null) {
    if (!value) return null;
    const normalized = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      return normalized;
    }
    if (/^\d{4}[./年-]\d{1,2}[./月-]\d{1,2}日?$/.test(normalized)) {
      return normalized
        .replace(/年|\./g, '-')
        .replace(/月/g, '-')
        .replace(/日/g, '')
        .replace(/\//g, '-')
        .split('-')
        .map((segment, index) => (index === 0 ? segment : segment.padStart(2, '0')))
        .join('-');
    }
    return normalized;
  }
}

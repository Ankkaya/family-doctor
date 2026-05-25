import request from './request';

export interface UploadRecord {
  id: number;
  userId: number | null;
  originalName: string;
  objectKey: string;
  url: string;
  mimeType: string;
  size: number;
  module: string;
  refId: string | null;
  refType: string | null;
  status: string;
  createdAt: string;
}

export function getUploadRecords(params: {
  page?: number;
  pageSize?: number;
  userId?: number;
  module?: string;
  refId?: string;
  status?: string;
}) {
  return request.get<{
    list: UploadRecord[];
    total: number;
    page: number;
    pageSize: number;
  }>('/upload-records', { params });
}

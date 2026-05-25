// ==================== 文件上传 API 类型 ====================

/**
 * 上传文件信息
 */
export interface UploadedFileInfo {
  filename: string;
  objectKey: string;
  url: string;
  etag: string;
}

/**
 * 批量上传响应
 */
export type UploadMultipleResponse = UploadedFileInfo[];

/**
 * 文件列表项
 */
export interface FileListItem {
  name?: string;
  size: number;
  lastModified?: Date;
  etag?: string;
  prefix?: string;
}

/**
 * 文件统计信息
 */
export interface FileStat {
  size: number;
  etag: string;
  lastModified: Date;
  contentType: string;
}

/**
 * 文件 API 命名空间
 */
export namespace FileApi {
  /** 单文件上传响应 */
  export type UploadSingle = UploadedFileInfo;
  /** 多文件上传响应 */
  export type UploadMultiple = UploadMultipleResponse;
  /** 获取文件URL响应 */
  export type GetUrl = { url: string };
  /** 列出文件响应 */
  export type List = FileListItem[];
  /** 获取文件统计响应 */
  export type GetStat = FileStat;
  /** 获取预签名上传URL响应 */
  export type GetPresignedUrl = { url: string };
  /** 检查文件是否存在响应 */
  export type CheckExists = { exists: boolean };
  /** 删除文件响应 */
  export type Delete = void;
  /** 批量删除文件响应 */
  export type DeleteBatch = void;
}

/**
 * 上传参数
 */
export interface UploadParams {
  file: File;
  path?: string;
}

/**
 * 多文件上传参数
 */
export interface UploadMultipleParams {
  files: File[];
  path?: string;
}

/**
 * 获取文件URL参数
 */
export interface GetFileUrlParams {
  filename: string;
  expiry?: number;
}

/**
 * 列出文件参数
 */
export interface ListFilesParams {
  prefix?: string;
  recursive?: boolean;
}

/**
 * 获取预签名URL参数
 */
export interface GetPresignedUrlParams {
  filename: string;
  expiry?: number;
}

/**
 * 检查文件存在参数
 */
export interface CheckFileExistsParams {
  filename: string;
}

/**
 * 删除文件参数
 */
export interface DeleteFileParams {
  filename: string;
}

/**
 * 批量删除文件参数
 */
export interface DeleteFilesParams {
  filenames: string[];
}

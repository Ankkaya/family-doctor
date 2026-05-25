export interface UploadResponseDto {
  code: number;
  message: string;
  data: {
    filename: string;
    objectKey: string;
    url: string;
    etag: string;
  };
}

export interface FileInfoDto {
  name?: string;
  size: number;
  lastModified?: Date;
  etag?: string;
  prefix?: string;
}

export interface FileListResponseDto {
  code: number;
  message: string;
  data: FileInfoDto[];
}

export interface FileStatResponseDto {
  code: number;
  message: string;
  data: {
    size: number;
    etag: string;
    lastModified: Date;
    contentType: string;
  };
}

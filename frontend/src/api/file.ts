import api from './request'
import type {
  FileApi,
  UploadedFileInfo,
  UploadMultipleResponse,
  DeleteFileParams,
  DeleteFilesParams,
} from '@/types/api/index.ts'

/**
 * 上传单个文件
 * @param file 文件对象
 * @param path 存储路径（可选）
 */
export function uploadFile(file: File, path?: string): Promise<FileApi.UploadSingle> {
  const formData = new FormData()
  formData.append('file', file)
  
  const url = path ? `/files/upload?path=${encodeURIComponent(path)}` : '/files/upload'
  
  return api.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }) as Promise<FileApi.UploadSingle>
}

/**
 * 上传多个文件
 * @param files 文件列表
 * @param path 存储路径（可选）
 */
export function uploadFiles(files: File[], path?: string): Promise<FileApi.UploadMultiple> {
  const formData = new FormData()
  files.forEach(file => {
    formData.append('files', file)
  })
  
  const url = path ? `/files/upload/multiple?path=${encodeURIComponent(path)}` : '/files/upload/multiple'
  
  return api.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }) as Promise<FileApi.UploadMultiple>
}

/**
 * 获取文件访问 URL
 * @param filename 文件名
 * @param expiry 过期时间（秒，可选）
 */
export function getFileUrl(filename: string, expiry?: number) {
  const params = new URLSearchParams()
  params.append('filename', filename)
  if (expiry) params.append('expiry', expiry.toString())
  
  return api.get<FileApi.GetUrl>(`/files/url?${params.toString()}`)
}

/**
 * 删除文件
 * @param filename 文件名
 */
export function deleteFile(filename: string) {
  const data: DeleteFileParams = { filename }
  return api.delete<FileApi.Delete>('/files/delete', { data })
}

/**
 * 批量删除文件
 * @param filenames 文件名列表
 */
export function deleteFiles(filenames: string[]) {
  const data: DeleteFilesParams = { filenames }
  return api.delete<FileApi.DeleteBatch>('/files/delete/batch', { data })
}

/**
 * 列出文件
 * @param prefix 前缀（可选）
 * @param recursive 是否递归（可选）
 */
export function listFiles(prefix?: string, recursive?: boolean) {
  const params = new URLSearchParams()
  if (prefix) params.append('prefix', prefix)
  if (recursive) params.append('recursive', 'true')
  
  return api.get<FileApi.List>(`/files/list?${params.toString()}`)
}

/**
 * 获取预签名上传 URL（用于前端直传）
 * @param filename 文件名
 * @param expiry 过期时间（秒，可选）
 */
export function getPresignedUploadUrl(filename: string, expiry?: number) {
  const params = new URLSearchParams()
  params.append('filename', filename)
  if (expiry) params.append('expiry', expiry.toString())
  
  return api.get<FileApi.GetPresignedUrl>(`/files/presigned-upload?${params.toString()}`)
}

/**
 * 检查文件是否存在
 * @param filename 文件名
 */
export function checkFileExists(filename: string) {
  return api.get<FileApi.CheckExists>(`/files/exists?filename=${encodeURIComponent(filename)}`)
}

// 导出类型
export type { UploadedFileInfo, UploadMultipleResponse }

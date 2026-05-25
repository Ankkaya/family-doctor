// ==================== 通用 API 类型 ====================

/**
 * 标准 API 响应格式
 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/**
 * 分页查询参数
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/**
 * 分页响应元数据
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * 分页响应数据
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * 树形结构查询参数
 */
export interface TreeQueryParams {
  format?: 'tree' | 'flat';
}

/**
 * 通用 ID 参数
 */
export interface IdParams {
  id: number;
}

/**
 * 批量操作参数
 */
export interface BatchOperationParams {
  ids: number[];
}

/**
 * 状态更新参数
 */
export interface StatusUpdateParams {
  isEnabled: boolean;
}

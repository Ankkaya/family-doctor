import request from './request';

export interface OperationLog {
  id: number;
  userId: number | null;
  username: string | null;
  module: string;
  action: string;
  method: string | null;
  path: string | null;
  statusCode: number | null;
  targetId: string | null;
  targetType: string | null;
  description: string | null;
  requestBody: string | null;
  oldValue: any;
  newValue: any;
  response: string | null;
  error: string | null;
  ip: string | null;
  userAgent: string | null;
  duration: number | null;
  createdAt: string;
}

export interface LoginLog {
  id: number;
  userId: number | null;
  username: string | null;
  type: string;
  ip: string;
  location: string | null;
  userAgent: string | null;
  success: boolean;
  message: string | null;
  createdAt: string;
}

export function getOperationLogs(params: {
  page?: number;
  pageSize?: number;
  userId?: number;
  module?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  action?: string;
  startTime?: string;
  endTime?: string;
}) {
  return request.get<{
    list: OperationLog[];
    total: number;
    page: number;
    pageSize: number;
  }>('/system-logs/operations', { params });
}

export function getLoginLogs(params: {
  page?: number;
  pageSize?: number;
  userId?: number;
  type?: string;
  success?: boolean;
  startTime?: string;
  endTime?: string;
}) {
  return request.get<{
    list: LoginLog[];
    total: number;
    page: number;
    pageSize: number;
  }>('/system-logs/logins', { params });
}

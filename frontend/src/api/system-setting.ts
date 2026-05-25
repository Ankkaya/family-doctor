import api from './request';

export interface SystemSettingItem {
  id: number;
  key: string;
  category: string;
  name: string;
  value: Record<string, any>;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertSystemSettingDto {
  key: string;
  category: string;
  name: string;
  value: Record<string, any>;
  description?: string;
}

export const getSystemSettingsByCategory = (category: string) => {
  return api.get<SystemSettingItem[]>(`/system-settings/category/${category}`);
};

export const upsertSystemSetting = (data: UpsertSystemSettingDto) => {
  return api.post<SystemSettingItem>('/system-settings', data);
};

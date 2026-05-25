export interface MallHotSearchKeyword {
  id: number;
  keyword: string;
  sort?: number;
  enabled?: boolean;
}

export type CreateMallHotSearchDto = Partial<MallHotSearchKeyword>;
export type UpdateMallHotSearchDto = Partial<MallHotSearchKeyword>;

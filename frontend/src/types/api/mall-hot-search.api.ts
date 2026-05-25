import type {
  CreateMallHotSearchDto,
  MallHotSearchKeyword,
  UpdateMallHotSearchDto,
} from '@/types/mall-hot-search';

export namespace MallHotSearchApi {
  export type List = MallHotSearchKeyword[];
  export type Detail = MallHotSearchKeyword;
  export type Create = MallHotSearchKeyword;
  export type Update = MallHotSearchKeyword;
  export type Delete = void;
  export type CreateParams = CreateMallHotSearchDto;
  export type UpdateParams = UpdateMallHotSearchDto;
}

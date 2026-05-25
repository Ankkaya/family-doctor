// ==================== API 类型统一导出 ====================

// 通用类型
export type {
  ApiResponse,
  PaginationParams,
  PaginationMeta,
  PaginatedResponse,
  TreeQueryParams,
  IdParams,
  BatchOperationParams,
  StatusUpdateParams,
} from './common.api';

// 认证 API 类型
export type {
  AuthApi,
  LoginParams,
  RegisterParams,
  RefreshTokenParams,
  AuthResponse,
} from './auth.api';

// 用户 API 类型
export type {
  UserApi,
  CreateUserParams,
  UpdateUserParams,
  ResetUserPasswordParams,
  AssignUserRolesParams,
  BatchDeleteUsersParams,
  QueryUserParams,
} from './user.api';

// 角色 API 类型
export type {
  RoleApi,
  CreateRoleParams,
  UpdateRoleParams,
  AssignRoleMenusParams,
  BatchDeleteRolesParams,
} from './role.api';

// 字典 API 类型
export type {
  DictionaryApi,
  QueryDictionaryTypeParams,
  QueryDictionaryItemParams,
  CreateDictionaryTypeParams,
  UpdateDictionaryTypeParams,
  CreateDictionaryItemParams,
  UpdateDictionaryItemParams,
} from './dictionary.api';

// 菜单 API 类型
export type {
  MenuApi,
  CreateMenuParams,
  UpdateMenuParams,
  QueryMenuParams,
  BatchDeleteMenusParams,
} from './menu.api';

// 基础数据 API 类型
export type {
  UnitApi,
  CategoryApi,
  BrandApi,
  BannerApi,
  WarehouseApi,
  SupplierApi,
  CustomerApi,
} from './basic-data.api';

// 商品管理 API 类型
export type {
  ProductApi,
  SkuApi,
  InventoryApi,
  MallApi,
} from './product.api';

// 商城配置 API 类型
export type { MallHotSearchApi } from './mall-hot-search.api';

// 文件上传 API 类型
export type {
  FileApi,
  UploadedFileInfo,
  UploadMultipleResponse,
  FileListItem,
  FileStat,
  UploadParams,
  UploadMultipleParams,
  GetFileUrlParams,
  ListFilesParams,
  GetPresignedUrlParams,
  CheckFileExistsParams,
  DeleteFileParams,
  DeleteFilesParams,
} from './file.api';

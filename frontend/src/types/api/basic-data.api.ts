// ==================== 基础数据 API 类型 ====================
import type {
  Unit,
  Category,
  Brand,
  Banner,
  Warehouse,
  Supplier,
  Customer,
  CreateUnitDto,
  UpdateUnitDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateBrandDto,
  UpdateBrandDto,
  CreateBannerDto,
  UpdateBannerDto,
  CreateWarehouseDto,
  UpdateWarehouseDto,
  CreateSupplierDto,
  UpdateSupplierDto,
  CreateCustomerDto,
  UpdateCustomerDto,
} from '@/types/basic-data';

// ==================== 计量单位 API ====================
export namespace UnitApi {
  export type List = Unit[];
  export type Detail = Unit;
  export type Create = Unit;
  export type Update = Unit;
  export type Delete = void;
  export type CreateParams = CreateUnitDto;
  export type UpdateParams = UpdateUnitDto;
}

// ==================== 商品分类 API ====================
export namespace CategoryApi {
  export type List = Category[];
  export type ListFlat = Category[];
  export type Detail = Category;
  export type Create = Category;
  export type Update = Category;
  export type Delete = void;
  export type CreateParams = CreateCategoryDto;
  export type UpdateParams = UpdateCategoryDto;
}

// ==================== 品牌 API ====================
export namespace BrandApi {
  export type List = Brand[];
  export type Detail = Brand;
  export type Create = Brand;
  export type Update = Brand;
  export type Delete = void;
  export type CreateParams = CreateBrandDto;
  export type UpdateParams = UpdateBrandDto;
}

// ==================== 轮播图 API ====================
export namespace BannerApi {
  export type List = Banner[];
  export type Detail = Banner;
  export type Create = Banner;
  export type Update = Banner;
  export type Delete = void;
  export type CreateParams = CreateBannerDto;
  export type UpdateParams = UpdateBannerDto;
}

// ==================== 仓库 API ====================
export namespace WarehouseApi {
  export type List = Warehouse[];
  export type Detail = Warehouse;
  export type Create = Warehouse;
  export type Update = Warehouse;
  export type Delete = void;
  export type CreateParams = CreateWarehouseDto;
  export type UpdateParams = UpdateWarehouseDto;
}

// ==================== 供应商 API ====================
export namespace SupplierApi {
  export type List = Supplier[];
  export type Detail = Supplier;
  export type Create = Supplier;
  export type Update = Supplier;
  export type Delete = void;
  export type CreateParams = CreateSupplierDto;
  export type UpdateParams = UpdateSupplierDto;
}

// ==================== 客户 API ====================
export namespace CustomerApi {
  export type List = Customer[];
  export type Detail = Customer;
  export type Create = Customer;
  export type Update = Customer;
  export type Delete = void;
  export type CreateParams = CreateCustomerDto;
  export type UpdateParams = UpdateCustomerDto;
}

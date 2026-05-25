// ==================== 商品管理 API 类型 ====================
import type {
  Product,
  ProductSku,
  Inventory,
  CreateProductDto,
  UpdateProductDto,
  UpdateProductMallDto,
  UpdateProductEnabledDto,
  UpdateSkuDto,
  UpdateInventoryDto,
  QueryProductParams,
  QueryInventoryParams,
  PaginatedResponse,
} from '@/types/product';

// ==================== 商品 API ====================
export namespace ProductApi {
  /** 获取商品列表 */
  export type List = PaginatedResponse<Product>;
  /** 获取商品详情 */
  export type Detail = Product;
  /** 创建商品 */
  export type Create = Product;
  /** 更新商品 */
  export type Update = Product;
  /** 获取商品商城信息 */
  export type MallDetail = Product;
  /** 更新商品商城信息 */
  export type MallUpdate = Product;
  /** 删除商品 */
  export type Delete = void;
  /** 更新商品状态 */
  export type UpdateStatus = Product;
  /** 获取商品SKU列表 */
  export type GetSkus = ProductSku[];
  
  /** 创建商品参数 */
  export type CreateParams = CreateProductDto;
  /** 更新商品参数 */
  export type UpdateParams = UpdateProductDto;
  /** 更新状态参数 */
  export type UpdateStatusParams = UpdateProductEnabledDto;
  /** 更新商城信息参数 */
  export type UpdateMallParams = UpdateProductMallDto;
  /** 查询商品参数 */
  export type QueryParams = QueryProductParams;
}

// ==================== SKU API ====================
export namespace SkuApi {
  /** 更新SKU */
  export type Update = ProductSku;
  /** 更新SKU价格 */
  export type UpdatePrice = ProductSku;
  
  /** 更新SKU参数 */
  export type UpdateParams = UpdateSkuDto;
  /** 更新价格参数 */
  export type UpdatePriceParams = {
    costPrice?: number;
    salePrice?: number;
    marketPrice?: number;
  };
}

// ==================== 库存 API ====================
export namespace InventoryApi {
  /** 库存列表项（含关联数据） */
  export type ListItem = Inventory & {
    sku?: ProductSku & { product?: Product };
    warehouse?: { id: number; name: string; code: string };
  };
  
  /** 获取库存列表 */
  export type List = PaginatedResponse<ListItem>;
  /** 获取库存详情 */
  export type Detail = Inventory;
  /** 更新库存 */
  export type Update = Inventory;
  /** 初始化库存 */
  export type Initialize = Inventory;
  /** 获取库存统计 */
  export type Stats = {
    totalSkuCount: number;
    totalQuantity: number;
    totalAvailable: number;
    totalLocked: number;
    lowStockCount: number;
  };
  /** 获取库存预警列表 */
  export type Warnings = PaginatedResponse<Inventory & { warningType: 'low' | 'high' }>;
  /** 获取SKU库存明细 */
  export type DetailBySku = {
    sku: ProductSku & { product?: Product };
    inventories: Inventory[];
  };
  
  /** 查询库存参数 */
  export type QueryParams = QueryInventoryParams;
  /** 初始化库存参数 */
  export type InitializeParams = {
    skuId: number;
    warehouseId: number;
    quantity: number;
    minStock?: number;
    maxStock?: number;
  };
  /** 更新库存参数 */
  export type UpdateParams = UpdateInventoryDto;
}

// ==================== 商城前台 API ====================
export namespace MallApi {
  /** 商城商品列表项 */
  export type ProductItem = Product & {
    priceRange: string;
    minPrice: number;
    maxPrice: number;
  };
  
  /** 商城商品详情 */
  export type ProductDetail = Product & {
    specOptions: { name: string; values: string[] }[];
  };
  
  /** 获取商城商品列表 */
  export type ProductList = PaginatedResponse<ProductItem>;
  /** 获取商城商品详情 */
  export type GetProductDetail = ProductDetail;
  /** 获取商城分类列表 */
  export type CategoryList = {
    id: number;
    name: string;
    code: string;
    parentId?: number;
    level: number;
    icon?: string;
    image?: string;
  }[];
  /** 获取商城品牌列表 */
  export type BrandList = {
    id: number;
    name: string;
    logo?: string;
    description?: string;
  }[];
  
  /** 查询商城商品参数 */
  export type QueryProductParams = {
    keyword?: string;
    categoryId?: number;
    brandId?: number;
    sort?: string;
    page?: number;
    pageSize?: number;
  };
}

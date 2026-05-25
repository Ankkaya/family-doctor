import type { PaginatedResponse } from './api/common.api';

export interface Product {
  id: number;
  name: string;
  code?: string;
  enabled?: boolean;
}

export interface ProductSku {
  id: number;
  productId?: number;
  skuCode?: string;
  name?: string;
}

export interface Inventory {
  id: number;
  skuId?: number;
  warehouseId?: number;
  quantity?: number;
  available?: number;
  minStock?: number;
}

export type CreateProductDto = Partial<Product>;
export type UpdateProductDto = Partial<Product>;
export type UpdateProductMallDto = Partial<Product>;
export type UpdateProductEnabledDto = { enabled: boolean };
export type UpdateSkuDto = Partial<ProductSku>;
export type UpdateInventoryDto = Partial<Inventory>;

export interface QueryProductParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  categoryId?: number;
  brandId?: number;
}

export interface QueryInventoryParams {
  page?: number;
  pageSize?: number;
  skuId?: number;
  warehouseId?: number;
}

export type { PaginatedResponse };

export interface Unit {
  id: number;
  name: string;
  code?: string;
}

export interface Category {
  id: number;
  name: string;
  code?: string;
  parentId?: number | null;
}

export interface Brand {
  id: number;
  name: string;
  logo?: string | null;
}

export interface Banner {
  id: number;
  title: string;
  image?: string | null;
}

export interface Warehouse {
  id: number;
  name: string;
  code?: string;
}

export interface Supplier {
  id: number;
  name: string;
  phone?: string | null;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string | null;
}

export type CreateUnitDto = Partial<Unit>;
export type UpdateUnitDto = Partial<Unit>;
export type CreateCategoryDto = Partial<Category>;
export type UpdateCategoryDto = Partial<Category>;
export type CreateBrandDto = Partial<Brand>;
export type UpdateBrandDto = Partial<Brand>;
export type CreateBannerDto = Partial<Banner>;
export type UpdateBannerDto = Partial<Banner>;
export type CreateWarehouseDto = Partial<Warehouse>;
export type UpdateWarehouseDto = Partial<Warehouse>;
export type CreateSupplierDto = Partial<Supplier>;
export type UpdateSupplierDto = Partial<Supplier>;
export type CreateCustomerDto = Partial<Customer>;
export type UpdateCustomerDto = Partial<Customer>;

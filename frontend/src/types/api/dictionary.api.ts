import type {
  CreateDictionaryItemDto,
  CreateDictionaryTypeDto,
  DictionaryItem,
  DictionaryType,
  UpdateDictionaryItemDto,
  UpdateDictionaryTypeDto,
} from '@/types'

export interface QueryDictionaryTypeParams {
  page?: number
  pageSize?: number
  keyword?: string
  isEnabled?: boolean
}

export interface QueryDictionaryItemParams {
  keyword?: string
  isEnabled?: boolean
}

export interface DictionaryTypePage {
  list: DictionaryType[]
  total: number
  page: number
  pageSize: number
}

export type CreateDictionaryTypeParams = CreateDictionaryTypeDto
export type UpdateDictionaryTypeParams = UpdateDictionaryTypeDto
export type CreateDictionaryItemParams = CreateDictionaryItemDto
export type UpdateDictionaryItemParams = UpdateDictionaryItemDto

export namespace DictionaryApi {
  export type TypeList = DictionaryTypePage
  export type TypeDetail = DictionaryType
  export type TypeCreate = DictionaryType
  export type TypeUpdate = DictionaryType
  export type TypeDelete = DictionaryType
  export type ItemList = DictionaryItem[]
  export type ItemCreate = DictionaryItem
  export type ItemUpdate = DictionaryItem
  export type ItemDelete = DictionaryItem
}

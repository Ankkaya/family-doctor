import api from './request'
import type {
  CreateDictionaryItemParams,
  CreateDictionaryTypeParams,
  DictionaryApi,
  QueryDictionaryItemParams,
  QueryDictionaryTypeParams,
  UpdateDictionaryItemParams,
  UpdateDictionaryTypeParams,
} from '@/types/api/index.ts'

export const getDictionaryTypes = (params?: QueryDictionaryTypeParams) => {
  return api.get<DictionaryApi.TypeList>('/dictionaries/types', { params })
}

export const getDictionaryType = (id: number) => {
  return api.get<DictionaryApi.TypeDetail>(`/dictionaries/types/${id}`)
}

export const createDictionaryType = (data: CreateDictionaryTypeParams) => {
  return api.post<DictionaryApi.TypeCreate>('/dictionaries/types', data)
}

export const updateDictionaryType = (id: number, data: UpdateDictionaryTypeParams) => {
  return api.patch<DictionaryApi.TypeUpdate>(`/dictionaries/types/${id}`, data)
}

export const deleteDictionaryType = (id: number) => {
  return api.delete<DictionaryApi.TypeDelete>(`/dictionaries/types/${id}`)
}

export const getDictionaryItemsByType = (typeId: number, params?: QueryDictionaryItemParams) => {
  return api.get<DictionaryApi.ItemList>(`/dictionaries/types/${typeId}/items`, { params })
}

export const getDictionaryItemsByCode = (code: string, params?: QueryDictionaryItemParams) => {
  return api.get<DictionaryApi.ItemList>(`/dictionaries/code/${code}/items`, { params })
}

export const createDictionaryItem = (data: CreateDictionaryItemParams) => {
  return api.post<DictionaryApi.ItemCreate>('/dictionaries/items', data)
}

export const updateDictionaryItem = (id: number, data: UpdateDictionaryItemParams) => {
  return api.patch<DictionaryApi.ItemUpdate>(`/dictionaries/items/${id}`, data)
}

export const deleteDictionaryItem = (id: number) => {
  return api.delete<DictionaryApi.ItemDelete>(`/dictionaries/items/${id}`)
}

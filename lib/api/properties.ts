import { apiClient } from './client';
const BASE='/api/v1/commerce';
export type PropertyRow=Record<string,any>&{id:string;title:string;price:string|number;city?:string;locality?:string;transaction_type?:string;property_type?:string;status?:string;image_url?:string;description?:string};
export const propertiesApi={
  list(params?:{q?:string;type?:string;propertyType?:string;limit?:number}){return apiClient.get<{items:PropertyRow[];total:number}>(`${BASE}/properties`,params as Record<string,string|number>);},
  get(id:string){return apiClient.get<PropertyRow>(`${BASE}/properties/${encodeURIComponent(id)}`);},
  mine(){return apiClient.get<PropertyRow[]>(`${BASE}/properties/mine`);},
  create(body:Record<string,unknown>){return apiClient.post<PropertyRow>(`${BASE}/properties`,body);},
  inquire(id:string,message:string){return apiClient.post(`${BASE}/properties/${encodeURIComponent(id)}/inquiries`,{message});},
  saveSearch(body:Record<string,unknown>){return apiClient.post(`${BASE}/property-saved-searches`,body);},
  messages(){return apiClient.get<Record<string,unknown>[]>(`${BASE}/property-messages`);},
  estimate(body:Record<string,unknown>){return apiClient.post<{low:number;average:number;high:number;sampleSize:number}>(`${BASE}/properties/estimate`,body);},
  update(id:string,body:Record<string,unknown>){return apiClient.patch<PropertyRow>(`${BASE}/properties/${encodeURIComponent(id)}`,body);},
  remove(id:string){return apiClient.delete<{deleted:boolean}>(`${BASE}/properties/${encodeURIComponent(id)}`);},
  savedSearches(){return apiClient.get<Record<string,unknown>[]>(`${BASE}/property-saved-searches`);},
  rentTrackers(){return apiClient.get<Record<string,unknown>[]>(`${BASE}/property-rent-trackers`);},
  saveRent(body:Record<string,unknown>){return apiClient.put<Record<string,unknown>>(`${BASE}/property-rent-trackers`,body);},
};
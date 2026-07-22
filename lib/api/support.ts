import { apiClient } from './client';
const BASE='/api/v1/commerce/support';
export type SupportMessage={id:string;sender_type:string;message:string;created_at:string};
export type SupportTicket={id:string;subject:string;category:string;priority:string;status:string;updated_at:string;messages?:SupportMessage[]};
export const supportApi={
  list:()=>apiClient.get<{items:SupportTicket[];total:number}>(`${BASE}/tickets`,undefined,{forceRefresh:true}),
  create:(body:Record<string,unknown>)=>apiClient.post<SupportTicket>(`${BASE}/tickets`,body),
  get:(id:string)=>apiClient.get<SupportTicket>(`${BASE}/tickets/${encodeURIComponent(id)}`,undefined,{forceRefresh:true}),
  message:(id:string,message:string)=>apiClient.post<SupportTicket>(`${BASE}/tickets/${encodeURIComponent(id)}/messages`,{message}),
  close:(id:string)=>apiClient.patch<SupportTicket>(`${BASE}/tickets/${encodeURIComponent(id)}/close`,{}),
};

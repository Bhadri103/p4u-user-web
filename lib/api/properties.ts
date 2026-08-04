import { apiClient } from "./client";
import { resolveMediaUrl } from "@/lib/media";

const BASE = "/api/v1/commerce";
type Row = Record<string, unknown>;

export interface PropertyRow extends Row {
  id: string; title: string; price: string | number; transaction_type?: string; property_type?: string; status?: string;
  state?: string; city?: string; locality?: string; address?: string; landmark?: string; pincode?: string;
  image_url?: string; images?: string[]; description?: string; area_sqft?: string | number; area_unit?: string; carpet_area?: string | number;
  bhk?: string | number; bathrooms?: string | number; balconies?: string | number; floor?: string | number; total_floors?: string | number;
  property_age_years?: string | number; furnishing?: string; facing?: string; parking?: string; ownership?: string; availability?: string;
  available_from?: string; plot_length?: string | number; plot_width?: string | number; road_width?: string | number; boundary_wall?: boolean;
  gated_community?: boolean; amenities?: string[]; price_negotiable?: boolean; maintenance?: string | number; security_deposit?: string | number;
  brokerage?: string | number; posted_by?: string; contact_name?: string; contact_phone?: string; created_at?: string;
}

const record=(value:unknown):Row=>value&&typeof value==="object"&&!Array.isArray(value)?value as Row:{};
const text=(row:Row,keys:string[],fallback="")=>{for(const key of keys){const value=row[key];if(value!==null&&value!==undefined&&String(value).trim()&&String(value)!=="[object Object]")return String(value).trim();}return fallback;};
const numeric=(row:Row,keys:string[],fallback=0)=>{const value=text(row,keys);const parsed=Number(value);return Number.isFinite(parsed)?parsed:fallback;};
const boolean=(row:Row,keys:string[])=>{for(const key of keys){const value=row[key];if(value!==undefined&&value!==null)return value===true||value===1||["true","yes","1"].includes(String(value).toLowerCase());}return undefined;};
function media(row:Row){const result:string[]=[];const add=(value:unknown)=>{if(value===null||value===undefined)return;if(typeof value==="string"){const item=value.trim();if(!item)return;if(item.startsWith("[")){try{const parsed=JSON.parse(item);if(Array.isArray(parsed)){parsed.forEach(add);return;}}catch{}}const resolved=resolveMediaUrl(item);if(resolved&&(/^https?:\/\//i.test(resolved)||resolved.startsWith("/")))result.push(resolved);return;}if(Array.isArray(value)){value.forEach(add);return;}if(typeof value!=="object")return;const nested=record(value);const next=nested.url??nested.imageUrl??nested.image_url??nested.path;if(next!==undefined&&next!==value)add(next);};["images","image_urls","imageUrls","media","image_url","imageUrl","cover_image","coverImage","image"].forEach((key)=>add(row[key]));return Array.from(new Set(result));}

export function normalizeProperty(input:unknown):PropertyRow {
  let row=record(input); for(let depth=0;depth<4;depth++){const nested=record(row.property??row.item??row.listing??row.data);if(!Object.keys(nested).length||nested===row)break;row=nested;}
  const metadata={...record(row.metadata??row.details),...row}; const images=media(metadata); const amenitiesRaw=metadata.amenities; const amenities=Array.isArray(amenitiesRaw)?amenitiesRaw.map(String):typeof amenitiesRaw==="string"?amenitiesRaw.split(",").map((v)=>v.trim()).filter(Boolean):[];
  return {...metadata,id:text(metadata,["id","propertyId","property_id"]),title:text(metadata,["title","name"],"Property"),transaction_type:text(metadata,["transaction_type","transactionType","listing_type","listingType"],"sale"),property_type:text(metadata,["property_type","propertyType"],"property"),price:numeric(metadata,["price","amount"]),price_negotiable:boolean(metadata,["price_negotiable","priceNegotiable"]),maintenance:numeric(metadata,["maintenance","maintenanceCharges"]),security_deposit:numeric(metadata,["security_deposit","securityDeposit"]),brokerage:numeric(metadata,["brokerage","brokerageAmount"]),state:text(metadata,["state","stateName"]),city:text(metadata,["city","cityName"]),locality:text(metadata,["locality","neighbourhood"]),address:text(metadata,["address","fullAddress"]),landmark:text(metadata,["landmark","nearbyLandmark"]),pincode:text(metadata,["pincode","postalCode","postal_code"]),area_sqft:numeric(metadata,["area_sqft","areaSqft","builtUpArea"]),area_unit:text(metadata,["area_unit","areaUnit"],"sqft"),carpet_area:numeric(metadata,["carpet_area","carpetArea"]),bhk:numeric(metadata,["bhk","bedrooms"]),bathrooms:numeric(metadata,["bathrooms","bathroomCount"]),balconies:numeric(metadata,["balconies","balconyCount"]),floor:text(metadata,["floor","floorNumber"]),total_floors:text(metadata,["total_floors","totalFloors"]),property_age_years:text(metadata,["property_age_years","propertyAgeYears"]),furnishing:text(metadata,["furnishing","furnishingStatus"]),facing:text(metadata,["facing","propertyFacing"]),parking:text(metadata,["parking","parkingType"]),ownership:text(metadata,["ownership","ownershipType"]),availability:text(metadata,["availability","availabilityStatus"]),available_from:text(metadata,["available_from","availableFrom"]),plot_length:text(metadata,["plot_length","plotLength"]),plot_width:text(metadata,["plot_width","plotWidth"]),road_width:text(metadata,["road_width","roadWidth"]),boundary_wall:boolean(metadata,["boundary_wall","boundaryWall"]),gated_community:boolean(metadata,["gated_community","gatedCommunity"]),amenities,description:text(metadata,["description"]),posted_by:text(metadata,["posted_by","postedBy"]),contact_name:text(metadata,["contact_name","contactName"]),contact_phone:text(metadata,["contact_phone","contactPhone","phone"]),image_url:images[0]??"",images,status:text(metadata,["status"],"approved"),created_at:text(metadata,["created_at","createdAt"])};
}

function rows(payload:unknown):unknown[]{if(Array.isArray(payload))return payload;const value=record(payload);return Array.isArray(value.items)?value.items:Array.isArray(value.data)?value.data:[];}

export const propertiesApi={
  list(params?:{q?:string;type?:string;propertyType?:string;limit?:number}){return apiClient.get<unknown>(`${BASE}/properties`,params as Record<string,string|number>).then((payload)=>{const items=rows(payload).map(normalizeProperty);return{items,total:numeric(record(payload),["total"],items.length)}});},
  get(id:string){return apiClient.get<unknown>(`${BASE}/properties/${encodeURIComponent(id)}`).then(normalizeProperty);},
  mine(){return apiClient.get<unknown>(`${BASE}/properties/mine`).then((payload)=>rows(payload).map(normalizeProperty));},
  create(body:Record<string,unknown>){return apiClient.post<unknown>(`${BASE}/properties`,body).then(normalizeProperty);},
  inquire(id:string,message:string){return apiClient.post(`${BASE}/properties/${encodeURIComponent(id)}/inquiries`,{message});},
  saveSearch(body:Record<string,unknown>){return apiClient.post(`${BASE}/property-saved-searches`,body);},
  messages(){return apiClient.get<unknown>(`${BASE}/property-messages`).then(rows).then((items)=>items.map(record));},
  estimate(body:Record<string,unknown>){return apiClient.post<{low:number;average:number;high:number;sampleSize:number}>(`${BASE}/properties/estimate`,body);},
  update(id:string,body:Record<string,unknown>){return apiClient.patch<unknown>(`${BASE}/properties/${encodeURIComponent(id)}`,body).then(normalizeProperty);},
  remove(id:string){return apiClient.delete<{deleted:boolean}>(`${BASE}/properties/${encodeURIComponent(id)}`);},
  savedSearches(){return apiClient.get<unknown>(`${BASE}/property-saved-searches`).then(rows).then((items)=>items.map(record));},
  rentTrackers(){return apiClient.get<unknown>(`${BASE}/property-rent-trackers`).then(rows).then((items)=>items.map(record));},
  saveRent(body:Record<string,unknown>){return apiClient.put<Record<string,unknown>>(`${BASE}/property-rent-trackers`,body);},
};

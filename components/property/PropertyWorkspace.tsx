"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { propertiesApi, type PropertyRow } from "@/lib/api/properties";

type Tab = "browse" | "mine" | "messages" | "tools";
const fieldClass = "h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500";
const money = (value: unknown) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const messageOf = (error: unknown) => error instanceof Error ? error.message : "Request failed";

export default function PropertyWorkspace() {
  const [tab, setTab] = useState<Tab>("browse");
  const [items, setItems] = useState<PropertyRow[]>([]);
  const [mine, setMine] = useState<PropertyRow[]>([]);
  const [messages, setMessages] = useState<Record<string, unknown>[]>([]);
  const [saved, setSaved] = useState<Record<string, unknown>[]>([]);
  const [rent, setRent] = useState<Record<string, unknown>[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showPost, setShowPost] = useState(false);

  const loadBrowse = useCallback(async () => {
    setLoading(true); setError("");
    try { const result = await propertiesApi.list({ q: q || undefined, type: type || undefined, propertyType: propertyType || undefined, limit: 100 }); setItems(result.items || []); }
    catch (requestError) { setError(messageOf(requestError)); }
    finally { setLoading(false); }
  }, [q, type, propertyType]);

  const loadAccount = useCallback(async () => {
    const [myRows, messageRows, savedRows, rentRows] = await Promise.all([propertiesApi.mine(), propertiesApi.messages(), propertiesApi.savedSearches(), propertiesApi.rentTrackers()]);
    setMine(myRows || []); setMessages(messageRows || []); setSaved(savedRows || []); setRent(rentRows || []);
  }, []);

  useEffect(() => { void loadBrowse(); void loadAccount().catch((requestError) => setError(messageOf(requestError))); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveCurrentSearch() {
    try { await propertiesApi.saveSearch({ name: q || `${type || "All"} properties`, query: { q, type, propertyType }, notify: true }); setSaved(await propertiesApi.savedSearches()); }
    catch (requestError) { setError(messageOf(requestError)); }
  }

  return <main className="mx-auto max-w-7xl px-4 py-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-semibold text-teal-700">P4U Homes</p><h1 className="text-3xl font-black text-slate-900">Property marketplace</h1><p className="text-slate-500">Find, list and manage verified properties.</p></div><button onClick={() => setShowPost(true)} className="rounded-xl bg-teal-600 px-5 py-3 font-bold text-white">Post property</button></div>
    <nav className="mt-6 flex gap-2 overflow-x-auto rounded-2xl border bg-white p-2">{([['browse','Browse'],['mine','My properties'],['messages','Messages'],['tools','Tools']] as const).map(([id,label]) => <button key={id} onClick={() => setTab(id)} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === id ? "bg-teal-600 text-white" : "text-slate-600"}`}>{label}</button>)}</nav>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
    {tab === "browse" && <Browse items={items} loading={loading} q={q} setQ={setQ} type={type} setType={setType} propertyType={propertyType} setPropertyType={setPropertyType} search={loadBrowse} saveSearch={saveCurrentSearch} />}
    {tab === "mine" && <MyListings rows={mine} refresh={loadAccount} setError={setError} />}
    {tab === "messages" && <Messages rows={messages} />}
    {tab === "tools" && <Tools saved={saved} rent={rent} refresh={loadAccount} setError={setError} />}
    {showPost && <PropertyForm onClose={() => setShowPost(false)} onSaved={async () => { setShowPost(false); await loadAccount(); }} setError={setError} />}
  </main>;
}

function Browse({ items, loading, q, setQ, type, setType, propertyType, setPropertyType, search, saveSearch }: { items: PropertyRow[]; loading: boolean; q: string; setQ:(v:string)=>void; type:string; setType:(v:string)=>void; propertyType:string; setPropertyType:(v:string)=>void; search:()=>Promise<void>; saveSearch:()=>Promise<void> }) {
  return <section><div className="mt-5 grid gap-2 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-[1fr_150px_180px_auto_auto]"><input className={fieldClass} value={q} onChange={(event)=>setQ(event.target.value)} placeholder="City, locality or title"/><select className={fieldClass} value={type} onChange={(event)=>setType(event.target.value)}><option value="">Buy & rent</option><option value="sale">Buy</option><option value="rent">Rent</option></select><select className={fieldClass} value={propertyType} onChange={(event)=>setPropertyType(event.target.value)}><option value="">All property types</option><option>Apartment</option><option>House</option><option>Plot</option><option>Commercial</option></select><button onClick={()=>void search()} className="rounded-xl bg-slate-900 px-4 font-bold text-white">Search</button><button onClick={()=>void saveSearch()} className="rounded-xl border px-4 font-bold">Save search</button></div>{loading?<p className="py-16 text-center text-slate-500">Loading properties...</p>:<div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((row)=><PropertyCard key={row.id} row={row}/>)}</div>}{!loading&&!items.length&&<p className="py-16 text-center text-slate-500">No approved properties match your search.</p>}</section>;
}

function PropertyCard({ row }: { row: PropertyRow }) {
  return <article className="overflow-hidden rounded-2xl border bg-white shadow-sm">{row.image_url?<img src={row.image_url} alt="" className="h-44 w-full object-cover"/>:<div className="flex h-44 items-center justify-center bg-teal-50 font-semibold text-teal-700">Property photo</div>}<div className="p-4"><div className="flex justify-between gap-2"><h2 className="font-bold">{row.title}</h2><span className="text-xs font-bold uppercase text-teal-700">{row.transaction_type}</span></div><p className="mt-1 text-sm text-slate-500">{[row.locality,row.city].filter(Boolean).join(', ')}</p><p className="mt-3 text-xl font-black">{money(row.price)}</p><p className="mt-2 line-clamp-2 text-sm text-slate-600">{row.description}</p><button onClick={()=>{const text=window.prompt('Message to owner:','I am interested in this property');if(text)void propertiesApi.inquire(row.id,text).then(()=>window.alert('Inquiry sent'));}} className="mt-4 w-full rounded-xl bg-teal-600 py-2 font-bold text-white">Contact owner</button></div></article>;
}

function MyListings({ rows, refresh, setError }: { rows:PropertyRow[]; refresh:()=>Promise<void>; setError:(v:string)=>void }) {
  return <section className="mt-5 space-y-3">{rows.map((row)=><article key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-5"><div><h2 className="font-bold">{row.title}</h2><p className="text-sm text-slate-500">{money(row.price)} · {row.locality || row.city || 'No location'}</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase">{row.status}</span><button onClick={async()=>{if(!window.confirm('Delete this property?'))return;try{await propertiesApi.remove(row.id);await refresh();}catch(error){setError(messageOf(error));}}} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-600">Delete</button></div></article>)}{!rows.length&&<p className="py-16 text-center text-slate-500">You have not posted a property.</p>}</section>;
}

function Messages({ rows }: { rows:Record<string,unknown>[] }) { return <section className="mt-5 space-y-3">{rows.map((row,index)=><article key={String(row.id||index)} className="rounded-2xl border bg-white p-5"><div className="flex justify-between gap-3"><h2 className="font-bold">Property inquiry</h2><span className="text-xs font-bold uppercase text-teal-700">{String(row.status||'open')}</span></div><p className="mt-2 text-slate-700">{String(row.message||'')}</p><p className="mt-2 text-xs text-slate-400">{row.created_at?new Date(String(row.created_at)).toLocaleString():''}</p></article>)}{!rows.length&&<p className="py-16 text-center text-slate-500">No property conversations yet.</p>}</section>; }

function Tools({ saved, rent, refresh, setError }: { saved:Record<string,unknown>[]; rent:Record<string,unknown>[]; refresh:()=>Promise<void>; setError:(v:string)=>void }) {
  const [city,setCity]=useState(''); const [propertyType,setPropertyType]=useState('Apartment'); const [estimate,setEstimate]=useState<{low:number;average:number;high:number;sampleSize:number}|null>(null); const [propertyName,setPropertyName]=useState(''); const [monthlyRent,setMonthlyRent]=useState('');
  return <section className="mt-5 grid gap-5 lg:grid-cols-2"><form onSubmit={async(event)=>{event.preventDefault();try{setEstimate(await propertiesApi.estimate({city,propertyType}));}catch(error){setError(messageOf(error));}}} className="rounded-2xl border bg-white p-5"><h2 className="text-lg font-bold">Property value estimator</h2><div className="mt-4 grid gap-3"><input className={fieldClass} value={city} onChange={(event)=>setCity(event.target.value)} placeholder="City"/><select className={fieldClass} value={propertyType} onChange={(event)=>setPropertyType(event.target.value)}><option>Apartment</option><option>House</option><option>Plot</option><option>Commercial</option></select><button className="rounded-xl bg-teal-600 py-3 font-bold text-white">Estimate value</button></div>{estimate&&<div className="mt-4 rounded-xl bg-teal-50 p-4"><p className="text-sm text-teal-700">Based on {estimate.sampleSize} approved properties</p><p className="mt-2 text-xl font-black">{money(estimate.average)}</p><p className="text-sm">Range {money(estimate.low)} – {money(estimate.high)}</p></div>}</form><form onSubmit={async(event:FormEvent)=>{event.preventDefault();try{await propertiesApi.saveRent({propertyName,monthlyRent:Number(monthlyRent),paidMonths:[]});setPropertyName('');setMonthlyRent('');await refresh();}catch(error){setError(messageOf(error));}}} className="rounded-2xl border bg-white p-5"><h2 className="text-lg font-bold">Rent tracker</h2><div className="mt-4 grid gap-3"><input className={fieldClass} value={propertyName} onChange={(event)=>setPropertyName(event.target.value)} placeholder="Property name"/><input className={fieldClass} type="number" min="1" value={monthlyRent} onChange={(event)=>setMonthlyRent(event.target.value)} placeholder="Monthly rent"/><button className="rounded-xl bg-slate-900 py-3 font-bold text-white">Add tracker</button></div><div className="mt-4 space-y-2">{rent.map((row,index)=><div key={String(row.id||index)} className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm"><b>{String(row.property_name||'Property')}</b><span>{money(row.monthly_rent)}/month</span></div>)}</div></form><div className="rounded-2xl border bg-white p-5 lg:col-span-2"><h2 className="text-lg font-bold">Saved searches</h2><div className="mt-3 grid gap-2 md:grid-cols-2">{saved.map((row,index)=><div key={String(row.id||index)} className="rounded-xl bg-slate-50 p-3"><b>{String(row.name||'Property search')}</b><p className="text-xs text-slate-500">Notifications {row.notify?'enabled':'disabled'}</p></div>)}</div>{!saved.length&&<p className="mt-3 text-sm text-slate-500">No saved searches yet.</p>}</div></section>;
}

function PropertyForm({ onClose, onSaved, setError }: { onClose:()=>void; onSaved:()=>Promise<void>; setError:(v:string)=>void }) {
  const [form,setForm]=useState({title:'',price:'',city:'',locality:'',listingType:'sale',propertyType:'Apartment',description:'',bhk:'',areaSqft:'',image:''}); const update=(key:string,value:string)=>setForm((current)=>({...current,[key]:value}));
  async function submit(event:FormEvent){event.preventDefault();try{await propertiesApi.create({title:form.title,price:Number(form.price),city:form.city,locality:form.locality,transaction_type:form.listingType,property_type:form.propertyType,description:form.description,bhk:Number(form.bhk||0),area_sqft:Number(form.areaSqft||0),images:form.image?[form.image]:[]});await onSaved();}catch(error){setError(messageOf(error));}}
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={onClose}><form onSubmit={submit} onMouseDown={(event)=>event.stopPropagation()} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6"><div className="flex justify-between"><h2 className="text-2xl font-black">Post a property</h2><button type="button" onClick={onClose}>✕</button></div><div className="mt-5 grid gap-3 md:grid-cols-2"><input required minLength={5} className={`${fieldClass} md:col-span-2`} value={form.title} onChange={(event)=>update('title',event.target.value)} placeholder="Property title"/><input required type="number" min="1" className={fieldClass} value={form.price} onChange={(event)=>update('price',event.target.value)} placeholder="Price"/><select className={fieldClass} value={form.listingType} onChange={(event)=>update('listingType',event.target.value)}><option value="sale">For sale</option><option value="rent">For rent</option></select><input className={fieldClass} value={form.city} onChange={(event)=>update('city',event.target.value)} placeholder="City"/><input className={fieldClass} value={form.locality} onChange={(event)=>update('locality',event.target.value)} placeholder="Locality"/><select className={fieldClass} value={form.propertyType} onChange={(event)=>update('propertyType',event.target.value)}><option>Apartment</option><option>House</option><option>Plot</option><option>Commercial</option></select><input type="number" className={fieldClass} value={form.bhk} onChange={(event)=>update('bhk',event.target.value)} placeholder="BHK"/><input type="number" className={fieldClass} value={form.areaSqft} onChange={(event)=>update('areaSqft',event.target.value)} placeholder="Area (sq ft)"/><input className={fieldClass} value={form.image} onChange={(event)=>update('image',event.target.value)} placeholder="Image URL"/><textarea rows={4} className="rounded-xl border p-3 md:col-span-2" value={form.description} onChange={(event)=>update('description',event.target.value)} placeholder="Description"/></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border px-5 py-3 font-bold">Cancel</button><button className="rounded-xl bg-teal-600 px-5 py-3 font-bold text-white">Submit for review</button></div></form></div>;
}

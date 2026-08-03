"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Minus, Plus, ShoppingBag, Star, UtensilsCrossed, X } from "lucide-react";
import { foodApi, type FoodCombo, type FoodMenuItem, type FoodRestaurant, type FoodReview } from "@/lib/api/food";

type Cart = Record<string, number>;
type DisplayItem = FoodMenuItem & { isCombo?: boolean };
type Selection = { addonIds: string[]; customizations: Record<string, string | string[]> };
function errorMessage(e: unknown) { return e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Request failed"; }

export default function FoodRestaurantView({ restaurantId }: { restaurantId: string }) {
  const [restaurant, setRestaurant] = useState<FoodRestaurant | null>(null);
  const [items, setItems] = useState<FoodMenuItem[]>([]);
  const [combos, setCombos] = useState<FoodCombo[]>([]);
  const [reviews, setReviews] = useState<FoodReview[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [cart, setCart] = useState<Cart>({});
  const [selections, setSelections] = useState<Record<string, Selection>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkout, setCheckout] = useState(false);
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [couponCode, setCouponCode] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placedId, setPlacedId] = useState("");

  useEffect(() => { Promise.all([foodApi.getMenu(restaurantId), foodApi.listReviews(restaurantId, { limit: 10 }), foodApi.listCombos(restaurantId)]).then(([r, reviewPage, comboRows]) => { setRestaurant(r.restaurant); setItems(r.items); setCategories(r.categories); setReviews(reviewPage.data); setCombos(comboRows); }).catch((e) => setError(errorMessage(e))).finally(() => setLoading(false)); }, [restaurantId]);
  const displayItems = useMemo<DisplayItem[]>(() => [...items, ...combos.map((combo) => ({
    id: combo.id, restaurantId, categoryId: null, name: combo.name, description: combo.description,
    price: combo.price, discountedPrice: null, isVeg: true, imageUrl: combo.image_url,
    addons: [], customizations: [], inStock: combo.in_stock, isBestseller: false, prepMinutes: 0, gstRate: '5', isCombo: true,
  }))], [items, combos, restaurantId]);
  const lines = useMemo(() => displayItems.filter((i) => (cart[i.id] || 0) > 0), [displayItems, cart]);
  const unitPrice = (menuItem: DisplayItem) => {
    const selected = selections[menuItem.id] || { addonIds: [], customizations: {} };
    const addonTotal = (Array.isArray(menuItem.addons) ? menuItem.addons : []).reduce((sum, raw) => { const addon = raw as { id?: unknown; name?: unknown; price?: unknown }; return selected.addonIds.includes(String(addon.id ?? addon.name)) ? sum + Number(addon.price || 0) : sum; }, 0);
    const optionTotal = (Array.isArray(menuItem.customizations) ? menuItem.customizations : []).reduce((sum, raw) => { const group = raw as { id?: unknown; name?: unknown; options?: unknown }; const id = String(group.id ?? group.name); const chosen = selected.customizations[id]; const values = Array.isArray(chosen) ? chosen.map(String) : chosen ? [String(chosen)] : []; const options = Array.isArray(group.options) ? group.options : []; return sum + options.reduce((optionSum, option) => { const row = option as { id?: unknown; name?: unknown; price?: unknown }; return values.includes(String(row.id ?? row.name)) ? optionSum + Number(row.price || 0) : optionSum; }, 0); }, 0);
    return Number(menuItem.discountedPrice ?? menuItem.price) + addonTotal + optionTotal;
  };
  const subtotal = lines.reduce((sum, item) => sum + unitPrice(item) * cart[item.id], 0);
  const totalCount = Object.values(cart).reduce((sum, n) => sum + n, 0);
  const setQty = (id: string, qty: number) => setCart((old) => ({ ...old, [id]: Math.max(0, qty) }));

  async function placeOrder() {
    if (!address.trim()) { setError("Enter a delivery address"); return; }
    const missingChoice = lines.find((line) => (Array.isArray(line.customizations) ? line.customizations : []).some((raw) => { const group = raw as { id?: unknown; name?: unknown; required?: unknown }; return Boolean(group.required) && !selections[line.id]?.customizations?.[String(group.id ?? group.name)]; }));
    if (missingChoice) { setError(`Select all required customisations for ${missingChoice.name}`); return; }
    setPlacing(true); setError("");
    try {
      const order = await foodApi.placeOrder({ restaurantId, items: lines.map((i) => ({ ...(i.isCombo ? { comboId: i.id } : { menuItemId: i.id }), quantity: cart[i.id], ...(!i.isCombo ? selections[i.id] : {}) })), deliveryAddress: address.trim(), paymentMethod, couponCode: couponCode.trim() || undefined, scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined });
      if (paymentMethod !== "cod") await foodApi.createPayment(order.id);
      setPlacedId(order.id); setCart({});
    } catch (e) { setError(errorMessage(e)); } finally { setPlacing(false); }
  }

  if (loading) return <div className="flex min-h-[55vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#89CFF0]" /></div>;
  if (!restaurant) return <div className="mx-auto max-w-3xl p-8"><Link href="/food" className="text-[#202124]">← Food</Link><p className="mt-6 rounded-2xl bg-red-50 p-5 text-red-700">{error || "Restaurant not found"}</p></div>;

  return <div className="mx-auto w-full max-w-7xl bg-white  px-4 py-6 md:px-6">
    <Link href="/food" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-[#202124]"><ArrowLeft className="h-4 w-4" />All restaurants</Link>
    <section className="mt-4 overflow-hidden rounded-3xl border bg-white shadow-sm"><div className="h-48 bg-gradient-to-r from-orange-100 to-amber-50 md:h-64">{restaurant.coverImage ? <img src={restaurant.coverImage} alt="" className="h-full w-full object-cover" /> : <UtensilsCrossed className="mx-auto h-full w-20 text-orange-300" />}</div><div className="p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-3xl font-bold text-gray-900">{restaurant.name}</h1><p className="mt-2 text-gray-500">{restaurant.cuisine?.join(" • ") || restaurant.description}</p><p className="mt-2 text-sm text-gray-500">{restaurant.address}</p></div><span className="flex items-center gap-1 rounded-xl bg-green-600 px-3 py-2 font-bold text-white"><Star className="h-4 w-4 fill-current" />{Number(restaurant.rating).toFixed(1)}</span></div></div></section>
    {error && <div className="mt-4 flex items-center justify-between rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}<button onClick={() => setError("")}><X className="h-4 w-4" /></button></div>}
    {placedId && <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-5 text-green-800">Order placed successfully. <Link className="font-bold underline" href="/food/orders">View your order</Link></div>}
    <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_340px]"><div>{combos.length > 0 && <section className="mb-8"><h2 className="mb-4 text-xl font-bold text-gray-900">Value combos</h2><div className="space-y-3">{displayItems.filter((item) => item.isCombo).map((item) => <MenuRow key={item.id} item={item} qty={cart[item.id] || 0} setQty={setQty} selection={selections[item.id]} setSelection={(value) => setSelections((old) => ({ ...old, [item.id]: value }))} />)}</div></section>}{categories.map((category) => { const categoryItems = items.filter((i) => i.categoryId === category.id); if (!categoryItems.length) return null; return <section key={category.id} className="mb-8"><h2 className="mb-4 text-xl font-bold text-gray-900">{category.name}</h2><div className="space-y-3">{categoryItems.map((item) => <MenuRow key={item.id} item={item} qty={cart[item.id] || 0} setQty={setQty} selection={selections[item.id]} setSelection={(value) => setSelections((old) => ({ ...old, [item.id]: value }))} />)}</div></section>; })}{items.some((i) => !i.categoryId) && <section><h2 className="mb-4 text-xl font-bold">More dishes</h2><div className="space-y-3">{items.filter((i) => !i.categoryId).map((item) => <MenuRow key={item.id} item={item} qty={cart[item.id] || 0} setQty={setQty} selection={selections[item.id]} setSelection={(value) => setSelections((old) => ({ ...old, [item.id]: value }))} />)}</div></section>}</div>
      <aside className="h-fit rounded-3xl border bg-white p-5 shadow-sm lg:sticky lg:top-24"><h2 className="flex items-center gap-2 text-xl font-bold"><ShoppingBag className="h-5 w-5 text-[#89CFF0]" />Your order</h2>{!lines.length ? <p className="py-10 text-center text-sm text-gray-500">Add dishes from the menu</p> : <><div className="my-4 space-y-3">{lines.map((item) => <div key={item.id} className="flex justify-between gap-3 text-sm"><span>{cart[item.id]} × {item.name}</span><span className="font-semibold">₹{(unitPrice(item) * cart[item.id]).toFixed(2)}</span></div>)}</div><div className="border-t pt-4"><div className="flex justify-between font-bold"><span>Item subtotal</span><span>₹{subtotal.toFixed(2)}</span></div><p className="mt-1 text-xs text-gray-500">Taxes and delivery charges are calculated by the restaurant.</p></div>{checkout ? <div className="mt-5 space-y-3"><textarea rows={3} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Delivery address" className="w-full rounded-xl border p-3 text-sm outline-none focus:border-[#89CFF0]" /><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full rounded-xl border p-3 text-sm"><option value="cod">Cash on delivery</option><option value="upi">UPI / online</option><option value="card">Card</option></select><input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="Coupon code" className="w-full rounded-xl border p-3 text-sm" /><label className="block text-xs font-semibold text-gray-500">Schedule for later<input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className="mt-1 w-full rounded-xl border p-3 text-sm font-normal text-gray-800" /></label><button disabled={placing} onClick={placeOrder} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#89CFF0] px-4 py-3 font-bold text-white disabled:opacity-60">{placing && <Loader2 className="h-4 w-4 animate-spin" />}Place order</button></div> : <button onClick={() => setCheckout(true)} className="mt-5 w-full rounded-xl bg-[#89CFF0] px-4 py-3 font-bold text-white">Checkout {totalCount} item{totalCount === 1 ? "" : "s"}</button>}</>}</aside>
    </div>
    <section className="mt-8 rounded-3xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Customer reviews</h2>{reviews.length === 0 ? <p className="mt-4 text-sm text-gray-500">No reviews yet.</p> : <div className="mt-4 grid gap-3 md:grid-cols-2">{reviews.map((review) => <article key={review.id} className="rounded-2xl bg-gray-50 p-4"><p className="font-bold text-amber-500">{"★".repeat(review.foodRating)}<span className="text-gray-300">{"★".repeat(5 - review.foodRating)}</span></p><p className="mt-2 text-sm text-gray-700">{review.comment || "Rated this order"}</p><p className="mt-2 text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</p></article>)}</div>}</section>
  </div>;
}

function MenuRow({ item, qty, setQty, selection, setSelection }: { item: DisplayItem; qty: number; setQty: (id: string, qty: number) => void; selection?: Selection; setSelection: (value: Selection) => void }) {
  const selected = selection || { addonIds: [], customizations: {} };
  const addons = Array.isArray(item.addons) ? item.addons : [];
  const customizations = Array.isArray(item.customizations) ? item.customizations : [];
  return <div className="flex gap-4 rounded-2xl border bg-white p-4 shadow-sm"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className={`h-3 w-3 rounded-sm border ${item.isVeg ? "border-green-600 bg-green-600" : "border-red-600 bg-red-600"}`} /><h3 className="font-bold text-gray-900">{item.name}</h3>{item.isBestseller && <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700">BESTSELLER</span>}</div><p className="mt-1 font-semibold">₹{Number(item.discountedPrice ?? item.price).toFixed(2)}{item.discountedPrice && <span className="ml-2 text-xs font-normal text-gray-400 line-through">₹{Number(item.price).toFixed(2)}</span>}</p><p className="mt-2 line-clamp-2 text-sm text-gray-500">{item.description}</p>{addons.length > 0 && <div className="mt-3 flex flex-wrap gap-3">{addons.map((raw) => { const addon=raw as {id?:unknown;name?:unknown;price?:unknown}; const id=String(addon.id ?? addon.name); return <label key={id} className="text-xs"><input type="checkbox" checked={selected.addonIds.includes(id)} onChange={(e) => setSelection({ ...selected, addonIds: e.target.checked ? [...selected.addonIds, id] : selected.addonIds.filter((value) => value !== id) })} /> {String(addon.name ?? id)} +₹{Number(addon.price || 0)}</label>; })}</div>}{customizations.map((raw) => { const group=raw as {id?:unknown;name?:unknown;required?:unknown;options?:unknown}; const id=String(group.id ?? group.name); const options=Array.isArray(group.options) ? group.options : []; return <label key={id} className="mt-2 block text-xs font-semibold">{String(group.name ?? id)}{group.required ? ' *' : ''}<select value={String(selected.customizations[id] ?? '')} onChange={(e) => setSelection({ ...selected, customizations: { ...selected.customizations, [id]: e.target.value } })} className="ml-2 rounded border p-1"><option value="">Select</option>{options.map((option) => { const value=typeof option === 'object' && option ? String((option as {id?:unknown;name?:unknown}).id ?? (option as {name?:unknown}).name) : String(option); return <option key={value} value={value}>{typeof option === 'object' && option ? String((option as {name?:unknown}).name ?? value) : value}</option>; })}</select></label>; })}</div><div className="flex w-28 shrink-0 flex-col items-center justify-between gap-2">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-20 w-24 rounded-xl object-cover" /> : <div className="flex h-20 w-24 items-center justify-center rounded-xl bg-orange-50"><UtensilsCrossed className="text-orange-300" /></div>}<div className="flex items-center overflow-hidden rounded-lg border border-[#89CFF0] text-[#202124]">{qty > 0 && <button onClick={() => setQty(item.id, qty - 1)} className="p-2"><Minus className="h-3 w-3" /></button>}<span className="min-w-7 text-center text-sm font-bold">{qty || "ADD"}</span><button onClick={() => setQty(item.id, qty + 1)} className="p-2"><Plus className="h-3 w-3" /></button></div></div></div>;
}

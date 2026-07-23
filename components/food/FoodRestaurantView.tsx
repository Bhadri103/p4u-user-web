"use client";
/* Restaurant/menu images use vendor-managed absolute URLs. */
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bell, Leaf, Loader2, Minus, Plus, Search, ShoppingBag, Star, UtensilsCrossed, X } from "lucide-react";
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
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponStatus, setCouponStatus] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placedId, setPlacedId] = useState("");
  const [menuSearch, setMenuSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [vegOnly, setVegOnly] = useState(false);

  useEffect(() => { Promise.all([foodApi.getMenu(restaurantId), foodApi.listReviews(restaurantId, { limit: 10 }), foodApi.listCombos(restaurantId)]).then(([r, reviewPage, comboRows]) => { setRestaurant(r.restaurant); setItems(r.items); setCategories(r.categories); setReviews(reviewPage.data); setCombos(comboRows); }).catch((e) => setError(errorMessage(e))).finally(() => setLoading(false)); }, [restaurantId]);
  const displayItems = useMemo<DisplayItem[]>(() => [...items, ...combos.map((combo) => ({
    id: combo.id, restaurantId, categoryId: null, name: combo.name, description: combo.description,
    price: combo.price, discountedPrice: null, isVeg: true, imageUrl: combo.image_url,
    addons: [], customizations: [], inStock: combo.in_stock, isBestseller: false, prepMinutes: 0, gstRate: '5', isCombo: true,
  }))], [items, combos, restaurantId]);
  const visibleItems = useMemo(() => displayItems.filter((item) => {
    if (vegOnly && !item.isVeg) return false;
    if (selectedCategory === "combos" && !item.isCombo) return false;
    if (selectedCategory !== "all" && selectedCategory !== "combos" && item.categoryId !== selectedCategory) return false;
    const query = menuSearch.trim().toLowerCase();
    return !query || `${item.name} ${item.description || ""}`.toLowerCase().includes(query);
  }), [displayItems, vegOnly, selectedCategory, menuSearch]);  const lines = useMemo(() => displayItems.filter((i) => (cart[i.id] || 0) > 0), [displayItems, cart]);
  const unitPrice = (menuItem: DisplayItem) => {
    const selected = selections[menuItem.id] || { addonIds: [], customizations: {} };
    const addonTotal = (Array.isArray(menuItem.addons) ? menuItem.addons : []).reduce((sum, raw) => { const addon = raw as { id?: unknown; name?: unknown; price?: unknown }; return selected.addonIds.includes(String(addon.id ?? addon.name)) ? sum + Number(addon.price || 0) : sum; }, 0);
    const optionTotal = (Array.isArray(menuItem.customizations) ? menuItem.customizations : []).reduce((sum, raw) => { const group = raw as { id?: unknown; name?: unknown; options?: unknown }; const id = String(group.id ?? group.name); const chosen = selected.customizations[id]; const values = Array.isArray(chosen) ? chosen.map(String) : chosen ? [String(chosen)] : []; const options = Array.isArray(group.options) ? group.options : []; return sum + options.reduce((optionSum, option) => { const row = option as { id?: unknown; name?: unknown; price?: unknown }; return values.includes(String(row.id ?? row.name)) ? optionSum + Number(row.price || 0) : optionSum; }, 0); }, 0);
    return Number(menuItem.discountedPrice ?? menuItem.price) + addonTotal + optionTotal;
  };
  const subtotal = lines.reduce((sum, item) => sum + unitPrice(item) * cart[item.id], 0);
  const totalCount = Object.values(cart).reduce((sum, n) => sum + n, 0);
  const payable = Math.max(0, subtotal - couponDiscount);
  const setQty = (id: string, qty: number) => setCart((old) => ({ ...old, [id]: Math.max(0, qty) }));

  async function validateCoupon() {
    const code = couponCode.trim().toUpperCase();
    if (!code || subtotal <= 0) return;
    setValidatingCoupon(true);
    setCouponStatus("");
    setError("");
    try {
      const result = await foodApi.validateCoupon({ code, restaurantId, subtotal });
      setCouponDiscount(Number(result.discount || 0));
      setCouponStatus(String(result.title || result.code) + " applied");
    } catch (requestError) {
      setCouponDiscount(0);
      setError(errorMessage(requestError));
    } finally {
      setValidatingCoupon(false);
    }
  }
  async function placeOrder() {
    if (!address.trim()) {
      setError("Enter a complete delivery address");
      return;
    }
    const missingChoice = lines.find((line) =>
      (Array.isArray(line.customizations) ? line.customizations : []).some((raw) => {
        const group = raw as { id?: unknown; name?: unknown; required?: unknown };
        return Boolean(group.required) &&
          !selections[line.id]?.customizations?.[String(group.id ?? group.name)];
      }),
    );
    if (missingChoice) {
      setError(`Select all required customisations for ${missingChoice.name}`);
      return;
    }

    setPlacing(true);
    setError("");
    try {
      const order = await foodApi.placeOrder({
        restaurantId,
        items: lines.map((item) => ({
          ...(item.isCombo ? { comboId: item.id } : { menuItemId: item.id }),
          quantity: cart[item.id],
          ...(!item.isCombo ? selections[item.id] : {}),
        })),
        deliveryAddress: address.trim(),
        paymentMethod,
        couponCode: couponCode.trim() || undefined,
        scheduledFor: scheduledFor
          ? new Date(scheduledFor).toISOString()
          : undefined,
      });

      setPlacedId(order.id);
      setCart({});
      setCouponDiscount(0);
      setCouponStatus("");

      if (paymentMethod !== "cod") {
        try {
          await foodApi.createPayment(order.id);
        } catch (paymentError) {
          setError(
            `Order created, but online payment could not start: ${errorMessage(paymentError)}`,
          );
        }
      }
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setPlacing(false);
    }
  }
  async function notifyBackInStock(itemId: string) {
    setError("");
    try {
      await foodApi.subscribeBackInStock(itemId);
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }
  if (loading) return <div className="flex min-h-[55vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#0a9a9a]" /></div>;
  if (!restaurant) return <div className="mx-auto max-w-3xl p-8"><Link href="/food" className="text-[#087f7f]">← Food</Link><p className="mt-6 rounded-2xl bg-red-50 p-5 text-red-700">{error || "Restaurant not found"}</p></div>;

  return <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
    <Link href="/food" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-[#087f7f]"><ArrowLeft className="h-4 w-4" />All restaurants</Link>
    <section className="mt-4 overflow-hidden rounded-3xl border bg-white shadow-sm"><div className="h-48 bg-gradient-to-r from-orange-100 to-amber-50 md:h-64">{restaurant.coverImage ? <img src={restaurant.coverImage} alt="" className="h-full w-full object-cover" /> : <UtensilsCrossed className="mx-auto h-full w-20 text-orange-300" />}</div><div className="p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-3xl font-bold text-gray-900">{restaurant.name}</h1><p className="mt-2 text-gray-500">{restaurant.cuisine?.join(" • ") || restaurant.description}</p><p className="mt-2 text-sm text-gray-500">{restaurant.address}</p></div><span className="flex items-center gap-1 rounded-xl bg-green-600 px-3 py-2 font-bold text-white"><Star className="h-4 w-4 fill-current" />{Number(restaurant.rating).toFixed(1)}</span></div></div></section>
    {error && <div className="mt-4 flex items-center justify-between rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}<button onClick={() => setError("")}><X className="h-4 w-4" /></button></div>}
    {placedId && <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-5 text-green-800">Order placed successfully. <Link className="font-bold underline" href="/food/orders">View your order</Link></div>}
    <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_340px]">
      <div>
        <section className="sticky top-20 z-20 mb-5 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
          <label className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2.5">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={menuSearch}
              onChange={(event) => setMenuSearch(event.target.value)}
              placeholder="Search within the menu"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button type="button" onClick={() => setVegOnly((value) => !value)} className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold ${vegOnly ? "border-green-600 bg-green-50 text-green-700" : "border-slate-200 text-slate-600"}`}>
              <Leaf className="h-3.5 w-3.5" /> Veg only
            </button>
            <MenuCategory active={selectedCategory === "all"} onClick={() => setSelectedCategory("all")}>All</MenuCategory>
            {combos.length > 0 && <MenuCategory active={selectedCategory === "combos"} onClick={() => setSelectedCategory("combos")}>Combos</MenuCategory>}
            {categories.map((category) => (
              <MenuCategory key={category.id} active={selectedCategory === category.id} onClick={() => setSelectedCategory(category.id)}>
                {category.name}
              </MenuCategory>
            ))}
          </div>
        </section>
        <h2 className="mb-4 text-xl font-black text-slate-900">
          {selectedCategory === "all" ? "Full menu" : selectedCategory === "combos" ? "Value combos" : categories.find((category) => category.id === selectedCategory)?.name || "Menu"}
          <span className="ml-2 text-sm font-semibold text-slate-400">{visibleItems.length} items</span>
        </h2>
        <div className="space-y-3">
          {visibleItems.map((item) => (
            <MenuRow
              key={item.id}
              item={item}
              qty={cart[item.id] || 0}
              setQty={setQty}
              selection={selections[item.id]}
              setSelection={(value) => setSelections((old) => ({ ...old, [item.id]: value }))}
              onNotify={() => void notifyBackInStock(item.id)}
            />
          ))}
          {visibleItems.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center text-sm font-semibold text-slate-500">No dishes match these filters.</div>}
        </div>
      </div>
      <aside id="food-cart" className="h-fit rounded-3xl border bg-white p-5 shadow-sm lg:sticky lg:top-24"><h2 className="flex items-center gap-2 text-xl font-bold"><ShoppingBag className="h-5 w-5 text-[#0a9a9a]" />Your order</h2>{!lines.length ? <p className="py-10 text-center text-sm text-gray-500">Add dishes from the menu</p> : <><div className="my-4 space-y-3">{lines.map((item) => <div key={item.id} className="flex justify-between gap-3 text-sm"><span>{cart[item.id]} × {item.name}</span><span className="font-semibold">₹{(unitPrice(item) * cart[item.id]).toFixed(2)}</span></div>)}</div><div className="border-t pt-4"><div className="flex justify-between font-bold"><span>Item subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>{couponDiscount > 0 && <div className="mt-2 flex justify-between text-sm font-bold text-green-700"><span>Coupon discount</span><span>-₹{couponDiscount.toFixed(2)}</span></div>}<div className="mt-3 flex justify-between border-t pt-3 font-black"><span>Before final charges</span><span>₹{payable.toFixed(2)}</span></div><p className="mt-1 text-xs text-gray-500">Taxes, packaging and delivery charges are calculated by the restaurant.</p></div>{checkout ? <div className="mt-5 space-y-3"><textarea rows={3} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Delivery address" className="w-full rounded-xl border p-3 text-sm outline-none focus:border-[#0a9a9a]" /><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full rounded-xl border p-3 text-sm"><option value="cod">Cash on delivery</option><option value="upi">UPI / online</option><option value="card">Card</option></select><div className="flex gap-2"><input value={couponCode} onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponDiscount(0); setCouponStatus(""); }} placeholder="Coupon code" className="min-w-0 flex-1 rounded-xl border p-3 text-sm" /><button type="button" disabled={validatingCoupon || !couponCode.trim()} onClick={() => void validateCoupon()} className="rounded-xl border border-teal-600 px-3 text-xs font-extrabold text-teal-700 disabled:opacity-50">{validatingCoupon ? "Checking..." : "Apply"}</button></div>{couponStatus && <p className="text-xs font-bold text-green-700">{couponStatus}: save ₹{couponDiscount.toFixed(2)}</p>}<label className="block text-xs font-semibold text-gray-500">Schedule for later<input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className="mt-1 w-full rounded-xl border p-3 text-sm font-normal text-gray-800" /></label><button disabled={placing} onClick={placeOrder} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a9a9a] px-4 py-3 font-bold text-white disabled:opacity-60">{placing && <Loader2 className="h-4 w-4 animate-spin" />}Place order</button></div> : <button onClick={() => setCheckout(true)} className="mt-5 w-full rounded-xl bg-[#0a9a9a] px-4 py-3 font-bold text-white">Checkout {totalCount} item{totalCount === 1 ? "" : "s"}</button>}</>}</aside>
    </div>
    {totalCount > 0 && (
      <button
        type="button"
        onClick={() => {
          setCheckout(true);
          document.getElementById("food-cart")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        className="fixed bottom-[84px] left-4 right-4 z-30 flex items-center justify-between rounded-2xl bg-teal-600 px-5 py-3.5 text-white shadow-xl lg:hidden"
      >
        <span className="font-extrabold">{totalCount} item{totalCount === 1 ? "" : "s"} · ₹{subtotal.toFixed(2)}</span>
        <span className="font-extrabold">View cart →</span>
      </button>
    )}    <section className="mt-8 rounded-3xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Customer reviews</h2>{reviews.length === 0 ? <p className="mt-4 text-sm text-gray-500">No reviews yet.</p> : <div className="mt-4 grid gap-3 md:grid-cols-2">{reviews.map((review) => <article key={review.id} className="rounded-2xl bg-gray-50 p-4"><p className="font-bold text-amber-500">{"★".repeat(review.foodRating)}<span className="text-gray-300">{"★".repeat(5 - review.foodRating)}</span></p><p className="mt-2 text-sm text-gray-700">{review.comment || "Rated this order"}</p><p className="mt-2 text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</p></article>)}</div>}</section>
  </div>;
}

function MenuCategory({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
        active
          ? "border-teal-600 bg-teal-50 text-teal-700"
          : "border-slate-200 bg-white text-slate-600"
      }`}
    >
      {children}
    </button>
  );
}

function MenuRow({
  item,
  qty,
  setQty,
  selection,
  setSelection,
  onNotify,
}: {
  item: DisplayItem;
  qty: number;
  setQty: (id: string, qty: number) => void;
  selection?: Selection;
  setSelection: (value: Selection) => void;
  onNotify: () => void;
}) {
  const selected = selection || { addonIds: [], customizations: {} };
  const addons = Array.isArray(item.addons) ? item.addons : [];
  const customizations = Array.isArray(item.customizations) ? item.customizations : [];

  return (
    <article className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`grid h-4 w-4 place-items-center border ${item.isVeg ? "border-green-600" : "border-red-600"}`}>
            <span className={`h-2 w-2 rounded-full ${item.isVeg ? "bg-green-600" : "bg-red-600"}`} />
          </span>
          <h3 className="font-black text-gray-900">{item.name}</h3>
          {item.isBestseller && <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-extrabold text-orange-700">BESTSELLER</span>}
          {item.isCombo && <span className="rounded bg-teal-50 px-2 py-0.5 text-[10px] font-extrabold text-teal-700">VALUE COMBO</span>}
        </div>
        <p className="mt-1 font-bold text-slate-800">
          ₹{Number(item.discountedPrice ?? item.price).toFixed(2)}
          {item.discountedPrice && <span className="ml-2 text-xs font-normal text-gray-400 line-through">₹{Number(item.price).toFixed(2)}</span>}
        </p>
        {item.description && <p className="mt-2 line-clamp-2 text-sm leading-5 text-gray-500">{item.description}</p>}

        {addons.length > 0 && (
          <fieldset className="mt-4">
            <legend className="text-xs font-extrabold text-slate-700">Choose add-ons</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {addons.map((raw) => {
                const addon = raw as { id?: unknown; name?: unknown; price?: unknown };
                const id = String(addon.id ?? addon.name);
                const checked = selected.addonIds.includes(id);
                return (
                  <label key={id} className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition ${checked ? "border-teal-600 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600"}`}>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={(event) =>
                        setSelection({
                          ...selected,
                          addonIds: event.target.checked
                            ? [...selected.addonIds, id]
                            : selected.addonIds.filter((value) => value !== id),
                        })
                      }
                    />
                    {String(addon.name ?? id)} {Number(addon.price || 0) > 0 ? `+₹${Number(addon.price).toFixed(0)}` : ""}
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {customizations.map((raw) => {
          const group = raw as { id?: unknown; name?: unknown; required?: unknown; options?: unknown };
          const id = String(group.id ?? group.name);
          const options = Array.isArray(group.options) ? group.options : [];
          return (
            <label key={id} className="mt-3 block text-xs font-extrabold text-slate-700">
              {String(group.name ?? id)}{group.required ? " *" : ""}
              <select
                value={String(selected.customizations[id] ?? "")}
                onChange={(event) =>
                  setSelection({
                    ...selected,
                    customizations: { ...selected.customizations, [id]: event.target.value },
                  })
                }
                className="mt-1.5 block w-full max-w-xs rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-normal text-slate-700 outline-none focus:border-teal-500"
              >
                <option value="">Select an option</option>
                {options.map((option) => {
                  const row = typeof option === "object" && option ? option as { id?: unknown; name?: unknown; price?: unknown } : null;
                  const value = row ? String(row.id ?? row.name) : String(option);
                  return <option key={value} value={value}>{row ? String(row.name ?? value) : value}{row && Number(row.price || 0) > 0 ? ` (+₹${Number(row.price).toFixed(0)})` : ""}</option>;
                })}
              </select>
            </label>
          );
        })}
      </div>

      <div className="flex w-28 shrink-0 flex-col items-center gap-2">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.name} className="h-24 w-28 rounded-xl object-cover" />
        ) : (
          <div className="flex h-24 w-28 items-center justify-center rounded-xl bg-orange-50">
            <UtensilsCrossed className="text-orange-300" />
          </div>
        )}
        {!item.inStock ? (
          <button type="button" onClick={onNotify} className="flex w-full items-center justify-center gap-1 rounded-lg border border-teal-600 px-2 py-2 text-xs font-extrabold text-teal-700">
            <Bell className="h-3.5 w-3.5" /> Notify
          </button>
        ) : (
          <div className="flex w-full items-center justify-center overflow-hidden rounded-lg border border-[#0a9a9a] bg-white text-[#087f7f]">
            {qty > 0 && <button type="button" aria-label={`Remove one ${item.name}`} onClick={() => setQty(item.id, qty - 1)} className="p-2"><Minus className="h-3.5 w-3.5" /></button>}
            <span className="min-w-9 text-center text-sm font-extrabold">{qty || "ADD"}</span>
            <button type="button" aria-label={`Add ${item.name}`} onClick={() => setQty(item.id, qty + 1)} className="p-2"><Plus className="h-3.5 w-3.5" /></button>
          </div>
        )}
        {(addons.length > 0 || customizations.length > 0) && <p className="text-center text-[10px] font-semibold text-slate-400">Customisable</p>}
      </div>
    </article>
  );
}

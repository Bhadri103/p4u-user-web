"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { commerceApi, type Cart, type CartItemApi } from "@/lib/api/commerce";
import { resolveMediaUrl } from "@/lib/media";
import { setPostLoginAction } from "@/lib/postLoginAction";

export interface CartItem {
  /** Server cart line id (UUID) when synced; otherwise same as productId for local-only rows */
  id: string | number;
  /** Catalog product id (string or number from API) */
  productId?: string | number;
  name: string;
  price: number;
  originalPrice: number;
  image?: string;
  imageUrl?: string;
  vendor: string;
  vendorId: string;
  color?: string;
  qty: number;
  delivery?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, "qty">) => void;
  removeFromCart: (id: string | number) => void;
  updateQty: (id: string | number, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
  syncing: boolean;
  syncError: string | null;
}

const STORAGE_KEY = "p4u_cart";

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch { /* quota exceeded */ }
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Persist to localStorage on every change
  useEffect(() => {
    saveCart(items);
  }, [items]);

  // On mount, if user is logged in, try to merge local cart with server cart
  useEffect(() => {
    const token = localStorage.getItem("p4u_token");
    if (!token) return;

    setSyncing(true);
    const localItems = loadCart();

    const mapServerItems = (serverCart: Cart): CartItem[] =>
      serverCart.items.map((si: CartItemApi) => {
        const productId = si.productId;
        const unit = si.unitPrice ?? si.price;
        const price =
          typeof unit === "string"
            ? Number(unit) || 0
            : typeof unit === "number"
              ? unit
              : 0;
        const meta =
          si.metadata && typeof si.metadata === "object"
            ? (si.metadata as Record<string, unknown>)
            : {};
        const rawImg =
          si.productImage ||
          (typeof meta.productImage === "string" ? meta.productImage : null) ||
          (typeof meta.imageUrl === "string" ? meta.imageUrl : null) ||
          (typeof meta.thumbnailUrl === "string" ? meta.thumbnailUrl : null);
        const resolvedImg = resolveMediaUrl(typeof rawImg === "string" ? rawImg : null);
        const name =
          si.productName ||
          (typeof meta.productName === "string" ? meta.productName : null) ||
          `Product #${productId}`;
        const vendor =
          (typeof meta.vendorName === "string" ? meta.vendorName : "") || "";
        return {
          id: si.id,
          productId,
          name,
          price,
          originalPrice: price,
          vendor,
          vendorId: String(si.vendorId ?? ""),
          qty: si.quantity,
          image: resolvedImg || (typeof rawImg === "string" ? rawImg : undefined),
        };
      });

    const cartLineMetadata = (i: CartItem) => {
      const rawImg = i.imageUrl || i.image;
      return {
        productName: i.name,
        vendorName: i.vendor,
        ...(rawImg ? { productImage: rawImg } : {}),
      };
    };

    const linesFromLocal = (items: CartItem[]) =>
      items.map((i) => ({
        productId: i.productId ?? i.id,
        quantity: i.qty,
        unitPrice: i.price,
        vendorId: i.vendorId || null,
        metadata: cartLineMetadata(i),
      }));

    if (localItems.length) {
      commerceApi
        .updateCart(linesFromLocal(localItems))
        .then((serverCart) => {
          setSyncError(null);
          setItems(mapServerItems(serverCart));
        })
        .catch(() => {
          setSyncError("Failed to sync cart with server");
        })
        .finally(() => setSyncing(false));
    } else {
      commerceApi
        .getCart()
        .then((serverCart) => {
          setSyncError(null);
          if (serverCart.items.length) {
            setItems(mapServerItems(serverCart));
          }
        })
        .catch(() => {
          setSyncError("Failed to load cart from server");
        })
        .finally(() => setSyncing(false));
    }
  }, []);

  const syncToServer = useCallback((action: () => Promise<unknown>) => {
    const token = localStorage.getItem("p4u_token");
    if (token) {
      action().then(() => setSyncError(null)).catch(() => setSyncError("Cart sync failed"));
    }
  }, []);

  const addToCart = useCallback((newItem: Omit<CartItem, "qty">) => {
    if (typeof window !== "undefined" && !localStorage.getItem("p4u_token")) {
      setPostLoginAction({ type: "addToCart", item: newItem });
      window.dispatchEvent(new CustomEvent("p4u-open-auth"));
      return;
    }
    const pid = newItem.productId ?? newItem.id;
    setItems((prev) => {
      const existing = prev.find((i) => String(i.productId ?? i.id) === String(pid));
      if (existing) {
        return prev.map((i) =>
          String(i.productId ?? i.id) === String(pid) ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [...prev, { ...newItem, productId: pid, qty: 1 }];
    });
    syncToServer(() =>
      commerceApi.addCartItem(pid, 1, newItem.price, newItem.vendorId || null, {
        productName: newItem.name,
        vendorName: newItem.vendor,
        ...((newItem.imageUrl || newItem.image)
          ? { productImage: newItem.imageUrl || newItem.image }
          : {}),
      }),
    );
  }, [syncToServer]);

  const removeFromCart = useCallback((id: string | number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    syncToServer(() => commerceApi.removeCartItem(id));
  }, [syncToServer]);

  const updateQty = useCallback((id: string | number, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.id !== id)
        : prev.map((i) => (i.id === id ? { ...i, qty } : i)),
    );
    syncToServer(() =>
      qty <= 0 ? commerceApi.removeCartItem(id) : commerceApi.updateCartItem(id, qty),
    );
  }, [syncToServer]);

  const clearCart = useCallback(() => {
    setItems([]);
    syncToServer(() => commerceApi.clearCart());
  }, [syncToServer]);

  const totalItems = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQty, clearCart, totalItems, syncing, syncError }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

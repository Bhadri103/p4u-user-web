/** Payload matches `addToCart` item shape (without qty). Kept standalone to avoid circular imports with CartContext. */
export type PendingCartLine = {
  id: string | number;
  productId?: string | number;
  name: string;
  price: number;
  originalPrice: number;
  image?: string;
  imageUrl?: string;
  vendor: string;
  vendorId: string;
  color?: string;
  delivery?: string;
};

export type PostLoginAction =
  | { type: "addToCart"; item: PendingCartLine }
  | { type: "navigate"; href: string };

let pending: PostLoginAction | null = null;

export function setPostLoginAction(action: PostLoginAction | null) {
  pending = action;
}

export function takePostLoginAction(): PostLoginAction | null {
  const p = pending;
  pending = null;
  return p;
}

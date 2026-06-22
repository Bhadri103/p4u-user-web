export interface Badge {
  label: string;
  bg: string;
}

export interface Product {
  id: string | number;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviews: number;
  badge?: string;
  image: string;
  description: string;
  duration: string;
  category: string;
}

export interface BannerSlide {
  gradient: string;
  accent: string;
  title: string;
  subtitle: string;
  handle: string;
  badgeText: string;
  icon: string;
}

export interface Vendor {
  id: string;
  name: string;
  logo: string;
  logoColor: string;
  verified: boolean;
  since: string;
  category: string;
  subCategory: string;
  delivery: string;
  rating: number;
  totalRatings: number;
  phone: string;
  email: string;
  address: string;
  description: string;
  openHours: string;
  distance: string;
  banners: BannerSlide[];
  tabs: string[];
  products: Product[];
}

export interface Seller {
  id: string | number;
  title: string;
  image: string;
  provider: string;
  description: string;
  rating: number;
  price: number;
  duration: string;
  distance: string;
  category: string;
  badge: Badge | null;
  hasOffer: boolean;
  vendorId: string;
}

export const TEAL = "#009999";

// Optional subtle gradient (teal only, no green)
export const TEAL_GRAD = "linear-gradient(135deg, #009999, #007777)";

// Replace dark gradient with plain dark teal
export const TEAL_DARK = "#006666";
export const RATING_OPTS = [
  { label: "4★ & above", min: 4.0 },
  { label: "3★ & above", min: 3.0 },
  { label: "2★ & above", min: 2.0 },
];
export const REVIEW_OPTS = ["Excellent", "Very Good", "Good", "Average"];
export const OFFER_OPTS = ["Deals of the Day", "Limited Offers", "Seasonal Sale"];
export const SORT_OPTS = [
  { label: "Price — Low to High", val: "low" },
  { label: "Price — High to Low", val: "high" },
  { label: "Newest", val: "newest" },
];
export const PER_PAGE = 12;

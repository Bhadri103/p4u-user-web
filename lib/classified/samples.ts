import type { ClassifiedAd } from "@/lib/api/classified";

export const SAMPLE_CLASSIFIED_ADS: ClassifiedAd[] = [
  {
    id: "demo-classified-phone",
    title: "iPhone 15 Pro 256 GB",
    description: "Gently used phone in excellent working condition. Includes the original box, charging cable and invoice. Inspection is welcome before purchase.",
    price: 78999,
    image: "/images/classified/mobiles-tablets.jpg",
    images: ["/images/classified/mobiles-tablets.jpg", "/images/classified/laptops-pcs.jpg"],
    categoryId: "Mobiles",
    categoryName: "Mobiles",
    city: "Bengaluru",
    area: "Whitefield",
    location: "Whitefield, Bengaluru",
    contactPhone: "8888888888",
    adType: "sell",
    condition: "like_new",
    brand: "Apple",
    model: "iPhone 15 Pro",
    manufactureYear: 2025,
    quantity: 1,
    negotiable: true,
    warranty: true,
    invoiceAvailable: true,
    deliveryAvailable: true,
    state: "Karnataka",
    pincode: "560066",
    sellerName: "Verified seller",
    preferredContact: "phone_whatsapp",
    tags: ["mobile", "iphone", "apple", "256gb"],
    status: "approved",
    postedBy: "Verified seller",
    memberSince: "2024",
    createdAt: "2026-07-30T10:30:00.000Z",
    updatedAt: "2026-07-30T10:30:00.000Z",
  },
  {
    id: "demo-classified-laptop",
    title: "Dell Inspiron Laptop",
    description: "Reliable laptop suitable for study, office work and browsing. Freshly serviced with charger included.",
    price: 34500,
    image: "/images/classified/laptops-pcs.jpg",
    images: ["/images/classified/laptops-pcs.jpg"],
    categoryId: "Electronics & Appliances",
    categoryName: "Electronics & Appliances",
    city: "Hyderabad",
    area: "HITEC City",
    location: "HITEC City, Hyderabad",
    contactPhone: "8888888888",
    adType: "sell",
    condition: "used_good",
    brand: "Dell",
    model: "Inspiron 15",
    manufactureYear: 2024,
    quantity: 1,
    negotiable: true,
    warranty: false,
    invoiceAvailable: true,
    deliveryAvailable: false,
    state: "Telangana",
    pincode: "500081",
    sellerName: "Local electronics seller",
    preferredContact: "chat",
    tags: ["laptop", "dell", "computer"],
    status: "approved",
    postedBy: "Local electronics seller",
    memberSince: "2025",
    createdAt: "2026-07-28T08:00:00.000Z",
    updatedAt: "2026-07-28T08:00:00.000Z",
  },
  {
    id: "demo-classified-sofa",
    title: "Premium 3-Seater Sofa",
    description: "Comfortable three-seater sofa with durable fabric and solid frame. Available for pickup or local delivery.",
    price: 18500,
    image: "/images/classified/furniture.jpg",
    images: ["/images/classified/furniture.jpg"],
    categoryId: "Furniture",
    categoryName: "Furniture",
    city: "Coimbatore",
    area: "RS Puram",
    location: "RS Puram, Coimbatore",
    contactPhone: "8888888888",
    adType: "sell",
    condition: "used_good",
    brand: "Home collection",
    model: "Three seater",
    manufactureYear: 2025,
    quantity: 1,
    negotiable: true,
    warranty: false,
    invoiceAvailable: false,
    deliveryAvailable: true,
    state: "Tamil Nadu",
    pincode: "641002",
    sellerName: "Verified seller",
    preferredContact: "phone_whatsapp",
    tags: ["sofa", "furniture", "home"],
    status: "approved",
    postedBy: "Verified seller",
    memberSince: "2024",
    createdAt: "2026-07-25T12:15:00.000Z",
    updatedAt: "2026-07-25T12:15:00.000Z",
  },
];

export function filteredSampleClassifiedAds(query = "", categoryId = ""): ClassifiedAd[] {
  const search = query.trim().toLowerCase();
  return SAMPLE_CLASSIFIED_ADS.filter((ad) => {
    const categoryMatches = !categoryId || ad.categoryId === categoryId || ad.categoryName === categoryId;
    const searchMatches = !search || [ad.title, ad.description, ad.categoryName, ad.city, ad.area, ad.brand, ad.model, ...(ad.tags ?? [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search);
    return categoryMatches && searchMatches;
  });
}

export function sampleClassifiedById(id: string): ClassifiedAd | undefined {
  return SAMPLE_CLASSIFIED_ADS.find((ad) => ad.id === id);
}

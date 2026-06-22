"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Star, Heart, ShoppingCart, Minus, Plus, ChevronLeft,
  ChevronRight, Shield, Truck, RotateCcw, CheckCircle,
  ThumbsUp, ChevronDown, ChevronUp, Tag, Zap
} from "lucide-react";
import { useCart } from "@/providers/CartContext";
import { useAuth } from "@/providers/AuthContext";
import { buildProductGalleryImages, resolveMediaUrl } from "@/lib/media";
import { profileApi } from "@/lib/api/profile";

function parseAttributeOptions(raw) {
  if (!raw || typeof raw !== "object") return [];
  return Object.entries(raw).flatMap(([name, vals]) => {
    const arr = Array.isArray(vals) ? vals : vals ? [vals] : [];
    return arr.map((v) => {
      const s = String(v || "").trim();
      const m = s.match(/^(.*?)(#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}))$/);
      const label = m ? String(m[1] || "").trim() : s;
      const hex = m ? m[2] : null;
      return { name, label: label || s, raw: s, hex };
    });
  });
}

function formatAttributeMap(raw) {
  if (!raw || typeof raw !== "object") return {};
  return Object.entries(raw).reduce((acc, [k, vals]) => {
    const arr = Array.isArray(vals) ? vals : vals ? [vals] : [];
    const pretty = arr
      .map((v) => {
        const s = String(v || "").trim();
        const m = s.match(/^(.*?)(#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}))$/);
        return (m ? String(m[1] || "").trim() : s) || s;
      })
      .filter(Boolean);
    if (pretty.length) acc[k] = pretty.join(", ");
    return acc;
  }, {});
}

function enrich(p) {
  if (!p) return {};
  const name = p.name || "Product";
  const price = p.price || 0;
  const originalPrice = p.originalPrice || price;

  const baseSpecs = (() => {
    const cat = (p.category || "").toLowerCase();
    const nm = p.name || "";
    if (cat === "electronics") return {
      Brand: p.brand || nm.split(" ")[0] || "N/A",
      Model: nm,
      Color: p.color || "N/A",
      ...(p.sizes?.length ? { Storage: p.sizes.join(", ") } : {}),
      "Display": "Full HD Display",
      "Battery": "Long-lasting Battery",
      Connectivity: "Wi-Fi, Bluetooth 5.0",
      "Operating System": "Latest OS",
      Warranty: "1 Year Manufacturer Warranty",
      "In Box": "Device, Charger, Manual",
    };
    if (cat === "restaurants") return {
      "Item Name": nm,
      "Serving Size": p.color || p.sizes?.[0] || "Regular",
      "Cuisine Type": "Indian",
      "Preparation Time": "15-20 mins",
      "Spice Level": "Medium",
      "Dietary Info": "Freshly Prepared",
      "Allergens": "May contain nuts, dairy",
      Packaging: "Food-safe containers",
      "Best Consumed": "Immediately after delivery",
    };
    if (cat === "clothing") return {
      Brand: p.brand || "Fashion Brand",
      "Item Name": nm,
      Color: p.color || "N/A",
      ...(p.sizes?.length ? { Sizes: p.sizes.join(", ") } : { Sizes: "S, M, L, XL, XXL" }),
      Fabric: "Premium Quality Fabric",
      Fit: "Regular Fit",
      Wash: "Machine Washable",
      "Country of Origin": "India",
      Warranty: "7 Days Return",
    };
    if (cat === "groceries") return {
      "Product Name": nm,
      Brand: p.brand || "Fresh Brand",
      "Net Weight": p.color || p.sizes?.[0] || "500g",
      "Storage": "Store in a cool, dry place",
      "Shelf Life": "Check packaging",
      "Country of Origin": "India",
      "Food Type": "Vegetarian",
      Packaging: "Sealed Pack",
      Certification: "FSSAI Certified",
    };
    if (cat === "medical") return {
      "Product Name": nm,
      Brand: p.brand || "MediCare",
      "Dosage Form": p.color || "Tablet/Capsule",
      ...(p.sizes?.length ? { Pack: p.sizes.join(", ") } : {}),
      "Manufacturer": "Certified Manufacturer",
      "Shelf Life": "Check packaging",
      "Storage": "Store below 25°C",
      "Prescription": "Not Required",
      Certification: "Drug Controller Approved",
    };
    if (cat === "cosmetics") return {
      "Product Name": nm,
      Brand: p.brand || "Glow Brand",
      "Shade/Variant": p.color || "N/A",
      ...(p.sizes?.length ? { Size: p.sizes.join(", ") } : { Size: "30ml / 50g" }),
      "Skin Type": "All Skin Types",
      "Key Ingredients": "Natural Extracts",
      "How to Use": "Apply evenly on clean skin",
      "Shelf Life": "24 months",
      Certification: "Dermatologically Tested",
    };
    return {
      ...(p.brand ? { Brand: p.brand } : {}),
      ...(p.color ? { Color: p.color } : {}),
      ...(p.sizes?.length ? { Variants: p.sizes.join(", ") } : {}),
      Category: p.category || "General",
    };
  })();

  const specs = {
    ...baseSpecs,
    "Delivery Time": p.duration || "Standard",
    ...(p.rating ? { Rating: String(p.rating) + " / 5" } : {}),
    ...(p.reviews ? { "Total Reviews": String(p.reviews) } : {}),
    ...(p.specs || {}),
  };
  const metadataAttrs =
    (p.specs && (p.specs.productAttributes || p.specs.attributes)) ||
    p.productAttributes ||
    {};
  const normalizedAttrMap = formatAttributeMap(metadataAttrs);
  const colorOptions = parseAttributeOptions(metadataAttrs)
    .filter((a) => String(a.name || "").toLowerCase() === "color")
    .map((a) => ({ name: a.label, hex: a.hex || "#d1d5db" }));
  const dynamicSizes =
    parseAttributeOptions(metadataAttrs)
      .filter((a) => String(a.name || "").toLowerCase() === "size")
      .map((a) => a.label)
      .filter(Boolean) || [];

  const description = (p.description && p.description.trim())
    ? p.description
    : name + " is a top-quality product available at the best price of Rs." + price.toLocaleString() + "." +
    (originalPrice > price
      ? " You save Rs." + (originalPrice - price).toLocaleString() +
      " (" + Math.round((1 - price / originalPrice) * 100) + "% off) today."
      : "") +
    " This product is verified by our sellers and comes with a 7-day hassle-free return policy. Fast delivery available." +
    " Trusted by " + (p.reviews || "hundreds of") + " happy customers with a rating of " + (p.rating || 4.5) + "/5." +
    (p.badge ? ' Currently featured as "' + p.badge + '".' : "");

  const ratingBreakdown = p.ratingBreakdown || (() => {
    const r = Math.min(Math.max(p.rating || 4.5, 1), 5);
    return {
      5: Math.max(5, Math.round(35 + (r - 4) * 35)),
      4: Math.max(3, Math.round(28 - (r - 4) * 12)),
      3: Math.max(2, Math.round(18 - (r - 4) * 8)),
      2: Math.max(1, Math.round(12 - (r - 4) * 5)),
      1: Math.max(1, Math.round(7 - (r - 4) * 3)),
    };
  })();

  const reviewsList = p.reviewsList || [];

  const images = p.images?.length
    ? p.images.map((u) => resolveMediaUrl(u) || u).filter(Boolean)
    : (() => {
        const g = buildProductGalleryImages({
          thumbnailUrl: p.thumbnailUrl,
          bannerUrls: p.bannerUrls,
          image: p.image,
          imageUrl: p.imageUrl,
          metadata: p.metadata,
        });
        if (g.length) return g;
        if (p.imageUrl) return [resolveMediaUrl(p.imageUrl) || p.imageUrl];
        if (p.image) return [resolveMediaUrl(p.image) || p.image];
        return null;
      })();

  const availableOffers = p.availableOffers || [];

  return {
    ...p,
    specs: { ...specs, ...normalizedAttrMap },
    description,
    ratingBreakdown,
    reviewsList,
    images,
    availableOffers,
    originalPrice,
    productAttributes: normalizedAttrMap,
    colors: colorOptions.length ? colorOptions : p.colors,
    sizes: dynamicSizes.length ? dynamicSizes : p.sizes,
  };
}

function Stars({ rating, size = 12 }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}
        />
      ))}
    </span>
  );
}

export default function ProductDetailPage({ product: rawProduct, onBack }) {
  const router = useRouter();
  const product = useMemo(() => enrich(rawProduct), [rawProduct]);
  const { addToCart, clearCart } = useCart();
  const { isLoggedIn } = useAuth();

  const [mainImg, setMainImg] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || null);
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || null);
  const [qty, setQty] = useState(1);
  const [liked, setLiked] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("Description");
  const [helpfulClicked, setHelpfulClicked] = useState({});
  const [reviewFilter, setReviewFilter] = useState("All Reviews");
  const [addedToCart, setAddedToCart] = useState(false);
  const [showAllSpecs, setShowAllSpecs] = useState(false);

  useEffect(() => {
    // Keep navigation snappy when opening product pages repeatedly.
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [rawProduct]);

  useEffect(() => {
    let mounted = true;
    if (!isLoggedIn || !product?.id) {
      setLiked(false);
      return;
    }
    profileApi
      .getWishlist()
      .then((rows) => {
        if (!mounted) return;
        const found = rows.some((r) => String(r.productId) === String(product.id));
        setLiked(found);
      })
      .catch(() => {
        if (mounted) setLiked(false);
      });
    return () => {
      mounted = false;
    };
  }, [isLoggedIn, product?.id]);

  const { specs, description, ratingBreakdown, reviewsList, images, availableOffers, originalPrice } = product;
  const discount = originalPrice > product.price ? Math.round((1 - product.price / originalPrice) * 100) : 0;
  const totalRatings = Object.values(ratingBreakdown || {}).reduce((a, b) => a + b, 0);
  const reviewCount = product.reviews || reviewsList?.length || 0;

  const filteredReviews = useMemo(() => {
    if (!reviewsList) return [];
    if (reviewFilter === "All Reviews") return reviewsList;
    if (reviewFilter === "With Photos") return reviewsList.filter(r => r.images?.length > 0);
    const star = parseInt(reviewFilter);
    return reviewsList.filter(r => Math.round(r.rating) === star);
  }, [reviewsList, reviewFilter]);

  function handleAddToCart() {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice || product.price,
      imageUrl: images?.[0] || "",
      image: product.image || "",
      vendor: product.vendor || "Seller",
      vendorId: product.vendorId || "",
      color: selectedColor?.name || product.color || "",
      delivery: product.delivery || "Delivery in 30 Mins",
    });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2500);
  }

  function handleBuyNow() {
    const buyNowItem = {
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice || product.price,
      imageUrl: images?.[0] || "",
      image: product.image || "",
      vendor: product.vendor || "Seller",
      vendorId: product.vendorId || "",
      color: selectedColor?.name || product.color || "",
      qty: 1,
      delivery: product.delivery || "Delivery in 30 Mins",
    };
    if (!isLoggedIn) {
      window.dispatchEvent(new Event("p4u-open-auth"));
      return;
    }
    // Buy Now should open the same checkout experience as cart,
    // but with this product as the only checkout item.
    clearCart();
    addToCart(buyNowItem);
    try {
      sessionStorage.setItem("openCart", "1");
    } catch {
      // ignore storage failures and still navigate
    }
    router.push("/cart");
  }

  async function toggleWishlist() {
    if (!product?.id || wishlistBusy) return;
    if (!isLoggedIn) {
      window.dispatchEvent(new Event("p4u-open-auth"));
      return;
    }
    const next = !liked;
    setLiked(next);
    setWishlistBusy(true);
    try {
      if (next) await profileApi.addToWishlist(product.id);
      else await profileApi.removeFromWishlist(product.id);
    } catch {
      setLiked(!next);
    } finally {
      setWishlistBusy(false);
    }
  }

  const specEntries = specs ? Object.entries(specs) : [];
  const visibleSpecs = showAllSpecs ? specEntries : specEntries.slice(0, 7);
  const attrEntries = product.productAttributes ? Object.entries(product.productAttributes) : [];

  return (
    <div >

       {addedToCart && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, display: "flex", alignItems: "center", gap: 8,
          padding: "10px 20px", borderRadius: 4, background: "#388e3c",
          color: "white", fontSize: 13, fontWeight: 700, boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          whiteSpace: "nowrap",
        }}>
          <CheckCircle size={16} style={{ fill: "white", color: "white" }} />
          Item added to cart!
        </div>
      )}

       <div style={{ background: "white", borderBottom: "1px solid #e0e0e0", padding: "8px 16px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#878787" }}>
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: "#2874f0", fontSize: 12, fontWeight: 600, padding: 0 }}>
            <ChevronLeft size={14} /> Back
          </button>
          <span>/</span>
          <span>{product.category || "Products"}</span>
          <span>/</span>
          <span style={{ color: "#212121", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "40vw" }}>
            {product.name}
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ display: "flex", gap: 0, background: "white", borderRadius: 2, boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>

           <div style={{ width: 420, minWidth: 420, display: "flex", gap: 0, padding: "24px 16px 24px 24px", borderRight: "1px solid #f0f0f0" }}>

 
            {images && images.length > 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginRight: 12, paddingTop: 4 }}>
                {images.slice(0, 6).map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setMainImg(i)}
                    style={{
                      width: 64, height: 64, borderRadius: 4, overflow: "hidden", padding: 0,
                      background: "white", cursor: "pointer", flexShrink: 0,
                      border: `2px solid ${mainImg === i ? "#2874f0" : "#e0e0e0"}`,
                      boxShadow: mainImg === i ? "0 0 0 1px #2874f0" : "none",
                    }}
                  >
                    <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }} />
                  </button>
                ))}
              </div>
            )} 
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, alignItems: "center", position: "relative" }}>
              <div style={{ position: "relative", width: "100%", height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {images ? (
                  <img src={images[mainImg]} alt={product.name}
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                ) : (
                  <img src={product.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80"}
                    alt={product.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                )} 
                {images && images.length > 1 && (
                  <>
                    <button onClick={() => setMainImg(i => (i - 1 + images.length) % images.length)}
                      style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", background: "white", border: "1px solid #e0e0e0", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}>
                      <ChevronLeft size={14} color="#212121" />
                    </button>
                    <button onClick={() => setMainImg(i => (i + 1) % images.length)}
                      style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", background: "white", border: "1px solid #e0e0e0", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}>
                      <ChevronRight size={14} color="#212121" />
                    </button>
                  </>
                )} 
                <button onClick={toggleWishlist}
                  disabled={wishlistBusy}
                  style={{ position: "absolute", top: 8, right: 8, background: "white", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}>
                  <Heart size={15} style={{ fill: liked ? "#ff3c3c" : "none", color: liked ? "#ff3c3c" : "#878787" }} />
                </button>
              </div>
 
              {images && images.length > 1 && (
                <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                  {images.slice(0, 6).map((_, i) => (
                    <button key={i} onClick={() => setMainImg(i)}
                      style={{ width: i === mainImg ? 20 : 8, height: 8, borderRadius: 4, border: "none", cursor: "pointer", transition: "width 0.2s", background: i === mainImg ? "#2874f0" : "#d0d0d0", padding: 0 }} />
                  ))}
                </div>
              )}

              {/* Cart actions */}
              <div style={{ display: "flex", gap: 10, width: "100%", marginTop: 4 }}>
                <button
                  onClick={handleAddToCart}
                  style={{
                    flex: 1, height: 48, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    background: "#ff9f00", border: "none", borderRadius: 2, cursor: "pointer",
                    fontSize: 14, fontWeight: 700, color: "white", boxShadow: "0 2px 4px rgba(255,159,0,0.4)",
                    transition: "opacity 0.2s",
                  }}
                >
                  <ShoppingCart size={18} />
                  ADD TO CART
                </button>
                <button
                  onClick={handleBuyNow}
                  style={{
                    flex: 1, height: 48, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    background: "#fb641b", border: "none", borderRadius: 2, cursor: "pointer",
                    fontSize: 14, fontWeight: 700, color: "white", boxShadow: "0 2px 4px rgba(251,100,27,0.4)",
                  }}
                >
                  <Zap size={18} />
                  BUY NOW
                </button>
              </div>
            </div>
          </div> 
          <div style={{ flex: 1, padding: "24px 28px", minWidth: 0 }}> 
            <h1 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 500, color: "#212121", lineHeight: 1.4 }}>
              {product.name}
            </h1> 
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 5, background: "#388e3c",
                color: "white", borderRadius: 3, padding: "2px 8px", fontSize: 13, fontWeight: 700
              }}>
                {product.rating || 4.5} <Star size={11} style={{ fill: "white", color: "white" }} />
              </div>
              <span style={{ fontSize: 13, color: "#878787" }}>
                {reviewCount.toLocaleString()} Ratings & {reviewsList?.length || 0} Reviews
              </span>
              {product.badge && (
                <span style={{ background: "#fffde7", color: "#f57f17", border: "1px solid #ffe082", borderRadius: 3, fontSize: 11, fontWeight: 700, padding: "1px 8px" }}>
                  {product.badge}
                </span>
              )}
            </div> 
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 26, fontWeight: 700, color: "#212121" }}>₹{product.price?.toLocaleString()}</span>
              {discount > 0 && (
                <>
                  <span style={{ fontSize: 15, color: "#878787", textDecoration: "line-through" }}>₹{originalPrice?.toLocaleString()}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#388e3c" }}>{discount}% off</span>
                </>
              )}
            </div>
            <div style={{ fontSize: 12, color: "#878787", marginBottom: 16 }}>+ ₹0 Delivery Charge</div>
 
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#212121", marginBottom: 10 }}>Available offers</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {availableOffers.slice(0, 3).map((offer, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#212121" }}>
                    <Tag size={14} style={{ color: "#388e3c", marginTop: 1, flexShrink: 0 }} />
                    <span>{offer}</span>
                  </div>
                ))}
              </div>
            </div> 
            {product.colors && (
              <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 16, borderTop: "1px solid #f0f0f0", paddingTop: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#212121", minWidth: 80 }}>Color</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {product.colors.map(c => (
                    <button
                      key={c.name}
                      onClick={() => setSelectedColor(c)}
                      title={c.name}
                      style={{
                        width: 36, height: 36, borderRadius: "50%", background: c.hex,
                        border: `3px solid ${selectedColor?.name === c.name ? "#2874f0" : "transparent"}`,
                        outline: `1px solid #e0e0e0`, outlineOffset: 2,
                        cursor: "pointer", padding: 0,
                      }}
                    />
                  ))}
                </div>
              </div>
            )} 
            {product.sizes && (
              <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 16, borderTop: "1px solid #f0f0f0", paddingTop: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#212121", minWidth: 80 }}>Storage</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {product.sizes.map(s => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      style={{
                        padding: "6px 16px", borderRadius: 3, fontSize: 13, fontWeight: 600, cursor: "pointer",
                        border: `1.5px solid ${selectedSize === s ? "#2874f0" : "#e0e0e0"}`,
                        color: selectedSize === s ? "#2874f0" : "#212121",
                        background: selectedSize === s ? "#e8f0fe" : "white",
                        transition: "all 0.15s",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
 
            <div style={{ marginBottom: 16, borderTop: "1px solid #f0f0f0", paddingTop: 16 }}>
              <div style={{ display: "flex", gap: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#212121", minWidth: 80, paddingTop: 2 }}>Highlights</span>
                <ul style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {specEntries.slice(0, 5).map(([k, v]) => (
                    <li key={k} style={{ fontSize: 13, color: "#212121" }}>
                      <span style={{ color: "#878787" }}>{k}: </span>{String(v)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {attrEntries.length > 0 && (
              <div style={{ marginBottom: 16, borderTop: "1px solid #f0f0f0", paddingTop: 16 }}>
                <div style={{ display: "flex", gap: 16 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#212121", minWidth: 80, paddingTop: 2 }}>Attributes</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {attrEntries.map(([k, v]) => (
                      <div key={`attr-${k}`} style={{ fontSize: 13, color: "#212121", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "#878787", minWidth: 90 }}>{k}:</span>
                        <span>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Delivery + Services */}
            <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#212121", minWidth: 80 }}>Services</span>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                  {[
                    { icon: RotateCcw, label: "7 Day Return", sub: "Change of mind applicable" },
                    { icon: Shield, label: "1 Year Warranty", sub: "Manufacturer warranty" },
                    { icon: Truck, label: "Free Delivery", sub: "On orders above ₹499" },
                  ].map(({ icon: Icon, label, sub }) => (
                    <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <Icon size={18} style={{ color: "#2874f0", marginTop: 1 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#212121" }}>{label}</div>
                        <div style={{ fontSize: 11, color: "#878787" }}>{sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seller */}
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#212121", minWidth: 80 }}>Seller</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, color: "#2874f0", fontWeight: 600 }}>{product.vendor || "RetailNet"}</span>
                  <span style={{ fontSize: 11, color: "#878787" }}>4.6 ★ | 10k+ Sales</span>
                </div>
              </div>
            </div>

          </div>
        </div>
 
        <div style={{ background: "white", borderRadius: 2, boxShadow: "0 1px 4px rgba(0,0,0,0.1)", overflow: "hidden" }}>
 
          <div style={{ display: "flex", borderBottom: "1px solid #e0e0e0" }}>
            {["Description", "Specification", "Seller"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, padding: "14px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer",
                  border: "none", borderBottom: `3px solid ${activeTab === tab ? "#2874f0" : "transparent"}`,
                  color: activeTab === tab ? "#2874f0" : "#878787",
                  background: "white", transition: "all 0.15s",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ padding: "20px 24px" }}>

            {activeTab === "Description" && (
              <p style={{ margin: 0, fontSize: 14, color: "#212121", lineHeight: 1.8, whiteSpace: "pre-line" }}>
                {description}
              </p>
            )}

            {activeTab === "Specification" && (
              <div style={{ borderRadius: 2, overflow: "hidden", border: "1px solid #e0e0e0" }}>
                {specEntries.length === 0 ? (
                  <p style={{ margin: 0, padding: 16, fontSize: 13, color: "#878787", textAlign: "center" }}>No specifications available.</p>
                ) : (
                  <>
                    {(showAllSpecs ? specEntries : specEntries.slice(0, 8)).map(([k, v], i) => (
                      <div key={k} style={{ display: "flex", borderBottom: "1px solid #f0f0f0", background: i % 2 === 0 ? "#fafafa" : "white" }}>
                        <div style={{ width: 180, minWidth: 180, padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "#878787", borderRight: "1px solid #f0f0f0" }}>{k}</div>
                        <div style={{ flex: 1, padding: "10px 16px", fontSize: 13, color: "#212121" }}>{String(v)}</div>
                      </div>
                    ))}
                    {specEntries.length > 8 && (
                      <button onClick={() => setShowAllSpecs(!showAllSpecs)}
                        style={{ width: "100%", padding: "12px 16px", fontSize: 13, color: "#2874f0", fontWeight: 700, background: "white", border: "none", borderTop: "1px solid #f0f0f0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        {showAllSpecs ? "Show less" : `View all ${specEntries.length} specifications`}
                        {showAllSpecs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === "Seller" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 16, background: "#fafafa", borderRadius: 4, border: "1px solid #e0e0e0" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 4, background: "#2874f0", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 22, fontWeight: 700 }}>
                    {(product.vendor || "S").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#212121" }}>{product.vendor || "Official Store"}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <Stars rating={4.6} size={11} />
                      <span style={{ fontSize: 12, color: "#878787" }}>4.6 (1.2k ratings) · Verified Seller</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                  {[{ label: "Total Sales", value: "10k+" }, { label: "Response Rate", value: "98%" }, { label: "Ship Speed", value: "Same Day" }].map(({ label, value }) => (
                    <div key={label} style={{ padding: "14px 16px", background: "#fafafa", border: "1px solid #e0e0e0", borderRadius: 4, textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#212121" }}>{value}</div>
                      <div style={{ fontSize: 12, color: "#878787", marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
 
        <div style={{ background: "white", borderRadius: 2, boxShadow: "0 1px 4px rgba(0,0,0,0.1)", padding: "24px" }}>

          <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: "#212121" }}>
            Ratings & Reviews
          </h2> 
          <div style={{ display: "flex", gap: 32, marginBottom: 24, paddingBottom: 24, borderBottom: "1px solid #f0f0f0", alignItems: "flex-start", flexWrap: "wrap" }}>
 
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 100 }}>
              <div style={{ fontSize: 48, fontWeight: 700, color: "#212121", lineHeight: 1 }}>{product.rating || 4.5}</div>
              <Stars rating={product.rating || 4.5} size={18} />
              <div style={{ fontSize: 12, color: "#878787", marginTop: 4 }}>{reviewCount.toLocaleString()} ratings</div>
            </div>
 
            <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 8 }}>
              {[5, 4, 3, 2, 1].map(star => {
                const count = ratingBreakdown?.[star] || 0;
                const pct = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
                return (
                  <div key={star} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 13, color: "#212121", minWidth: 14, textAlign: "right" }}>{star}</span>
                    <Star size={11} style={{ fill: "#388e3c", color: "#388e3c" }} />
                    <div style={{ flex: 1, height: 8, background: "#e0e0e0", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 4, transition: "width 0.5s ease",
                        width: `${pct}%`,
                        background: star >= 4 ? "#388e3c" : star === 3 ? "#ff9f00" : "#ff6161",
                      }} />
                    </div>
                    <span style={{ fontSize: 12, color: "#878787", minWidth: 36, textAlign: "right" }}>{count}%</span>
                  </div>
                );
              })}
            </div>
 
            {images && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 12, color: "#878787", fontWeight: 600 }}>Photos</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {images.slice(0, 4).map((img, i) => (
                    <div key={i} style={{ width: 60, height: 60, borderRadius: 4, overflow: "hidden", border: "1px solid #e0e0e0" }}>
                      <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div> 
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {["All Reviews", "5 Star", "4 Star", "3 Star", "With Photos"].map(f => (
              <button
                key={f}
                onClick={() => setReviewFilter(f)}
                style={{
                  padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${reviewFilter === f ? "#2874f0" : "#e0e0e0"}`,
                  background: reviewFilter === f ? "#2874f0" : "white",
                  color: reviewFilter === f ? "white" : "#878787",
                  transition: "all 0.15s",
                }}
              >
                {f}
              </button>
            ))}
          </div> 
          {filteredReviews.length === 0 ? (
            <p style={{ textAlign: "center", color: "#878787", fontSize: 14, padding: "24px 0" }}>No reviews match this filter.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {filteredReviews.map((review, idx) => (
                <div key={review.id} style={{ padding: "20px 0", borderBottom: idx < filteredReviews.length - 1 ? "1px solid #f0f0f0" : "none" }}>
 
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      background: `hsl(${(review.id * 73) % 360}, 55%, 50%)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontSize: 14, fontWeight: 700,
                    }}>
                      {review.name?.charAt(0) || "U"}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#212121" }}>{review.name}</span>
                        {review.verified && (
                          <span style={{ fontSize: 11, color: "#388e3c", fontWeight: 600 }}>✓ Verified Purchase</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "#878787" }}>{review.date}</div>
                    </div>
                  </div> 
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      background: review.rating >= 4 ? "#388e3c" : review.rating === 3 ? "#ff9f00" : "#ff6161",
                      color: "white", borderRadius: 3, padding: "2px 8px", fontSize: 13, fontWeight: 700
                    }}>
                      {review.rating} <Star size={10} style={{ fill: "white", color: "white" }} />
                    </div>
                    {review.title && (
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#212121" }}>{review.title}</span>
                    )}
                  </div>
 
                  <p style={{ margin: "0 0 12px", fontSize: 13, color: "#212121", lineHeight: 1.7 }}>
                    {review.comment}
                  </p> 
                  {review.images?.length > 0 && (
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      {review.images.map((img, i) => (
                        <div key={i} style={{ width: 64, height: 64, borderRadius: 4, overflow: "hidden", border: "1px solid #e0e0e0" }}>
                          <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      ))}
                    </div>
                  )}
 
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: 13, color: "#878787" }}>Helpful?</span>
                    <button
                      onClick={() => setHelpfulClicked(prev => ({ ...prev, [review.id]: !prev[review.id] }))}
                      style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "4px 14px",
                        borderRadius: 3, fontSize: 13, cursor: "pointer",
                        border: `1px solid ${helpfulClicked[review.id] ? "#388e3c" : "#e0e0e0"}`,
                        color: helpfulClicked[review.id] ? "#388e3c" : "#878787",
                        background: helpfulClicked[review.id] ? "#f1f8f5" : "white",
                        fontWeight: helpfulClicked[review.id] ? 700 : 400,
                        transition: "all 0.15s",
                      }}
                    >
                      <ThumbsUp size={13} />
                      Helpful ({(review.helpful || 0) + (helpfulClicked[review.id] ? 1 : 0)})
                    </button>
                    <button style={{ fontSize: 13, color: "#878787", background: "none", border: "none", cursor: "pointer" }}>
                      Report
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
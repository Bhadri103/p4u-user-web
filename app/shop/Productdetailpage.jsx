"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Star, Heart, Minus, Plus, ChevronLeft,
  ChevronRight, Shield, Truck, RotateCcw, CheckCircle,
  ThumbsUp, ChevronDown, ChevronUp, Tag, X, ImagePlus, Loader2
} from "lucide-react";
import { useCart } from "@/providers/CartContext";
import { useAuth } from "@/providers/AuthContext";
import { buildProductGalleryImages, resolveMediaUrl } from "@/lib/media";
import { profileApi } from "@/lib/api/profile";
import PurchaseActionButton from "@/components/shop/PurchaseActionButton";
import { commerceApi } from "@/lib/api/commerce";
import { classifiedApi } from "@/lib/api/classified";

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

function buildVariationAttributeOptions(variations) {
  if (!Array.isArray(variations) || !variations.length) return {};
  const map = {};
  for (const v of variations) {
    if (v.isActive === false) continue;
    const attrs = v.attributes || {};
    for (const [k, val] of Object.entries(attrs)) {
      if (!map[k]) map[k] = new Set();
      map[k].add(String(val));
    }
  }
  return Object.fromEntries(Object.entries(map).map(([k, set]) => [k, [...set]]));
}

function splitLabelAndHex(value) {
  const s = String(value || "").trim();
  const m = s.match(/^(.*?)(#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}))$/);
  if (!m) return { label: s, hex: null };
  const label = String(m[1] || "").trim();
  return { label: label || s, hex: m[2] };
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
    .filter((a) => /color|colour|shade/i.test(String(a.name || "")))
    .map((a) => ({ name: a.label, hex: a.hex || "#D7E7F5" }));
  const dynamicSizes =
    parseAttributeOptions(metadataAttrs)
      .filter((a) => String(a.name || "").toLowerCase() === "size")
      .map((a) => a.label)
      .filter(Boolean) || [];

  const description = (() => {
    const long = String(p.longDescription || "").trim();
    const short = String(p.shortDescription || "").trim();
    const base = String(p.description || "").trim();
    if (long) return long;
    if (short) return short;
    if (base) return base;
    return (
      name + " is a top-quality product available at the best price of Rs." + price.toLocaleString() + "." +
      (originalPrice > price
        ? " You save Rs." + (originalPrice - price).toLocaleString() +
        " (" + Math.round((1 - price / originalPrice) * 100) + "% off) today."
        : "") +
      " This product is verified by our sellers and comes with a 7-day hassle-free return policy. Fast delivery available." +
      " Trusted by " + (p.reviews || "hundreds of") + " happy customers with a rating of " + (p.rating || 4.5) + "/5." +
      (p.badge ? ' Currently featured as "' + p.badge + '".' : "")
    );
  })();

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
  const [selectedVariationAttrs, setSelectedVariationAttrs] = useState({});
  const [variationError, setVariationError] = useState("");

  const hasVariations = Array.isArray(product.variations) && product.variations.length > 0;
  const variationAttrOptions = useMemo(
    () => buildVariationAttributeOptions(product.variations),
    [product.variations],
  );

  useEffect(() => {
    if (!hasVariations) {
      setSelectedVariationAttrs({});
      return;
    }
    const initial = {};
    for (const [k, vals] of Object.entries(variationAttrOptions)) {
      if (vals?.length) initial[k] = vals[0];
    }
    setSelectedVariationAttrs(initial);
    setVariationError("");
  }, [product.id, hasVariations, variationAttrOptions]);

  const matchedVariation = useMemo(() => {
    if (!hasVariations) return null;
    const keys = Object.keys(variationAttrOptions);
    if (!keys.length) return null;
    if (!keys.every((k) => selectedVariationAttrs[k])) return null;
    return (
      product.variations.find((v) => {
        if (v.isActive === false) return false;
        const attrs = v.attributes || {};
        return keys.every((k) => String(attrs[k] || "") === String(selectedVariationAttrs[k] || ""));
      }) || null
    );
  }, [hasVariations, product.variations, selectedVariationAttrs, variationAttrOptions]);

  const displayPrice = matchedVariation
    ? Number(matchedVariation.finalPrice || matchedVariation.sellPrice || 0)
    : product.price;
  const displayOriginal = matchedVariation
    ? Number(matchedVariation.sellPrice || displayPrice)
    : product.originalPrice || product.price;
  const [qty, setQty] = useState(1);
  const [liked, setLiked] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("Description");
  const [helpfulClicked, setHelpfulClicked] = useState({});
  const [reviewFilter, setReviewFilter] = useState("All Reviews");
  const [addedToCart, setAddedToCart] = useState(false);
  const [showAllSpecs, setShowAllSpecs] = useState(false);
  const [localReviews, setLocalReviews] = useState(product.reviewsList || []);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewFiles, setReviewFiles] = useState([]);
  const [reviewPreviews, setReviewPreviews] = useState([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");

  useEffect(() => {
    setLocalReviews(product.reviewsList || []);
  }, [product.reviewsList]);

  useEffect(() => () => reviewPreviews.forEach((url) => URL.revokeObjectURL(url)), [reviewPreviews]);

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

  const { specs, description, ratingBreakdown, images, availableOffers } = product;
  const reviewsList = localReviews;
  const reviewPhotos = reviewsList.flatMap((review) => Array.isArray(review.images) ? review.images : []).filter(Boolean);
  const discount = displayOriginal > displayPrice ? Math.round((1 - displayPrice / displayOriginal) * 100) : 0;
  const visibleBreakdown = reviewsList.length
    ? reviewsList.reduce((counts, review) => ({ ...counts, [Math.max(1, Math.min(5, Math.round(review.rating)))]: (counts[Math.max(1, Math.min(5, Math.round(review.rating)))] || 0) + 1 }), {})
    : ratingBreakdown;
  const totalRatings = Object.values(visibleBreakdown || {}).reduce((a, b) => a + b, 0);
  const reviewCount = Math.max(Number(product.reviews || 0), reviewsList.length);
  const reviewSectionRating = reviewsList.length
    ? reviewsList.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviewsList.length
    : (product.rating || 4.5);

  const filteredReviews = useMemo(() => {
    if (!reviewsList) return [];
    if (reviewFilter === "All Reviews") return reviewsList;
    if (reviewFilter === "With Photos") return reviewsList.filter(r => r.images?.length > 0);
    const star = parseInt(reviewFilter);
    return reviewsList.filter(r => Math.round(r.rating) === star);
  }, [reviewsList, reviewFilter]);

  function openReviewModal() {
    if (!isLoggedIn) {
      window.dispatchEvent(new Event("p4u-open-auth"));
      return;
    }
    setReviewError("");
    setReviewOpen(true);
  }

  function selectReviewImages(event) {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/")).slice(0, 6);
    reviewPreviews.forEach((url) => URL.revokeObjectURL(url));
    setReviewFiles(files);
    setReviewPreviews(files.map((file) => URL.createObjectURL(file)));
  }

  function removeReviewImage(index) {
    const removed = reviewPreviews[index];
    if (removed) URL.revokeObjectURL(removed);
    setReviewFiles((files) => files.filter((_, fileIndex) => fileIndex !== index));
    setReviewPreviews((urls) => urls.filter((_, urlIndex) => urlIndex !== index));
  }

  async function submitReview(event) {
    event.preventDefault();
    if (!reviewComment.trim()) {
      setReviewError("Please write your review.");
      return;
    }
    setReviewSubmitting(true);
    setReviewError("");
    try {
      const imageUrls = reviewFiles.length ? await classifiedApi.uploadImages(reviewFiles) : [];
      const created = await commerceApi.createReview({
        targetType: "product",
        targetId: product.id,
        rating: reviewRating,
        title: reviewTitle.trim() || undefined,
        comment: reviewComment.trim(),
        imageUrls,
      });
      const next = {
        id: created?.id || `review-${Date.now()}`,
        name: "You",
        verified: true,
        rating: reviewRating,
        title: reviewTitle.trim(),
        comment: reviewComment.trim(),
        date: "Just now",
        helpful: 0,
        images: imageUrls,
      };
      setLocalReviews((rows) => [next, ...rows]);
      setReviewOpen(false);
      setReviewTitle("");
      setReviewComment("");
      setReviewFiles([]);
      reviewPreviews.forEach((url) => URL.revokeObjectURL(url));
      setReviewPreviews([]);
      setReviewFilter("All Reviews");
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "Could not submit your review.");
    } finally {
      setReviewSubmitting(false);
    }
  }

  function buildCartPayload() {
    if (hasVariations && !matchedVariation) {
      setVariationError("Please select all options before adding to cart.");
      return null;
    }
    if (matchedVariation && Number(matchedVariation.quantity) <= 0) {
      setVariationError("This variation is out of stock.");
      return null;
    }
    setVariationError("");
    const variationImage = matchedVariation?.thumbnailUrl
      ? resolveMediaUrl(matchedVariation.thumbnailUrl) || matchedVariation.thumbnailUrl
      : null;
    const attrLabel = matchedVariation
      ? Object.entries(matchedVariation.attributes || {})
          .map(([k, v]) => {
            const { label } = splitLabelAndHex(String(v));
            return `${k}: ${label}`;
          })
          .join(", ")
      : selectedColor?.name || product.color || "";
    return {
      id: product.id,
      productId: product.id,
      variationId: matchedVariation?.id || null,
      name: product.name,
      price: displayPrice,
      originalPrice: displayOriginal,
      imageUrl: variationImage || images?.[0] || "",
      image: variationImage || product.image || "",
      vendor: product.vendor || "Seller",
      vendorId: product.vendorId || "",
      color: attrLabel,
      delivery: product.delivery || "Standard delivery",
      qty,
    };
  }

  function handleAddToCart() {
    const payload = buildCartPayload();
    if (!payload) return;
    addToCart(payload);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2500);
  }

  async function handleBuyNow() {
    const buyNowItem = buildCartPayload();
    if (!buyNowItem) return;
    if (!isLoggedIn) {
      window.dispatchEvent(new Event("p4u-open-auth"));
      return;
    }
    try {
      await clearCart();
    } catch {
      // Continue — buy-now should still replace the local cart.
    }
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
          padding: "10px 20px", borderRadius: 4, background: "#89CFF0",
          color: "white", fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          whiteSpace: "nowrap",
        }}>
          <CheckCircle size={16} style={{ fill: "white", color: "white" }} />
          Item added to cart!
        </div>
      )}

       <div style={{ background: "white", borderBottom: "1px solid #D7E7F5", padding: "8px 16px" }}>
        <div style={{ maxWidth: 1600, margin: "0 auto", display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#5D757A" }}>
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: "#89CFF0", fontSize: 12, fontWeight: 600, padding: 0 }}>
            <ChevronLeft size={14} /> Back
          </button>
          <span>/</span>
          <span>{product.category || "Products"}</span>
          <span>/</span>
          <span style={{ color: "#202124", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "40vw" }}>
            {product.name}
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
    <div className="product-detail-grid" style={{ background: "white", border: "1px solid #D7E7F5" }}>

           <div className="product-gallery-column" style={{ display: "flex", gap: 0, padding: "24px 16px 24px 24px", borderRight: "1px solid #F7FBFF" }}>

 
            {images && images.length > 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginRight: 12, paddingTop: 4 }}>
                {images.slice(0, 6).map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setMainImg(i)}
                    style={{
                      width: 64, height: 64, borderRadius: 4, overflow: "hidden", padding: 0,
                      background: "white", cursor: "pointer", flexShrink: 0,
                      border: `2px solid ${mainImg === i ? "#89CFF0" : "#D7E7F5"}`,
                      boxShadow: mainImg === i ? "0 0 0 1px #89CFF0" : "none",
                    }}
                  >
                    <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }} />
                  </button>
                ))}
              </div>
            )} 
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, alignItems: "center", position: "relative" }}>
              <div className="product-main-image" style={{ position: "relative", width: "100%", height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {images ? (
                  <img src={images[mainImg]} alt={product.name}
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                ) : (
                  <img src={resolveMediaUrl(product.image) || product.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80"}
                    alt={product.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                )} 
                {images && images.length > 1 && (
                  <>
                    <button onClick={() => setMainImg(i => (i - 1 + images.length) % images.length)}
                      style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", background: "white", border: "1px solid #D7E7F5", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}>
                      <ChevronLeft size={14} color="#202124" />
                    </button>
                    <button onClick={() => setMainImg(i => (i + 1) % images.length)}
                      style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", background: "white", border: "1px solid #D7E7F5", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}>
                      <ChevronRight size={14} color="#202124" />
                    </button>
                  </>
                )} 
                <button onClick={toggleWishlist}
                  disabled={wishlistBusy}
                  style={{ position: "absolute", top: 8, right: 8, background: "white", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}>
                  <Heart size={15} style={{ fill: liked ? "#ff3c3c" : "none", color: liked ? "#ff3c3c" : "#5D757A" }} />
                </button>
              </div>
 
              {images && images.length > 1 && (
                <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                  {images.slice(0, 6).map((_, i) => (
                    <button key={i} onClick={() => setMainImg(i)}
                      style={{ width: i === mainImg ? 20 : 8, height: 8, borderRadius: 4, border: "none", cursor: "pointer", transition: "width 0.2s", background: i === mainImg ? "#89CFF0" : "#d0d0d0", padding: 0 }} />
                  ))}
                </div>
              )}

            </div>
          </div> 
          <div className="product-info-column" style={{ flex: 1, padding: "24px 28px", minWidth: 0 }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 500, color: "#202124", lineHeight: 1.32 }}>
              {product.name}
            </h1>
            {product.shortDescription ? (
              <p style={{ margin: "0 0 12px", fontSize: 14, color: "#5D757A", lineHeight: 1.5 }}>
                {product.shortDescription}
              </p>
            ) : null}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#202124", fontSize: 13 }}>
                <b>{product.rating || 4.5}</b> <Star size={15} style={{ fill: "#B8E3F7", color: "#B8E3F7" }} />
              </div>
              <span style={{ fontSize: 13, color: "#5D757A" }}>
                {reviewCount.toLocaleString()} Ratings & {reviewsList?.length || 0} Reviews
              </span>
              {product.badge && (
                <span style={{ background: "#fffde7", color: "#f57f17", border: "1px solid #ffe082", borderRadius: 3, fontSize: 11, fontWeight: 600, padding: "1px 8px" }}>
                  {product.badge}
                </span>
              )}
            </div> 
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 26, fontWeight: 600, color: "#202124" }}>₹{displayPrice?.toLocaleString()}</span>
              {discount > 0 && (
                <>
                  <span style={{ fontSize: 15, color: "#5D757A", textDecoration: "line-through" }}>₹{displayOriginal?.toLocaleString()}</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#b12704" }}>{discount}% off</span>
                </>
              )}
            </div>
            {variationError ? (
              <div style={{ fontSize: 12, color: "#d32f2f", marginBottom: 8 }}>{variationError}</div>
            ) : null}
            <div style={{ fontSize: 13, color: "#5D757A", marginBottom: 16 }}>Delivery charges and availability are calculated from your saved address.</div>
 
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#202124", marginBottom: 10 }}>Available offers</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {availableOffers.slice(0, 3).map((offer, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#202124" }}>
                    <Tag size={14} style={{ color: "#B8E3F7", marginTop: 1, flexShrink: 0 }} />
                    <span>{offer}</span>
                  </div>
                ))}
              </div>
            </div> 
            {hasVariations ? (
              Object.entries(variationAttrOptions).map(([attrName, values]) => (
                <div
                  key={attrName}
                  style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 16, borderTop: "1px solid #F7FBFF", paddingTop: 16 }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#202124", minWidth: 80 }}>{attrName}</span>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {values.map((opt) => {
                      const { label, hex } = splitLabelAndHex(opt);
                      const active = selectedVariationAttrs[attrName] === opt;
                      return (
                        <button
                          key={`${attrName}-${opt}`}
                          type="button"
                          onClick={() => {
                            setSelectedVariationAttrs((prev) => ({ ...prev, [attrName]: opt }));
                            setVariationError("");
                          }}
                          style={{
                            padding: hex ? "4px" : "6px 16px",
                            borderRadius: hex ? "50%" : 3,
                            width: hex ? 36 : undefined,
                            height: hex ? 36 : undefined,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            border: hex
                              ? `3px solid ${active ? "#89CFF0" : "transparent"}`
                              : `1.5px solid ${active ? "#89CFF0" : "#D7E7F5"}`,
                            outline: hex ? "1px solid #D7E7F5" : undefined,
                            outlineOffset: hex ? 2 : undefined,
                            color: active ? "#89CFF0" : "#202124",
                            background: hex ? hex : active ? "#EAF4FF" : "white",
                          }}
                          title={label || opt}
                        >
                          {!hex ? (label || opt) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : null}
            {!hasVariations && product.colors && (
              <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 16, borderTop: "1px solid #F7FBFF", paddingTop: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#202124", minWidth: 80 }}>Color</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {product.colors.map(c => (
                    <button
                      key={c.name}
                      onClick={() => setSelectedColor(c)}
                      title={c.name}
                      style={{
                        width: 36, height: 36, borderRadius: "50%", background: c.hex,
                        border: `3px solid ${selectedColor?.name === c.name ? "#89CFF0" : "transparent"}`,
                        outline: `1px solid #D7E7F5`, outlineOffset: 2,
                        cursor: "pointer", padding: 0,
                      }}
                    />
                  ))}
                </div>
              </div>
            )} 
            {!hasVariations && product.sizes && (
              <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 16, borderTop: "1px solid #F7FBFF", paddingTop: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#202124", minWidth: 80 }}>Storage</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {product.sizes.map(s => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      style={{
                        padding: "6px 16px", borderRadius: 3, fontSize: 13, fontWeight: 600, cursor: "pointer",
                        border: `1.5px solid ${selectedSize === s ? "#89CFF0" : "#D7E7F5"}`,
                        color: selectedSize === s ? "#89CFF0" : "#202124",
                        background: selectedSize === s ? "#EAF4FF" : "white",
                        transition: "all 0.15s",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
 
            <div style={{ marginBottom: 16, borderTop: "1px solid #F7FBFF", paddingTop: 16 }}>
              <div style={{ display: "flex", gap: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#202124", minWidth: 80, paddingTop: 2 }}>Highlights</span>
                <ul style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {specEntries.slice(0, 5).map(([k, v]) => (
                    <li key={k} style={{ fontSize: 13, color: "#202124" }}>
                      <span style={{ color: "#5D757A" }}>{k}: </span>{String(v)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {attrEntries.length > 0 && (
              <div style={{ marginBottom: 16, borderTop: "1px solid #F7FBFF", paddingTop: 16 }}>
                <div style={{ display: "flex", gap: 16 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#202124", minWidth: 80, paddingTop: 2 }}>Attributes</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {attrEntries.map(([k, v]) => (
                      <div key={`attr-${k}`} style={{ fontSize: 13, color: "#202124", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "#5D757A", minWidth: 90 }}>{k}:</span>
                        <span>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Delivery + Services */}
            <div style={{ borderTop: "1px solid #F7FBFF", paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#202124", minWidth: 80 }}>Services</span>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                  {[
                    { icon: RotateCcw, label: "7 Day Return", sub: "Change of mind applicable" },
                    { icon: Shield, label: "1 Year Warranty", sub: "Manufacturer warranty" },
                    { icon: Truck, label: "Free Delivery", sub: "On orders above ₹499" },
                  ].map(({ icon: Icon, label, sub }) => (
                    <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <Icon size={18} style={{ color: "#89CFF0", marginTop: 1 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#202124" }}>{label}</div>
                        <div style={{ fontSize: 11, color: "#5D757A" }}>{sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seller */}
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#202124", minWidth: 80 }}>Seller</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, color: "#89CFF0", fontWeight: 600 }}>{product.vendor || "RetailNet"}</span>
                  <span style={{ fontSize: 11, color: "#5D757A" }}>4.6 ★ | 10k+ Sales</span>
                </div>
              </div>
            </div>

          </div>
          <aside className="product-purchase-panel">
            <div className="product-purchase-price">₹{displayPrice?.toLocaleString("en-IN")}</div>
            <div className="product-purchase-saving">{discount > 0 ? `Save ${discount}% · ` : ""}Inclusive of all taxes</div>
            <p className="product-delivery-copy"><b>FREE delivery</b> details will be confirmed using your saved address.</p>
            <p className="product-stock-copy">In stock</p>
            <label className="product-quantity-label">Quantity
              <select value={qty} onChange={(event) => setQty(Number(event.target.value))}>
                {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <PurchaseActionButton action="cart" className="w-full" onClick={handleAddToCart} />
            <PurchaseActionButton action="buy" className="w-full" onClick={handleBuyNow} />
            <dl className="product-purchase-meta">
              <div><dt>Ships from</dt><dd>Planext4u partner</dd></div>
              <div><dt>Sold by</dt><dd>{product.vendor || "Verified seller"}</dd></div>
              <div><dt>Returns</dt><dd>7-day eligible</dd></div>
              <div><dt>Payment</dt><dd>Secure transaction</dd></div>
            </dl>
          </aside>
        </div>
 
        <div style={{ background: "white", borderRadius: 2, boxShadow: "0 1px 4px rgba(0,0,0,0.1)", overflow: "hidden" }}>
 
          <div style={{ display: "flex", borderBottom: "1px solid #D7E7F5" }}>
            {["Description", "Specification", "Seller"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, padding: "14px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer",
                  border: "none", borderBottom: `3px solid ${activeTab === tab ? "#89CFF0" : "transparent"}`,
                  color: activeTab === tab ? "#89CFF0" : "#5D757A",
                  background: "white", transition: "all 0.15s",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ padding: "20px 24px" }}>

            {activeTab === "Description" && (
              <p style={{ margin: 0, fontSize: 14, color: "#202124", lineHeight: 1.8, whiteSpace: "pre-line" }}>
                {description}
              </p>
            )}

            {activeTab === "Specification" && (
              <div style={{ borderRadius: 2, overflow: "hidden", border: "1px solid #D7E7F5" }}>
                {specEntries.length === 0 ? (
                  <p style={{ margin: 0, padding: 16, fontSize: 13, color: "#5D757A", textAlign: "center" }}>No specifications available.</p>
                ) : (
                  <>
                    {(showAllSpecs ? specEntries : specEntries.slice(0, 8)).map(([k, v], i) => (
                      <div key={k} style={{ display: "flex", borderBottom: "1px solid #F7FBFF", background: i % 2 === 0 ? "#F7FBFF" : "white" }}>
                        <div style={{ width: 180, minWidth: 180, padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "#5D757A", borderRight: "1px solid #F7FBFF" }}>{k}</div>
                        <div style={{ flex: 1, padding: "10px 16px", fontSize: 13, color: "#202124" }}>{String(v)}</div>
                      </div>
                    ))}
                    {specEntries.length > 8 && (
                      <button onClick={() => setShowAllSpecs(!showAllSpecs)}
                        style={{ width: "100%", padding: "12px 16px", fontSize: 13, color: "#89CFF0", fontWeight: 600, background: "white", border: "none", borderTop: "1px solid #F7FBFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
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
                <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 16, background: "#FFFFFF", borderRadius: 4, border: "1px solid #D7E7F5" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 4, background: "#89CFF0", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 22, fontWeight: 600 }}>
                    {(product.vendor || "S").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#202124" }}>{product.vendor || "Official Store"}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <Stars rating={4.6} size={11} />
                      <span style={{ fontSize: 12, color: "#5D757A" }}>4.6 (1.2k ratings) · Verified Seller</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                  {[{ label: "Total Sales", value: "10k+" }, { label: "Response Rate", value: "98%" }, { label: "Ship Speed", value: "Same Day" }].map(({ label, value }) => (
                    <div key={label} style={{ padding: "14px 16px", background: "#FFFFFF", border: "1px solid #D7E7F5", borderRadius: 4, textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 600, color: "#202124" }}>{value}</div>
                      <div style={{ fontSize: 12, color: "#5D757A", marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
 
        <div style={{ background: "white", borderRadius: 2, boxShadow: "0 1px 4px rgba(0,0,0,0.1)", padding: "24px" }}>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[#202124]">Ratings & Reviews</h2>
              <p className="mt-1 text-sm text-[#5D757A]">See verified customer feedback or share your experience.</p>
            </div>
            <button type="button" onClick={openReviewModal} className="rounded-xl bg-[#89CFF0] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#89CFF0] hover:shadow-md">
              Add Review
            </button>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-[#D7E7F5] bg-[#F8FBFF] p-4 sm:p-5">
          <div style={{ display: "flex", gap: 32, marginBottom: 24, paddingBottom: 24, borderBottom: "1px solid #F7FBFF", alignItems: "flex-start", flexWrap: "wrap" }}>
 
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 100 }}>
              <div style={{ fontSize: 48, fontWeight: 600, color: "#202124", lineHeight: 1 }}>{Number(reviewSectionRating).toFixed(1)}</div>
              <Stars rating={reviewSectionRating} size={18} />
              <div style={{ fontSize: 12, color: "#5D757A", marginTop: 4 }}>{reviewCount.toLocaleString()} ratings</div>
            </div>
 
            <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 8 }}>
              {[5, 4, 3, 2, 1].map(star => {
                const count = visibleBreakdown?.[star] || 0;
                const pct = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
                return (
                  <div key={star} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 13, color: "#202124", minWidth: 14, textAlign: "right" }}>{star}</span>
                    <Star size={11} style={{ fill: "#89CFF0", color: "#89CFF0" }} />
                    <div style={{ flex: 1, height: 8, background: "#D7E7F5", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 4, transition: "width 0.5s ease",
                        width: `${pct}%`,
                        background: star >= 4 ? "#89CFF0" : star === 3 ? "#B8E3F7" : "#ff6161",
                      }} />
                    </div>
                    <span style={{ fontSize: 12, color: "#5D757A", minWidth: 36, textAlign: "right" }}>{Math.round(pct)}%</span>
                  </div>
                );
              })}
            </div>
 
            {reviewPhotos.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 12, color: "#5D757A", fontWeight: 600 }}>Photos</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {reviewPhotos.slice(0, 4).map((img, i) => (
                    <div key={i} style={{ width: 60, height: 60, borderRadius: 4, overflow: "hidden", border: "1px solid #D7E7F5" }}>
                      <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div> 
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["All Reviews", "5 Star", "4 Star", "3 Star", "With Photos"].map(f => (
              <button
                key={f}
                onClick={() => setReviewFilter(f)}
                style={{
                  padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${reviewFilter === f ? "#89CFF0" : "#D7E7F5"}`,
                  background: reviewFilter === f ? "#89CFF0" : "white",
                  color: reviewFilter === f ? "white" : "#5D757A",
                  transition: "all 0.15s",
                }}
              >
                {f}
              </button>
            ))}
          </div>
          </section>
          <section className="min-w-0 rounded-2xl border border-[#D7E7F5] bg-white p-4 sm:p-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-[#202124]">Customer reviews</h3>
              <span className="rounded-full bg-[#EAF4FF] px-3 py-1 text-xs font-semibold text-[#89CFF0]">{filteredReviews.length} shown</span>
            </div>
          {filteredReviews.length === 0 ? (
            <p style={{ textAlign: "center", color: "#5D757A", fontSize: 14, padding: "24px 0" }}>No reviews match this filter.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {filteredReviews.map((review, idx) => (
                <div key={review.id} style={{ padding: "20px 0", borderBottom: idx < filteredReviews.length - 1 ? "1px solid #F7FBFF" : "none" }}>
 
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      background: "#89CFF0",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontSize: 14, fontWeight: 600,
                    }}>
                      {review.name?.charAt(0) || "U"}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#202124" }}>{review.name}</span>
                        {review.verified && (
                          <span style={{ fontSize: 11, color: "#89CFF0", fontWeight: 600 }}>✓ Verified Purchase</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "#5D757A" }}>{review.date}</div>
                    </div>
                  </div> 
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      background: review.rating >= 4 ? "#89CFF0" : review.rating === 3 ? "#B8E3F7" : "#ff6161",
                      color: "white", borderRadius: 3, padding: "2px 8px", fontSize: 13, fontWeight: 600
                    }}>
                      {review.rating} <Star size={10} style={{ fill: "white", color: "white" }} />
                    </div>
                    {review.title && (
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#202124" }}>{review.title}</span>
                    )}
                  </div>
 
                  <p style={{ margin: "0 0 12px", fontSize: 13, color: "#202124", lineHeight: 1.7 }}>
                    {review.comment}
                  </p> 
                  {review.images?.length > 0 && (
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      {review.images.map((img, i) => (
                        <div key={i} style={{ width: 64, height: 64, borderRadius: 4, overflow: "hidden", border: "1px solid #D7E7F5" }}>
                          <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      ))}
                    </div>
                  )}
 
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: 13, color: "#5D757A" }}>Helpful?</span>
                    <button
                      onClick={() => setHelpfulClicked(prev => ({ ...prev, [review.id]: !prev[review.id] }))}
                      style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "4px 14px",
                        borderRadius: 3, fontSize: 13, cursor: "pointer",
                        border: `1px solid ${helpfulClicked[review.id] ? "#89CFF0" : "#D7E7F5"}`,
                        color: helpfulClicked[review.id] ? "#89CFF0" : "#5D757A",
                        background: helpfulClicked[review.id] ? "#f1f8f5" : "white",
                        fontWeight: helpfulClicked[review.id] ? 700 : 400,
                        transition: "all 0.15s",
                      }}
                    >
                      <ThumbsUp size={13} />
                      Helpful ({(review.helpful || 0) + (helpfulClicked[review.id] ? 1 : 0)})
                    </button>
                    <button style={{ fontSize: 13, color: "#5D757A", background: "none", border: "none", cursor: "pointer" }}>
                      Report
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          </section>
          </div>
        </div>

        {reviewOpen && (
          <div className="fixed inset-0 z-[1400] flex items-end justify-center bg-neutral-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={() => !reviewSubmitting && setReviewOpen(false)}>
            <form onSubmit={submitReview} onMouseDown={(event) => event.stopPropagation()} className="max-h-[94dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div><h2 className="text-2xl font-semibold text-[#202124]">Add your review</h2><p className="mt-1 text-sm text-[#5D757A]">Photos are optional. You can upload up to 6 images.</p></div>
                <button type="button" disabled={reviewSubmitting} onClick={() => setReviewOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"><X className="h-5 w-5" /></button>
              </div>

              <fieldset className="mt-6">
                <legend className="text-sm font-semibold text-[#202124]">Your rating *</legend>
                <div className="mt-2 flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => <button key={star} type="button" onClick={() => setReviewRating(star)} aria-label={`${star} star${star > 1 ? "s" : ""}`} className="rounded-lg p-1 transition hover:scale-110"><Star className={`h-8 w-8 ${star <= reviewRating ? "fill-amber-400 text-amber-400" : "fill-slate-100 text-slate-300"}`} /></button>)}
                </div>
              </fieldset>

              <label className="mt-5 block text-sm font-semibold text-[#202124]">Review title <span className="font-normal text-[#7A879B]">(optional)</span><input value={reviewTitle} onChange={(event) => setReviewTitle(event.target.value)} maxLength={100} placeholder="Summarize your experience" className="mt-2 h-12 w-full rounded-xl border border-[#D7E7F5] px-4 font-normal outline-none focus:border-[#89CFF0]" /></label>
              <label className="mt-4 block text-sm font-semibold text-[#202124]">Your review *<textarea required value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} maxLength={2000} rows={5} placeholder="What did you like or dislike about this product?" className="mt-2 w-full resize-y rounded-xl border border-[#D7E7F5] p-4 font-normal outline-none focus:border-[#89CFF0]" /></label>

              <div className="mt-4">
                <p className="text-sm font-semibold text-[#202124]">Add photos <span className="font-normal text-[#7A879B]">(optional)</span></p>
                <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[#B9D4EA] bg-[#F8FBFF] px-4 py-5 text-sm font-semibold text-[#89CFF0] transition hover:border-[#89CFF0] hover:bg-[#EAF4FF]"><ImagePlus className="h-5 w-5" />Choose images<input type="file" accept="image/*" multiple className="hidden" onChange={selectReviewImages} /></label>
                {reviewPreviews.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">{reviewPreviews.map((url, index) => <div key={url} className="relative aspect-square overflow-hidden rounded-xl border border-[#D7E7F5]"><img src={url} alt={`Review upload ${index + 1}`} className="h-full w-full object-cover" /><button type="button" onClick={() => removeReviewImage(index)} aria-label={`Remove image ${index + 1}`} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-950/75 text-white"><X className="h-3.5 w-3.5" /></button></div>)}</div>}
              </div>

              {reviewError && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{reviewError}</p>}
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" disabled={reviewSubmitting} onClick={() => setReviewOpen(false)} className="rounded-xl border border-[#D7E7F5] px-5 py-3 font-semibold text-[#5D687A]">Cancel</button><button disabled={reviewSubmitting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#89CFF0] px-6 py-3 font-semibold text-white disabled:opacity-60">{reviewSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}{reviewSubmitting ? "Submitting…" : "Submit Review"}</button></div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}

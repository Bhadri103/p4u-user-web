"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Eye, Pencil } from "lucide-react";
import AuthGuard from "@/providers/AuthGuard";
import { classifiedApi, type ClassifiedCategory } from "@/lib/api/classified";
import { profileApi } from "@/lib/api/profile";
import { useAuth } from "@/providers/AuthContext";

const TEAL = "#17a2b8";
const MAX_PHOTOS = 5;

function PostFormBody() {
  const router = useRouter();
  const { displayName, loggedPhone } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<ClassifiedCategory[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [city, setCity] = useState("Mumbai");
  const [area, setArea] = useState("");
  const [contactPhone, setContactPhone] = useState(loggedPhone || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    classifiedApi.categories().then((res) => setCategories(res.items)).catch(() => setCategories([]));
    profileApi.getMe().then((me) => {
      if (me.phone) setContactPhone(me.phone);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [photos]);

  function onPickPhotos(files: FileList | null) {
    if (!files?.length) return;
    setPhotos((prev) => [...prev, ...Array.from(files)].slice(0, MAX_PHOTOS));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!categoryId) {
      setError("Please select a category.");
      return;
    }
    if (!area.trim()) {
      setError("Area is required.");
      return;
    }
    setSubmitting(true);
    try {
      let imageUrls: string[] = [];
      if (photos.length) {
        imageUrls = await classifiedApi.uploadImages(photos);
      }
      await classifiedApi.create({
        title: title.trim(),
        description: description.trim(),
        price: price.trim() || "0",
        categoryId,
        city: city.trim(),
        area: area.trim(),
        contactPhone: contactPhone.trim(),
        imageUrls,
      });
      setSuccess("Your ad was submitted. It will appear after admin approval (usually within 24 hours).");
      setTimeout(() => router.push("/classified"), 1800);
    } catch (err: unknown) {
      setError(err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Failed to post ad");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 md:py-6">
      <Link href="/classified" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" />
        Back to Classifieds
      </Link>

      <h1 className="mb-5 text-2xl font-bold text-gray-900 md:text-3xl">Post a Classified Ad</h1>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {success ? <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div> : null}

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Photos (up to {MAX_PHOTOS})</label>
          <div className="flex flex-wrap gap-3">
            {previewUrls.map((url, idx) => (
              <div key={url} className="relative h-24 w-24 overflow-hidden rounded-xl border border-gray-200">
                <img src={url} alt={`Upload ${idx + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white"
                >
                  ×
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-24 w-24 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-500"
              >
                <Camera className="mb-1 h-5 w-5" />
                Add
              </button>
            ) : null}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onPickPhotos(e.target.files)} />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What are you selling?"
            className="h-12 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#17a2b8] focus:ring-2 focus:ring-[#17a2b8]/20"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Description *</label>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500">
              <span className="font-semibold">B</span>
              <span className="italic">I</span>
              <span className="underline">U</span>
              <span className="ml-auto inline-flex items-center gap-2">
                <Pencil className="h-4 w-4 text-[#17a2b8]" />
                <Eye className="h-4 w-4" />
              </span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your item — condition, features, etc."
              rows={5}
              className="w-full resize-y px-4 py-3 text-sm outline-none"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Price (₹) *</label>
            <input
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              className="h-12 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#17a2b8] focus:ring-2 focus:ring-[#17a2b8]/20"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Category *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-12 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#17a2b8] focus:ring-2 focus:ring-[#17a2b8]/20"
              required
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">City</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-12 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#17a2b8] focus:ring-2 focus:ring-[#17a2b8]/20"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Area *</label>
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="e.g., Andheri"
              className="h-12 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#17a2b8] focus:ring-2 focus:ring-[#17a2b8]/20"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">WhatsApp / Contact phone</label>
          <input
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="10-digit mobile number"
            className="h-12 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#17a2b8] focus:ring-2 focus:ring-[#17a2b8]/20"
          />
          {displayName ? <p className="mt-1 text-xs text-gray-500">Posting as {displayName}</p> : null}
        </div>

        <p className="text-xs text-gray-500">
          Your ad will be reviewed by admin before publishing. This usually takes 24 hours.
        </p>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: TEAL }}
        >
          {submitting ? "Posting..." : "Post Ad"}
        </button>
      </form>
    </div>
  );
}

export default function ClassifiedPostView() {
  return (
    <AuthGuard>
      <PostFormBody />
    </AuthGuard>
  );
}

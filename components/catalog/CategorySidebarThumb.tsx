"use client";

import { useState } from "react";
import { resolveMediaUrl } from "@/lib/media";

/** Small category image for Shop / Services sidebars (catalog thumbnail or icon). */
export function CategorySidebarThumb({
  imageUrl,
  label,
  size = 36,
}: {
  imageUrl: string | null;
  label: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const initial = (label?.trim()?.charAt(0) || "?").toUpperCase();

  const resolved = imageUrl ? resolveMediaUrl(imageUrl) || imageUrl : null;

  if (!resolved || failed) {
    return (
      <div
        className="shrink-0 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-xs font-bold text-gray-400"
        style={{ width: size, height: size }}
        aria-hidden
      >
        {initial}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-lg border border-gray-100 object-cover bg-white"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}

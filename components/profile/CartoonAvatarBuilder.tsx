"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type CartoonAvatarConfig = {
  skin: string;
  hairStyle: "short" | "long" | "bun" | "bald";
  hairColor: string;
  eyes: "round" | "happy" | "cool";
  mouth: "smile" | "grin" | "neutral";
  shirt: string;
  bg: string;
};

const SKINS = ["#F5D0B0", "#E0AC69", "#C68642", "#8D5524", "#FFDBAC", "#D4A574"];
const HAIR_COLORS = ["#1C1C1C", "#4A3728", "#A0522D", "#D4A017", "#C0C0C0", "#6B3FA0"];
const SHIRTS = ["#89CFF0", "#34D399", "#F472B6", "#FBBF24", "#818CF8", "#FB7185"];
const BGS = ["#E0F2FE", "#ECFDF5", "#FDF2F8", "#FEF3C7"];

const DEFAULT_CONFIG: CartoonAvatarConfig = {
  skin: SKINS[0],
  hairStyle: "short",
  hairColor: HAIR_COLORS[0],
  eyes: "round",
  mouth: "smile",
  shirt: SHIRTS[0],
  bg: BGS[0],
};

function hairSvg(style: CartoonAvatarConfig["hairStyle"], color: string) {
  if (style === "bald") return null;
  if (style === "long") {
    return (
      <>
        <ellipse cx="128" cy="88" rx="78" ry="62" fill={color} />
        <path d={`M50 100 Q40 180 55 220 Q70 200 80 160`} fill={color} />
        <path d={`M206 100 Q216 180 201 220 Q186 200 176 160`} fill={color} />
      </>
    );
  }
  if (style === "bun") {
    return (
      <>
        <ellipse cx="128" cy="92" rx="70" ry="52" fill={color} />
        <circle cx="128" cy="42" r="28" fill={color} />
      </>
    );
  }
  return <ellipse cx="128" cy="86" rx="72" ry="48" fill={color} />;
}

function eyesSvg(style: CartoonAvatarConfig["eyes"]) {
  if (style === "happy") {
    return (
      <>
        <path d="M88 128 Q100 118 112 128" stroke="#202124" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M144 128 Q156 118 168 128" stroke="#202124" strokeWidth="4" fill="none" strokeLinecap="round" />
      </>
    );
  }
  if (style === "cool") {
    return (
      <>
        <rect x="82" y="118" width="36" height="18" rx="6" fill="#202124" />
        <rect x="138" y="118" width="36" height="18" rx="6" fill="#202124" />
        <rect x="118" y="124" width="20" height="4" fill="#202124" />
      </>
    );
  }
  return (
    <>
      <circle cx="100" cy="128" r="8" fill="#202124" />
      <circle cx="156" cy="128" r="8" fill="#202124" />
      <circle cx="103" cy="125" r="2.5" fill="#fff" />
      <circle cx="159" cy="125" r="2.5" fill="#fff" />
    </>
  );
}

function mouthSvg(style: CartoonAvatarConfig["mouth"]) {
  if (style === "grin") {
    return <path d="M100 168 Q128 196 156 168" fill="#E11D48" stroke="#9F1239" strokeWidth="2" />;
  }
  if (style === "neutral") {
    return <path d="M108 172 H148" stroke="#202124" strokeWidth="4" strokeLinecap="round" />;
  }
  return <path d="M108 168 Q128 186 148 168" stroke="#202124" strokeWidth="4" fill="none" strokeLinecap="round" />;
}

export function CartoonAvatarPreview({ config, size = 160 }: { config: CartoonAvatarConfig; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="256" height="256" rx="128" fill={config.bg} />
      <ellipse cx="128" cy="220" rx="70" ry="48" fill={config.shirt} />
      <circle cx="128" cy="128" r="72" fill={config.skin} />
      {hairSvg(config.hairStyle, config.hairColor)}
      {eyesSvg(config.eyes)}
      <ellipse cx="78" cy="148" rx="10" ry="6" fill="rgba(232,110,110,0.35)" />
      <ellipse cx="178" cy="148" rx="10" ry="6" fill="rgba(232,110,110,0.35)" />
      {mouthSvg(config.mouth)}
    </svg>
  );
}

export async function cartoonConfigToPngFile(config: CartoonAvatarConfig, filename = "cartoon-avatar.png"): Promise<File> {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="128" fill="${config.bg}"/>
  <ellipse cx="128" cy="220" rx="70" ry="48" fill="${config.shirt}"/>
  <circle cx="128" cy="128" r="72" fill="${config.skin}"/>
  ${
    config.hairStyle === "bald"
      ? ""
      : config.hairStyle === "long"
        ? `<ellipse cx="128" cy="88" rx="78" ry="62" fill="${config.hairColor}"/><path d="M50 100 Q40 180 55 220 Q70 200 80 160" fill="${config.hairColor}"/><path d="M206 100 Q216 180 201 220 Q186 200 176 160" fill="${config.hairColor}"/>`
        : config.hairStyle === "bun"
          ? `<ellipse cx="128" cy="92" rx="70" ry="52" fill="${config.hairColor}"/><circle cx="128" cy="42" r="28" fill="${config.hairColor}"/>`
          : `<ellipse cx="128" cy="86" rx="72" ry="48" fill="${config.hairColor}"/>`
  }
  ${
    config.eyes === "happy"
      ? `<path d="M88 128 Q100 118 112 128" stroke="#202124" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M144 128 Q156 118 168 128" stroke="#202124" stroke-width="4" fill="none" stroke-linecap="round"/>`
      : config.eyes === "cool"
        ? `<rect x="82" y="118" width="36" height="18" rx="6" fill="#202124"/><rect x="138" y="118" width="36" height="18" rx="6" fill="#202124"/><rect x="118" y="124" width="20" height="4" fill="#202124"/>`
        : `<circle cx="100" cy="128" r="8" fill="#202124"/><circle cx="156" cy="128" r="8" fill="#202124"/><circle cx="103" cy="125" r="2.5" fill="#fff"/><circle cx="159" cy="125" r="2.5" fill="#fff"/>`
  }
  <ellipse cx="78" cy="148" rx="10" ry="6" fill="rgba(232,110,110,0.35)"/>
  <ellipse cx="178" cy="148" rx="10" ry="6" fill="rgba(232,110,110,0.35)"/>
  ${
    config.mouth === "grin"
      ? `<path d="M100 168 Q128 196 156 168" fill="#E11D48" stroke="#9F1239" stroke-width="2"/>`
      : config.mouth === "neutral"
        ? `<path d="M108 172 H148" stroke="#202124" stroke-width="4" stroke-linecap="round"/>`
        : `<path d="M108 168 Q128 186 148 168" stroke="#202124" stroke-width="4" fill="none" stroke-linecap="round"/>`
  }
</svg>`.trim();

  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not render cartoon avatar"));
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(img, 0, 0, 512, 512);
    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG export failed"))), "image/png");
    });
    return new File([png], filename, { type: "image/png" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function OptionRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function ColorDot({
  color,
  active,
  onClick,
  title,
}: {
  color: string;
  active: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`h-9 w-9 shrink-0 rounded-full transition ${
        active ? "ring-2 ring-teal-600 ring-offset-2 scale-105" : ""
      }`}
      style={{
        backgroundColor: color,
        border: "2px solid #64748b",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.35)",
      }}
      aria-label={title || color}
    />
  );
}

function Chip({
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
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

export default function CartoonAvatarBuilder({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (file: File, previewUrl: string) => void;
}) {
  const [config, setConfig] = useState<CartoonAvatarConfig>(DEFAULT_CONFIG);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setBusy(false);
    }
  }, [open]);

  const patch = useCallback(<K extends keyof CartoonAvatarConfig>(key: K, value: CartoonAvatarConfig[K]) => {
    setConfig((c) => ({ ...c, [key]: value }));
  }, []);

  const preview = useMemo(() => <CartoonAvatarPreview config={config} size={168} />, [config]);

  if (!open) return null;

  const apply = async () => {
    setBusy(true);
    setError(null);
    try {
      const file = await cartoonConfigToPngFile(config);
      const previewUrl = URL.createObjectURL(file);
      onApply(file, previewUrl);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create avatar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Create cartoon avatar</h3>
            <p className="text-xs text-slate-500">Free 2D character — pick looks, then apply</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100">
            Close
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="flex justify-center">{preview}</div>

          <OptionRow label="Skin">
            {SKINS.map((c) => (
              <ColorDot key={c} color={c} active={config.skin === c} onClick={() => patch("skin", c)} />
            ))}
          </OptionRow>

          <OptionRow label="Hair style">
            {(["short", "long", "bun", "bald"] as const).map((s) => (
              <Chip key={s} active={config.hairStyle === s} onClick={() => patch("hairStyle", s)}>
                {s}
              </Chip>
            ))}
          </OptionRow>

          {config.hairStyle !== "bald" && (
            <OptionRow label="Hair color">
              {HAIR_COLORS.map((c) => (
                <ColorDot key={c} color={c} active={config.hairColor === c} onClick={() => patch("hairColor", c)} />
              ))}
            </OptionRow>
          )}

          <OptionRow label="Eyes">
            {(["round", "happy", "cool"] as const).map((s) => (
              <Chip key={s} active={config.eyes === s} onClick={() => patch("eyes", s)}>
                {s}
              </Chip>
            ))}
          </OptionRow>

          <OptionRow label="Mouth">
            {(["smile", "grin", "neutral"] as const).map((s) => (
              <Chip key={s} active={config.mouth === s} onClick={() => patch("mouth", s)}>
                {s}
              </Chip>
            ))}
          </OptionRow>

          <OptionRow label="Shirt">
            {SHIRTS.map((c) => (
              <ColorDot key={c} color={c} active={config.shirt === c} onClick={() => patch("shirt", c)} />
            ))}
          </OptionRow>

          <OptionRow label="Background">
            {BGS.map((c) => (
              <ColorDot key={c} color={c} active={config.bg === c} onClick={() => patch("bg", c)} />
            ))}
          </OptionRow>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        </div>

        <div className="sticky bottom-0 flex gap-2 border-t border-slate-100 bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={apply}
            className="flex-1 rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Use this avatar"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { ShoppingCart, Zap } from "lucide-react";
import type { ButtonHTMLAttributes, MouseEvent } from "react";

type PurchaseActionButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  action: "cart" | "buy";
  compact?: boolean;
};

export default function PurchaseActionButton({
  action,
  compact = false,
  className = "",
  onClick,
  ...props
}: PurchaseActionButtonProps) {
  const isCart = action === "cart";
  const Icon = isCart ? ShoppingCart : Zap;

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onClick?.(event);
  }

  return (
    <button
      type="button"
      {...props}
      onClick={handleClick}
      className={[
        "inline-flex min-w-0 items-center justify-center gap-2 rounded-full border font-bold leading-none",
        "whitespace-nowrap transition duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
        compact ? "h-9 px-3 text-xs" : "h-11 px-5 text-sm",
        isCart
          ? "border-[#009f9b] bg-white text-[#008f8c] hover:bg-[#009f9b]/5"
          : "border-transparent text-white shadow-sm hover:brightness-[0.98]",
        className,
      ].join(" ")}
      style={
        isCart
          ? props.style
          : {
              background: "linear-gradient(90deg, #08a7a0 0%, #13b3a5 48%, #f2ae21 100%)",
              ...props.style,
            }
      }
    >
      <Icon
        aria-hidden="true"
        className={`${compact ? "h-4 w-4" : "h-[18px] w-[18px]"} shrink-0 ${isCart ? "" : "fill-white"}`}
        strokeWidth={2.4}
      />
      <span className="inline-flex items-center leading-none">
        {isCart ? "Add to Cart" : "Buy Now"}
      </span>
    </button>
  );
}

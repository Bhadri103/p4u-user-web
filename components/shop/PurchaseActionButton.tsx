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
        "purchase-action-button inline-flex min-w-0 items-center justify-center gap-2 rounded-xl border font-semibold leading-none",
        "whitespace-nowrap shadow-sm transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
        compact ? "h-9 px-3 text-xs" : "h-11 px-5 text-sm",
        "border-[#1976D2] bg-[#1976D2] text-white hover:-translate-y-0.5 hover:bg-[#1565C0] hover:shadow-[0_10px_24px_rgba(25,118,210,0.24)]",
        className,
      ].join(" ")}
      style={props.style}
    >
      <Icon
        aria-hidden="true"
        className={`${compact ? "h-4 w-4" : "h-[18px] w-[18px]"} shrink-0`}
        strokeWidth={2.4}
      />
      <span className="inline-flex items-center leading-none">
        {isCart ? "Add to Cart" : "Buy Now"}
      </span>
    </button>
  );
}

"use client";

import { useEffect } from "react";

export default function WorkspaceScrollGuard() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".p4u-locked-workspace");
    if (!root) return;

    const onWheel = (event: WheelEvent) => {
      if (window.innerWidth < 1024 || event.ctrlKey || event.metaKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target || target.closest('[role="dialog"]')) return;

      // Normalize old mouse-wheel line/page deltas and modern trackpad pixels.
      const multiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 18
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? window.innerHeight
          : 1;
      const delta = event.deltaY * multiplier;
      if (!delta || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

      const scrollPanel = (panel: HTMLElement) => {
        if (panel.scrollHeight <= panel.clientHeight + 1) return false;
        event.preventDefault();
        panel.scrollTop += delta;
        return true;
      };

      const nestedTextArea = target.closest<HTMLTextAreaElement>("textarea");
      if (nestedTextArea && nestedTextArea.scrollHeight > nestedTextArea.clientHeight + 1) return;

      const localPanel = target.closest<HTMLElement>(".marketplace-scroll-panel");
      if (localPanel && scrollPanel(localPanel)) return;

      const scrollOwner = target.closest<HTMLElement>(".workspace-scroll-owner");
      const ownedPanel = scrollOwner?.querySelector<HTMLElement>(".marketplace-scroll-panel");
      if (ownedPanel && scrollPanel(ownedPanel)) return;

      const primaryPanel = root.querySelector<HTMLElement>(".marketplace-primary-scroll");
      if (primaryPanel) scrollPanel(primaryPanel);
    };

    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel);
  }, []);

  return null;
}

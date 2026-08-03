"use client";

import { useEffect } from "react";

const STATE_ATTRIBUTE = "data-p4u-image-state";

function setImageState(image: HTMLImageElement) {
  if (image.dataset.p4uImageLoader === "off") return;

  if (image.complete && image.naturalWidth > 0) {
    image.setAttribute(STATE_ATTRIBUTE, "loaded");
    return;
  }

  image.setAttribute(STATE_ATTRIBUTE, "loading");
}

function prepareImages(node: Node) {
  if (node instanceof HTMLImageElement) setImageState(node);
  if (node instanceof Element) node.querySelectorAll("img").forEach(setImageState);
}

/** Applies the app-style shimmer to every image without requiring per-card state. */
export default function GlobalImageLoader() {
  useEffect(() => {
    document.querySelectorAll("img").forEach(setImageState);

    const handleLoad = (event: Event) => {
      if (event.target instanceof HTMLImageElement) {
        event.target.setAttribute(STATE_ATTRIBUTE, "loaded");
      }
    };

    const handleError = (event: Event) => {
      if (!(event.target instanceof HTMLImageElement)) return;
      const image = event.target;
      const failedSource = image.currentSrc || image.src;

      // Existing image error handlers may replace the source with a fallback.
      window.setTimeout(() => {
        const currentSource = image.currentSrc || image.src;
        if (currentSource !== failedSource) {
          setImageState(image);
        } else if (image.naturalWidth === 0) {
          image.setAttribute(STATE_ATTRIBUTE, "error");
        }
      }, 0);
    };

    document.addEventListener("load", handleLoad, true);
    document.addEventListener("error", handleError, true);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach(prepareImages);
        } else if (mutation.target instanceof HTMLImageElement) {
          setImageState(mutation.target);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "srcset"],
    });

    return () => {
      observer.disconnect();
      document.removeEventListener("load", handleLoad, true);
      document.removeEventListener("error", handleError, true);
    };
  }, []);

  return null;
}

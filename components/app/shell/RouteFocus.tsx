"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * W-5.5: after a client route change, move focus to the page's <h1> so keyboard and
 * screen reader users start at the new content. Skips the first render (initial load
 * keeps the browser's default focus so the skip link is the first Tab stop, W-5.1).
 */
export function RouteFocus() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    // Wait a frame so the new page has rendered its heading.
    const id = requestAnimationFrame(() => {
      const h1 = document.querySelector<HTMLElement>("main h1") ?? document.querySelector<HTMLElement>("h1");
      if (!h1) return;
      if (!h1.hasAttribute("tabindex")) h1.setAttribute("tabindex", "-1");
      h1.focus({ preventScroll: false });
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return null;
}

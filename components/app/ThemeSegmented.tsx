"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

const OPTIONS = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
] as const;

/** W-8.2: three-option appearance control. Selection pairs fill with a weight change and aria-checked. */
export function ThemeSegmented({ labelledBy }: { labelledBy?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current = mounted ? theme ?? "system" : "system";

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="inline-flex rounded-full bg-control p-1 gap-1"
      onKeyDown={(e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        const i = OPTIONS.findIndex((o) => o.value === current);
        const next = OPTIONS[(i + (e.key === "ArrowRight" ? 1 : OPTIONS.length - 1)) % OPTIONS.length];
        setTheme(next.value);
        (e.currentTarget.querySelector(`[data-value="${next.value}"]`) as HTMLElement | null)?.focus();
      }}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = current === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            data-value={value}
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => setTheme(value)}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-subheadline transition-colors duration-150 ${
              selected
                ? "bg-card text-label font-semibold shadow-card border border-card-stroke"
                : "text-supporting hover:text-label"
            }`}
          >
            <Icon aria-hidden="true" strokeWidth={1.75} className="size-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cx } from "./ui";

/**
 * A small "i" button that shows a longer explanation. Opens on hover or focus (desktop) and on tap
 * (touch); closes with Escape or a click elsewhere. The panel is positioned against the nearest
 * positioned ancestor, so put it inside a `relative` card.
 */
export function InfoTip({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  const [pinned, setPinned] = useState(false);
  const [hover, setHover] = useState(false);
  const id = useId();
  const root = useRef<HTMLSpanElement>(null);
  const open = pinned || hover;

  useEffect(() => {
    if (!pinned) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPinned(false);
    const onClick = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setPinned(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [pinned]);

  return (
    <span ref={root} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => {
          e.preventDefault(); // don't also select the card this sits in
          setPinned((p) => !p);
        }}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        className="inline-grid h-5 w-5 place-items-center rounded-full border border-stone-300 align-middle text-[11px] font-semibold text-stone-500 hover:border-teal-600 hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-teal-600"
      >
        i
      </button>
      <span
        id={id}
        role="tooltip"
        hidden={!open}
        className={cx(
          "absolute left-3 right-3 top-full z-30 mt-2 block rounded-lg bg-stone-900 p-3 text-left text-sm font-normal leading-relaxed text-stone-50 shadow-xl",
          className,
        )}
      >
        {children}
      </span>
    </span>
  );
}

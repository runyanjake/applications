import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const SHOW_DELAY_MS = 150;
const GAP = 6;

/**
 * One-line text clipped with an ellipsis. Hovering shows the full text when it is
 * clipped or multi-line, or `tooltip` when given. Replaces `title`, whose native
 * tooltip is slow and flaky in Electron.
 */
export function TruncatedText({
  text,
  tooltip,
  className = "",
}: {
  text: string;
  tooltip?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [position, setPosition] = useState<{ left: number; top?: number; bottom?: number } | null>(
    null,
  );

  const hide = () => {
    window.clearTimeout(timer.current);
    setPosition(null);
  };

  const show = () => {
    const el = ref.current;
    if (!el) return;
    const clipped = el.scrollWidth > el.clientWidth || text.includes("\n");
    if (!tooltip && !clipped) return;
    timer.current = window.setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const left = Math.min(rect.left, window.innerWidth - 400);
      // Below the text, or above it in the bottom third of the window
      setPosition(
        rect.bottom > (window.innerHeight * 2) / 3
          ? { left, bottom: window.innerHeight - rect.top + GAP }
          : { left, top: rect.bottom + GAP },
      );
    }, SHOW_DELAY_MS);
  };

  // Scrolling moves the text out from under a fixed tooltip
  useEffect(() => {
    if (!position) return;
    window.addEventListener("scroll", hide, true);
    return () => window.removeEventListener("scroll", hide, true);
  }, [position]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={show}
        onMouseLeave={hide}
        className={`block truncate ${className}`}
      >
        {text}
      </span>
      {position &&
        createPortal(
          <div
            role="tooltip"
            style={{ ...position, left: Math.max(GAP, position.left) }}
            className="pointer-events-none fixed z-50 max-w-sm whitespace-pre-line break-words rounded-md bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
          >
            {tooltip ?? text}
          </div>,
          document.body,
        )}
    </>
  );
}

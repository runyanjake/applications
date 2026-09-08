import { useCallback, useEffect, useRef, useState } from "react";

/** Shows a transient "Saved!" confirmation for `duration` ms. */
export function useSavedFlash(duration = 2000) {
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const flash = useCallback(() => {
    setSaved(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), duration);
  }, [duration]);

  return { saved, flash };
}

import { useEffect, useState } from "react";

/**
 * True only once `active` has stayed on for `delay` ms.
 *
 * Refetches that resolve in a few frames — a keystroke in a search field, a
 * page step that was already cached — should not flick a busy state on and off
 * again. Anything slower than the delay is worth telling the user about.
 */
export default function useDeferredFlag(active, delay = 140) {
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    if (!active) return undefined;

    const timer = setTimeout(() => setElapsed(true), delay);

    // Cleared here rather than in the `!active` branch above, so the effect
    // never sets state on its way in.
    return () => {
      clearTimeout(timer);
      setElapsed(false);
    };
  }, [active, delay]);

  // `active` is checked again on the way out: the reset above lands a commit
  // later, and the flag must go off in the same one the work finishes in.
  return active && elapsed;
}

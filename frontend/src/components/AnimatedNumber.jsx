import { useEffect, useRef, useState } from "react";

/**
 * Counts up from 0 to `value` whenever `value` changes. Pure requestAnimationFrame
 * implementation -- no extra dependency needed for a simple numeric tween.
 */
export default function AnimatedNumber({ value = 0, duration = 700, format }) {
  const [display, setDisplay] = useState(0);
  const frame = useRef(null);
  const start = useRef(null);
  const from = useRef(0);

  useEffect(() => {
    from.current = display;
    start.current = null;
    cancelAnimationFrame(frame.current);

    function tick(ts) {
      if (start.current === null) start.current = ts;
      const progress = Math.min(1, (ts - start.current) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from.current + (value - from.current) * eased;
      setDisplay(next);
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
      }
    }
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  const rounded = Math.round(display);
  return <>{format ? format(rounded) : rounded}</>;
}

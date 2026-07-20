import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

// A number that counts up the first time it scrolls into view — Wrapped-style,
// but honest: reduced-motion (or a non-finite value) renders the final figure
// immediately. Purely presentational; the real value is always in the DOM for
// screen readers via aria-label.
const DURATION_MS = 900;
const easeOut = (t) => 1 - (1 - t) ** 3;

const prefersReducedMotion = () => (
  typeof window !== "undefined"
  && !!window.matchMedia
  && window.matchMedia("(prefers-reduced-motion: reduce)").matches
);

const CountUp = ({ value, decimals, className }) => {
  const ref = useRef(null);
  const [display, setDisplay] = useState(() => (prefersReducedMotion() ? value : 0));
  const startedRef = useRef(prefersReducedMotion());

  useEffect(() => {
    if (startedRef.current || !Number.isFinite(value)) {
      setDisplay(value);
      return undefined;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setDisplay(value);
      return undefined;
    }
    let raf = 0;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting) || startedRef.current) return;
      startedRef.current = true;
      observer.disconnect();
      const t0 = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - t0) / DURATION_MS);
        setDisplay(value * easeOut(t));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  const formatted = Number.isFinite(display)
    ? display.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : String(value);

  return (
    <span
      ref={ref}
      aria-label={Number.isFinite(value)
        ? value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
        : String(value)}
      className={className}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {formatted}
    </span>
  );
};

CountUp.propTypes = {
  value: PropTypes.number.isRequired,
  decimals: PropTypes.number,
  className: PropTypes.string,
};

CountUp.defaultProps = {
  decimals: 0,
  className: undefined,
};

export default CountUp;

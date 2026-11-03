import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";

// A mechanical odometer: each digit is a strip of 0–9 that rolls to its value
// once `run` turns true, the left digits travelling furthest. The real number
// is the accessible label; the strips are decoration.

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const Odometer = ({ value, run, className }) => {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!run) return undefined;
    const t = setTimeout(() => setOn(true), 60);
    return () => clearTimeout(t);
  }, [run]);
  const text = Math.round(value).toLocaleString("en-IN");
  let digitIndex = 0;
  return (
    <span className={`tr-odo ${className}`} role="img" aria-label={text}>
      {text.split("").map((ch, i) => {
        if (!/\d/.test(ch)) {
          // eslint-disable-next-line react/no-array-index-key
          return <span key={`s${i}`} aria-hidden="true">{ch}</span>;
        }
        digitIndex += 1;
        const d = Number(ch);
        // Two full turns plus the digit, so every wheel visibly spins.
        const turns = on ? 20 + d : 0;
        return (
          // eslint-disable-next-line react/no-array-index-key
          <span key={i} className="tr-odo-digit" aria-hidden="true">
            <span
              className="tr-odo-strip"
              style={{ transform: `translateY(-${turns}em)`, transitionDelay: `${digitIndex * 90}ms` }}
            >
              {[...DIGITS, ...DIGITS, ...DIGITS].map((n, k) => <span key={k}>{n}</span>)}
            </span>
          </span>
        );
      })}
    </span>
  );
};

Odometer.propTypes = { value: PropTypes.number.isRequired, run: PropTypes.bool, className: PropTypes.string };
Odometer.defaultProps = { run: true, className: "" };

export default Odometer;

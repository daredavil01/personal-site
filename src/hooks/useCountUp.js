import { useEffect, useState } from "react";

// Ease-out-cubic count-up from 0 → `target` over `duration` ms, gated on
// `active`. Extracted from LifeStats (§9) so the atlas orbit stage can reuse
// the exact same live-count animation the homepage uses.
const useCountUp = (target, duration, active) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active || target === 0) return undefined;
    let frame = 0;
    const totalFrames = Math.round(duration / 16);
    const timer = setInterval(() => {
      frame += 1;
      const progress = frame / totalFrames;
      const eased = 1 - (1 - progress) ** 3; // ease-out cubic
      setCount(Math.min(Math.round(eased * target), target));
      if (frame >= totalFrames) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [active, target, duration]);
  return count;
};

export default useCountUp;

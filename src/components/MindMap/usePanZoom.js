import { useEffect, useRef, useState } from 'react';

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

// Pan/zoom behaviour for an SVG element driven by its viewBox.
// Supports mouse drag, touch drag, scroll-wheel zoom, pinch zoom and
// animated transitions to a target viewBox.
const usePanZoom = ({ initialViewBox, minWidth, maxWidth }) => {
  const svgRef = useRef(null);
  const [viewBox, setViewBox] = useState(initialViewBox);
  const vbRef = useRef(initialViewBox);
  const pointers = useRef(new Map());
  const pinchDist = useRef(null);
  const didDrag = useRef(false);
  const animRef = useRef(null);

  const apply = (vb) => {
    vbRef.current = vb;
    setViewBox(vb);
  };

  const stopAnimation = () => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  };

  const animateTo = (target, duration = 550) => {
    stopAnimation();
    const from = { ...vbRef.current };
    const start = performance.now();
    const ease = (t) => 1 - ((1 - t) ** 3);
    const stepFrame = (now) => {
      const t = clamp((now - start) / duration, 0, 1);
      const k = ease(t);
      apply({
        x: from.x + ((target.x - from.x) * k),
        y: from.y + ((target.y - from.y) * k),
        w: from.w + ((target.w - from.w) * k),
        h: from.h + ((target.h - from.h) * k),
      });
      animRef.current = t < 1 ? requestAnimationFrame(stepFrame) : null;
    };
    animRef.current = requestAnimationFrame(stepFrame);
  };

  const zoomAt = (clientX, clientY, factor) => {
    const svg = svgRef.current;
    if (!svg) return;
    stopAnimation();
    const rect = svg.getBoundingClientRect();
    const vb = vbRef.current;
    const newW = clamp(vb.w * factor, minWidth, maxWidth);
    const realFactor = newW / vb.w;
    const px = vb.x + (((clientX - rect.left) / rect.width) * vb.w);
    const py = vb.y + (((clientY - rect.top) / rect.height) * vb.h);
    apply({
      x: px - ((px - vb.x) * realFactor),
      y: py - ((py - vb.y) * realFactor),
      w: newW,
      h: vb.h * realFactor,
    });
  };

  const zoomCenter = (factor) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    zoomAt(rect.left + (rect.width / 2), rect.top + (rect.height / 2), factor);
  };

  // Wheel listener must be attached manually so it can be non-passive
  // (React attaches wheel handlers as passive, which blocks preventDefault).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, e.deltaY > 0 ? 1.12 : 0.89);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDown = (e) => {
    stopAnimation();
    didDrag.current = false;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    const prev = pointers.current.get(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const vb = vbRef.current;

    if (pointers.current.size === 1) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      if ((Math.abs(dx) + Math.abs(dy)) > 2) didDrag.current = true;
      apply({
        ...vb,
        x: vb.x - (dx * (vb.w / rect.width)),
        y: vb.y - (dy * (vb.h / rect.height)),
      });
    } else if (pointers.current.size === 2) {
      didDrag.current = true;
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist.current && dist > 0) {
        zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinchDist.current / dist);
        pinchDist.current = dist;
      }
    }
  };

  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchDist.current = null;
  };

  return {
    svgRef,
    viewBox,
    animateTo,
    zoomCenter,
    didDrag,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerLeave: onPointerUp,
      onPointerCancel: onPointerUp,
    },
  };
};

export default usePanZoom;

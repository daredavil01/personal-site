import React, {
  useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import PropTypes from 'prop-types';

// The Expedition Trail — the 100 Days challenge drawn as a journey: a winding
// route from Base Camp (post 0) to the Summit (post 100). One waypoint per
// post slot; published waypoints are inked and clickable (they open the same
// post modal the cards use), camps mark the quarters, and a pennant flag shows
// today's position with the pace delta as a margin note.
//
// The route geometry differs by orientation: a wide ridge walk on desktop, a
// steeper switchback on narrow screens. Waypoints are placed with
// getPointAtLength so any GOAL count or route shape works unchanged.

const WIDE_ROUTE = {
  viewBox: '0 0 720 250',
  route: 'M40,216 C150,208 130,160 240,152 C350,144 330,180 430,140 C530,100 480,70 585,58 C640,52 660,40 686,26',
  ridges: [
    'M0,208 L90,150 L150,196 L235,120 L305,186 L400,96 L470,168 L560,66 L640,140 L720,44 L720,250 L0,250 Z',
    'M0,224 L120,180 L220,214 L340,156 L460,206 L580,120 L720,168 L720,250 L0,250 Z',
  ],
  minHeight: 250,
};

const TALL_ROUTE = {
  viewBox: '0 0 360 430',
  route: 'M38,398 C150,392 280,382 300,344 C320,306 60,318 48,278 C36,238 300,250 310,210 C320,170 70,180 56,142 C42,104 290,116 322,54',
  ridges: [
    'M0,380 L60,320 L120,368 L200,290 L260,352 L330,240 L360,300 L360,430 L0,430 Z',
    'M0,404 L90,368 L180,398 L270,344 L360,382 L360,430 L0,430 Z',
  ],
  minHeight: 430,
};

const QUARTER_CAMPS = [0.25, 0.5, 0.75];

const prefersReducedMotion = () => (
  typeof window !== 'undefined'
  && !!window.matchMedia
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

const ExpeditionTrail = ({
  blogs, goal, pace, onSelect,
}) => {
  const [narrow, setNarrow] = useState(() => (
    typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(max-width: 640px)').matches
  ));
  const geometry = narrow ? TALL_ROUTE : WIDE_ROUTE;

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia('(max-width: 640px)');
    const onChange = (e) => setNarrow(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Sample the invisible route path once per geometry to place everything.
  const routeRef = useRef(null);
  const [layout, setLayout] = useState(null);
  useLayoutEffect(() => {
    const path = routeRef.current;
    if (!path) return;
    const total = path.getTotalLength();
    const at = (f) => {
      const p = path.getPointAtLength(total * Math.min(1, Math.max(0, f)));
      return { x: p.x, y: p.y };
    };
    setLayout({
      total,
      start: at(0),
      end: at(1),
      camps: QUARTER_CAMPS.map((f) => ({ f, ...at(f) })),
      waypoints: Array.from({ length: goal }, (_, i) => ({ n: i + 1, ...at((i + 1) / goal) })),
    });
  }, [geometry, goal]);

  const done = Math.min(blogs.length, goal);
  const progress = done / goal;
  const currentPoint = layout && done > 0 ? layout.waypoints[done - 1] : null;

  // Draw-in: the walked stroke animates from zero on first paint.
  const walkedLength = layout ? layout.total * progress : 0;
  const [drawn, setDrawn] = useState(prefersReducedMotion());
  useEffect(() => {
    if (drawn || !layout) return undefined;
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true)));
    return () => cancelAnimationFrame(raf);
  }, [drawn, layout]);

  const flagLabelLeft = currentPoint && layout
    && currentPoint.x > (narrow ? 240 : 500);

  const marginNote = useMemo(() => {
    const ahead = pace.delta >= 0;
    return `Day ${pace.dayOfYear} of 365 · pace target ${pace.expected} · ${done} published · ${goal - done} remaining · ${ahead ? '+' : ''}${pace.delta} ${ahead ? 'ahead' : 'behind'}`;
  }, [pace, done, goal]);

  return (
    <div>
      <svg
        viewBox={geometry.viewBox}
        className="w-full h-auto block"
        role="group"
        aria-label={`Expedition trail: ${done} of ${goal} posts published`}
      >
        {/* ridge silhouettes */}
        {geometry.ridges.map((d, i) => (
          <path key={d} d={d} className="fill-secondary" opacity={i === 0 ? 0.06 : 0.1} />
        ))}

        {/* invisible sampling route */}
        <path ref={routeRef} d={geometry.route} fill="none" stroke="none" />

        {/* the route ahead */}
        <path
          d={geometry.route}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="2 7"
          className="stroke-stone-300 dark:stroke-stone-600"
        />

        {/* the walked route */}
        {layout && (
          <path
            d={geometry.route}
            fill="none"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="stroke-secondary"
            strokeDasharray={`${layout.total} ${layout.total}`}
            strokeDashoffset={drawn ? layout.total - walkedLength : layout.total}
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.33, 1, 0.68, 1)' }}
          />
        )}

        {/* waypoints — one per post slot; published ones open the post */}
        {layout && layout.waypoints.map((wp) => {
          const blog = wp.n <= done ? blogs[wp.n - 1] : null;
          if (!blog) {
            return (
              <circle
                key={wp.n}
                cx={wp.x}
                cy={wp.y}
                r="2.5"
                fill="none"
                strokeWidth="1"
                className="stroke-stone-300 dark:stroke-stone-600"
              />
            );
          }
          return (
            <circle
              key={wp.n}
              cx={wp.x}
              cy={wp.y}
              r="3.5"
              tabIndex={0}
              role="button"
              aria-label={`Post ${wp.n}: ${blog.blog_title}`}
              onClick={() => onSelect(blog)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(blog);
                }
              }}
              className="fill-secondary cursor-pointer hover:opacity-70 transition-opacity"
            >
              <title>{`#${wp.n} · ${blog.blog_date} · ${blog.blog_title}`}</title>
            </circle>
          );
        })}

        {/* quarter camps — the flag's labels win over a camp label it would
            collide with, so a camp within a few posts of today keeps only
            its tent */}
        {layout && layout.camps.map((camp) => (
          <g key={camp.f} className="text-stone-500 dark:text-stone-400">
            <rect x={camp.x - 6} y={camp.y - 22} width="12" height="8" className="fill-white dark:fill-stone-900 stroke-stone-400 dark:stroke-stone-500" strokeWidth="1" />
            <path d={`M${camp.x - 6},${camp.y - 22} L${camp.x},${camp.y - 29} L${camp.x + 6},${camp.y - 22} Z`} className="fill-white dark:fill-stone-900 stroke-stone-400 dark:stroke-stone-500" strokeWidth="1" />
            {Math.abs(Math.round(camp.f * goal) - done) > goal * 0.08 && (
              <text x={camp.x} y={camp.y - 34} textAnchor="middle" fontSize="9" className="fill-current font-label uppercase tracking-wider">
                {`Camp ${Math.round(camp.f * goal)}`}
              </text>
            )}
          </g>
        ))}

        {/* base camp + summit */}
        {layout && (
          <g fontSize="9" className="fill-stone-500 dark:fill-stone-400 font-label uppercase tracking-wider">
            <text x={layout.start.x} y={layout.start.y + 16}>Base Camp · 0</text>
            <line x1={layout.end.x} y1={layout.end.y} x2={layout.end.x} y2={layout.end.y - 18} strokeWidth="1.5" className="stroke-stone-500 dark:stroke-stone-400" />
            <path d={`M${layout.end.x},${layout.end.y - 18} L${layout.end.x + 15},${layout.end.y - 14} L${layout.end.x},${layout.end.y - 10} Z`} className="fill-stone-500 dark:fill-stone-400" />
            <text x={layout.end.x} y={layout.end.y + 13} textAnchor="middle">{`Summit · ${goal}`}</text>
          </g>
        )}

        {/* the pennant flag at today's waypoint */}
        {currentPoint && (
          <g>
            <line x1={currentPoint.x} y1={currentPoint.y} x2={currentPoint.x} y2={currentPoint.y - 40} strokeWidth="2" className="stroke-stone-800 dark:stroke-stone-200" />
            <path
              d={`M${currentPoint.x},${currentPoint.y - 40} L${currentPoint.x + 24},${currentPoint.y - 34} L${currentPoint.x},${currentPoint.y - 28} Z`}
              className="fill-secondary"
            />
            <circle cx={currentPoint.x} cy={currentPoint.y} r="6" className="fill-secondary stroke-white dark:stroke-stone-900" strokeWidth="2" />
            <text
              x={flagLabelLeft ? currentPoint.x - 10 : currentPoint.x + 10}
              y={currentPoint.y - 50}
              textAnchor={flagLabelLeft ? 'end' : 'start'}
              fontSize="11"
              fontWeight="700"
              className="fill-stone-900 dark:fill-stone-100 font-label"
            >
              {`Post ${done} — you are here`}
            </text>
            <text
              x={flagLabelLeft ? currentPoint.x - 10 : currentPoint.x + 10}
              y={currentPoint.y - 38}
              textAnchor={flagLabelLeft ? 'end' : 'start'}
              fontSize="9"
              className={`font-label uppercase tracking-wider ${pace.delta >= 0 ? 'fill-emerald-700 dark:fill-emerald-500' : 'fill-secondary'}`}
            >
              {`${pace.delta >= 0 ? '+' : ''}${pace.delta} ${pace.delta >= 0 ? 'ahead of' : 'behind'} pace`}
            </text>
          </g>
        )}
      </svg>

      <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 text-center mt-3 mb-0">
        {marginNote}
      </p>
    </div>
  );
};

ExpeditionTrail.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types -- post rows straight from the blogs api
  blogs: PropTypes.arrayOf(PropTypes.object).isRequired,
  goal: PropTypes.number.isRequired,
  pace: PropTypes.shape({
    dayOfYear: PropTypes.number,
    expected: PropTypes.number,
    delta: PropTypes.number,
  }).isRequired,
  onSelect: PropTypes.func.isRequired,
};

export default ExpeditionTrail;

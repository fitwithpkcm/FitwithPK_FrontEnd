import React, { useLayoutEffect, useRef, useState } from "react";
import { BodyPartPaths } from "../../lib/muscle-diagram/paths";

// Renders one front/back body silhouette. `colorFor` decides the fill class
// per anatomical slug (e.g. 'chest', 'biceps') so callers can highlight
// different slugs in different colors — a single aggregate color for the
// "Today's Focus" view, red/orange (primary/secondary) for a single exercise.
// `styleFor` is optional and layers an inline style (e.g. a continuous
// gradient color) on top, for callers that need more than discrete classes —
// existing callers that only pass colorFor are unaffected.
// `onSlugClick` is optional — when passed, each region becomes tappable and
// reports its raw slug back to the caller (e.g. to focus/highlight it).
// `isFocusedSlug`/`focusedLabel` are optional — when the caller has a slug
// currently focused, this draws a leader line straight out to the nearer
// side margin (clear of the silhouette) ending in a label badge, instead of
// the caller having to show the name somewhere else on the page. The line
// is drawn in the SVG's own coordinate space (so it scales with the artwork
// correctly), but the label itself is a plain HTML element positioned by
// percentage over the SVG — real text needs real CSS pixels, and the
// viewBox here is ~727x1280 user units, not pixels, so a foreignObject sized
// in those units would render at a small fraction of the size it looks like
// in the JSX.
export default function BodySvg({
  paths, viewBox, colorFor, styleFor, onSlugClick, isFocusedSlug, focusedLabel,
}: {
  paths: BodyPartPaths[];
  viewBox: string;
  colorFor: (slug: string) => string;
  styleFor?: (slug: string) => React.CSSProperties;
  onSlugClick?: (slug: string) => void;
  isFocusedSlug?: (slug: string) => boolean;
  focusedLabel?: React.ReactNode;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg || !isFocusedSlug) {
      setAnchor(null);
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let found = false;
    for (const part of paths) {
      if (!isFocusedSlug(part.slug)) continue;
      const el = svg.querySelector(`[data-slug="${part.slug}"]`) as SVGGraphicsElement | null;
      if (!el) continue;
      try {
        const bbox = el.getBBox();
        if (bbox.width === 0 && bbox.height === 0) continue;
        found = true;
        minX = Math.min(minX, bbox.x);
        minY = Math.min(minY, bbox.y);
        maxX = Math.max(maxX, bbox.x + bbox.width);
        maxY = Math.max(maxY, bbox.y + bbox.height);
      } catch {
        // getBBox can throw on an unrendered/detached element — skip it.
      }
    }
    setAnchor(found ? { x: (minX + maxX) / 2, y: (minY + maxY) / 2 } : null);
  }, [paths, isFocusedSlug]);

  const [vbX, vbY, vbW, vbH] = viewBox.split(" ").map(Number);

  // Push the line straight out to whichever side margin is nearer — most
  // muscle groups sit well inside the figure's horizontal center, leaving
  // open space at the left/right edges of the viewBox for the line to land in.
  const side = anchor && anchor.x < vbX + vbW / 2 ? "left" : "right";
  const edgeX = side === "left" ? vbX + vbW * 0.04 : vbX + vbW * 0.96;
  const lineEndY = anchor
    ? Math.min(Math.max(anchor.y, vbY + vbH * 0.08), vbY + vbH * 0.92)
    : 0;
  const labelLeftPct = anchor ? ((edgeX - vbX) / vbW) * 100 : 0;
  const labelTopPct = anchor ? ((lineEndY - vbY) / vbH) * 100 : 0;

  return (
    <div className="relative w-full">
      <svg ref={svgRef} viewBox={viewBox} className="w-full h-auto overflow-visible">
        {paths.map(part => {
          const allD = [...(part.common ?? []), ...(part.left ?? []), ...(part.right ?? [])];
          return (
            <g
              key={part.slug}
              data-slug={part.slug}
              className={colorFor(part.slug)}
              style={{ ...styleFor?.(part.slug), cursor: onSlugClick ? "pointer" : undefined }}
              onClick={onSlugClick ? () => onSlugClick(part.slug) : undefined}
            >
              {allD.map((d, i) => <path key={i} d={d} />)}
            </g>
          );
        })}

        {anchor && focusedLabel && (
          <>
            <line
              x1={anchor.x} y1={anchor.y} x2={edgeX} y2={lineEndY}
              stroke="currentColor"
              className="text-primary"
              strokeWidth={vbW * 0.012}
              strokeLinecap="round"
            />
            <circle cx={anchor.x} cy={anchor.y} r={vbW * 0.02} className="fill-primary" />
            <circle cx={edgeX} cy={lineEndY} r={vbW * 0.012} className="fill-primary" />
          </>
        )}
      </svg>

      {anchor && focusedLabel && (
        <div
          className="absolute z-10 flex flex-col items-stretch text-center gap-0.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md px-2 py-1 pointer-events-none"
          style={{
            left: `${labelLeftPct}%`,
            top: `${labelTopPct}%`,
            minWidth: 90,
            maxWidth: 140,
            transform: side === "left"
              ? "translate(calc(-100% - 4px), -50%)"
              : "translate(4px, -50%)",
          }}
        >
          {focusedLabel}
        </div>
      )}
    </div>
  );
}

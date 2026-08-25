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
// currently focused, this draws a leader line + label directly on the region
// (measured from the rendered path geometry) instead of the caller having to
// show the name somewhere else on the page.
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
  const groupRefs = useRef(new Map<string, SVGGElement>());
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    if (!isFocusedSlug) {
      setAnchor(null);
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let found = false;
    for (const part of paths) {
      if (!isFocusedSlug(part.slug)) continue;
      const el = groupRefs.current.get(part.slug);
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

  const [vbX, vbY, vbW] = viewBox.split(" ").map(Number);
  const badgeW = 168;
  const badgeH = 44;
  const lineLift = 116;
  const labelY = anchor ? Math.max(vbY + 8, anchor.y - lineLift) : 0;
  const boxX = anchor ? Math.min(Math.max(anchor.x - badgeW / 2, vbX + 8), vbX + vbW - badgeW - 8) : 0;

  return (
    <svg viewBox={viewBox} className="w-full h-auto overflow-visible">
      {paths.map(part => {
        const allD = [...(part.common ?? []), ...(part.left ?? []), ...(part.right ?? [])];
        return (
          <g
            key={part.slug}
            ref={el => {
              if (el) groupRefs.current.set(part.slug, el);
              else groupRefs.current.delete(part.slug);
            }}
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
            x1={anchor.x} y1={anchor.y} x2={anchor.x} y2={labelY + badgeH}
            className="stroke-gray-500 dark:stroke-gray-300"
            strokeWidth={3}
            strokeDasharray="2 6"
            strokeLinecap="round"
          />
          <circle cx={anchor.x} cy={anchor.y} r={9} className="fill-gray-700 dark:fill-gray-100" />
          <foreignObject x={boxX} y={labelY} width={badgeW} height={badgeH}>
            <div
              className="h-full flex flex-col items-center justify-center text-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 shadow-md px-2 leading-tight"
            >
              {focusedLabel}
            </div>
          </foreignObject>
        </>
      )}
    </svg>
  );
}

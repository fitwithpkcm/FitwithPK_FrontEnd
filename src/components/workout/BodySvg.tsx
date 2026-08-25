import React from "react";
import { BodyPartPaths } from "../../lib/muscle-diagram/paths";

// Renders one front/back body silhouette. `colorFor` decides the fill class
// per anatomical slug (e.g. 'chest', 'biceps') so callers can highlight
// different slugs in different colors — a single aggregate color for the
// "Today's Focus" view, red/orange (primary/secondary) for a single exercise.
// `styleFor` is optional and layers an inline style (e.g. a continuous
// gradient color) on top, for callers that need more than discrete classes —
// existing callers that only pass colorFor are unaffected.
export default function BodySvg({
  paths, viewBox, colorFor, styleFor,
}: {
  paths: BodyPartPaths[];
  viewBox: string;
  colorFor: (slug: string) => string;
  styleFor?: (slug: string) => React.CSSProperties;
}) {
  return (
    <svg viewBox={viewBox} className="w-full h-auto">
      {paths.map(part => {
        const allD = [...(part.common ?? []), ...(part.left ?? []), ...(part.right ?? [])];
        return (
          <g key={part.slug} className={colorFor(part.slug)} style={styleFor?.(part.slug)}>
            {allD.map((d, i) => <path key={i} d={d} />)}
          </g>
        );
      })}
    </svg>
  );
}

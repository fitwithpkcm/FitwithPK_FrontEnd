import React from "react";
import { BodyPartPaths } from "../../lib/muscle-diagram/paths";

// Renders one front/back body silhouette. `colorFor` decides the fill class
// per anatomical slug (e.g. 'chest', 'biceps') so callers can highlight
// different slugs in different colors — a single aggregate color for the
// "Today's Focus" view, red/orange (primary/secondary) for a single exercise.
export default function BodySvg({
  paths, viewBox, colorFor,
}: {
  paths: BodyPartPaths[];
  viewBox: string;
  colorFor: (slug: string) => string;
}) {
  return (
    <svg viewBox={viewBox} className="w-full h-auto">
      {paths.map(part => {
        const allD = [...(part.common ?? []), ...(part.left ?? []), ...(part.right ?? [])];
        return (
          <g key={part.slug} className={colorFor(part.slug)}>
            {allD.map((d, i) => <path key={i} d={d} />)}
          </g>
        );
      })}
    </svg>
  );
}

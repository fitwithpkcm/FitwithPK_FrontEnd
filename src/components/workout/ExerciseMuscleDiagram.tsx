import React from "react";
import { FRONT_PATHS, BACK_PATHS, FRONT_VIEWBOX, BACK_VIEWBOX, musclesToSlugs, parseSecondaryMuscles } from "../../lib/muscle-diagram/paths";
import BodySvg from "./BodySvg";

// Compact per-exercise version of the body diagram: primary muscle red,
// secondary/assisting muscles orange. No Card chrome — meant to sit inline
// next to an exercise's video wherever the client already sees one.
export default function ExerciseMuscleDiagram({
  primary, secondaryCsv,
}: {
  primary?: string;
  secondaryCsv?: string;
}) {
  if (!primary) return null;

  const secondary = parseSecondaryMuscles(secondaryCsv).filter(m => m !== primary);

  const primaryFront = musclesToSlugs([primary], "front");
  const primaryBack = musclesToSlugs([primary], "back");
  const secondaryFront = new Set([...musclesToSlugs(secondary, "front")].filter(s => !primaryFront.has(s)));
  const secondaryBack = new Set([...musclesToSlugs(secondary, "back")].filter(s => !primaryBack.has(s)));

  const colorFor = (primarySet: Set<string>, secondarySet: Set<string>) => (slug: string) => {
    if (primarySet.has(slug)) return "fill-red-500 dark:fill-red-400";
    if (secondarySet.has(slug)) return "fill-orange-400 dark:fill-orange-300";
    return "fill-gray-300 dark:fill-gray-700";
  };

  return (
    <div className="flex items-start gap-2">
      <div className="w-16 sm:w-20">
        <BodySvg paths={FRONT_PATHS} viewBox={FRONT_VIEWBOX} colorFor={colorFor(primaryFront, secondaryFront)} />
      </div>
      <div className="w-16 sm:w-20">
        <BodySvg paths={BACK_PATHS} viewBox={BACK_VIEWBOX} colorFor={colorFor(primaryBack, secondaryBack)} />
      </div>
      <div className="flex flex-col gap-1 pt-1 text-[11px] text-gray-600 dark:text-gray-300">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 dark:bg-red-400 flex-shrink-0" />
          {primary}
        </span>
        {secondary.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-400 dark:bg-orange-300 flex-shrink-0" />
            {secondary.join(", ")}
          </span>
        )}
      </div>
    </div>
  );
}

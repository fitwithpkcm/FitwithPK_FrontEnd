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

  // Most muscle groups only live on one view (e.g. Chest/Biceps are front-only,
  // Back/Hamstrings are back-only) — show just that one, bigger, instead of two
  // cramped silhouettes. Only a handful of groups (Shoulders/Triceps/Calves)
  // span both; for those, front is the more recognizable default.
  const view = primaryFront.size > 0 ? "front" : "back";
  const paths = view === "front" ? FRONT_PATHS : BACK_PATHS;
  const viewBox = view === "front" ? FRONT_VIEWBOX : BACK_VIEWBOX;
  const primarySet = view === "front" ? primaryFront : primaryBack;
  const secondarySet = view === "front" ? secondaryFront : secondaryBack;

  const colorFor = (primarySet: Set<string>, secondarySet: Set<string>) => (slug: string) => {
    if (primarySet.has(slug)) return "fill-red-500 dark:fill-red-400";
    if (secondarySet.has(slug)) return "fill-orange-400 dark:fill-orange-300";
    return "fill-gray-300 dark:fill-gray-700";
  };

  return (
    <div className="flex items-start gap-3">
      <div className="w-24 sm:w-32 flex-shrink-0">
        <BodySvg paths={paths} viewBox={viewBox} colorFor={colorFor(primarySet, secondarySet)} />
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

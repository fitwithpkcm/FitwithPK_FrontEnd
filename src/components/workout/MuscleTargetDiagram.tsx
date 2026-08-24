import React from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { BodyPartPaths, FRONT_PATHS, BACK_PATHS, FRONT_VIEWBOX, BACK_VIEWBOX } from "../../lib/muscle-diagram/paths";

// Which artwork slugs light up for each of FitwithPK's MuscleGroup values.
// Cardio has no matching body region — represented only in the text caption below.
const MUSCLE_GROUP_TO_SLUGS: Record<string, { front?: string[]; back?: string[] }> = {
  Chest:      { front: ["chest", "upperChest", "lowerChest"] },
  Shoulders:  { front: ["deltoids", "frontDeltoid"], back: ["deltoids"] },
  Biceps:     { front: ["biceps"] },
  Triceps:    { front: ["triceps"], back: ["triceps"] },
  Back:       { back: ["upperBack", "lowerBack", "trapezius"] },
  Quads:      { front: ["quadriceps", "innerQuad", "outerQuad"] },
  Hamstrings: { back: ["hamstring"] },
  Glutes:     { back: ["gluteal"] },
  Calves:     { front: ["calves"], back: ["calves"] },
  Core:       { front: ["abs", "upperAbs", "lowerAbs", "obliques", "serratus"] },
};

function highlightedSlugs(muscleGroups: string[], view: "front" | "back"): Set<string> {
  const slugs = new Set<string>();
  for (const mg of muscleGroups) {
    const entry = MUSCLE_GROUP_TO_SLUGS[mg];
    const list = view === "front" ? entry?.front : entry?.back;
    list?.forEach(s => slugs.add(s));
  }
  return slugs;
}

function BodySvg({ paths, viewBox, active }: { paths: BodyPartPaths[]; viewBox: string; active: Set<string> }) {
  return (
    <svg viewBox={viewBox} className="w-full h-auto">
      {paths.map(part => {
        const isActive = active.has(part.slug);
        const fillClass = isActive
          ? "fill-emerald-500 dark:fill-emerald-400"
          : "fill-gray-300 dark:fill-gray-700";
        const allD = [...(part.common ?? []), ...(part.left ?? []), ...(part.right ?? [])];
        return (
          <g key={part.slug} className={fillClass}>
            {allD.map((d, i) => <path key={i} d={d} />)}
          </g>
        );
      })}
    </svg>
  );
}

export default function MuscleTargetDiagram({ muscleGroups }: { muscleGroups: string[] }) {
  if (muscleGroups.length === 0) return null;

  const front = highlightedSlugs(muscleGroups, "front");
  const back = highlightedSlugs(muscleGroups, "back");

  return (
    <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
      <CardHeader className="px-4 pt-4 pb-2">
        <p className="text-sm font-bold text-gray-900 dark:text-white">Today's Focus</p>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex items-start justify-center gap-4">
          <div className="w-28 sm:w-36">
            <BodySvg paths={FRONT_PATHS} viewBox={FRONT_VIEWBOX} active={front} />
          </div>
          <div className="w-28 sm:w-36">
            <BodySvg paths={BACK_PATHS} viewBox={BACK_VIEWBOX} active={back} />
          </div>
        </div>
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-3">
          {muscleGroups.join(" · ")}
        </p>
      </CardContent>
    </Card>
  );
}

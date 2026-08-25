import React from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { FRONT_PATHS, BACK_PATHS, FRONT_VIEWBOX, BACK_VIEWBOX, musclesToSlugs } from "../../lib/muscle-diagram/paths";
import BodySvg from "./BodySvg";

export default function MuscleTargetDiagram({ muscleGroups }: { muscleGroups: string[] }) {
  if (muscleGroups.length === 0) return null;

  const front = musclesToSlugs(muscleGroups, "front");
  const back = musclesToSlugs(muscleGroups, "back");
  const colorFor = (active: Set<string>) => (slug: string) =>
    active.has(slug) ? "fill-emerald-500 dark:fill-emerald-400" : "fill-gray-300 dark:fill-gray-700";

  return (
    <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
      <CardHeader className="px-4 pt-4 pb-2">
        <p className="text-sm font-bold text-gray-900 dark:text-white">Today's Focus</p>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex items-start justify-center gap-4">
          <div className="w-28 sm:w-36">
            <BodySvg paths={FRONT_PATHS} viewBox={FRONT_VIEWBOX} colorFor={colorFor(front)} />
          </div>
          <div className="w-28 sm:w-36">
            <BodySvg paths={BACK_PATHS} viewBox={BACK_VIEWBOX} colorFor={colorFor(back)} />
          </div>
        </div>
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-3">
          {muscleGroups.join(" · ")}
        </p>
      </CardContent>
    </Card>
  );
}

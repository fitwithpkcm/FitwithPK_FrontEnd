import moment from "moment";
import { IUpdatesForUser } from "../interface/IDailyUpdates";

/**
 * A day can only fairly be judged "missed" once it's fully over, so coaches
 * review the most recently completed day (yesterday), not the day in progress.
 */
export function getReviewDate(currentDate: Date = new Date()): string {
  return moment(currentDate).subtract(1, "days").format("DD-MM-YYYY");
}

/**
 * "Updated" = the user submitted a COMPLETE daily update for the review date.
 * Requirements:
 *  1. An IdStats row exists for that date specifically.
 *  2. Every required field is filled in (not just a partial submission).
 */
export function isDailyUpdateComplete(user: IUpdatesForUser, reviewDate: string): boolean {
  if (user.IdStats == null) return false;
  if (user.Day !== reviewDate) return false;
  return (
    user.Steps != null &&
    user.Water != null &&
    user.Diet_Follow != null &&
    (user.WorkOut_Follow != null || user.WorkOut != null) &&
    user.Weight != null &&
    user.Sleep != null
  );
}

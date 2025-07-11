import { httpCall } from "./HttpService";
import { API_URL } from "../common/Urls";
import { IWeeklyUpdatesForUser } from "@/interface/IWeeklyUpdates";
import { IUser } from "@/interface/models/User";
import { IUpdatesForUser } from "@/interface/IDailyUpdates";

export const getUserListForACoach = (params: unknown) => {
    return httpCall({
        url: API_URL.USER_LIST_FOR_COACH,
        method: "post",
        data: params
    }).then((response: ApiResponse<IUser[]>) => {
        return response;
    });
};

/**
 * 
 * @param params 
 * @returns 
 */
export const getUserListWithUpdates_ForCoach = (params: unknown) => {
    return httpCall({
        url: API_URL.USER_LIST_DUPDATES_FOR_COACH,
        method: "post",
        data: params
    }).then((response: ApiResponse<IUpdatesForUser[]>) => {
        return response;
    });
};

/**
 * 
 * @param params 
 * @returns 
 */
export const getUserListWithWeeklyUpdates_ForCoach = (params: unknown) => {
    return httpCall({
        url: API_URL.USER_LIST_WUPDATES_FOR_COACH,
        method: "post",
        data: params
    }).then((response: ApiResponse<IWeeklyUpdatesForUser[]>) => {
        return response;
    });
};

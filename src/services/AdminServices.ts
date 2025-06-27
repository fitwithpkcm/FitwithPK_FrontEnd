import { httpCall } from "./HttpService";
import { API_URL } from "../common/Urls";


export const getUserListForACoach = params => {
    return httpCall({
        url: API_URL.USER_LIST_FOR_COACH,
        method: "post",
        data: params
    }).then(response => {
        return response;
    });
};

/**
 * 
 * @param params 
 * @returns 
 */
export const getUserListWithUpdates_ForCoach = params => {
    return httpCall({
        url: API_URL.USER_LIST_DUPDATES_FOR_COACH,
        method: "post",
        data: params
    }).then(response => {
        return response;
    });
};


/**
 * 
 * @param params 
 * @returns 
 */
export const getUserListWithWeeklyUpdates_ForCoach = params => {
    return httpCall({
        url: API_URL.USER_LIST_WUPDATES_FOR_COACH,
        method: "post",
        data: params
    }).then(response => {
        return response;
    });
};


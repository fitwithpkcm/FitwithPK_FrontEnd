import { httpCall, httpUpload } from "./HttpService";
import { API_URL } from "../common/Urls";
import { IWeeklyUpdatesForUser } from "../interface/IWeeklyUpdates";
import { IUser, SuperAdminResponse } from "../interface/models/User";
import { IUpdatesForUser } from "../interface/IDailyUpdates";
import { ICoach } from "../interface/models/Coach";

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


export const setUpdateActiveStatus = (params: unknown) => {
    return httpCall({
        url: API_URL.APPROVE_USER,
        method: "post",
        data: params
    }).then((response: ApiResponse<unknown[]>) => {
        return response;
    });
};


// Keep FormData if this is a file upload
export const nutriInsert = (params: FormData) => {
    return httpUpload({
        url: API_URL.SET_FOOD,
        method: "post",
        data: params
    }).then((response: unknown) => {
        return response;
    });
};

export const addDietPlan = (params: unknown) => {
    return httpUpload({
        url: API_URL.ADD_DIET_PLAN,
        method: "post",
        data: params
    }).then((response: ApiResponse<{ FileName: string }[]>) => {
        return response;
    });
};

export const addCoach = (params: unknown) => {
    return httpUpload({
        url: API_URL.ADD_COACH,
        method: "post",
        data: params
    }).then((response: ApiResponse<unknown>) => {
        return response;
    });
};


export const getAllCoach = (params: unknown): Promise<ApiResponse<ICoach[]>> => {
    return httpCall({
        url: API_URL.GET_COACHALL_LIST,
        method: "post",
        data: params
    }).then((response: ApiResponse<ICoach[]>) => {
        return response;
    });
};


export const setCoachAssign = (params: unknown): Promise<ApiResponse<unknown>> => {
    return httpCall({
        url: API_URL.ASSIGN_COACH_STUDENT,
        method: "post",
        data: params
    }).then((response: ApiResponse<unknown>) => {
        return response;
    });
};

export const deleteCoachAssign = (params: unknown): Promise<ApiResponse<unknown>> => {
    return httpCall({
        url: API_URL.REMOVE_COACH_STUDENT,
        method: "post",
        data: params
    }).then((response: ApiResponse<unknown>) => {
        return response;
    });
};


export const isSuperAdminApi = (params: unknown): Promise<ApiResponse<SuperAdminResponse>> => {
    return httpCall({
        url: API_URL.IS_SUPER_ADMIN,
        method: "post",
        data: params
    }).then((response: ApiResponse<SuperAdminResponse>) => {
        return response;
    });
};

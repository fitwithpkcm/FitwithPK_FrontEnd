import { httpCall } from "./HttpService";
import { API_URL } from "../common/Urls";
import { CoachStudentAssign, ICoach } from "../interface/models/Coach";
import { IUser } from "../interface/models/User";

export const getMyCoachDetails = (params: unknown) => {
    return httpCall({
        url: API_URL.GET_COACH_DETAILS,
        method: "post",
        data: params
    }).then((response: ApiResponse<ICoach>) => {
        return response;
    });
};

// id will be get from token
export const getLoggedUserDetails = (params: unknown) => {
    return httpCall({
        url: API_URL.USERLIST,
        method: "post",
        data: params
    }).then((response: ApiResponse<Partial<IUser[]>>) => {
        return response;
    });
};


export const getAlreadyAssignedList = (params: unknown) => {
    return httpCall({
        url: API_URL.ASSIGNED_COACH_LIST,
        method: "post",
        data: params
    }).then((response: ApiResponse<CoachStudentAssign[]>) => {
        return response;
    });
};

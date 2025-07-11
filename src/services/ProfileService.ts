import { httpCall, httpUpload } from "./HttpService";
import { API_URL } from "../common/Urls";
import { ICoach } from "@/interface/models/Coach";
import { IUser } from "@/interface/models/User";

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
    }).then((response: ApiResponse<Partial<IUser>>) => {
        return response;
    });
};

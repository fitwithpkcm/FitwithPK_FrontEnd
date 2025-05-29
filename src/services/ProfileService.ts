import { httpCall,httpUpload } from "./HttpService";
import { API_URL } from "../common/Urls";


export const getMyCoachDetails = params => {
    return httpCall({
        url: API_URL.GET_COACH_DETAILS,
        method: "post",
        data: params
    }).then(response => {
        return response;
    });
};

//id will be get from token
export const getLoggedUserDetails = params => {
    return httpCall({
        url: API_URL.USERLIST,
        method: "post",
        data: params
    }).then(response => {
        return response;
    });
};

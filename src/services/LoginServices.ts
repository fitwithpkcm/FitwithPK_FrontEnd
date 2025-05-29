import { httpCall,httpUpload} from "./HttpService";
import { API_URL } from "../common/Urls";

export const login = params => {
    return httpCall({
        url: API_URL.LOGIN,
        method: "post",
        data: params
    }).then(response => {
        return response;
    });
};

export const registerUser = params => {
    return httpCall({
        url: API_URL.REGISTRATION,
        method: "post",
        data: params
    }).then(response => {
        return response;
    });
};


export const onBoardProfileAttributeUpdates = params => {
    return httpCall({
        url: API_URL.ONBOARD_PROFILE_ATTRIBUTE_UPDATE,
        method: "post",
        data: params
    }).then(response => {
        return response;
    });
};

export const onBoardFileUpload = params => {
    return httpUpload({
        url: API_URL.ONBOARD_FILE_UPLOAD,
        method: "post",
        data: params
    }).then(response => {
        return response;
    });
};

export const fetchOnBoardUserAttributes = params => {
    return httpCall({
        url: API_URL.ONBOARD_PROFILE_ATTRIBUTE_UPDATE,
        method: "get",
        data: params
    }).then(response => {
        return response;
    });
};


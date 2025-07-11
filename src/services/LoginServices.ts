import { httpCall, httpUpload } from "./HttpService";
import { API_URL } from "../common/Urls";
import { ILoginUserData } from "@/interface/ILoginUserData";

/* export const login = params => {
    return httpCall({
        url: API_URL.LOGIN,
        method: "post",
        data: params
    }).then(response => {
        return response;
    });
}; */


export const login = (params: unknown = null) => {
    return httpCall({
        url: API_URL.LOGIN,
        method: "post",
        data: params
    }).then((response: ApiResponse<ILoginUserData>) => {
        return response;
    });
};

export const validateToken = (params: unknown) => {
    return httpCall({
        url: API_URL.VALIDATE_TOKEN_USERTYPE,
        method: "post",
        data: params
    }).then((response: unknown) => {
        return response;
    });
};

export const registerUser = (params: unknown) => {
    return httpCall({
        url: API_URL.REGISTRATION,
        method: "post",
        data: params
    }).then((response: unknown) => {
        return response;
    });
};

export const onBoardProfileAttributeUpdates = (params: unknown) => {
    return httpCall({
        url: API_URL.ONBOARD_PROFILE_ATTRIBUTE_UPDATE,
        method: "post",
        data: params
    }).then((response: unknown) => {
        return response;
    });
};

// Keep FormData here as it's a specific known type
export const onBoardFileUpload = (params: FormData) => {
    return httpUpload({
        url: API_URL.ONBOARD_FILE_UPLOAD,
        method: "post",
        data: params
    }).then((response: unknown) => {
        return response;
    });
};

// null is fine for default value; still keep param as `unknown`
export const fetchOnBoardUserAttributes = (params: unknown = null) => {
    return httpCall({
        url: API_URL.ONBOARD_PROFILE_ATTRIBUTE_UPDATE,
        method: "get",
        data: params
    }).then((response: unknown) => {
        return response;
    });
};

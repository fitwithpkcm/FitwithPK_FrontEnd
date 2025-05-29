
import { httpCall } from "./HttpService";
import { API_URL } from "../common/Urls";


export const getFoodBasedOnCatergoryApi = params => {
    return httpCall({
        url: API_URL.GET_FOOD_CATERGORY_BASEDLIST,
        method: "post",
        data: params
    }).then(response => {
        return response;
    });
};

export const getSwappedNutriProducts = params => {
    return httpCall({
        url: API_URL.GET_FOOD_SWAPPED,
        method: "post",
        data: params
    }).then(response => {
        return response;
    });
};

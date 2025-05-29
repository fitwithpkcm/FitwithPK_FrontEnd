// Login

export const BASE_URL = "https://api.fitwithpk.com"

export const LOGIN_REQUEST = "LOGIN_REQUEST";
export const LOGIN_SUCCESS = "LOGIN_SUCCESS";
export const LOGIN_FAILED = "LOGIN_FAILED";
export const LOGOUT = "LOGOUT"
export const SET_TYPES = "SET_TYPES"
export const SET_LATEST_ARTICLES = "SET_LATEST_ARTICLES"
export const SET_ADDS = "SET_ADDS"
export const START_LOADING = "START_LOADING"
export const STOP_LOADING = "STOP_LOADING"
export const STATUS_CODES = {
    HTTP_400: 400,
    HTTP_401: 401,
    HTTP_403: 403,
    HTTP_404: 404,
    HTTP_409: 409,
    HTTP_422: 422,
    HTTP_500: 500,
    HTTP_501: 501,
};

export const colors = [
    { name: 'Red', code: 'red' },
    { name: 'Green', code: 'green' },
    { name: 'Yellow', code: 'yellow' },
    { name: 'Blue', code: 'blue' },
    { name: 'Purple', code: 'purple' },
    { name: 'Cyan', code: 'cyan' },
    { name: 'Brown', code: 'brown' },
];




export const UNITS = Object.freeze({
    WEIGHT: Object.freeze({
        KILO: "kg",
        POUND: "lbs"
    }),
    HEIGHT: Object.freeze({
        INCH: "in",
        CENTI: "cm"
    })
});


export const USER_TARGET = Object.freeze({
    DAILY_TARGET: Object.freeze({
        SLEEP: 8,
        WATER: 4,
        STEPS: 10000,
    }),
});




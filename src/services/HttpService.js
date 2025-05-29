import axios from "axios";
import { ManageLocalStorage } from "./Localstorage"
axios.defaults.headers.post["Content-Type"] = "application/json";
axios.defaults.headers.put["Accept"] = "application/json";
export const httpCall = async payload => {
  let config = {};
  let userData = ManageLocalStorage.get("userData")
  userData = userData ? JSON.parse(userData) : {};
  let token = userData.token
    ? userData.token
    : "";
  config.headers = { Token: token };
  config.method = payload.method ? payload.method : "get";
  config.url = payload.url ? payload.url : "";
  if (payload.data) {
    config.data = payload.data;
    // config.data = JSON.stringify(payload.data);
  }
  return axios(config);
  //   if(payload.method==='put'){
  //     config.data=payload.data
  //   }else{
  //   config.data =JSON.stringify(payload.data);
  //   }
  //   return axios(config);
}


export const httpUpload = (payload) => {
  let config = {};
  let userData = ManageLocalStorage.get("userData")
  userData = userData ? JSON.parse(userData) : {};
  let token = userData.token
    ? userData.token
    : "";
  config.headers = {
    Token: token,
    "Content-Type": "multipart/form-data"
  };
  config.method = "post";
  config.url = payload.url ? payload.url : "";
  config.data = payload.data;
  //if (payload.data) config.data = JSON.stringify(payload.data);
  return axios(config);
}

export const setBaseUrl = (baseUrl) => {
  axios.defaults.baseURL = baseUrl;
}

export const getBaseUrl = () => {
  return axios.defaults.baseURL
}


export const httpInterceptor = () => {

  axios.interceptors.response.use(
    function (response) {
      return response;
    },
    function (error) {
      if (error.request.status === 401) {
        ManageLocalStorage.clear();
        window.location.reload();
      } else {
        return error;
      }
    }
  );

}


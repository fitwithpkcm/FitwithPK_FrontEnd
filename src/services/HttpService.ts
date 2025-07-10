import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import { ManageLocalStorage } from "./Localstorage";

axios.defaults.headers.post["Content-Type"] = "application/json";
axios.defaults.headers.put["Accept"] = "application/json";

interface HttpPayload {
  method?: "get" | "post" | "put" | "delete" | "patch";
  url: string;
  data?: unknown;
}

interface UserData {
  token?: string;
  [key: string]: unknown;
}

export const httpCall = async (payload: HttpPayload): Promise<AxiosResponse> => {
  const config: AxiosRequestConfig = {};
  const userDataString = ManageLocalStorage.get("userData");
  const userData: UserData = userDataString ? JSON.parse(userDataString) : {};
  const token = userData.token ? userData.token : "";
  
  config.headers = { Token: token };
  config.method = payload.method ? payload.method : "get";
  config.url = payload.url ? payload.url : "";
  
  if (payload.data) {
    config.data = payload.data;
  }
  
  return axios(config);
};

export const httpUpload = (payload: HttpPayload): Promise<AxiosResponse> => {
  const config: AxiosRequestConfig = {};
  const userDataString = ManageLocalStorage.get("userData");
  const userData: UserData = userDataString ? JSON.parse(userDataString) : {};
  const token = userData.token ? userData.token : "";
  
  config.headers = {
    Token: token,
    "Content-Type": "multipart/form-data"
  };
  config.method = "post";
  config.url = payload.url ? payload.url : "";
  config.data = payload.data;
  
  return axios(config);
};

export const setBaseUrl = (baseUrl: string): void => {
  axios.defaults.baseURL = baseUrl;
};

export const getBaseUrl = (): string | undefined => {
  return axios.defaults.baseURL;
};

export const httpInterceptor = (): void => {
  axios.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        ManageLocalStorage.clear();
        window.location.reload();
      }
      return Promise.reject(error);
    }
  );
};
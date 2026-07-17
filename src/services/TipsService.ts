import { httpCall } from "./HttpService";
import { API_URL } from "../common/Urls";

export const getDailyTip = () =>
  httpCall({ method: "post", url: API_URL.GET_DAILY_TIP, data: {} });

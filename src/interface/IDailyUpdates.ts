
export interface IDailyStats {
  IdStats?: number,
  Day?: string,
  Steps?: number,
  Water?: number,
  Diet_Follow?: 0|1|2|3|4|5,
  WorkOut_Follow?: 0|1|2|3|4|5,
  Weight?: number,
  Sleep?: number,
  Notes?: string
  IdUser?: number,
  WeekDay?: string;
  Steps_Percent?: number;
  Sleep_Percent?: number;
  Water_Percent?: number;
}


export interface IDailyStats {
  IdStats?: number,
  Day?: string,
  DayDate?:string|null, //alternative added for Day becuase of sql query
  Steps?: number,
  Water?: number,
  Diet_Follow?: 0|1|2|3|4|5,
  WorkOut_Follow?: 0|1|2|3|4|5,
  WorkOut?: 0|1|2|3|4|5,//alternative added for WorkOut_Follow becuase of sql query
  Weight?: number,
  Sleep?: number,
  Notes?: string
  IdUser?: number,
  WeekDay?: string;
  Steps_Percent?: number;
  Sleep_Percent?: number;
  Water_Percent?: number;
}


export interface IUpdatesForUser extends IDailyStats{
  FirstName:string,
  LastName:string,
}
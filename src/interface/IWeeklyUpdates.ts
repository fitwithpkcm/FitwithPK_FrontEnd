
export interface IWeeklyStats {
  IdWeeklyStats?: number,
  Weight: number,
  Waist: number,
  BodyFat: number,
  BodyHip: number,
  Neck: number,
  Chest: number,
  UpperArm: number,
  Quadriceps: number,
  FileName?: string,
  DateRange?: string,
  IdUser: number
}

export interface IWeeklyStatsExtended extends IWeeklyStats {
  WeightDifference?: number,
  WaistDifference?: number,
  BodyFatDifference?: number,
  BodyHipDifference?: number,
  NeckDifference?: number,
  ChestDifference?: number,
  UpperArmDifference?: number,
  QuadricepsDifference?: number,
}



export interface IWeeklyUpdatesForUser extends IWeeklyStatsExtended{
  FirstName:string,
  LastName:string,
}
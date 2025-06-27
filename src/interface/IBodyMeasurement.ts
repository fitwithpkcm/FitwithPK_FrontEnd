export interface IBodyMeasurement {
    IdWeeklyStats?: number|string,
    Weight?: number,
    Waist?: number,
    BodyFat?: number,
    BodyHip?: number,
    Neck?: number,
    Chest?: number,
    UpperArm?: number,
    Quadriceps?: number,
    FileName?: string[],
    WeeklyFile?:string[],
    DateRange?: string,
    IdUser?: number
}
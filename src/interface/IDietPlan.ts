export interface IdDietPlan {
    IdDiet: number
    DietName: string
    FileName: { diet_plan: string; workout_plan: string }; 
    CreatedBy: string
    IdUser: number
    Targets: Targets,
    FeedBack:string
}

export interface Targets {
    sleep: number | 8
    steps: number | 100
    water: number | 1
}

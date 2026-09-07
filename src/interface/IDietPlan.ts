export interface IdDietPlan {
    IdDiet: number
    DietName: string
    FileName: { diet_plan: string; workout_plan: string }; 
    CreatedBy: string
    IdUser: number
    Targets: Targets,
    FeedBack:string
}

import { NutritionTarget } from "../lib/nutrition";

export interface Targets {
    sleep: number | 8
    steps: number | 100
    water: number | 1
    // Coach-set daily calorie + macro target, derived from the client's latest
    // weekly measurement. Optional — absent for clients whose coach hasn't set one.
    nutrition?: NutritionTarget
}

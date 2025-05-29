export interface IMainBodyAttributes {
  height: number;
  weight: number;
  target_weight?: number;
}

//interface used for storing profile details on user onboarding to fitwithpk 
export interface IUserOnBoardAttributes {
  age?: number;
  gender?: string;
  profession?: string;
  location?: string;
  height?: number;
  weight?: number;
  waist?: number;
  hip?: number;
  chest?: number;
  neck?: number;
  biceps?: number;
  quadriceps?: number;
  dietType?: string;
  morningMeal?: string;
  breakfast?: string;
  lunch?: string;
  eveningSnack?: string;
  dinner?: string;
  skipMeals?: string;
  dietaryRestrictions?: string;
  dislikedFoods?: string;
  smokingDrinking?: string;
  sleepHours?: string;
  stressLevel?: string;
  activityLevel?: string;
  currentExercise?: string;
  workoutPreference?: string;
  workoutAvailability?: string;
  medicalConditions?: string;
  medications?: string;
  supplementWillingness?: string;
  recentBloodTest?: boolean;
  uploadFileNames?:string,
  fitnessGoals?: string;
  biggestChallenge?: string;
  challengingHabits?: string;
  pastDietExperience?: string;
  pastCoachExperience?: string;
  motivation?: string;
}

export interface IprofileInfo {
  Address?: string;
  Profession?: string;
  DateOfBirth?: string;
  MainBodyAttributes?: IMainBodyAttributes;
  OnBoardUserAttributes?: IUserOnBoardAttributes;
}

export interface IUser extends IprofileInfo {
  IdUser?: number;
  FirstName?: string;
  LastName?: string;
  EmailID?: string;
  Password?: string;
  Mobile?: string;
  IsUser?: number;
  IsAdmin?: number;
  IsSuperAdmin?: number;
  DeleteStatus?: 0 | 1;
  LoginType?: string;
  ApproveStatus: "Y" | "N";

}


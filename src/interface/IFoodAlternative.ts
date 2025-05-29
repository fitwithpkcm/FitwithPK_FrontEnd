
export interface IFoodAlternative {
  name: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar:number;
  imageUrl?: string;
  benefits: string[];
  health_score:number,
  note?:string,
  category?:string,
};


export interface IFoodCatergory {
  Protein: IFoodAlternative[]
  Fat: IFoodAlternative[]
  Carbs:IFoodAlternative[]
}
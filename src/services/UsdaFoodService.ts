import { USDA_FDC_API_KEY, USDA_FDC_BASE_URL } from "../common/Constant";

export interface IUsdaNutrient {
  nutrientId: number;
  nutrientName: string;
  unitName: string;
  value: number;
}

export interface IUsdaSearchResult {
  fdcId: number;
  description: string;
  dataType: string;
  foodNutrients: IUsdaNutrient[];
}

export interface IUsdaMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
}

// Standard USDA FoodData Central nutrient IDs (same across Foundation/SR Legacy/Branded results)
const NUTRIENT_IDS = {
  calories: [1008],
  protein: [1003],
  carbs: [1005],
  fat: [1004],
  fiber: [1079],
  sugar: [2000],
};

function pickNutrient(nutrients: IUsdaNutrient[], ids: number[]): number {
  const match = nutrients.find(n => ids.includes(n.nutrientId));
  return match ? Math.round(match.value * 10) / 10 : 0;
}

export function extractMacrosPer100g(food: IUsdaSearchResult): IUsdaMacros {
  const nutrients = food.foodNutrients ?? [];
  return {
    calories: pickNutrient(nutrients, NUTRIENT_IDS.calories),
    protein: pickNutrient(nutrients, NUTRIENT_IDS.protein),
    carbs: pickNutrient(nutrients, NUTRIENT_IDS.carbs),
    fat: pickNutrient(nutrients, NUTRIENT_IDS.fat),
    fiber: pickNutrient(nutrients, NUTRIENT_IDS.fiber),
    sugar: pickNutrient(nutrients, NUTRIENT_IDS.sugar),
  };
}

export const searchUsdaFoods = async (query: string): Promise<IUsdaSearchResult[]> => {
  const params = new URLSearchParams({
    api_key: USDA_FDC_API_KEY,
    query,
    pageSize: "10",
  });
  params.append("dataType", "Foundation");
  params.append("dataType", "SR Legacy");
  params.append("dataType", "Branded");

  const res = await fetch(`${USDA_FDC_BASE_URL}/foods/search?${params.toString()}`);
  if (!res.ok) {
    throw new Error(res.status === 429 ? "USDA rate limit reached — try again later" : `USDA search failed (${res.status})`);
  }
  const data = await res.json();
  return (data.foods ?? []) as IUsdaSearchResult[];
};

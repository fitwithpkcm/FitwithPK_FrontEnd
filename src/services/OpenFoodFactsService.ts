// Open Food Facts — free, open, community-maintained database of packaged food
// products (https://github.com/openfoodfacts). Nutrition values are already
// structured per-100g JSON data, not read from a photo, so there's no OCR/decimal
// misread risk the way there is with a label-photo scanner.
//
// The browser can't call world.openfoodfacts.org directly (no CORS headers on
// their search endpoint), so this goes through our own backend proxy instead.

import { httpCall } from "./HttpService";
import { API_URL } from "../common/Urls";

export interface IOffNutriments {
  "energy-kcal_100g"?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
  fiber_100g?: number;
  sugars_100g?: number;
}

export interface IOffProduct {
  code: string;
  product_name?: string;
  brands?: string;
  image_front_small_url?: string;
  nutriments?: IOffNutriments;
}

export interface IOffMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
}

function round1(value: number | undefined): number {
  return typeof value === "number" ? Math.round(value * 10) / 10 : 0;
}

export function extractOffMacrosPer100g(product: IOffProduct): IOffMacros {
  const n = product.nutriments ?? {};
  return {
    calories: round1(n["energy-kcal_100g"]),
    protein: round1(n.proteins_100g),
    carbs: round1(n.carbohydrates_100g),
    fat: round1(n.fat_100g),
    fiber: round1(n.fiber_100g),
    sugar: round1(n.sugars_100g),
  };
}

export const searchOpenFoodFacts = async (query: string): Promise<IOffProduct[]> => {
  const res = await httpCall({
    method: "post",
    url: API_URL.SEARCH_OPEN_FOOD_FACTS,
    data: { Query: query },
  }) as { data: { success: boolean; message: string; data: IOffProduct[] } };

  if (!res.data?.success) {
    throw new Error(res.data?.message || "Open Food Facts search failed");
  }

  const products = res.data.data ?? [];
  // Skip entries with no usable macro data at all
  return products.filter(p => p.nutriments && (p.nutriments["energy-kcal_100g"] || p.nutriments.proteins_100g));
};

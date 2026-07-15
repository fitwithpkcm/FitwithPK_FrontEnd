import React, { useEffect, useState } from "react";
import { MobileNav } from "../../components/layout/mobile-nav";
import { PageHeader } from "../../components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import { useToast } from "../../hooks/use-toast";
import { setBaseUrl } from "../../services/HttpService"
import {
  Check,
  ChevronsUpDown,
  FileText,
  Flame,
  Leaf,
  Salad,
  Utensils,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "../../components/ui/command";
import { cn } from "../../lib/utils";
import { BASE_URL } from "../../common/Constant";
import { useMutation, useQuery } from "@tanstack/react-query";
import { IFoodCatergory } from "../../interface/IFoodAlternative";
import { getFoodBasedOnCatergoryApi, getSwappedNutriProducts } from "../../services/FoodService";



// Food nutrition data with comparisons
type FoodAlternative = {
  name: string;
  quantity: string;
  grams?: number; // equivalent amount of THIS food needed to match the base food's nutrition (alternatives only)
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  imageUrl?: string;
  benefits: string[];
  health_score: number,
  note?: string,
  category?: string,
};


// ── NutrientTile — one nutrient cell in the alternative comparison grid ──

function NutrientTile({ label, value, unit, baseValue, lowerIsBetter }: {
  label: string;
  value: number;
  unit: string;
  baseValue: number;
  lowerIsBetter?: boolean;
}) {
  const diff = value - baseValue;
  const pct = Math.round((Math.abs(diff) / Math.max(1, Math.abs(baseValue))) * 100);
  const isBetter = lowerIsBetter ? diff < 0 : diff > 0;

  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-gray-500 dark:text-gray-400">{label}</span>
        {diff === 0 ? (
          <Badge variant="outline" className="text-blue-500 border-blue-200 bg-blue-50 dark:bg-blue-900/20 text-[10px] h-4">Same</Badge>
        ) : (
          <Badge
            variant="outline"
            className={`text-[10px] h-4 ${
              isBetter
                ? "text-green-500 border-green-200 bg-green-50 dark:bg-green-900/20"
                : "text-amber-500 border-amber-200 bg-amber-50 dark:bg-amber-900/20"
            }`}
          >
            {diff > 0 ? "+" : "-"}{pct}%
          </Badge>
        )}
      </div>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">{value}{unit}</p>
    </div>
  );
}

export default function NutritionPage() {
  const { toast } = useToast();
  const [activeNutrient, setActiveNutrient] = useState<keyof IFoodCatergory>("Protein");
  const [nutritionGoal, setNutritionGoal] = useState<"fat-loss" | "muscle-gain" | "maintenance">("maintenance");

  const [comboOpen, setComboOpen] = useState(false);
  const [foodItem, setFoodItem] = useState<FoodAlternative | null>(null);
  const [quantity, setQuantity] = useState<string | null>("");
  const [selectedAlternative, setSelectedAlternative] = useState<FoodAlternative | null>(null);
  const [showBenefitsDialog, setShowBenefitsDialog] = useState(false);
  const [selectedFoodInfo, setSelectedFoodInfo] = useState<{
    baseInfo: FoodAlternative,
    alternatives: FoodAlternative[]
  } | null>(null);
  const [showResults, setShowResults] = useState(false);

  //constructor basil
  useEffect(() => {
    setBaseUrl(BASE_URL);
  }, []);


  /**
* author : basil1112
* Fetch daily updates
*/
  const { data: foodListBasedOnCatergory } = useQuery<IFoodCatergory>({
    queryKey: ["foodcatergory_list"],
    queryFn: () => getFoodBasedOnCatergoryApi(null).then((res: unknown) => {
      const resposne = res as ApiResponse<IFoodCatergory>;
      return resposne.data.data
    })
  });

  const getSwapProductsMutation = useMutation({
    mutationFn: async ({ food, weight, foodType, nutritionGoal, resolvedFoodItem }: { food: string; weight: string | null, foodType: string | null, nutritionGoal: "fat-loss" | "muscle-gain" | "maintenance", resolvedFoodItem: FoodAlternative }) => {
      const currentFoodItem = {
        Food: food,
        Quantity: weight,
        FoodType: foodType,
        NutritionGoal: nutritionGoal
      };

      try {
        const res = await getSwappedNutriProducts(currentFoodItem);
        const response = res as ApiResponse<FoodAlternative[]>;
        if (response.data.success) {
          return {
            swappedData: response.data.data,
            originalFood: resolvedFoodItem,
          };
        }
        throw new Error("Swap operation was not successful");
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Failed to swap products");
      }
    },
    onSuccess: (data) => {

      setSelectedFoodInfo({
        baseInfo: data.originalFood,
        alternatives: data.swappedData
      });


      setShowResults(true);

      toast({
        title: "Food items swapped successfully",
        description: "Your food items have been swapped successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to swap food items",
        description: error.message,
        variant: "destructive",
      });
    },
  });



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!foodItem) {
      toast({ title: "Please select a food item from the list", variant: "destructive" });
      return;
    }

    getSwapProductsMutation.mutate({
      food: foodItem.name,
      weight: quantity,
      foodType: activeNutrient,
      nutritionGoal,
      resolvedFoodItem: foodItem,
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <PageHeader title="NutriSwap" subtitle="One-tap healthy food alternatives" />

      <main className="flex-1 overflow-y-auto px-4 py-6 pb-28 sm:px-6 bg-gray-50 dark:bg-gray-950">
        <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 mb-6">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-center">Food Replacement Calculator</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Nutrient selection tabs */}
            <Tabs
              value={activeNutrient}
              onValueChange={(value) => {
                setActiveNutrient(value as "Carbs" | "Protein" | "Fat");
                setFoodItem(null);
                setQuantity(null);
                setShowResults(false);
              }}
              className="w-full"
            >
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="Carbs">Carbs</TabsTrigger>
                <TabsTrigger value="Protein">Protein</TabsTrigger>
                <TabsTrigger value="Fat">Fat</TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Food item combobox */}
              <div className="space-y-2">
                <Label>Food Item</Label>
                <Popover open={comboOpen} onOpenChange={setComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={comboOpen}
                      className="w-full justify-between font-normal"
                    >
                      {foodItem ? foodItem.name : "Search food…"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Type to filter foods…" />
                      <CommandList>
                        <CommandEmpty>No foods found.</CommandEmpty>
                        <CommandGroup>
                          {(foodListBasedOnCatergory?.[activeNutrient] ?? []).map((item, idx) => (
                            <CommandItem
                              key={idx}
                              value={item.name}
                              onSelect={() => {
                                setFoodItem(item as unknown as FoodAlternative);
                                setComboOpen(false);
                                setShowResults(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", foodItem?.name === item.name ? "opacity-100" : "opacity-0")} />
                              {item.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Quantity input */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity (grams)</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="e.g., 100"
                  value={quantity ? quantity : ""}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Nutrition Goal selection */}
              <div className="space-y-2">
                <Label htmlFor="nutritionGoal">Your Fitness Goal</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={nutritionGoal === "fat-loss" ? "default" : "outline"}
                    className={`flex flex-col items-center justify-center h-[70px] ${nutritionGoal === "fat-loss" ? "bg-rose-500 hover:bg-rose-600 border-rose-500" : "border-gray-200 dark:border-gray-700"}`}
                    onClick={() => setNutritionGoal("fat-loss")}
                  >
                    <Flame className="h-4 w-4 mb-1.5" />
                    <span className="text-xs font-medium">Fat Loss</span>
                  </Button>
                  <Button
                    type="button"
                    variant={nutritionGoal === "muscle-gain" ? "default" : "outline"}
                    className={`flex flex-col items-center justify-center h-[70px] ${nutritionGoal === "muscle-gain" ? "bg-blue-500 hover:bg-blue-600 border-blue-500" : "border-gray-200 dark:border-gray-700"}`}
                    onClick={() => setNutritionGoal("muscle-gain")}
                  >
                    <div className="text-[18px] mb-1">💪</div>
                    <span className="text-xs font-medium">Muscle Gain</span>
                  </Button>
                  <Button
                    type="button"
                    variant={nutritionGoal === "maintenance" ? "default" : "outline"}
                    className={`flex flex-col items-center justify-center h-[70px] ${nutritionGoal === "maintenance" ? "bg-green-500 hover:bg-green-600 border-green-500" : "border-gray-200 dark:border-gray-700"}`}
                    onClick={() => setNutritionGoal("maintenance")}
                  >
                    <div className="text-[18px] mb-1">⚖️</div>
                    <span className="text-xs font-medium">Maintenance</span>
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={!foodItem || getSwapProductsMutation.isPending}>
                {getSwapProductsMutation.isPending ? "Calculating…" : "Calculate Alternatives"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results section */}
        {showResults && (
          <div className="space-y-6 pb-16">
            {selectedFoodInfo ? (
              <>
                {/* Original food item card */}

                <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
                  <div className="relative">
                    {selectedFoodInfo?.baseInfo?.imageUrl && (
                      <div className="w-full h-48 relative">
                        <img
                          src={selectedFoodInfo.baseInfo.imageUrl}
                          alt={foodItem?.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      </div>
                    )}
                    <div className={`p-5 ${selectedFoodInfo.baseInfo.imageUrl ? '-mt-16 relative z-10' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold text-white dark:text-white">{selectedFoodInfo.baseInfo.name}</h3>
                          <p className="text-gray-200 dark:text-gray-300">{quantity || "100"}g serving</p>
                        </div>
                        <Badge className="bg-primary-500 hover:bg-primary-600">{activeNutrient}</Badge>
                      </div>

                      {selectedFoodInfo.baseInfo.calories > 0 && (
                      <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="bg-black/20 backdrop-blur-sm p-3 rounded-lg">
                          <div className="flex items-center text-white">
                            <Flame className="w-4 h-4 mr-2" />
                            <span className="text-sm">Calories</span>
                          </div>
                          <p className="text-lg font-semibold text-white mt-1">{selectedFoodInfo.baseInfo.calories}</p>
                        </div>
                        <div className="bg-black/20 backdrop-blur-sm p-3 rounded-lg">
                          <div className="flex items-center text-white">
                            <Utensils className="w-4 h-4 mr-2" />
                            <span className="text-sm">Protein</span>
                          </div>
                          <p className="text-lg font-semibold text-white mt-1">{selectedFoodInfo.baseInfo.protein}g</p>
                        </div>
                        <div className="bg-black/20 backdrop-blur-sm p-3 rounded-lg">
                          <div className="flex items-center text-white">
                            <Salad className="w-4 h-4 mr-2" />
                            <span className="text-sm">Carbs</span>
                          </div>
                          <p className="text-lg font-semibold text-white mt-1">{selectedFoodInfo.baseInfo.carbs}g</p>
                        </div>
                        <div className="bg-black/20 backdrop-blur-sm p-3 rounded-lg">
                          <div className="flex items-center text-white">
                            <Leaf className="w-4 h-4 mr-2" />
                            <span className="text-sm">Fat</span>
                          </div>
                          <p className="text-lg font-semibold text-white mt-1">{selectedFoodInfo.baseInfo.fat}g</p>
                        </div>
                      </div>
                      )}
                    </div>
                  </div>
                </Card>


                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-6">One-Tap NutriSwap Options</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Tap any alternative to see detailed nutrition comparison
                </p>

                {selectedFoodInfo.alternatives.length === 0 && (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                    <p className="text-sm">No alternatives found for <strong className="text-gray-600 dark:text-gray-300">{selectedFoodInfo.baseInfo.name}</strong>.</p>
                    <p className="text-xs mt-1">Try selecting a different food from the list.</p>
                  </div>
                )}

                {/* Alternatives */}
                <div className="space-y-4">
                  {selectedFoodInfo.alternatives.map((alt, idx) => (
                    <Card
                      key={idx}
                      className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 overflow-hidden"
                    >
                      <div className="p-4 sm:p-5">
                        {/* header: thumbnail + name + eat-amount callout + details button */}
                        <div className="flex items-start gap-3">
                          {alt.imageUrl ? (
                            <img
                              src={`${BASE_URL}/uploads/nutriimg/${alt.imageUrl}`}
                              alt={alt.name}
                              className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-gray-100 dark:border-gray-800"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                              <Salad className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">{alt.name}</h3>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 flex-shrink-0 -mt-1"
                                onClick={() => {
                                  setSelectedAlternative(alt);
                                  setShowBenefitsDialog(true);
                                }}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </div>

                            {typeof alt.grams === "number" ? (
                              <div className="inline-flex items-baseline gap-1.5 mt-1.5 px-2.5 py-1 rounded-lg bg-primary-50 dark:bg-primary-900/20">
                                <span className="text-lg font-extrabold text-primary-600 dark:text-primary-400 leading-none">{alt.grams}g</span>
                                <span className="text-[11px] text-primary-700/80 dark:text-primary-300/80">
                                  to match your {quantity || "100"}g {selectedFoodInfo.baseInfo.name}
                                </span>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 mt-1">Serving size unavailable</p>
                            )}
                          </div>
                        </div>

                        {/* Nutrition comparison */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
                          <NutrientTile label="Calories" value={alt.calories} unit="" baseValue={selectedFoodInfo.baseInfo.calories} lowerIsBetter />
                          <NutrientTile label="Protein" value={alt.protein} unit="g" baseValue={selectedFoodInfo.baseInfo.protein} />
                          <NutrientTile label="Carbs" value={alt.carbs} unit="g" baseValue={selectedFoodInfo.baseInfo.carbs} lowerIsBetter />
                          <NutrientTile label="Fat" value={alt.fat} unit="g" baseValue={selectedFoodInfo.baseInfo.fat} lowerIsBetter />
                          <NutrientTile label="Fiber" value={alt.fiber} unit="g" baseValue={selectedFoodInfo.baseInfo.fiber} />
                        </div>

                        {/* Benefits */}
                        {alt.benefits?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {alt.benefits.slice(0, 3).map((benefit, i) => (
                              <Badge key={i} variant="secondary" className="bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-[10px] font-normal">
                                {benefit}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <p>No alternatives found for this food item.</p>
                <p className="mt-2">Try another item from the {activeNutrient} category.</p>
              </div>
            )}
          </div>
        )}
      </main>

      <MobileNav />

      {/* Benefits Dialog */}
      <Dialog open={showBenefitsDialog} onOpenChange={setShowBenefitsDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Benefits of {selectedAlternative?.name}</DialogTitle>
            <DialogDescription>
              These health benefits make {selectedAlternative?.name} a great alternative to {foodItem?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-4">
              {typeof selectedAlternative?.grams === "number" && (
                <div className="flex items-baseline gap-1.5 px-3 py-2 rounded-lg bg-primary-50 dark:bg-primary-900/20">
                  <span className="text-xl font-extrabold text-primary-600 dark:text-primary-400 leading-none">{selectedAlternative.grams}g</span>
                  <span className="text-xs text-primary-700/80 dark:text-primary-300/80">
                    to match your {quantity || "100"}g {selectedFoodInfo?.baseInfo.name}
                  </span>
                </div>
              )}

              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <ul className="space-y-2">
                  {selectedAlternative?.benefits?.map((benefit, index) => (
                    <li key={index} className="flex items-start">
                      <div className="bg-purple-100 dark:bg-purple-800/30 rounded-full p-1 mr-2 mt-0.5">
                        <Leaf className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="text-gray-800 dark:text-gray-200">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Nutrition Comparison</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Calories</p>
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      {selectedAlternative?.calories} vs {selectedFoodInfo?.baseInfo.calories} cal
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Protein</p>
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      {selectedAlternative?.protein}g vs {selectedFoodInfo?.baseInfo.protein}g
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Carbs</p>
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      {selectedAlternative?.carbs}g vs {selectedFoodInfo?.baseInfo.carbs}g
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Fat</p>
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      {selectedAlternative?.fat}g vs {selectedFoodInfo?.baseInfo.fat}g
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowBenefitsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
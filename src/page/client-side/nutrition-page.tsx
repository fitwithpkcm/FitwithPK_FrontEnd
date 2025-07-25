import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/use-auth";
import { MobileNav } from "../../components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import { useToast } from "../../hooks/use-toast";
import { setBaseUrl } from "../../services/HttpService"
import {
  ArrowRight,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Flame,
  Leaf,
  Plus,
  Salad,
  Utensils,
  X
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../../components/ui/dialog";
import { BASE_URL } from "../../common/Constant";
import { useMutation, useQuery } from "@tanstack/react-query";
import { IFoodCatergory } from "../../interface/IFoodAlternative";
import { getFoodBasedOnCatergoryApi, getSwappedNutriProducts } from "../../services/FoodService";



// Food nutrition data with comparisons
type FoodAlternative = {
  name: string;
  quantity: string;
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


export default function NutritionPage() {
  const { toast } = useToast();
  const [activeNutrient, setActiveNutrient] = useState<keyof IFoodCatergory>("Protein");
  const [nutritionGoal, setNutritionGoal] = useState<"fat-loss" | "muscle-gain" | "maintenance">("maintenance");

  const [foodItem, setFoodItem] = useState<FoodAlternative | null>();
  const [quantity, setQuantity] = useState<string | null>("");
  const [selectedAlternative, setSelectedAlternative] = useState<FoodAlternative | null>(null);
  const [showBenefitsDialog, setShowBenefitsDialog] = useState(false);
  const [selectedFoodInfo, setSelectedFoodInfo] = useState<{
    baseInfo: FoodAlternative,
    alternatives: FoodAlternative[]
  } | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [suggestions, setSuggestions] = useState<FoodAlternative[]>([]);

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
    mutationFn: async ({ food, weight }: { food: string; weight: string | null }) => {
      const currentFoodItem = {
        Food: food,
        Quantity: weight
      };

      try {
        const res = await getSwappedNutriProducts(currentFoodItem);
        const response = res as ApiResponse<FoodAlternative[]>;
        if (response.data.success) {
          return {
            swappedData: response.data.data,
            originalFood: foodItem  // Pass original food for use in onSuccess
          };
        }
        throw new Error("Swap operation was not successful");
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Failed to swap products");
      }
    },
    onSuccess: (data) => {

      setSelectedFoodInfo({
        baseInfo: data.originalFood!,
        alternatives: data.swappedData
      });


      console.log("YYOOYOYOY", {
        baseInfo: data.originalFood,
        alternatives: data.swappedData
      })

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



  const handleFoodItemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Show suggestions based on input
    if (value.length > 0) {

      const filtered = foodListBasedOnCatergory?.[activeNutrient]?.filter(item =>
        item.name.toLowerCase().includes(value.toLowerCase())
      ) || [];
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const selectSuggestion = (suggestion: FoodAlternative) => {
    setFoodItem(suggestion);
    setSuggestions([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    /**
   * author : basil1112
   * fetch daily updates for this weeek 
   */

    getSwapProductsMutation.mutate({ food: foodItem!.name, weight: quantity })


    /* 
        // Check if the food exists in our database
        const foodCategory = foodDatabase[activeNutrient];
        if (foodCategory && foodCategory[foodItem]) {
          setSelectedFoodInfo(foodCategory[foodItem]);
          setShowResults(true);
        } else {
          // If food not found, show empty results
          setSelectedFoodInfo(null);
          setShowResults(true);
        } */


  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 py-4 px-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">NutriSwap</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">One-tap healthy food alternatives</p>
          </div>
        </div>
      </header>

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
                setSuggestions([]);
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
              {/* Food item input with autocomplete */}
              <div className="space-y-2">
                <Label htmlFor="foodItem">Food Item</Label>
                <div className="relative">
                  <Input
                    id="foodItem"
                    placeholder="Enter a food item"
                    value={foodItem?.name}
                    onChange={handleFoodItemChange}
                    className="w-full"
                  />
                  {suggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 max-h-60 overflow-auto">
                      {suggestions.map((suggestion, idx) => (
                        <div
                          key={idx}
                          className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                          onClick={() => selectSuggestion(suggestion)}
                        >
                          {suggestion.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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



              <Button type="submit" className="w-full">Calculate Alternatives</Button>
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
                          <h3 className="text-xl font-bold text-white dark:text-white">{foodItem?.name}</h3>
                          <p className="text-gray-200 dark:text-gray-300">{quantity || "100"}g serving</p>
                        </div>
                        <Badge className="bg-primary-500 hover:bg-primary-600">{activeNutrient}</Badge>
                      </div>

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
                    </div>
                  </div>
                </Card>


                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-6">One-Tap NutriSwap Options</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Tap any alternative to see detailed nutrition comparison
                </p>

                {/* Alternatives */}
                <div className="space-y-4">
                  {selectedFoodInfo.alternatives.map((alt, idx) => (
                    <Card
                      key={idx}
                      className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 overflow-hidden"
                    >
                      <div className="flex flex-col md:flex-row">
                        {/* Image section */}
                        {alt.imageUrl && (
                          <div className="w-full md:w-1/3 h-48 md:h-auto">
                            <img
                              src={alt.imageUrl}
                              alt={alt.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {/* Content section */}
                        <div className="p-5 flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{alt.name}</h3>
                              <p className="text-gray-500 dark:text-gray-400">{alt.quantity} serving</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1"
                              onClick={() => {
                                console.log(alt);
                                setSelectedAlternative(alt);
                                setShowBenefitsDialog(true);
                              }}
                            >
                              <span>View Notes</span>
                              <FileText className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Nutrition comparison */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                              <div className="flex justify-between">
                                <span className="text-xs text-gray-500 dark:text-gray-400">Calories</span>
                                {alt.calories < selectedFoodInfo.baseInfo.calories ? (
                                  <Badge variant="outline" className="text-green-500 border-green-200 bg-green-50 dark:bg-green-900/20 text-[10px] h-4">
                                    -{Math.round(((selectedFoodInfo.baseInfo.calories - alt.calories) / selectedFoodInfo.baseInfo.calories) * 100)}%
                                  </Badge>
                                ) : alt.calories > selectedFoodInfo.baseInfo.calories ? (
                                  <Badge variant="outline" className="text-amber-500 border-amber-200 bg-amber-50 dark:bg-amber-900/20 text-[10px] h-4">
                                    +{Math.round(((alt.calories - selectedFoodInfo.baseInfo.calories) / selectedFoodInfo.baseInfo.calories) * 100)}%
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-blue-500 border-blue-200 bg-blue-50 dark:bg-blue-900/20 text-[10px] h-4">Same</Badge>
                                )}
                              </div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">{alt.calories}</p>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                              <div className="flex justify-between">
                                <span className="text-xs text-gray-500 dark:text-gray-400">Protein</span>
                                {alt.protein > selectedFoodInfo.baseInfo.protein ? (
                                  <Badge variant="outline" className="text-green-500 border-green-200 bg-green-50 dark:bg-green-900/20 text-[10px] h-4">
                                    +{Math.round(((alt.protein - selectedFoodInfo.baseInfo.protein) / selectedFoodInfo.baseInfo.protein) * 100)}%
                                  </Badge>
                                ) : alt.protein < selectedFoodInfo.baseInfo.protein ? (
                                  <Badge variant="outline" className="text-amber-500 border-amber-200 bg-amber-50 dark:bg-amber-900/20 text-[10px] h-4">
                                    -{Math.round(((selectedFoodInfo.baseInfo.protein - alt.protein) / selectedFoodInfo.baseInfo.protein) * 100)}%
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-blue-500 border-blue-200 bg-blue-50 dark:bg-blue-900/20 text-[10px] h-4">Same</Badge>
                                )}
                              </div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">{alt.protein}g</p>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                              <div className="flex justify-between">
                                <span className="text-xs text-gray-500 dark:text-gray-400">Carbs</span>
                                {alt.carbs < selectedFoodInfo.baseInfo.carbs ? (
                                  <Badge variant="outline" className="text-green-500 border-green-200 bg-green-50 dark:bg-green-900/20 text-[10px] h-4">
                                    -{Math.round(((selectedFoodInfo.baseInfo.carbs - alt.carbs) / selectedFoodInfo.baseInfo.carbs) * 100)}%
                                  </Badge>
                                ) : alt.carbs > selectedFoodInfo.baseInfo.carbs ? (
                                  <Badge variant="outline" className="text-amber-500 border-amber-200 bg-amber-50 dark:bg-amber-900/20 text-[10px] h-4">
                                    +{Math.round(((alt.carbs - selectedFoodInfo.baseInfo.carbs) / selectedFoodInfo.baseInfo.carbs) * 100)}%
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-blue-500 border-blue-200 bg-blue-50 dark:bg-blue-900/20 text-[10px] h-4">Same</Badge>
                                )}
                              </div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">{alt.carbs}g</p>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                              <div className="flex justify-between">
                                <span className="text-xs text-gray-500 dark:text-gray-400">Fiber</span>
                                {alt.fiber > selectedFoodInfo.baseInfo.fiber ? (
                                  <Badge variant="outline" className="text-green-500 border-green-200 bg-green-50 dark:bg-green-900/20 text-[10px] h-4">
                                    +{Math.round(((alt.fiber - selectedFoodInfo.baseInfo.fiber) / Math.max(1, selectedFoodInfo.baseInfo.fiber)) * 100)}%
                                  </Badge>
                                ) : alt.fiber < selectedFoodInfo.baseInfo.fiber ? (
                                  <Badge variant="outline" className="text-amber-500 border-amber-200 bg-amber-50 dark:bg-amber-900/20 text-[10px] h-4">
                                    -{Math.round(((selectedFoodInfo.baseInfo.fiber - alt.fiber) / Math.max(1, selectedFoodInfo.baseInfo.fiber)) * 100)}%
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-blue-500 border-blue-200 bg-blue-50 dark:bg-blue-900/20 text-[10px] h-4">Same</Badge>
                                )}
                              </div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">{alt.fiber}g</p>
                            </div>
                          </div>

                          {/* Benefits list */}
                          {/*  <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Benefits:</h4>
                            <div className="flex flex-wrap gap-2">
                              {alt.benefits.map((benefit, i) => (
                                <Badge key={i} variant="secondary" className="bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                  {benefit}
                                </Badge>
                              ))}
                            </div>
                          </div> */}
                        </div>
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
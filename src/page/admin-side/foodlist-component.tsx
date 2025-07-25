// components/FoodList.tsx
import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFoodBasedOnCatergoryApi } from "../../services/FoodService";
import { IFoodAlternative, IFoodCatergory } from "../../interface/IFoodAlternative";
import { Search, X } from "lucide-react";
import { setBaseUrl } from "../../services/HttpService";
import { BASE_URL } from "../../common/Constant";

interface FoodListProps {
    lastCatergory: "protein" | "carbs" | "fat"
}


const FoodList = (props: FoodListProps) => {
    const [activeTab, setActiveTab] = useState<"protein" | "carbs" | "fat">("protein");
    const [searchTerm, setSearchTerm] = useState<string>("");

    //constructor basil
    useEffect(() => {
        setBaseUrl(BASE_URL);
    }, []);


    useEffect(() => {
        setActiveTab(props.lastCatergory)
    }, [props.lastCatergory]);


    const { data: foodCategories, isLoading, error } = useQuery<IFoodCatergory>({
        queryKey: ["foodcatergory_list"],
        queryFn: () =>
            getFoodBasedOnCatergoryApi(null).then((res: unknown) => {
                const response = res as ApiResponse<IFoodCatergory>;
                return response.data.data;
            })
    });

    if (isLoading) return <div className="p-4 text-center">Loading food data...</div>;
    if (error) return <div className="p-4 text-center text-red-500">Error loading food data</div>;

    // Filter foods based on active tab and search term
    const filteredFoods = {
        protein: foodCategories?.Protein?.filter(food =>
            food.name.toLowerCase().includes(searchTerm.toLowerCase())
        ) || [],
        carbs: foodCategories?.Carbs?.filter(food =>
            food.name.toLowerCase().includes(searchTerm.toLowerCase())
        ) || [],
        fat: foodCategories?.Fat?.filter(food =>
            food.name.toLowerCase().includes(searchTerm.toLowerCase())
        ) || []
    };

    return (
        <div className="mt-6 h-full flex flex-col">
            {/* Tabs with horizontal scroll */}
            <div className="flex border-b overflow-x-auto no-scrollbar">
                <div className="flex min-w-max">
                    <button
                        className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === "protein" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
                        onClick={() => {
                            setActiveTab("protein");
                            setSearchTerm("");
                        }}
                    >
                        Protein
                    </button>
                    <button
                        className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === "carbs" ? "text-green-600 border-b-2 border-green-600" : "text-gray-500"}`}
                        onClick={() => {
                            setActiveTab("carbs");
                            setSearchTerm("");
                        }}
                    >
                        Carbohydrates
                    </button>
                    <button
                        className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === "fat" ? "text-yellow-600 border-b-2 border-yellow-600" : "text-gray-500"}`}
                        onClick={() => {
                            setActiveTab("fat");
                            setSearchTerm("");
                        }}
                    >
                        Fats
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative my-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder={`Search ${activeTab} foods...`}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <button
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setSearchTerm("")}
                    >
                        <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    </button>
                )}
            </div>

            {/* Scrollable Food List */}
            <div className="bg-white p-4 rounded-lg border flex-grow overflow-y-auto">
                {activeTab === "protein" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredFoods.protein.length > 0 ? (
                            filteredFoods.protein.map((food) => (
                                <FoodCard key={`protein-${food.name}`} food={food} />
                            ))
                        ) : (
                            <div className="col-span-3 text-center py-4 text-gray-500">
                                {searchTerm ? "No matching protein foods found" : "No protein foods available"}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "carbs" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredFoods.carbs.length > 0 ? (
                            filteredFoods.carbs.map((food) => (
                                <FoodCard key={`carbs-${food.name}`} food={food} />
                            ))
                        ) : (
                            <div className="col-span-3 text-center py-4 text-gray-500">
                                {searchTerm ? "No matching carbohydrate foods found" : "No carbohydrate foods available"}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "fat" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredFoods.fat.length > 0 ? (
                            filteredFoods.fat.map((food) => (
                                <FoodCard key={`fat-${food.name}`} food={food} />
                            ))
                        ) : (
                            <div className="col-span-3 text-center py-4 text-gray-500">
                                {searchTerm ? "No matching fat foods found" : "No fat foods available"}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};


const FoodCard = ({ food }: { food: IFoodAlternative }) => {
    return (
        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow h-full">
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{food.name}</h3>
                <span className="bg-gray-100 px-2 py-1 rounded text-sm">
                    {food.quantity}
                </span>
            </div>
            <hr></hr>
            <div className="w-full mt-2">
                <img
                    src={`${BASE_URL}/uploads/nutriimg/${food.imageUrl}`}
                    alt={food.name}
                    className="w-full h-auto object-cover rounded"
                />
            </div>

            <hr></hr>

            <div className="grid grid-cols-3 gap-2 mt-1 mb-3">
                <div className="text-center">
                    <p className="text-xs text-gray-500">Calories</p>
                    <p className="font-medium">{food.calories}</p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-gray-500">Protein</p>
                    <p className="font-medium">{food.protein}g</p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-gray-500">Carbs</p>
                    <p className="font-medium">{food.carbs}g</p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-gray-500">Fat</p>
                    <p className="font-medium">{food.fat}g</p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-gray-500">Fiber</p>
                    <p className="font-medium">{food.fiber}g</p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-gray-500">Sugar</p>
                    <p className="font-medium">{food.sugar}g</p>
                </div>
            </div>

            {food.benefits?.length > 0 && (
                <div className="mb-2">
                    <p className="text-xs font-medium text-gray-700">Benefits:</p>
                    <ul className="list-disc list-inside text-sm">
                        {food.benefits.map((benefit, i) => (
                            <li key={i}>{benefit}</li>
                        ))}
                    </ul>
                </div>
            )}

            {food.note && (
                <p className="text-sm text-gray-600 italic">Note: {food.note}</p>
            )}

            <div className="mt-2 flex items-center">
                <span className="text-xs font-medium mr-2">Health Score:</span>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                        className="bg-green-600 h-2.5 rounded-full"
                        style={{ width: `${food.health_score}%` }}
                    ></div>
                </div>
                <span className="text-xs ml-2">{food.health_score}/100</span>
            </div>
        </div>
    );
};

export default FoodList;
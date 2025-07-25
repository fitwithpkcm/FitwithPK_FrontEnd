import React, { useEffect, useRef, useState } from "react";
import { Plus, Check, X, FileText, Save, Edit, Trash, ArrowLeft, ImageIcon, Minus, CircleX, XIcon } from "lucide-react";
import { MobileAdminNav } from "../../components/layout/mobile-admin-nav";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { BASE_URL } from "../../common/Constant";
import { setBaseUrl } from "../../services/HttpService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { nutriInsert } from "../../services/AdminServices";
import { IFoodAlternative } from "../../interface/IFoodAlternative";
import FoodList from "./foodlist-component";
// Interface for food items
interface FoodItem {
    id: number;
    name: string;
    macros: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber: number;
        sugar: number;
    };
    quantity: number;
    unit: string;
    benefits: string[];
    notes?: string;
}

interface IFoodCatergory {
    Protein: IFoodAlternative[];
    Carbs: IFoodAlternative[];
    Fat: IFoodAlternative[];
}

export default function NutriSwapScreen() {

    const queryClient = useQueryClient();
    // State for the next ID to assign
    const [nextId, setNextId] = useState<number>(1);

    // State for the food form
    const [foodName, setFoodName] = useState<string>("");
    const [calories, setCalories] = useState<string>("");
    const [protein, setProtein] = useState<string>("");
    const [carbs, setCarbs] = useState<string>("");
    const [fat, setFat] = useState<string>("");
    const [fiber, setFiber] = useState<string>("");
    const [sugar, setSugar] = useState<string>("");
    const [quantity, setQuantity] = useState<string>("100");
    const [benefitsInput, setBenefitsInput] = useState<string>("");
    const [benefits, setBenefits] = useState<string[]>([]);
    const [notes, setNotes] = useState<string>("");
    const [showNotes, setShowNotes] = useState<boolean>(false);
    const [category, setFoodCatergory] = useState<"protein" | "carbs" | "fat">("protein");
    const [healthscore, setHealthScore] = useState<string>("");


    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // State for the food list
    const [foodItems, setFoodItems] = useState<FoodItem[]>([]);

    // State for search functionality
    const [searchTerm, setSearchTerm] = useState<string>("");

    // State for editing mode
    const [editMode, setEditMode] = useState<boolean>(false);
    const [editingItemId, setEditingItemId] = useState<number | null>(null);

    const [addNewFoodUI, setAddNewFoodUI] = useState<boolean>(false);

    //constructor basil
    useEffect(() => {
        setBaseUrl(BASE_URL);
    }, []);


    // Define the mutation
    const { mutate: insertFoodItem } = useMutation({
        mutationFn: nutriInsert,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["food-items"] });
            resetForm();
            alert("Food item saved successfully!");
        },
        onError: (error) => {
            console.error("Error saving food item:", error);
            alert("Failed to save food item");
        }
    });

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = event.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;

        const newFiles = Array.from(selectedFiles);
        setFiles(newFiles);

        // Create preview URLs for the selected files (just for UI preview)
        const newImageUrls = newFiles.map(file => URL.createObjectURL(file));
        setUploadedImages(newImageUrls);
    };

    const handleAddFoodItem = async () => {
        if (!foodName) {
            alert("Please enter a name for the food item");
            return;
        }

        // Create FormData object
        const formData = new FormData();

        // Append all food data
        formData.append("name", foodName);
        formData.append("quantity", quantity);
        formData.append("unit", "g");
        formData.append("calories", calories);
        formData.append("protein", protein);
        formData.append("carbs", carbs);
        formData.append("fat", fat);
        formData.append("fiber", fiber);
        formData.append("sugar", sugar);
        formData.append("category", category);
        formData.append("benefits", JSON.stringify(benefits));
        formData.append("note", notes);
        formData.append("healthscore", healthscore);

        if (notes) formData.append("notes", notes);

        // Append files if they exist
        if (files.length > 0) {
            files.forEach((file) => {
                formData.append("Nutri_Img", file);
            });
        }

        // Execute the mutation
        insertFoodItem(formData);
    };

    // Reset form fields
    const resetForm = () => {
        setFoodName("");
        setCalories("");
        setProtein("");
        setCarbs("");
        setFat("");
        setFiber("");
        setQuantity("100");
        setBenefits([]);
        setBenefitsInput("");
        setNotes("");
        setShowNotes(false);
        setUploadedImages([]);
        setFiles([]);
    };



    // Cancel editing
    const handleCancelEdit = () => {
        setEditMode(false);
        setEditingItemId(null);
        resetForm();
    };

    // Handle adding a benefit
    const handleAddBenefit = () => {
        if (benefitsInput.trim()) {
            if (!benefits.includes(benefitsInput.trim())) {
                setBenefits([...benefits, benefitsInput.trim()]);
            }
            setBenefitsInput("");
        }
    };

    // Handle removing a benefit
    const handleRemoveBenefit = (benefit: string) => {
        setBenefits(benefits.filter(b => b !== benefit));
    };

    const handleRemoveImage = (index: number) => {
        const newImages = [...uploadedImages];
        newImages.splice(index, 1);
        setUploadedImages(newImages);

        const newFiles = [...files];
        newFiles.splice(index, 1);
        setFiles(newFiles);
    };

    return (
        <>
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-50 flex items-center justify-center px-4">
                <h1 className="font-bold text-lg text-gray-900 dark:text-white">FitwithPKAdmin</h1>
            </header>

            <div className="p-4 mt-14">
                <h1 className="text-xl font-bold mb-2">NutriSwap</h1>
                <Button
                    onClick={() => setAddNewFoodUI(!addNewFoodUI)}
                    className="fixed bottom-20 right-5 w-14 h-14 rounded-full shadow-lg flex items-center justify-center to-primary-600 hover:from-rose-600 hover:to-primary-700 text-white transition-all dark:shadow-lg dark:shadow-rose-500/20 border-2 border-white dark:border-gray-800"
                >
                    {!addNewFoodUI ? (
                        <Plus className="h-6 w-6 text-white" />
                    ) : (
                        <XIcon className="h-6 w-6 text-white" />
                    )}
                </Button>
                <p className="mb-4 text-sm text-gray-600">Manage food items with their nutritional profiles</p>

                <div className="space-y-6">
                    {/* Food Entry Form */}
                    {addNewFoodUI && <div className="p-4 bg-blue-50 rounded-lg">
                        <h2 className="font-medium mb-3">
                            {editMode ? `Edit ${foodName}` : "Add New Food Item"}
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">Category</label>
                                <select
                                    value={category}
                                    onChange={(e) => setFoodCatergory(e.target.value as "protein" | "carbs" | "fat")}
                                    className="w-full px-3 py-2 border rounded-md"
                                >
                                    <option value="protein">Protein</option>
                                    <option value="carbs">Carbs</option>
                                    <option value="fat">Fat</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Name</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-md"
                                    placeholder="Enter food name"
                                    value={foodName}
                                    onChange={(e) => setFoodName(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-2 items-center">
                                <div className="flex-grow">
                                    <label className="block text-sm font-medium mb-1">Quantity</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border rounded-md"
                                        placeholder="100"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        min={1}
                                    />
                                </div>
                                <div className="w-10 pt-6 text-center">
                                    <span>g</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">Calories</label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 border rounded-md"
                                    placeholder=""
                                    value={calories}
                                    onChange={(e) => setCalories(e.target.value)}
                                    min={0}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Protein (g)</label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 border rounded-md"
                                    placeholder=""
                                    value={protein}
                                    onChange={(e) => setProtein(e.target.value)}
                                    min={0}
                                    step="0.1"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Carbs (g)</label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 border rounded-md"
                                    placeholder=""
                                    value={carbs}
                                    onChange={(e) => setCarbs(e.target.value)}
                                    min={0}
                                    step="0.1"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Fat (g)</label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 border rounded-md"
                                    placeholder=""
                                    value={fat}
                                    onChange={(e) => setFat(e.target.value)}
                                    min={0}
                                    step="0.1"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Fiber (g)</label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 border rounded-md"
                                    placeholder=""
                                    value={fiber}
                                    onChange={(e) => setFiber(e.target.value)}
                                    min={0}
                                    step="0.1"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Sugar (g)</label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 border rounded-md"
                                    placeholder=""
                                    value={sugar}
                                    onChange={(e) => setSugar(e.target.value)}
                                    min={0}
                                    step="0.1"
                                />
                            </div>
                        </div>

                        <div className="mb-3">
                            <label className="block text-sm font-medium mb-1">Health Score</label>
                            <div className="flex items-center gap-2 mb-2">
                                <input
                                    type="number"
                                    className="flex-grow px-3 py-2 border rounded-md"
                                    placeholder="Health Score"
                                    value={healthscore}
                                    onChange={(e) => setHealthScore(e.target.value)}

                                />

                            </div>

                        </div>

                        <div className="mb-3">
                            <label className="block text-sm font-medium mb-1">Benefits</label>
                            <div className="flex items-center gap-2 mb-2">
                                <input
                                    type="text"
                                    className="flex-grow px-3 py-2 border rounded-md"
                                    placeholder="Enter a benefit (e.g., Plant-based, Low fat)"
                                    value={benefitsInput}
                                    onChange={(e) => setBenefitsInput(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddBenefit();
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    className="px-3 py-2 bg-blue-600 text-white rounded-md"
                                    onClick={handleAddBenefit}
                                >
                                    Add
                                </button>
                            </div>

                            {benefits.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {benefits.map((benefit, index) => (
                                        <div
                                            key={index}
                                            className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center gap-1"
                                        >
                                            {benefit}
                                            <button
                                                type="button"
                                                className="text-blue-600 hover:text-blue-800"
                                                onClick={() => handleRemoveBenefit(benefit)}
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mb-3">
                            <label className="block text-sm font-medium mb-1">Images</label>
                            <div className="flex items-center gap-2 mb-2">
                                {uploadedImages.length > 0 ? (
                                    <div className="flex gap-2 flex-wrap">
                                        {uploadedImages.map((image, index) => (
                                            <div key={index} className="relative">
                                                <img
                                                    src={image}
                                                    alt={`Preview ${index}`}
                                                    className="h-16 w-16 object-cover rounded-md"
                                                />
                                                <button
                                                    onClick={() => handleRemoveImage(index)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex-grow px-3 py-2 border rounded-md flex items-center justify-center">
                                        <ImageIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                                    </div>
                                )}
                                <button
                                    type="button"
                                    className="px-3 py-2 bg-blue-600 text-white rounded-md"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    Add
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    multiple
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <div className="flex justify-between items-center">
                                <label className="block text-sm font-medium mb-1">Notes</label>
                                <button
                                    type="button"
                                    className="text-xs text-blue-600"
                                    onClick={() => setShowNotes(!showNotes)}
                                >
                                    {showNotes ? 'Hide' : 'Show'} Notes
                                </button>
                            </div>

                            {showNotes && (
                                <textarea
                                    className="w-full px-3 py-2 border rounded-md text-sm"
                                    placeholder="Add notes about this food item..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                />
                            )}
                        </div>

                        <div className="flex justify-end gap-2">
                            {editMode && (
                                <button
                                    type="button"
                                    className="px-4 py-2 bg-gray-500 text-white rounded-md text-sm"
                                    onClick={handleCancelEdit}
                                >
                                    Cancel
                                </button>
                            )}

                            <button
                                type="button"
                                className={`px-4 py-2 ${editMode ? 'bg-blue-600' : 'bg-green-600'} text-white rounded-md text-sm flex items-center gap-1`}
                                onClick={editMode ? () => { } : handleAddFoodItem}
                                disabled={isUploading}
                            >
                                {isUploading ? (
                                    "Uploading..."
                                ) : editMode ? (
                                    <><Save size={14} /> Save Changes</>
                                ) : (
                                    <><Plus size={14} /> Add Food</>
                                )}
                            </button>
                        </div>
                    </div>}


                    {/* Food Items List */}

                    <FoodList lastCatergory={category} />

                </div>
            </div>

            {/* Bottom Navigation */}
            <MobileAdminNav />
        </>
    );
}
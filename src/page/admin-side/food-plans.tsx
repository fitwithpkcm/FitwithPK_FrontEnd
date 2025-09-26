import { useState } from 'react';
import { Search, Plus, Clock, Users, Utensils, Coffee, Apple, Moon, ChevronLeft, ChevronRight, Calendar, CalendarDays, X, Copy } from 'lucide-react';

interface MealItem {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image?: string;
}

interface FoodItem {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image?: string;
}

interface MealPlan {
  id: number;
  clientId: number;
  clientName: string;
  date: string;
  breakfast: MealItem[];
  lunch: MealItem[];
  snack: MealItem[];
  dinner: MealItem[];
}

interface Client {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

interface MealPlanScreenProps {
  onBack?: () => void;
}



export default function MealPlanScreen({ onBack }: MealPlanScreenProps) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 6); // Default to 7 days (weekly)
    return date.toISOString().split('T')[0];
  });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'snack' | 'dinner' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [dateRangeScroll, setDateRangeScroll] = useState(0);
  const [applyToAllDates, setApplyToAllDates] = useState(false);
  const [dailyTargets, setDailyTargets] = useState({
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 70
  });
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [tempTargets, setTempTargets] = useState(dailyTargets);
  const [showFoodDialog, setShowFoodDialog] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyFromDate, setCopyFromDate] = useState('');
  const [copyToDate, setCopyToDate] = useState('');
  const [copyDays, setCopyDays] = useState(1);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [foodQuantity, setFoodQuantity] = useState(1);
  const [showQuantityDialog, setShowQuantityDialog] = useState(false);
  const [selectedMealIndex, setSelectedMealIndex] = useState<number | null>(null);

  // Sample clients data
  const clients: Client[] = [
    { id: 1, name: "John Smith", email: "john@example.com" },
    { id: 2, name: "Sarah Johnson", email: "sarah@example.com" },
    { id: 3, name: "Mike Brown", email: "mike@example.com" },
    { id: 4, name: "Emily Davis", email: "emily@example.com" },
    { id: 5, name: "Alex Wilson", email: "alex@example.com" },
    { id: 6, name: "Lisa Garcia", email: "lisa@example.com" },
  ];

  // Sample meal items with images
  const availableMeals: MealItem[] = [
    { id: 1, name: "Oatmeal with Berries", calories: 320, protein: 12, carbs: 54, fat: 8, image: "🥣" },
    { id: 2, name: "Greek Yogurt Parfait", calories: 280, protein: 20, carbs: 35, fat: 6, image: "🍨" },
    { id: 3, name: "Avocado Toast", calories: 350, protein: 8, carbs: 30, fat: 22, image: "🥑" },
    { id: 4, name: "Scrambled Eggs", calories: 200, protein: 16, carbs: 2, fat: 14, image: "🍳" },
    { id: 5, name: "Grilled Chicken Salad", calories: 420, protein: 35, carbs: 15, fat: 25, image: "🥗" },
    { id: 6, name: "Quinoa Bowl", calories: 380, protein: 14, carbs: 58, fat: 12, image: "🍲" },
    { id: 7, name: "Salmon with Vegetables", calories: 450, protein: 40, carbs: 20, fat: 26, image: "🐟" },
    { id: 8, name: "Turkey Sandwich", calories: 320, protein: 25, carbs: 35, fat: 10, image: "🥪" },
    { id: 9, name: "Mixed Nuts", calories: 180, protein: 6, carbs: 6, fat: 16, image: "🥜" },
    { id: 10, name: "Apple with Peanut Butter", calories: 220, protein: 8, carbs: 25, fat: 12, image: "🍎" },
    { id: 11, name: "Protein Smoothie", calories: 250, protein: 25, carbs: 20, fat: 8, image: "🥤" },
    { id: 12, name: "Beef Stir Fry", calories: 480, protein: 32, carbs: 25, fat: 28, image: "🥘" },
  ];

  // Sample meal plans for multiple days
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([
    {
      id: 1,
      clientId: 1,
      clientName: "John Smith",
      date: "2025-01-09",
      breakfast: [availableMeals[0], availableMeals[3]],
      lunch: [availableMeals[4]],
      snack: [availableMeals[9]],
      dinner: [availableMeals[6]]
    },
    {
      id: 2,
      clientId: 1,
      clientName: "John Smith",
      date: "2025-01-10",
      breakfast: [availableMeals[1]],
      lunch: [availableMeals[5], availableMeals[7]],
      snack: [availableMeals[10]],
      dinner: [availableMeals[11]]
    },
    {
      id: 3,
      clientId: 1,
      clientName: "John Smith",
      date: "2025-01-11",
      breakfast: [availableMeals[2]],
      lunch: [availableMeals[4]],
      snack: [availableMeals[8]],
      dinner: [availableMeals[6], availableMeals[7]]
    },
    {
      id: 4,
      clientId: 2,
      clientName: "Sarah Johnson",
      date: "2025-01-09",
      breakfast: [availableMeals[1], availableMeals[0]],
      lunch: [availableMeals[5]],
      snack: [availableMeals[9]],
      dinner: [availableMeals[11]]
    }
  ]);

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(clientSearchTerm.toLowerCase())
  );

  const filteredMeals = availableMeals.filter(meal =>
    meal.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCurrentMealPlan = (): MealPlan | null => {
    if (!selectedClient) return null;
    return mealPlans.find(plan => 
      plan.clientId === selectedClient.id && plan.date === selectedDate
    ) || null;
  };

  const getDateMealPlan = (date: string): MealPlan | null => {
    if (!selectedClient) return null;
    return mealPlans.find(plan => 
      plan.clientId === selectedClient.id && plan.date === date
    ) || null;
  };

  const getAllWeekMealPlans = (): MealPlan[] => {
    if (!selectedClient) return [];
    const weekPlans: MealPlan[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const plan = mealPlans.find(p => p.clientId === selectedClient.id && p.date === dateStr);
      if (plan) {
        weekPlans.push(plan);
      }
    }
    return weekPlans;
  };

  const handleFoodSelection = (food: FoodItem) => {
    if (!selectedClient || !selectedMealType) return;

    const meal: MealItem = {
      id: Date.now(),
      name: `${food.name} (100g)`,
      calories: Math.round(food.calories),
      protein: Math.round(food.protein),
      carbs: Math.round(food.carbs),
      fat: Math.round(food.fat),
    };

    if (applyToAllDates && startDate && endDate) {
      // Add to all dates in range
      addMealToAllDatesInRange(meal);
    } else {
      // Add to current selected date only
      const existingPlanIndex = mealPlans.findIndex(plan =>
        plan.clientId === selectedClient.id && plan.date === selectedDate
      );

      if (existingPlanIndex >= 0) {
        const updatedPlans = [...mealPlans];
        updatedPlans[existingPlanIndex] = {
          ...updatedPlans[existingPlanIndex],
          [selectedMealType]: [...updatedPlans[existingPlanIndex][selectedMealType], meal]
        };
        setMealPlans(updatedPlans);
      } else {
        const newPlan: MealPlan = {
          id: Date.now(),
          clientId: selectedClient.id,
          clientName: selectedClient.name,
          date: selectedDate,
          breakfast: selectedMealType === 'breakfast' ? [meal] : [],
          lunch: selectedMealType === 'lunch' ? [meal] : [],
          snack: selectedMealType === 'snack' ? [meal] : [],
          dinner: selectedMealType === 'dinner' ? [meal] : []
        };
        setMealPlans([...mealPlans, newPlan]);
      }
    }

    setSelectedMealType(null);
    setSearchTerm('');
    // Close the food selection dialog after adding food
    // The dialog will close automatically when selectedMealType becomes null
  };

  const addMealToClient = (food: FoodItem, quantity: number = 1) => {
    if (!selectedClient || !selectedMealType) return;

    const gramsAmount = Math.round(quantity * 100);
    const meal: MealItem = {
      id: Date.now(),
      name: `${food.name} (${gramsAmount}g)`,
      calories: Math.round(food.calories * quantity),
      protein: Math.round(food.protein * quantity),
      carbs: Math.round(food.carbs * quantity),
      fat: Math.round(food.fat * quantity),
    };

    if (applyToAllDates && startDate && endDate) {
      // Add to all dates in range
      addMealToAllDatesInRange(meal);
    } else {
      // Add to current selected date only
      const existingPlanIndex = mealPlans.findIndex(plan =>
        plan.clientId === selectedClient.id && plan.date === selectedDate
      );

      if (existingPlanIndex >= 0) {
        const updatedPlans = [...mealPlans];
        updatedPlans[existingPlanIndex] = {
          ...updatedPlans[existingPlanIndex],
          [selectedMealType]: [...updatedPlans[existingPlanIndex][selectedMealType], meal]
        };
        setMealPlans(updatedPlans);
      } else {
        const newPlan: MealPlan = {
          id: Date.now(),
          clientId: selectedClient.id,
          clientName: selectedClient.name,
          date: selectedDate,
          breakfast: selectedMealType === 'breakfast' ? [meal] : [],
          lunch: selectedMealType === 'lunch' ? [meal] : [],
          snack: selectedMealType === 'snack' ? [meal] : [],
          dinner: selectedMealType === 'dinner' ? [meal] : []
        };
        setMealPlans([...mealPlans, newPlan]);
      }
    }

    setSelectedMealType(null);
    setShowFoodDialog(false);
    setShowQuantityDialog(false);
    setSelectedFood(null);
    setFoodQuantity(1);
    setSearchTerm('');
  };

  const confirmFoodSelection = () => {
    if (selectedFood && selectedMealType && selectedClient) {
      if (selectedMealIndex !== null) {
        // Update existing meal
        updateExistingMeal();
      } else {
        // Add new meal (this shouldn't happen with current flow)
        addMealToClient(selectedFood, foodQuantity);
      } 
    }
  };

  const updateExistingMeal = () => {
    if (!selectedFood || !selectedMealType || !selectedClient || selectedMealIndex === null) return;

    const gramsAmount = Math.round(foodQuantity * 100);
    const updatedMeal: MealItem = {
      id: Date.now(),
      name: `${selectedFood.name} (${gramsAmount}g)`,
      calories: Math.round(selectedFood.calories * foodQuantity),
      protein: Math.round(selectedFood.protein * foodQuantity),
      carbs: Math.round(selectedFood.carbs * foodQuantity),
      fat: Math.round(selectedFood.fat * foodQuantity),
    };

    const existingPlanIndex = mealPlans.findIndex(plan =>
      plan.clientId === selectedClient.id && plan.date === selectedDate
    );

    if (existingPlanIndex >= 0) {
      const updatedPlans = [...mealPlans];
      const currentMeals = [...updatedPlans[existingPlanIndex][selectedMealType]];
      currentMeals[selectedMealIndex] = updatedMeal;
      
      updatedPlans[existingPlanIndex] = {
        ...updatedPlans[existingPlanIndex],
        [selectedMealType]: currentMeals
      };
      setMealPlans(updatedPlans);
    }

    // Reset states
    setShowQuantityDialog(false);
    setSelectedFood(null);
    setFoodQuantity(1);
    setSelectedMealIndex(null);
    setSelectedMealType(null);
  };

  const addMealToAllDatesInRange = (meal: MealItem) => {
    if (!selectedClient || !selectedMealType) return;

    const updatedPlans = [...mealPlans];
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Iterate through each day in the range
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      
      const existingPlanIndex = updatedPlans.findIndex(plan =>
        plan.clientId === selectedClient.id && plan.date === dateStr
      );

      if (existingPlanIndex >= 0) {
        updatedPlans[existingPlanIndex] = {
          ...updatedPlans[existingPlanIndex],
          [selectedMealType]: [...updatedPlans[existingPlanIndex][selectedMealType], meal]
        };
      } else {
        const newPlan: MealPlan = {
          id: Date.now() + Math.random(),
          clientId: selectedClient.id,
          clientName: selectedClient.name,
          date: dateStr,
          breakfast: selectedMealType === 'breakfast' ? [meal] : [],
          lunch: selectedMealType === 'lunch' ? [meal] : [],
          snack: selectedMealType === 'snack' ? [meal] : [],
          dinner: selectedMealType === 'dinner' ? [meal] : []
        };
        updatedPlans.push(newPlan);
      }
    }

    setMealPlans(updatedPlans);
  };

  const applyDietPlanToRange = () => {
    if (!selectedClient) return;

    // Get the current plan for the selected date
    const templatePlan = getDateMealPlan(selectedDate);
    if (!templatePlan) {
      alert('Please add some meals to the current date first, then apply to the full range.');
      return;
    }

    const updatedPlans = [...mealPlans];
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Apply the template plan to all dates in the range
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      
      // Skip if this is already the template date
      if (dateStr === selectedDate) continue;
      
      const existingPlanIndex = updatedPlans.findIndex(plan =>
        plan.clientId === selectedClient.id && plan.date === dateStr
      );

      const newPlan: MealPlan = {
        id: Date.now() + Math.random(),
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        date: dateStr,
        breakfast: [...templatePlan.breakfast],
        lunch: [...templatePlan.lunch],
        snack: [...templatePlan.snack],
        dinner: [...templatePlan.dinner]
      };

      if (existingPlanIndex >= 0) {
        updatedPlans[existingPlanIndex] = newPlan;
      } else {
        updatedPlans.push(newPlan);
      }
    }

    setMealPlans(updatedPlans);
    alert(`Diet plan applied to all ${(() => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    })()} days in the range!`);
  };

  const removeMealFromClient = (mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner', mealIndex: number) => {
    if (!selectedClient) return;

    const planIndex = mealPlans.findIndex(plan =>
      plan.clientId === selectedClient.id && plan.date === selectedDate
    );

    if (planIndex >= 0) {
      const updatedPlans = [...mealPlans];
      updatedPlans[planIndex] = {
        ...updatedPlans[planIndex],
        [mealType]: updatedPlans[planIndex][mealType].filter((_, index) => index !== mealIndex)
      };
      setMealPlans(updatedPlans);
    }
  };

  const getMealTypeIcon = (type: string) => {
    switch (type) {
      case 'breakfast': return <Coffee size={20} className="text-orange-600" />;
      case 'lunch': return <Utensils size={20} className="text-green-600" />;
      case 'snack': return <Apple size={20} className="text-yellow-600" />;
      case 'dinner': return <Moon size={20} className="text-purple-600" />;
      default: return <Utensils size={20} />;
    }
  };

  const getTotalCalories = (meals: MealItem[]) => {
    return meals.reduce((total, meal) => total + meal.calories, 0);
  };

  const getTotalMacros = (meals: MealItem[]) => {
    return meals.reduce(
      (totals, meal) => ({
        protein: totals.protein + meal.protein,
        carbs: totals.carbs + meal.carbs,
        fat: totals.fat + meal.fat
      }),
      { protein: 0, carbs: 0, fat: 0 }
    );
  };

  // Helper function to copy diet from one date to another with range support
  const copyDietPlan = () => {
    if (!selectedClient || !copyFromDate || !copyToDate) return;
    
    const sourcePlan = mealPlans.find(p => p.clientId === selectedClient.id && p.date === copyFromDate);
    if (!sourcePlan) {
      alert('No diet plan found for the selected date');
      return;
    }
    
    setMealPlans(prev => {
      const updated = [...prev];
      const startDate = new Date(copyToDate);
      
      // Copy to multiple days starting from target date
      for (let i = 0; i < copyDays; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        const existingTargetPlan = updated.find(p => p.clientId === selectedClient.id && p.date === dateStr);
        
        if (existingTargetPlan) {
          // Replace existing plan
          existingTargetPlan.breakfast = [...sourcePlan.breakfast];
          existingTargetPlan.lunch = [...sourcePlan.lunch];
          existingTargetPlan.snack = [...sourcePlan.snack];
          existingTargetPlan.dinner = [...sourcePlan.dinner];
        } else {
          // Create new plan
          updated.push({
            id: Date.now() + Math.random() + i,
            clientId: selectedClient.id,
            clientName: selectedClient.name,
            date: dateStr,
            breakfast: [...sourcePlan.breakfast],
            lunch: [...sourcePlan.lunch],
            snack: [...sourcePlan.snack],
            dinner: [...sourcePlan.dinner]
          });
        }
      }
      
      return updated;
    });
    
    setShowCopyDialog(false);
    setCopyFromDate('');
    setCopyToDate('');
    setCopyDays(1);
    
    // Update selected date to show the copied plan
    setSelectedDate(copyToDate);
    
    const endDate = new Date(copyToDate);
    endDate.setDate(endDate.getDate() + copyDays - 1);
    const message = copyDays === 1 
      ? `Diet plan copied from ${new Date(copyFromDate).toLocaleDateString()} to ${new Date(copyToDate).toLocaleDateString()}`
      : `Diet plan copied from ${new Date(copyFromDate).toLocaleDateString()} to ${copyDays} days starting ${new Date(copyToDate).toLocaleDateString()}`;
    alert(message);
  };



  // Client selection view
  if (!selectedClient) {
    return (
      <div className="p-4 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Diet Plans</h1>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients..."
            value={clientSearchTerm}
            onChange={(e) => setClientSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Client List */}
        <div className="space-y-3">
          {filteredClients.map((client) => (
            <div key={client.id} className="bg-white rounded-lg border p-4 hover:bg-gray-50 cursor-pointer"
                 onClick={() => setSelectedClient(client)}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-medium text-lg">
                    {client.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="font-medium">{client.name}</h3>
                  <p className="text-sm text-gray-600">{client.email}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Meal plan management view
  const currentPlan = getCurrentMealPlan();

  return (
    <div className="p-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedClient(null)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold">{selectedClient.name}</h1>
            <p className="text-gray-600">Diet Plan</p>
          </div>
        </div>
      </div>
      {/* Weekly Date Range Selector */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <CalendarDays size={20} className="text-blue-600" />
            Weekly Diet Plan
          </h3>
          <button
            onClick={() => {
              const today = new Date();
              const nextWeek = new Date();
              nextWeek.setDate(today.getDate() + 6);
              setStartDate(today.toISOString().split('T')[0]);
              setEndDate(nextWeek.toISOString().split('T')[0]);
              setSelectedDate(today.toISOString().split('T')[0]);
            }}
            className="text-sm text-blue-600 hover:underline"
          >
            This Week
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setSelectedDate(e.target.value); // Set selected date to start date
                setDateRangeScroll(0); // Reset scroll position
                
                // Ensure end date is not before start date
                if (endDate < e.target.value) {
                  setEndDate(e.target.value);
                }
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDateRangeScroll(0); // Reset scroll position
              }}
              min={startDate}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Date Range Validation */}
        {(() => {
          const start = new Date(startDate);
          const end = new Date(endDate);
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          
          if (totalDays < 1) {
            return (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-700">End date must be on or after start date (minimum 1 day)</p>
              </div>
            );
          }
          
          if (totalDays > 28) {
            return (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-amber-700">
                  <strong>Long Range Selected:</strong> {totalDays} days total. Use navigation arrows to scroll through dates.
                </p>
              </div>
            );
          }
          
          return null;
        })()}

        {/* Daily Navigation within the selected week */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              const date = new Date(selectedDate);
              date.setDate(date.getDate() - 1);
              const newDate = date.toISOString().split('T')[0];
              if (newDate >= startDate) {
                setSelectedDate(newDate);
              }
            }}
            disabled={selectedDate <= startDate}
            className={`p-2 rounded-lg ${selectedDate <= startDate ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100'}`}
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={startDate}
              max={endDate}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={() => {
              const date = new Date(selectedDate);
              date.setDate(date.getDate() + 1);
              const newDate = date.toISOString().split('T')[0];
              if (newDate <= endDate) {
                setSelectedDate(newDate);
              }
            }}
            disabled={selectedDate >= endDate}
            className={`p-2 rounded-lg ${selectedDate >= endDate ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100'}`}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Week Overview */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700 mb-3">
            <strong>Week Duration:</strong> {(() => {
              const start = new Date(startDate);
              const end = new Date(endDate);
              const diffTime = Math.abs(end.getTime() - start.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
              return `${diffDays} days`;
            })()}
          </p>
          
          {/* Daily Date Pills */}
          {(() => {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            const maxVisibleDays = 28;
            
            if (totalDays <= maxVisibleDays) {
              // Show all days in grid format
              return (
                <div className="grid grid-cols-7 gap-1 mb-3">
                  {(() => {
                    const days = [];
                    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                      const dateStr = d.toISOString().split('T')[0];
                      const hasDiet = getDateMealPlan(dateStr) !== null;
                      const isSelected = dateStr === selectedDate;
                      
                      days.push(
                        <button
                          key={dateStr}
                          onClick={() => setSelectedDate(dateStr)}
                          className={`p-2 rounded-lg text-xs font-medium transition-colors ${
                            isSelected 
                              ? 'bg-blue-600 text-white' 
                              : hasDiet 
                                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <div className="text-[10px] opacity-75">
                            {new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                          <div>{new Date(dateStr).getDate()}</div>
                          {hasDiet && !isSelected && (
                            <div className="w-1 h-1 bg-green-500 rounded-full mx-auto mt-1"></div>
                          )}
                        </button>
                      );
                    }
                    return days;
                  })()}
                </div>
              );
            } else {
              // Show scrollable view with navigation
              const visibleDays = 28; // Show 28 days at a time
              const maxScroll = Math.max(0, totalDays - visibleDays);
              const scrollPosition = Math.min(dateRangeScroll, maxScroll);
              
              return (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => setDateRangeScroll(Math.max(0, scrollPosition - 14))}
                      disabled={scrollPosition === 0}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                        scrollPosition === 0 
                          ? 'text-gray-300 cursor-not-allowed' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <ChevronLeft size={16} />
                      <span className="text-sm">Previous</span>
                    </button>
                    <span className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-lg">
                      Days {scrollPosition + 1} - {Math.min(scrollPosition + visibleDays, totalDays)} of {totalDays}
                    </span>
                    <button
                      onClick={() => setDateRangeScroll(Math.min(maxScroll, scrollPosition + 14))}
                      disabled={scrollPosition >= maxScroll}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                        scrollPosition >= maxScroll 
                          ? 'text-gray-300 cursor-not-allowed' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-sm">Next</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1">
                    {(() => {
                      const days = [];
                      let currentDay = 0;
                      
                      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                        if (currentDay >= scrollPosition && currentDay < scrollPosition + visibleDays) {
                          const dateStr = d.toISOString().split('T')[0];
                          const hasDiet = getDateMealPlan(dateStr) !== null;
                          const isSelected = dateStr === selectedDate;
                          
                          days.push(
                            <button
                              key={dateStr}
                              onClick={() => setSelectedDate(dateStr)}
                              className={`p-2 rounded-lg text-xs font-medium transition-colors ${
                                isSelected 
                                  ? 'bg-blue-600 text-white' 
                                  : hasDiet 
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              <div className="text-[10px] opacity-75">
                                {new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' })}
                              </div>
                              <div>{new Date(dateStr).getDate()}</div>
                              {hasDiet && !isSelected && (
                                <div className="w-1 h-1 bg-green-500 rounded-full mx-auto mt-1"></div>
                              )}
                            </button>
                          );
                        }
                        currentDay++;
                      }
                      return days;
                    })()}
                  </div>
                </div>
              );
            }
          })()}
          
          <p className="text-sm text-blue-600">
            Currently viewing: <strong>{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</strong>
          </p>
          
          <div className="flex items-center gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Has diet plan</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <span className="text-gray-600">No diet plan</span>
            </div>
          </div>
        </div>
      </div>
      {/* Daily Nutrition Summary */}
      <div className="bg-white rounded-lg border p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Daily Nutrition Goals</h3>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowCopyDialog(true)}
              className="px-3 py-1 text-blue-600 text-sm hover:text-blue-700 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1"
            >
              <Copy size={14} />
              Copy Diet
            </button>
            <button 
              onClick={() => {
                setTempTargets(dailyTargets);
                setShowTargetModal(true);
              }}
              className="px-3 py-1 text-blue-600 text-sm hover:text-blue-700 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Edit Targets
            </button>
          </div>
        </div>
        
        {/* Current Targets Display */}
        <div className="grid grid-cols-4 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-800">{dailyTargets.calories}</div>
            <div className="text-xs text-gray-600">Calories</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-800">{dailyTargets.protein}g</div>
            <div className="text-xs text-gray-600">Protein</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-800">{dailyTargets.carbs}g</div>
            <div className="text-xs text-gray-600">Carbs</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-800">{dailyTargets.fat}g</div>
            <div className="text-xs text-gray-600">Fat</div>
          </div>
        </div>

        {/* Current vs Target Progress */}
        {(() => {
          const allMeals = currentPlan ? [
            ...currentPlan.breakfast,
            ...currentPlan.lunch,
            ...currentPlan.snack,
            ...currentPlan.dinner
          ] : [];
          const currentTotals = {
            calories: getTotalCalories(allMeals),
            protein: getTotalMacros(allMeals).protein,
            carbs: getTotalMacros(allMeals).carbs,
            fat: getTotalMacros(allMeals).fat
          };

          return (
            <div className="space-y-3">
              {/* Calories Progress */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">Calories</span>
                  <span className="text-gray-600">
                    {currentTotals.calories} / {dailyTargets.calories} cal 
                    ({Math.round((currentTotals.calories / dailyTargets.calories) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      currentTotals.calories >= dailyTargets.calories 
                        ? 'bg-green-500' 
                        : currentTotals.calories >= dailyTargets.calories * 0.8 
                          ? 'bg-yellow-500' 
                          : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(100, (currentTotals.calories / dailyTargets.calories) * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Protein Progress */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">Protein</span>
                  <span className="text-gray-600">
                    {currentTotals.protein}g / {dailyTargets.protein}g 
                    ({Math.round((currentTotals.protein / dailyTargets.protein) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      currentTotals.protein >= dailyTargets.protein 
                        ? 'bg-green-500' 
                        : currentTotals.protein >= dailyTargets.protein * 0.8 
                          ? 'bg-yellow-500' 
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, (currentTotals.protein / dailyTargets.protein) * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Carbs Progress */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">Carbs</span>
                  <span className="text-gray-600">
                    {currentTotals.carbs}g / {dailyTargets.carbs}g 
                    ({Math.round((currentTotals.carbs / dailyTargets.carbs) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      currentTotals.carbs >= dailyTargets.carbs 
                        ? 'bg-green-500' 
                        : currentTotals.carbs >= dailyTargets.carbs * 0.8 
                          ? 'bg-yellow-500' 
                          : 'bg-orange-500'
                    }`}
                    style={{ width: `${Math.min(100, (currentTotals.carbs / dailyTargets.carbs) * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Fat Progress */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">Fat</span>
                  <span className="text-gray-600">
                    {currentTotals.fat}g / {dailyTargets.fat}g 
                    ({Math.round((currentTotals.fat / dailyTargets.fat) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      currentTotals.fat >= dailyTargets.fat 
                        ? 'bg-green-500' 
                        : currentTotals.fat >= dailyTargets.fat * 0.8 
                          ? 'bg-yellow-500' 
                          : 'bg-purple-500'
                    }`}
                    style={{ width: `${Math.min(100, (currentTotals.fat / dailyTargets.fat) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
      {/* Meal Sections */}
      <div className="space-y-4">
        {(['breakfast', 'lunch', 'snack', 'dinner'] as const).map((mealType) => {
          const meals = currentPlan?.[mealType] || [];
          const totalCalories = getTotalCalories(meals);

          return (
            <div key={mealType} className="bg-white rounded-lg border">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getMealTypeIcon(mealType)}
                    <div>
                      <h3 className="font-semibold capitalize">{mealType}</h3>
                      <p className="text-sm text-gray-600">{totalCalories} calories</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedMealType(mealType);
                      setShowFoodDialog(true);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
              <div className="p-4">
                {meals.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <Utensils size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No {mealType} assigned</p>
                    <button
                      onClick={() => {
                        setSelectedMealType(mealType);
                        setShowFoodDialog(true);
                      }}
                      className="mt-2 text-blue-600 hover:underline text-sm"
                    >
                      Add {mealType}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {meals.map((meal, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg pl-[1px] pr-[1px] pt-[0px] pb-[0px] mt-[-5px] mb-[-5px] ml-[-5px] mr-[-5px]">
                        <div className="text-2xl bg-white rounded-lg p-2 flex-shrink-0">
                          {meal.image || "🍽️"}
                        </div>
                        <div 
                          className="flex-1 cursor-pointer hover:bg-gray-100 -m-3 p-3 rounded-lg transition-colors"
                          onClick={() => {
                            // Extract base food data from the meal for quantity dialog
                            const baseName = meal.name.replace(/ \(\d+g\)$/, ''); // Remove (XXXg) from name
                            const baseMeal = availableMeals.find(m => m.name === baseName);
                            if (baseMeal) {
                              setSelectedFood(baseMeal);
                              // Calculate current quantity from the meal name
                              const gramMatch = meal.name.match(/\((\d+)g\)/);
                              if (gramMatch) {
                                setFoodQuantity(parseInt(gramMatch[1]) / 100);
                              } else {
                                setFoodQuantity(1);
                              }
                              setSelectedMealType(mealType);
                              setSelectedMealIndex(index);
                              setShowQuantityDialog(true);
                            }
                          }}
                        >
                          <h4 className="font-medium">{meal.name}</h4>
                          <div className="flex gap-4 text-sm text-gray-600">
                            <span>{meal.calories} cal</span>
                            <span>{meal.protein}g protein</span>
                            <span>{meal.carbs}g carbs</span>
                            <span>{meal.fat}g fat</span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeMealFromClient(mealType, index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* Target Edit Modal */}
      {showTargetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Edit Daily Nutrition Targets</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Calories Target
                  </label>
                  <input
                    type="number"
                    value={tempTargets.calories}
                    onChange={(e) => setTempTargets(prev => ({ ...prev, calories: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter calories target"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Protein Target (grams)
                  </label>
                  <input
                    type="number"
                    value={tempTargets.protein}
                    onChange={(e) => setTempTargets(prev => ({ ...prev, protein: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter protein target"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Carbs Target (grams)
                  </label>
                  <input
                    type="number"
                    value={tempTargets.carbs}
                    onChange={(e) => setTempTargets(prev => ({ ...prev, carbs: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter carbs target"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fat Target (grams)
                  </label>
                  <input
                    type="number"
                    value={tempTargets.fat}
                    onChange={(e) => setTempTargets(prev => ({ ...prev, fat: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter fat target"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowTargetModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setDailyTargets(tempTargets);
                    setShowTargetModal(false);
                  }}
                  className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Targets
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Food Selection Dialog */}
      {showFoodDialog && selectedMealType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">
                  Add Food to {selectedMealType || 'Meal'}
                </h2>
                <button
                  onClick={() => {
                    setShowFoodDialog(false);
                    setSelectedMealType(null);
                    setSearchTerm('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
              
              {/* Search Bar */}
              <div className="mt-4 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search for foods..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableMeals
                  .filter(meal => 
                    meal.name.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((meal) => (
                    <div key={meal.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="text-3xl bg-gray-50 rounded-lg p-2 flex-shrink-0">
                          {meal.image || "🍽️"}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">{meal.name}</h3>
                          <p className="text-sm text-gray-600">{meal.calories} calories</p>
                        </div>
                      </div>
                      
                      {/* Nutrition Info */}
                      <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <div className="font-semibold text-gray-800">{meal.protein}g</div>
                          <div className="text-xs text-gray-600">Protein</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <div className="font-semibold text-gray-800">{meal.carbs}g</div>
                          <div className="text-xs text-gray-600">Carbs</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <div className="font-semibold text-gray-800">{meal.fat}g</div>
                          <div className="text-xs text-gray-600">Fat</div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleFoodSelection(meal)}
                        className="w-full px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        {applyToAllDates ? (
                          <span className="flex items-center justify-center gap-1">
                            🎯 Add to All {(() => {
                              const start = new Date(startDate);
                              const end = new Date(endDate);
                              const diffTime = Math.abs(end.getTime() - start.getTime());
                              return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                            })()} Days
                          </span>
                        ) : (
                          'Add'
                        )}
                      </button>
                    </div>
                  ))
                }
              </div>
              
              {availableMeals.filter(meal => 
                meal.name.toLowerCase().includes(searchTerm.toLowerCase())
              ).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Utensils size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No foods found</p>
                  <p className="text-sm">Try a different search term</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Copy Diet Dialog */}
      {showCopyDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">Copy Diet Plan</h2>
                <button
                  onClick={() => {
                    setShowCopyDialog(false);
                    setCopyFromDate('');
                    setCopyToDate('');
                    setCopyDays(1);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Copy from date:
                  </label>
                  <input
                    type="date"
                    value={copyFromDate}
                    onChange={(e) => setCopyFromDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Copy to date:
                  </label>
                  <input
                    type="date"
                    value={copyToDate}
                    onChange={(e) => setCopyToDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of days to copy:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={copyDays}
                    onChange={(e) => setCopyDays(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Will copy to {copyDays} consecutive day{copyDays !== 1 ? 's' : ''} starting from the target date
                  </p>
                </div>
                
                {/* Preview info */}
                {copyFromDate && (() => {
                  const sourcePlan = mealPlans.find(p => p.clientId === selectedClient?.id && p.date === copyFromDate);
                  if (sourcePlan) {
                    const totalMeals = sourcePlan.breakfast.length + sourcePlan.lunch.length + sourcePlan.snack.length + sourcePlan.dinner.length;
                    const totalCalories = getTotalCalories([...sourcePlan.breakfast, ...sourcePlan.lunch, ...sourcePlan.snack, ...sourcePlan.dinner]);
                    return (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Source Plan:</strong> {totalMeals} meals, {totalCalories} calories
                        </p>
                      </div>
                    );
                  } else {
                    return (
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          No diet plan found for the selected date
                        </p>
                      </div>
                    );
                  }
                })()}
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCopyDialog(false);
                    setCopyFromDate('');
                    setCopyToDate('');
                    setCopyDays(1);
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={copyDietPlan}
                  disabled={!copyFromDate || !copyToDate}
                  className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Copy Diet Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Food Selection Dialog */}
      {selectedMealType && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999999,
            width: '100vw',
            height: '100vh'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedMealType(null);
              setSearchTerm('');
            }
          }}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] shadow-2xl border-2 border-blue-500 flex flex-col"
            style={{
              position: 'relative',
              zIndex: 99999999
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dialog Header */}
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Add {selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)}</h2>
                  <p className="text-gray-600">{selectedClient?.name} • {selectedDate}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedMealType(null);
                    setSearchTerm('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            {/* Dialog Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Search Bar */}
              <div className="relative mb-6">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search meals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              

              
              {/* Available Meals */}
              <div className="space-y-3">
                {filteredMeals.map((meal) => (
                  <div key={meal.id} className="bg-white rounded-lg border p-4">
                    <div 
                      className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 -m-4 p-4 rounded-lg transition-colors ml-[-17px] mr-[-17px] pl-[8px] pr-[8px] pt-[4px] pb-[4px] mt-[-15px] mb-[-15px] font-normal text-[17px]"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Click event fired on meal:', meal.name);
                        handleFoodSelection(meal);
                      }}
                    >
                      <div className="text-3xl bg-gray-50 rounded-lg p-2 flex-shrink-0">
                        {meal.image || "🍽️"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-800">{meal.name}</h3>
                        <div className="text-sm font-semibold text-blue-600 mt-1">
                          100g
                        </div>
                        <div className="text-xs text-gray-600 mt-1 ml-[-35px] mr-[-35px] text-center">
                          {meal.calories} cal • {meal.protein}g protein • {meal.carbs}g carbs • {meal.fat}g fat
                        </div>
                      </div>
                      <button 
                        className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-xs font-medium flex-shrink-0 ml-2"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Button clicked for meal:', meal.name);
                          handleFoodSelection(meal);
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Quantity Dialog */}
      {showQuantityDialog && selectedFood && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999999,
            width: '100vw',
            height: '100vh'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowQuantityDialog(false);
              setSelectedFood(null);
              setFoodQuantity(1);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-md shadow-2xl border-4 border-red-500"
            style={{
              position: 'relative',
              zIndex: 999999999
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800">Enter Weight/Quantity</h2>
                <button
                  onClick={() => {
                    setShowQuantityDialog(false);
                    setSelectedFood(null);
                    setFoodQuantity(1);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-4">
              {/* Selected Food Info */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {selectedFood.image || "🍽️"}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{selectedFood.name}</h3>
                    <p className="text-sm text-gray-600">
                      Per serving: {selectedFood.calories} cal, {selectedFood.protein}g protein
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Quantity Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity/Weight (grams):
                </label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  step="10"
                  value={Math.round(foodQuantity * 100)}
                  onChange={(e) => setFoodQuantity(Math.max(0.1, parseFloat(e.target.value) / 100 || 1))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg"
                  placeholder="Enter grams"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Enter weight in grams (10g - 1000g)
                </p>
              </div>
              
              {/* Nutrition Preview */}
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Total Nutrition for {Math.round(foodQuantity * 100)}g:</h4>
                <div className="text-sm">
                  <div>{Math.round(selectedFood.calories * foodQuantity)} cal • {Math.round(selectedFood.protein * foodQuantity)}g protein • {Math.round(selectedFood.carbs * foodQuantity)}g carbs • {Math.round(selectedFood.fat * foodQuantity)}g fat</div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowQuantityDialog(false);
                    setSelectedFood(null);
                    setFoodQuantity(1);
                  }}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    confirmFoodSelection();
                    setShowQuantityDialog(false);
                    setSelectedFood(null);
                    setFoodQuantity(1);
                  }}
                  className="flex-1 px-4 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
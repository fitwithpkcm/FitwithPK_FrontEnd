import React, { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Award, Droplet, MessageSquare, Sun, Moon, Trophy, Check, Dumbbell, Flame, Plus, ChevronRight, FileText } from "lucide-react";
import { formatDate, calculatePercentage, isEmpty } from "../../lib/utils";
import { Link } from "wouter";
import { MobileNav } from "../../components/layout/mobile-nav";
import { Progress } from "../../components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Separator } from "../../components/ui/separator";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../hooks/use-auth";
import { Switch } from "../../components/ui/switch";
import { useTheme } from "next-themes";
import { Input } from "../../components/ui/input";
import { useToast } from "../../hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { dailyUpdate, getDailyUpdate, getDailyUpdateForAWeek, getDietPlan, getSingleDayUpdate } from "../../services/UpdateServices";
import { setBaseUrl } from "../../services/HttpService"
import { BASE_URL, USER_TARGET } from "../../common/Constant";
import { IDailyStats } from "../../interface/IDailyUpdates";
import moment from 'moment';
import { RENDER_URL } from "../../common/Urls";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { IdDietPlan } from "../../interface/IDietPlan";


pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs';

type ActivityItem = {
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  message: string;
  time: string;
};

export interface WeeklyDay {
  WeekDay: string;
  Day?: string;
  Steps?: number;
  Sleep?: number;
  Water?: number;
  Steps_Percent: number;
  Water_Percent: number;
  Sleep_Percent: number;
  [key: string]: unknown; // Still allow other dynamic properties
}


// function starts

export default function HomePage() {
  const { user } = useAuth();
  const currentDate = new Date();


  const { theme, setTheme } = useTheme();
  const [waterInputOpen, setWaterInputOpen] = useState(false);
  const [stepsInputOpen, setStepsInputOpen] = useState(false);
  const [sleepInputOpen, setSleepInputOpen] = useState(false);
  const [waterAmount, setWaterAmount] = useState<string | number | undefined>("");
  const [stepsAmount, setStepsAmount] = useState<string | number | undefined>("");
  const [sleepAmount, setSleepAmount] = useState<string | number | undefined>("");
  const [viewFeedback, setViewFeedback] = useState(false);

  const [workoutCompleted, setWorkoutCompleted] = useState(false);
  const [workoutRating, setWorkoutRating] = useState<1 | 2 | 3 | 4 | 5>(3);//smiley rating
  const [workoutNotes, setWorkoutNotes] = useState("");

  const [workoutRatingOpen, setWorkoutRatingOpen] = useState(false);
  const [chartDataType, setChartDataType] = useState<'Steps_Percent' | 'Water_Percent' | 'Sleep_Percent'>('Steps_Percent');
  const [chartInfoVisible, setChartInfoVisible] = useState(false);

  const [pdfType, setPdfType] = useState<'workout' | 'diet'>('workout');
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [workoutPdfUrl, setWorkOutPdfUrl] = useState("https://api.fitwithpk.com/uploads/onboard/1748047093391-Lastest.pdf");
  const [dietPdfUrl, setDietPdfUrl] = useState("https://api.fitwithpk.com/uploads/onboard/1748047093391-Lastest.pdf");
  const { toast } = useToast();

  // Activity feed items
  const activityItems: ActivityItem[] = [
    {
      icon: <Award className="h-4 w-4" />,
      iconBgColor: "bg-primary-100",
      iconColor: "text-primary-600",
      message: "You completed your daily step goal!",
      time: "2 hours ago",
    },
    {
      icon: <Droplet className="h-4 w-4" />,
      iconBgColor: "bg-blue-100",
      iconColor: "text-blue-600",
      message: "You've reached 75% of your water goal",
      time: "4 hours ago",
    },
    {
      icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L3 7V17L12 22L21 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>,
      iconBgColor: "bg-secondary-100",
      iconColor: "text-secondary-600",
      message: "New weight logged: 72.5kg",
      time: "Yesterday",
    },
  ];




  //constructor basil
  useEffect(() => {
    setBaseUrl(BASE_URL);
  }, []);


  /**
   * author : basil1112
   * Fetch daily updates
   */
  const { data: singleDayUpdates = [] } = useQuery<IDailyStats[]>({
    queryKey: ["singleday-updates"],
    queryFn: () => getSingleDayUpdate({ Day: moment(currentDate).format("DD-MM-YYYY") }).then(res => res.data.data)
  });

  /**
   * author : basil1112
   * Get latest daily stats
   */
  const latestUpdate: IDailyStats | null = singleDayUpdates && singleDayUpdates.length > 0
    ? singleDayUpdates[singleDayUpdates.length - 1]
    : null;



  /**
 * author : basil1112
 * fetch daily updates for this weeek 
 */
  const { data: dailyUpdatesForWeek = [] } = useQuery<IDailyStats[]>({
    queryKey: ["daily-updates-forweek"],
    queryFn: () => getDailyUpdateForAWeek({ Day: moment(currentDate).format("DD-MM-YYYY") }).then(res => res.data.data)
  });


  const { data: dietTargetGoalPlans = {
    FileName: { 'diet_plan': '', 'workout_plan': '' },
    Targets: {
      steps: 100, sleep: 1, water: 1
    },
    FeedBack:''
  } } = useQuery<IdDietPlan | null>({
    queryKey: ['dietPlan'],
    queryFn: async () => {
      const res: ApiResponse<IdDietPlan[]> = await getDietPlan(null);
      const data = res.data?.data?.map(element => ({
        ...element,
        FileName: JSON.parse(element.FileName.toString()),
      }));
      return data.length > 0 ? data[0] : null;

    }
  });




  //useEffect
  useEffect(() => {
    if (latestUpdate != null) {
      setWaterAmount(latestUpdate?.Water);
      setStepsAmount(latestUpdate?.Steps);
      setSleepAmount(latestUpdate?.Sleep);
    }
  }, [latestUpdate])

  useEffect(() => {
    if (dietTargetGoalPlans != null) {
      setWorkOutPdfUrl(`${BASE_URL}/uploads/workplans/${dietTargetGoalPlans?.FileName?.workout_plan}`);
      setDietPdfUrl(`${BASE_URL}/uploads/dietplans/${dietTargetGoalPlans?.FileName?.diet_plan}`);
    }
  }, []);


  /**
   * author : basil1112
   * setting up daily status for one week from monday - sunday
   */
  let weeklyData: WeeklyDay[] = [
    {
      WeekDay: "Mon",
      Steps_Percent: 0,
      Water_Percent: 0,
      Sleep_Percent: 0
    },
    {
      WeekDay: "Tue",
      Steps_Percent: 0,
      Water_Percent: 0,
      Sleep_Percent: 0
    },
    {
      WeekDay: "Wed",
      Steps_Percent: 0,
      Water_Percent: 0,
      Sleep_Percent: 0
    },
    {
      WeekDay: "Thu",
      Steps_Percent: 0,
      Water_Percent: 0,
      Sleep_Percent: 0
    },
    {
      WeekDay: "Fri",
      Steps_Percent: 0,
      Water_Percent: 0,
      Sleep_Percent: 0
    },
    {
      WeekDay: "Sat",
      Steps_Percent: 0,
      Water_Percent: 0,
      Sleep_Percent: 0
    },
    {
      WeekDay: "Sun",
      Steps_Percent: 0,
      Water_Percent: 0,
      Sleep_Percent: 0
    },
  ];

  if (!isEmpty(dailyUpdatesForWeek)) {
    weeklyData = dailyUpdatesForWeek?.map((element: IDailyStats, index: number) => {
      return {
        ...weeklyData[index],
        ...element,
        Steps_Percent: calculatePercentage(element.Steps, USER_TARGET.DAILY_TARGET.STEPS),
        Sleep_Percent: calculatePercentage(element.Sleep, USER_TARGET.DAILY_TARGET.SLEEP),
        Water_Percent: calculatePercentage(element.Water, USER_TARGET.DAILY_TARGET.WATER)
      };
    });
  }



  // Water intake update mutation
  const updateWaterMutation = useMutation({
    mutationFn: async (amount: number) => {
      const transformedData = {
        Water: amount,
        Day: moment(currentDate).format("DD-MM-YYYY")
      };

      return dailyUpdate(transformedData).then((res) => {
        if (res.data.success) {
          return res;
        }
      }).catch((error) => {
        return error
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["singleday-updates"] });
      queryClient.invalidateQueries({ queryKey: ['daily-updates-forweek'] })
      toast({
        title: "Water intake updated",
        description: "Your water intake has been recorded successfully",
      });
      setWaterInputOpen(false);
      setWaterAmount("");
    },
    onError: (error) => {
      toast({
        title: "Failed to update water intake",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Steps update mutation
  const updateStepsMutation = useMutation({
    mutationFn: async (steps: number) => {
      const transformedData = {
        Steps: steps || null,
        Day: moment(currentDate).format("DD-MM-YYYY")
      };

      return dailyUpdate(transformedData).then((res) => {
        if (res.data.success) {
          return res;
        }
      }).catch((error) => {
        return error
      })

    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["singleday-updates"] });
      queryClient.invalidateQueries({ queryKey: ['daily-updates-forweek'] })
      toast({
        title: "Steps updated",
        description: "Your steps count has been recorded successfully",
      });
      setStepsInputOpen(false);
      setStepsAmount("");
    },
    onError: (error) => {
      toast({
        title: "Failed to update steps",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Sleep update mutation
  const updateSleepMutation = useMutation({
    mutationFn: async (hours: number) => {
      const transformedData = {
        Sleep: hours,
        Day: moment(currentDate).format("DD-MM-YYYY")
      };

      return dailyUpdate(transformedData).then((res) => {
        if (res.data.success) {
          return res;
        }
      }).catch((error) => {
        return error
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["singleday-updates"] });
      queryClient.invalidateQueries({ queryKey: ['daily-updates-forweek'] })
      toast({
        title: "Sleep hours updated",
        description: "Your sleep hours have been recorded successfully",
      });
      setSleepInputOpen(false);
      setSleepAmount("");
    },
    onError: (error) => {
      toast({
        title: "Failed to update sleep hours",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update workout status
  const updateWorkoutMutation = useMutation({
    mutationFn: async ({ workrating, notes }: { workrating: number; notes: string }) => {
      const transformedData = {
        WorkOut: workrating,
        Notes: notes,
        Day: moment(currentDate).format("DD-MM-YYYY")
      };

      return dailyUpdate(transformedData).then((res) => {
        if (res.data.success) {
          return res;
        }
      }).catch((error) => {
        return error
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["singleday-updates"] });
      queryClient.invalidateQueries({ queryKey: ['daily-updates-forweek'] })
      toast({
        title: "Workout status updated",
        description: workoutCompleted ? "Great job completing your workout!" : "Workout status updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update workout status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleWaterSubmit = () => {
    const amount = parseFloat("" + waterAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid input",
        description: "Please enter a valid water amount",
        variant: "destructive",
      });
      return;
    }
    // Save to localStorage for auto-fill in updates page
    localStorage.setItem('waterAmount', amount.toString());
    updateWaterMutation.mutate(amount);
  };

  const handleStepsSubmit = () => {
    const steps = parseInt("" + stepsAmount);
    if (isNaN(steps) || steps <= 0) {
      toast({
        title: "Invalid input",
        description: "Please enter a valid number of steps",
        variant: "destructive",
      });
      return;
    }
    // Save to localStorage for auto-fill in updates page
    //localStorage.setItem('stepsAmount', steps.toString());

    updateStepsMutation.mutate(steps);
  };

  const handleSleepSubmit = () => {
    const hours = parseFloat("" + sleepAmount);
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      toast({
        title: "Invalid input",
        description: "Please enter a valid number of sleep hours (between 0 and 24)",
        variant: "destructive",
      });
      return;
    }
    // Save to localStorage for auto-fill in updates page
    localStorage.setItem('sleepAmount', hours.toString());
    updateSleepMutation.mutate(hours);
  };


  const handleWorkOutSubmit = () => {

    if (isNaN(workoutRating)) {
      toast({
        title: "Invalid input",
        description: "Please enter a valid number of sleep hours (between 0 and 24)",
        variant: "destructive",
      });
      return;
    }
    // Save to localStorage for auto-fill in updates page
    updateWorkoutMutation.mutate({
      workrating: workoutRating,
      notes: workoutNotes
    });
    setWorkoutRating(1);
    setWorkoutNotes("");
    setWorkoutCompleted(true);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 py-4 px-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">FitwithPK</h1>
            <div className="flex items-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(currentDate)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center mr-1">
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-gray-500" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-gray-400" />
              <Switch
                className="ml-1"
                checked={theme === "dark"}
                onCheckedChange={() => setTheme(theme === "dark" ? "light" : "dark")}
              />
            </div>

            <Link href={RENDER_URL.STUDENT_ONBOARD}>
              <Button variant="outline" size="sm" className="mr-2 text-xs">
                Update Profile
              </Button>
            </Link>

            <div className="h-9 w-9 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
              <span className="text-primary-700 dark:text-primary-300 font-medium text-sm">
                BJ
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 pb-20 sm:px-6 bg-gray-50 dark:bg-gray-950">
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Steps Card */}
          <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 cursor-pointer" onClick={() => setStepsInputOpen(true)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Today's Steps</h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary-500">
                  <path d="M19 5.5C19 6.9 16.7 8 16 8C15.3 8 13 6.9 13 5.5C13 4.1 14.1 3 16 3C17.9 3 19 4.1 19 5.5ZM16 10C16 10 7 10 7 14.5C7 18.5 12 21 16 21C20 21 21 18 21 14.5C21 11 16 10 16 10ZM11 5.5C11 6.9 8.7 8 8 8C7.3 8 5 6.9 5 5.5C5 4.1 6.1 3 8 3C9.9 3 11 4.1 11 5.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex items-end">
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{latestUpdate?.Steps || 0}</span>
                <span className="ml-1 text-xs text-gray-500 dark:text-gray-400 mb-1">/ {dietTargetGoalPlans?.Targets.steps}</span>
              </div>
              <Progress value={calculatePercentage(latestUpdate?.Steps || 0, dietTargetGoalPlans!.Targets.steps)} className="mt-2 h-2 dark:bg-gray-800" />
            </CardContent>
          </Card>

          {/* Water Intake Card */}
          <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900" onClick={() => setWaterInputOpen(true)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Water Intake</h3>
                <Droplet className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex items-end">
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{latestUpdate?.Water || 0}</span>
                <span className="ml-1 text-xs text-gray-500 dark:text-gray-400 mb-1">/ {dietTargetGoalPlans?.Targets.water} ltrs</span>
              </div>
              <Progress value={calculatePercentage(latestUpdate?.Water || 0, dietTargetGoalPlans!.Targets.water)} className="mt-2 h-2 bg-gray-100 dark:bg-gray-800">
                <div className="h-full bg-blue-500 rounded-full" />
              </Progress>
              <div className="mt-2 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs bg-blue-50 text-blue-600 border-blue-200 w-full max-w-[160px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Add 250ml (0.25L) to current water intake
                    let currentWater = latestUpdate?.Water || 0;
                    currentWater = parseFloat("" + currentWater)
                    const newAmount = currentWater + 0.25;
                    setWaterAmount(newAmount.toString());
                    updateWaterMutation.mutate(newAmount);
                  }}
                >
                  + 250ml
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Sleep tracker */}
          <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 cursor-pointer" onClick={() => setSleepInputOpen(true)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Sleep Tracker</h3>
                <Moon className="h-5 w-5 text-purple-500" />
              </div>
              <div className="flex items-end">
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{latestUpdate?.Sleep || 7.5}</span>
                <span className="ml-1 text-xs text-gray-500 dark:text-gray-400 mb-1">/ {dietTargetGoalPlans?.Targets.sleep} hours</span>
              </div>
              <Progress value={calculatePercentage(latestUpdate?.Sleep || 0, dietTargetGoalPlans!.Targets.sleep)} className="mt-2 h-2 bg-gray-100 dark:bg-gray-800">
                <div className="h-full bg-purple-500 rounded-full" />
              </Progress>

            </CardContent>
          </Card>

          {/* Workout Completion Card */}
          <Card
            className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 cursor-pointer"
            onClick={() => {
              if (!latestUpdate?.WorkOut_Follow) {
                setWorkoutRatingOpen(true);
              }
            }}
          >
            <CardContent className="p-4 flex flex-col h-full">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Today's Workout</h3>
                <Dumbbell className="h-5 w-5 text-secondary-500" />
              </div>
              <p className="text-sm text-gray-800 dark:text-gray-200">Upper Body Strength</p>

              {latestUpdate?.WorkOut_Follow ? (
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${latestUpdate.WorkOut_Follow === 1 ? 'bg-red-500' :
                      latestUpdate.WorkOut_Follow === 2 ? 'bg-orange-500' :
                        latestUpdate.WorkOut_Follow === 3 ? 'bg-yellow-500' :
                          latestUpdate.WorkOut_Follow === 4 ? 'bg-lime-500' :
                            'bg-green-500'
                      }`}>
                      {latestUpdate.WorkOut_Follow === 1 && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm2.97 4.43l1.06-1.06 1.06 1.06 1.415-1.414-1.06-1.06 1.06-1.06-1.415-1.416-1.06 1.06-1.06-1.06-1.414 1.415 1.06 1.06-1.06 1.06 1.414 1.415z" />
                        </svg>
                      )}
                      {latestUpdate.WorkOut_Follow === 2 && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm8 5H9v2h6v-2z" />
                        </svg>
                      )}
                      {latestUpdate.WorkOut_Follow === 3 && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm8 5H9v2h6v-2z" />
                        </svg>
                      )}
                      {latestUpdate.WorkOut_Follow === 4 && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm1.146 5.146l1.414 1.414L12 15.12l2.44 2.44 1.414-1.414L12 12.292l-3.854 3.854z" />
                        </svg>
                      )}
                      {(!latestUpdate.WorkOut_Follow || latestUpdate.WorkOut_Follow === 5) && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm4.592 4.295l2.7-4.055 1.416.943-3.85 5.776-3.374-2.7.943-1.176 2.165 1.212z" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-medium ml-2 text-gray-800 dark:text-gray-200">
                      {latestUpdate.WorkOut_Follow || 5}/5
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                    onClick={() => {
                      setWorkoutCompleted(false);
                      localStorage.setItem('workoutCompleted', 'false');
                      // updateWorkoutStatus.mutate({completed: false});
                    }}
                  >
                    Revert
                  </Button>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  className={`mt-auto self-start h-8 ${workoutRating ? 'px-2' : 'pl-2 pr-3'}`}
                  onClick={() => {
                    setWorkoutRatingOpen(true);
                  }}
                >
                  {/* Display appropriate smiley based on the workout rating */}
                  <div className="flex items-center gap-1">
                    <div className={`w-5 h-5 flex items-center justify-center rounded-full ${workoutRating === 1 ? 'bg-red-500' :
                      workoutRating === 2 ? 'bg-orange-500' :
                        workoutRating === 3 ? 'bg-yellow-500' :
                          workoutRating === 4 ? 'bg-lime-500' :
                            workoutRating === 5 ? 'bg-green-500' :
                              'bg-gray-200 dark:bg-gray-700'
                      }`}>
                      {workoutRating === 1 && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm2.97 4.43l1.06-1.06 1.06 1.06 1.415-1.414-1.06-1.06 1.06-1.06-1.415-1.416-1.06 1.06-1.06-1.06-1.414 1.415 1.06 1.06-1.06 1.06 1.414 1.415z" />
                        </svg>
                      )}
                      {workoutRating === 2 && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm8 5H9v2h6v-2z" />
                        </svg>
                      )}
                      {workoutRating === 3 && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm8 5H9v2h6v-2z" />
                        </svg>
                      )}
                      {workoutRating === 4 && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm1.146 5.146l1.414 1.414L12 15.12l2.44 2.44 1.414-1.414L12 12.292l-3.854 3.854z" />
                        </svg>
                      )}
                      {workoutRating === 5 && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm4.592 4.295l2.7-4.055 1.416.943-3.85 5.776-3.374-2.7.943-1.176 2.165 1.212z" />
                        </svg>
                      )}
                      {!workoutRating && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                          <line x1="9" y1="9" x2="9.01" y2="9" />
                          <line x1="15" y1="9" x2="15.01" y2="9" />
                        </svg>
                      )}
                    </div>
                    {!workoutRating && <span className="text-xs">Rate</span>}
                  </div>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>


        {/* PDF Plans Section */}
        <div className="mb-6">
          <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-medium text-gray-800 dark:text-gray-200">Your Plans</h3>
                <FileText className="h-5 w-5 text-primary-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="flex items-center justify-between  h-auto gap-2 bg-gradient-to-r from-primary-50 to-blue-50 hover:from-primary-100 hover:to-blue-100 border-primary-200 dark:from-primary-950/30 dark:to-blue-950/30 dark:border-primary-800 dark:hover:from-primary-950/40 dark:hover:to-blue-950/40"
                  onClick={() => {
                    setPdfType('workout');
                    setPdfViewerOpen(true);
                  }}
                >
                  <div className="flex flex-col items-start min-w-0"> {/* Added min-w-0 */}
                    <span className="text-base font-medium text-gray-900 dark:text-gray-100">Workout Plan</span> {/* Added truncate */}
                    <span className="text-xs text-pretty text-left text-gray-600 dark:text-gray-400">8-Week Strength Program</span> {/* Added truncate */}
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center justify-between px-4 py-6 h-auto gap-2 bg-gradient-to-r from-green-50 to-lime-50 hover:from-green-100 hover:to-lime-100 border-green-200 dark:from-green-950/30 dark:to-lime-950/30 dark:border-green-800 dark:hover:from-green-950/40 dark:hover:to-lime-950/40"
                  onClick={() => {
                    setPdfType('diet');
                    setPdfViewerOpen(true);
                  }}
                >
                  <div className="flex flex-col items-start min-w-0"> {/* Added min-w-0 */}
                    <span className="text-base font-medium text-gray-900 dark:text-gray-100 truncate">Diet Plan</span> {/* Added truncate */}
                    <span className="text-xs text-pretty text-left text-gray-600 dark:text-gray-400 truncate">Nutrition Guide & Meal Plan</span> {/* Added truncate */}
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>


        {/* Weekly Progress Chart */}
        <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-medium text-gray-800 dark:text-gray-200">Weekly Progress</h3>
              <div className="flex text-xs">
                <button
                  className="py-1 px-2 rounded-l bg-primary-500 text-white"
                  onClick={() => {
                    setChartDataType('Steps_Percent');
                    setChartInfoVisible(true);
                  }}
                >
                  Steps
                </button>
                <button
                  className="py-1 px-2 border-r border-l border-primary-600 bg-primary-600 text-white"
                  onClick={() => {
                    setChartDataType('Water_Percent');
                    setChartInfoVisible(true);
                  }}
                >
                  Water
                </button>
                <button
                  className="py-1 px-2 rounded-r bg-primary-500 text-white"
                  onClick={() => {
                    setChartDataType('Sleep_Percent');
                    setChartInfoVisible(true);
                  }}
                >
                  Sleep
                </button>
              </div>
            </div>

            <div className="chart-container relative pb-10 h-[150px] mt-8">
              {weeklyData.map((data, index) => (
                <div
                  key={data.Day}
                  className="absolute bottom-10 cursor-pointer"
                  onClick={() => setChartInfoVisible(true)}
                  style={{
                    left: `${(index * 12) + 5}%`,
                    height: `${data[chartDataType] * 0.8}%`,
                    width: '8%',
                    backgroundColor:
                      chartDataType === 'Steps_Percent' ? (theme === 'dark' ? '#4f46e5' : '#3B82F6') :
                        chartDataType === 'Water_Percent' ? '#0EA5E9' :
                          '#A855F7',
                    borderRadius: '4px 4px 0 0'
                  }}
                >
                  <div className="absolute -bottom-8 text-center w-full text-xs text-gray-500 dark:text-gray-400">
                    {data.WeekDay}
                  </div>
                  <div className="absolute -top-5 text-center w-full text-xs font-medium text-primary-700 dark:text-primary-400">
                    {data[chartDataType]}%
                  </div>
                </div>
              ))}

              {chartInfoVisible && (
                <div className="absolute inset-x-0 -bottom-14 bg-white dark:bg-gray-800 rounded-md p-2 shadow border border-gray-200 dark:border-gray-700 text-sm">
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      {chartDataType === 'Steps_Percent' ? 'Step Count' :
                        chartDataType === 'Water_Percent' ? 'Water Intake' : 'Sleep Hours'}
                    </div>
                    <button
                      onClick={() => setChartInfoVisible(false)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      &times;
                    </button>
                  </div>
                  <div className="mt-1 grid grid-cols-7 gap-1">
                    {weeklyData.map((data, i) => (
                      <div key={i} className="text-center">
                        <div className="text-xs font-medium">{data.WeekDay}</div>
                        <div className="text-xs">
                          {chartDataType === 'Steps_Percent' ? data.Steps :
                            chartDataType === 'Water_Percent' ? data.Water : data.Sleep}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Coach's Comments Section */}
        <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 overflow-hidden mb-6">
          <CardHeader className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <CardTitle className="text-base font-medium text-gray-800 dark:text-gray-200">Coach's Feedback</CardTitle>
            <Badge variant="outline" className="bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border-primary-200 dark:border-primary-800">
              New
            </Badge>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              <div className="p-4">
                <div className="flex items-start mb-3">
                  <div>
                    <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                      <p>{dietTargetGoalPlans?.FeedBack}</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                    onClick={() => setViewFeedback(true)}
                  >
                    View All Feedback
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* View Progress Button */}
        <div className="flex justify-center mb-6">
          <Link href="/progress">
            <Button className="bg-primary-600 hover:bg-primary-700 text-white w-full">
              View Complete Progress
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>

        {/* Activity Feed */}
        <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-medium text-gray-800 dark:text-gray-200">Recent Activity</h3>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {activityItems.map((item, index) => (
              <div key={index} className="px-4 py-3 flex items-center">
                <div className={`w-8 h-8 rounded-full ${item.iconBgColor} flex-shrink-0 flex items-center justify-center ${item.iconColor}`}>
                  {item.icon}
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-800 dark:text-gray-200">{item.message}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </main>

      <MobileNav />

      {/* Water Input Dialog */}
      <Dialog open={waterInputOpen} onOpenChange={setWaterInputOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Water Intake</DialogTitle>
            <DialogDescription>
              Enter the amount of water you've consumed in liters.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="waterAmount" className="text-right text-sm font-medium col-span-1">
                Amount
              </label>
              <div className="col-span-3 flex items-center">
                <Input
                  id="waterAmount"
                  type="number"
                  placeholder="0.0"
                  step="0.1"
                  value={waterAmount}
                  onChange={(e) => setWaterAmount(e.target.value)}
                  className="mr-2"
                />
                <span>liters</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-1"></div>
              <div className="col-span-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                  onClick={() => {
                    const newAmount = 0.25;
                    setWaterAmount(newAmount.toString());
                  }}
                >
                  250ml
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                  onClick={() => {
                    const newAmount = 0.5;
                    setWaterAmount(newAmount.toString());
                  }}
                >
                  500ml
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                  onClick={() => {
                    const newAmount = 1;
                    setWaterAmount(newAmount.toString());
                  }}
                >
                  1 liter
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                  onClick={() => {
                    const currentAmount = parseFloat("" + waterAmount) || 0;
                    const newAmount = currentAmount + 0.25;
                    setWaterAmount(newAmount.toString());
                  }}
                >
                  + 250ml
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWaterInputOpen(false)}>Cancel</Button>
            <Button onClick={handleWaterSubmit} disabled={updateWaterMutation.isPending}>
              {updateWaterMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Steps Input Dialog */}
      <Dialog open={stepsInputOpen} onOpenChange={setStepsInputOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Step Count</DialogTitle>
            <DialogDescription>
              Enter the number of steps you've taken today.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="stepsAmount" className="text-right text-sm font-medium col-span-1">
                Steps
              </label>
              <div className="col-span-3">
                <Input
                  id="stepsAmount"
                  type="number"
                  placeholder="0"
                  value={stepsAmount}
                  onChange={(e) => setStepsAmount(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStepsInputOpen(false)}>Cancel</Button>
            <Button onClick={handleStepsSubmit} disabled={updateStepsMutation.isPending}>
              {updateStepsMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sleep Input Dialog */}
      <Dialog open={sleepInputOpen} onOpenChange={setSleepInputOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Sleep Hours</DialogTitle>
            <DialogDescription>
              Enter how many hours you slept last night.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="sleepAmount" className="text-right text-sm font-medium col-span-1">
                Hours
              </label>
              <div className="col-span-3 flex items-center">
                <Input
                  id="sleepAmount"
                  type="number"
                  placeholder="0.0"
                  step="0.5"
                  min="0"
                  max="24"
                  value={sleepAmount}
                  onChange={(e) => setSleepAmount(e.target.value)}
                  className="mr-2"
                />
                <span>hours</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSleepInputOpen(false)}>Cancel</Button>
            <Button onClick={handleSleepSubmit} disabled={updateSleepMutation.isPending}>
              {updateSleepMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View All Feedback Dialog */}
      <Dialog open={viewFeedback} onOpenChange={setViewFeedback}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Coach's Feedback History</DialogTitle>
            <DialogDescription>
              View all feedback from Coach PK
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-2">
            {/* Current feedback */}
            <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
                    <span className="text-primary-700 dark:text-primary-300 font-bold">PK</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Coach PK</h4>
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">Yesterday</span>
                  </div>
                  <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                    <p>Great job on hitting your step goal consistently this week! I noticed your water intake could use some improvement.</p>
                    <p className="mt-2">For next week, let's focus on:</p>
                    <ul className="list-disc pl-5 mt-1 space-y-1 text-sm">
                      <li>Increasing your water intake to at least 2L daily</li>
                      <li>Adding 10 minutes of stretching after your workouts</li>
                      <li>Tracking your protein intake more carefully</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Older feedback items */}
            <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
                    <span className="text-primary-700 dark:text-primary-300 font-bold">PK</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Coach PK</h4>
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">4 days ago</span>
                  </div>
                  <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                    <p>I reviewed your workout logs and noticed you're making steady progress with your upper body exercises. Your bicep curl technique has improved significantly!</p>
                    <p className="mt-2">Some suggestions:</p>
                    <ul className="list-disc pl-5 mt-1 space-y-1 text-sm">
                      <li>Try increasing the weight for shoulder press by 5%</li>
                      <li>Let's add pull-ups to your routine next week</li>
                      <li>Your recovery seems good - keep up the protein intake</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="pb-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
                    <span className="text-primary-700 dark:text-primary-300 font-bold">PK</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Coach PK</h4>
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">Last week</span>
                  </div>
                  <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                    <p>Looking at your nutrition logs, I see you're consistently hitting your protein goals. That's excellent!</p>
                    <p className="mt-2">I noticed your carb intake is a bit higher than we discussed. For next week:</p>
                    <ul className="list-disc pl-5 mt-1 space-y-1 text-sm">
                      <li>Try swapping some carbs for healthy fats (avocados, nuts)</li>
                      <li>Consider adding another 10 minutes of cardio on rest days</li>
                      <li>Your water intake is improving - keep it up!</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setViewFeedback(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Workout Rating Dialog */}
      <Dialog open={workoutRatingOpen} onOpenChange={setWorkoutRatingOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rate Your Workout</DialogTitle>
            <DialogDescription>
              How did you follow your workout plan today?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Rating:</label>
              <div className="flex space-x-2">
                <div
                  className={`cursor-pointer rounded-full w-8 h-8 flex items-center justify-center transition-all duration-200 ${workoutRating === 1 ? 'bg-red-500 transform scale-125 z-10' : 'bg-red-500 opacity-75 hover:opacity-100'}`}
                  onClick={() => setWorkoutRating(1)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm2.97 4.43l1.06-1.06 1.06 1.06 1.415-1.414-1.06-1.06 1.06-1.06-1.415-1.416-1.06 1.06-1.06-1.06-1.414 1.415 1.06 1.06-1.06 1.06 1.414 1.415z" />
                  </svg>
                </div>
                <div
                  className={`cursor-pointer rounded-full w-8 h-8 flex items-center justify-center transition-all duration-200 ${workoutRating === 2 ? 'bg-orange-500 transform scale-125 z-10' : 'bg-orange-500 opacity-75 hover:opacity-100'}`}
                  onClick={() => setWorkoutRating(2)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm8 5H9v2h6v-2z" />
                  </svg>
                </div>
                <div
                  className={`cursor-pointer rounded-full w-8 h-8 flex items-center justify-center transition-all duration-200 ${workoutRating === 3 ? 'bg-yellow-500 transform scale-125 z-10' : 'bg-yellow-500 opacity-75 hover:opacity-100'}`}
                  onClick={() => setWorkoutRating(3)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm8 5H9v2h6v-2z" />
                  </svg>
                </div>
                <div
                  className={`cursor-pointer rounded-full w-8 h-8 flex items-center justify-center transition-all duration-200 ${workoutRating === 4 ? 'bg-lime-500 transform scale-125 z-10' : 'bg-lime-500 opacity-75 hover:opacity-100'}`}
                  onClick={() => setWorkoutRating(4)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm1.146 5.146l1.414 1.414L12 15.12l2.44 2.44 1.414-1.414L12 12.292l-3.854 3.854z" />
                  </svg>
                </div>
                <div
                  className={`cursor-pointer rounded-full w-8 h-8 flex items-center justify-center transition-all duration-200 ${workoutRating === 5 ? 'bg-green-500 transform scale-125 z-10' : 'bg-green-500 opacity-75 hover:opacity-100'}`}
                  onClick={() => setWorkoutRating(5)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm4.592 4.295l2.7-4.055 1.416.943-3.85 5.776-3.374-2.7.943-1.176 2.165 1.212z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-xs border border-gray-200 dark:border-gray-700">
              {workoutRating === 1 && (
                <div className="flex items-start">
                  <span className="w-3 h-3 rounded-full bg-red-500 mr-2 mt-0.5 flex-shrink-0"></span>
                  <span className="text-gray-700 dark:text-gray-300">Off Plan (Did not do workout)</span>
                </div>
              )}
              {workoutRating === 2 && (
                <div className="flex items-start">
                  <span className="w-3 h-3 rounded-full bg-orange-500 mr-2 mt-0.5 flex-shrink-0"></span>
                  <span className="text-gray-700 dark:text-gray-300">Some Effort (Minimal workout)</span>
                </div>
              )}
              {workoutRating === 3 && (
                <div className="flex items-start">
                  <span className="w-3 h-3 rounded-full bg-yellow-500 mr-2 mt-0.5 flex-shrink-0"></span>
                  <span className="text-gray-700 dark:text-gray-300">Partially On Track (Modified workout)</span>
                </div>
              )}
              {workoutRating === 4 && (
                <div className="flex items-start">
                  <span className="w-3 h-3 rounded-full bg-lime-500 mr-2 mt-0.5 flex-shrink-0"></span>
                  <span className="text-gray-700 dark:text-gray-300">Workout Completed, Steps Missed</span>
                </div>
              )}
              {workoutRating === 5 && (
                <div className="flex items-start">
                  <span className="w-3 h-3 rounded-full bg-green-500 mr-2 mt-0.5 flex-shrink-0"></span>
                  <span className="text-gray-700 dark:text-gray-300">Workout and Step Goal Completed</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes:</label>
              <textarea
                className="w-full min-h-[80px] p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="Add any notes about your workout (optional)"
                value={workoutNotes}
                onChange={(e) => setWorkoutNotes(e.target.value)}
              ></textarea>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {

                handleWorkOutSubmit();


              }}
              className="w-full"
            >
              Submit WorkOut Updates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* PDF Viewer Dialog */}
      <Dialog open={pdfViewerOpen} onOpenChange={setPdfViewerOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{pdfType === 'workout' ? 'Workout Plan' : 'Diet Plan'}</DialogTitle>
            <DialogDescription>
              {pdfType === 'workout'
                ? '8-Week Strength Training Program by Coach PK'
                : 'Nutrition Guide & Customized Meal Plan by Coach PK'}
            </DialogDescription>
          </DialogHeader>

          {/* PDF Viewer Container - Key changes here */}
          <div className="flex-1 overflow-y-auto mt-2 mb-4">
            <div className="rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 w-full h-full flex flex-col">
              {pdfType === 'workout' ? (
                workoutPdfUrl ? (
                  <Document
                    file={workoutPdfUrl}
                    loading={
                      <div className="flex-1 flex items-center justify-center p-4">
                        <p>Loading workout plan...</p>
                      </div>
                    }
                    error={
                      <div className="flex-1 flex items-center justify-center p-4 text-red-500">
                        Failed to load workout plan PDF.
                      </div>
                    }
                    className="flex-1 flex flex-col min-h-0"
                  >
                    <div className="flex-1 overflow-auto p-2">
                      <Page
                        pageNumber={1}
                        width={Math.min(750, window.innerWidth - 64)} // Responsive width
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        className="mx-auto" // Center the PDF
                      />
                    </div>
                  </Document>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-4">
                    <FileText className="h-16 w-16 text-primary-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Workout Plan PDF</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      No workout plan available
                    </p>
                  </div>
                )
              ) : dietPdfUrl ? (
                <Document
                  file={dietPdfUrl}
                  loading={
                    <div className="flex-1 flex items-center justify-center p-4">
                      <p>Loading diet plan...</p>
                    </div>
                  }
                  error={
                    <div className="flex-1 flex items-center justify-center p-4 text-red-500">
                      Failed to load diet plan PDF.
                    </div>
                  }
                  className="flex-1 flex flex-col min-h-0"
                >
                  <div className="flex-1 overflow-auto p-2">
                    <Page
                      pageNumber={1}
                      width={Math.min(750, window.innerWidth - 64)} // Responsive width
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      className="mx-auto" // Center the PDF
                    />
                  </div>
                </Document>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-4">
                  <FileText className="h-16 w-16 text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Diet Plan PDF</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    No diet plan available
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex justify-between items-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Last updated: May 15, 2025
            </div>
            <Button onClick={() => setPdfViewerOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

"use client"

import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Award, Droplet, MessageSquare, Sun, Moon, Trophy, Check, Dumbbell, Flame, Plus, ChevronRight, FileText, X, CreditCard } from "lucide-react";
import { formatDate, calculatePercentage, isEmpty } from "../../lib/utils";
import { Link } from "wouter";
import { MobileNav } from "../../components/layout/mobile-nav";
import { Progress } from "../../components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../hooks/use-auth";
import { Switch } from "../../components/ui/switch";
import { useTheme } from "next-themes";
import { Input } from "../../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { queryClient } from "../../lib/queryClient";
import { dailyUpdate, getDailyUpdateForAWeek, getDietPlan, getSingleDayUpdate } from "../../services/UpdateServices";
import { setBaseUrl } from "../../services/HttpService"
import { ACCESS_STATUS, BASE_URL, USER_TARGET } from "../../common/Constant";
import { IDailyStats } from "../../interface/IDailyUpdates";
import moment from 'moment';
import { RENDER_URL } from "../../common/Urls";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { IdDietPlan } from "../../interface/IDietPlan";
import { IUser } from "@/interface/models/User";
import { getLoggedUserDetails } from "@/services/ProfileService";
import { usePushNotification } from "@/hooks/use-push-notification";

import toast from 'react-hot-toast';

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
  const { user, logoutMutation } = useAuth();
  const currentDate = new Date();

  // Register Web Push subscription so coach can send reminders to this client
  const { status: pushStatus, subscribe: enablePush } = usePushNotification();

  if (user?.info.EmailID == "devumani10@gmail.com" || user?.info.EmailID == "devumani3@gmail.com") {
    alert("Odikko Nee");
  }

  const { theme, setTheme } = useTheme();
  const [waterInputOpen, setWaterInputOpen] = useState(false);
  const [stepsInputOpen, setStepsInputOpen] = useState(false);
  const [sleepInputOpen, setSleepInputOpen] = useState(false);
  const [paymentFailedAlert, setPaymentFailedAlert] = useState(false);

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
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [sleepStartAngle, setSleepStartAngle] = useState(0); // degrees, 0 = 12 o'clock, clockwise
  const draggingHandle = useRef<'start' | 'end' | null>(null);

  const [pdfType, setPdfType] = useState<'workout' | 'diet'>('workout');
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [workoutPdfUrl, setWorkOutPdfUrl] = useState("https://api.fitwithpk.com/uploads/onboard/1748047093391-Lastest.pdf");
  const [dietPdfUrl, setDietPdfUrl] = useState("https://api.fitwithpk.com/uploads/onboard/1748047093391-Lastest.pdf");


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
    FeedBack: ''
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


  const { data: loggedUserDetails } = useQuery<Partial<IUser> | null | undefined>({
    queryKey: ["get_mydetails"],
    queryFn: async () => {
      try {
        const res = await getLoggedUserDetails(0) as ApiResponse<Partial<IUser[]>>;
        if (Array.isArray(res.data.data) && res.data.data.length > 0) {
          return res.data.data[0];
        }
        return null;
      } catch (error) {
        console.log("error handling", error);
        return undefined; // Now matches the type
      }
    }
  });


  useEffect(() => {
    if (loggedUserDetails) {
      if (loggedUserDetails.ActiveStatus == ACCESS_STATUS.PAYMENT_FAILED.NUMBER) {
        //setPaymentFailedAlert(true);
        toast.custom(
          (t) => (
            <div
              className={`${t.visible ? 'animate-enter' : 'animate-leave'
                } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 border-l-4 border-red-500`}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    <CreditCard className="h-6 w-6 text-red-500" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Payment Required
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      Your subscription payment is overdue. Please update your payment.
                    </p>
                    <div className="mt-3 flex space-x-4">
                      <button
                        onClick={() => {
                          // Add your payment action here
                          console.log('Redirect to payment');
                          toast.dismiss(t.id);
                        }}
                        className="bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-red-700 transition-colors"
                        style={{ visibility: "hidden" }}
                      >
                        Update
                      </button>
                      <button
                        onClick={() => toast.dismiss(t.id)}
                        className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm font-medium hover:bg-gray-300 transition-colors"
                      >
                        Remind Me Later
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex border-l border-gray-200">
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          ),
          {
            duration: Infinity, 
            position: 'top-right',
          }
        );
      }
    }

  }, [loggedUserDetails]);



  //useEffect
  useEffect(() => {
    if (latestUpdate != null) {
      setWaterAmount(latestUpdate?.Water);
      setStepsAmount(latestUpdate?.Steps);
      setSleepAmount(latestUpdate?.Sleep);
    }
  }, [latestUpdate])

  useEffect(() => {
    console.log("filesnames", dietTargetGoalPlans);
    if (dietTargetGoalPlans != null) {
      setWorkOutPdfUrl(`${BASE_URL}/uploads/workplans/${dietTargetGoalPlans?.FileName?.workout_plan}`);
      setDietPdfUrl(`${BASE_URL}/uploads/dietplans/${dietTargetGoalPlans?.FileName?.diet_plan}`);
    }
  }, []);


  useEffect(() => {
    console.log("filesnames 2nd try", dietTargetGoalPlans);
    if (dietTargetGoalPlans != null) {
      setWorkOutPdfUrl(`${BASE_URL}/uploads/workplans/${dietTargetGoalPlans?.FileName?.workout_plan}`);
      setDietPdfUrl(`${BASE_URL}/uploads/dietplans/${dietTargetGoalPlans?.FileName?.diet_plan}`);
    }
  }, [dietTargetGoalPlans]);

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
    onSuccess: (_, amount) => {
      // Immediately update the cached daily stats so the home card bottle reflects the new value
      // without waiting for the async refetch to complete
      queryClient.setQueryData<IDailyStats[]>(["singleday-updates"], (old = []) => {
        if (old.length === 0) return old;
        return old.map((item, idx) => idx === old.length - 1 ? { ...item, Water: amount } : item);
      });
      queryClient.invalidateQueries({ queryKey: ["singleday-updates"] });
      queryClient.invalidateQueries({ queryKey: ['daily-updates-forweek'] });
      toast.success('Your water intake has been recorded successfully', {
        id: 'water-log',
        position: 'bottom-center',
        duration: 2500,
      });
      setWaterInputOpen(false);
      setWaterAmount("");
    },
    onError: (error) => {
      toast.error(`Failed ${error.message}`, {
        position: 'bottom-center'
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
      toast.success('Your steps count has been recorded successfully', {
        position: 'bottom-center'
      })

      setStepsInputOpen(false);
      setStepsAmount("");
    },
    onError: (error) => {
      toast.error(`Failed to update steps ${error.message}`, {
        position: 'bottom-center'
      })
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
      toast.success('Your sleep hours have been recorded successfully', {
        position: 'bottom-center'
      })

      setSleepInputOpen(false);
      setSleepAmount("");
    },
    onError: (error) => {

      toast.success(' Failed to update sleep hours', {
        position: 'bottom-center'
      })


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

      toast.success('Workout status updated', {
        position: 'bottom-center'
      })

    },
    onError: (error) => {
      toast.error('Failed to update Workout status', {
        position: 'bottom-center'
      })
    },
  });

  const handleWaterSubmit = () => {
    const amount = parseFloat("" + waterAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid water amount', {
        position: 'bottom-center'
      })

      return;
    }
    // Save to localStorage for auto-fill in updates page
    localStorage.setItem('waterAmount', amount.toString());
    updateWaterMutation.mutate(amount);
  };

  const handleStepsSubmit = () => {
    const steps = parseInt("" + stepsAmount);
    if (isNaN(steps) || steps <= 0) {
      toast.error('Please enter a valid number of steps', {
        position: 'bottom-center'
      })

      return;
    }
    // Save to localStorage for auto-fill in updates page
    //localStorage.setItem('stepsAmount', steps.toString());

    updateStepsMutation.mutate(steps);
  };

  const handleSleepSubmit = () => {
    const hours = parseFloat("" + sleepAmount);
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      toast.error('Please enter a valid number of sleep hours (between 0 and 24)', {
        position: 'bottom-center'
      })
      return;
    }
    // Save to localStorage for auto-fill in updates page
    localStorage.setItem('sleepAmount', hours.toString());
    updateSleepMutation.mutate(hours);
  };


  const handleWorkOutSubmit = () => {

    if (isNaN(workoutRating)) {

      toast.error('Please enter a valid number of sleep hours (between 0 and 24)', {
        position: 'bottom-center'
      })

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
    setWorkoutRatingOpen(false);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="bg-gradient-to-r from-blue-700 to-blue-600 py-4 px-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-xs font-medium">{formatDate(currentDate)}</p>
            <h1 className="text-xl font-bold text-white mt-0.5">
              Hey, {user?.info?.FirstName} 👋
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-blue-200" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-blue-200" />
              <Switch
                className="ml-1"
                checked={theme === "dark"}
                onCheckedChange={() => setTheme(theme === "dark" ? "light" : "dark")}
              />
            </div>

            <Link href={RENDER_URL.STUDENT_ONBOARD}>
              <Button variant="outline" size="sm" className="text-xs bg-white/15 border-white/30 text-white hover:bg-white/25 backdrop-blur-sm">
                Profile
              </Button>
            </Link>

            <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30">
              <span className="text-white font-semibold text-sm">
                {user?.info?.FirstName.charAt(0)}{user?.info?.LastName.charAt(0)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-5 pb-24 sm:px-6 bg-gray-50 dark:bg-gray-950">

        {/* Notification banner — visible until subscribed or dismissed */}
        {pushStatus !== 'subscribed' && !bannerDismissed && (
          <div className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 mb-4 border ${
            pushStatus === 'denied'
              ? 'bg-red-50 border-red-200'
              : pushStatus === 'subscribing'
              ? 'bg-blue-50 border-blue-200'
              : 'bg-orange-50 border-orange-200'
          }`}>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-lg">
                {pushStatus === 'denied' ? '🚫' : pushStatus === 'subscribing' ? '⏳' : '🔔'}
              </span>
              <span className={
                pushStatus === 'denied' ? 'text-red-800'
                : pushStatus === 'subscribing' ? 'text-blue-700'
                : 'text-orange-800'
              }>
                {pushStatus === 'denied' ? (
                  <span>
                    Notifications blocked.{' '}
                    <strong>To fix:</strong> open your browser Settings → Site Settings → Notifications → find this site → set to <strong>Allow</strong>, then reload the app.
                  </span>
                ) : pushStatus === 'subscribing' ? (
                  'Enabling notifications…'
                ) : (
                  'Enable notifications so your coach can send you reminders.'
                )}
              </span>
            </div>
            {(pushStatus === 'idle' || pushStatus === 'error') && (
              <button
                onClick={enablePush}
                className="text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 px-4 py-2 rounded-lg flex-shrink-0"
              >
                Enable
              </button>
            )}
            <button
              onClick={() => setBannerDismissed(true)}
              className="flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-black/10 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Steps Card — Radial Spinner */}
          {(() => {
            const stepsPct = Math.min(calculatePercentage(latestUpdate?.Steps || 0, dietTargetGoalPlans!.Targets.steps), 100);
            const R = 42;
            const circ = 2 * Math.PI * R;
            const offset = circ * (1 - stepsPct / 100);
            const isGoalMet = stepsPct >= 100;
            return (
              <Card
                className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 cursor-pointer overflow-hidden"
                onClick={() => setStepsInputOpen(true)}
              >
                <CardContent className="p-3 flex flex-col items-center">
                  <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 self-start tracking-wide uppercase">
                    Steps
                  </p>

                  {/* Radial ring */}
                  <div className="relative flex items-center justify-center">
                    <svg width="108" height="108" viewBox="0 0 108 108">
                      <defs>
                        <linearGradient id="stepsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor={isGoalMet ? "#34d399" : "#818cf8"} />
                          <stop offset="100%" stopColor={isGoalMet ? "#10b981" : "#6366f1"} />
                        </linearGradient>
                        <filter id="stepGlow">
                          <feGaussianBlur stdDeviation="2" result="blur" />
                          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                      </defs>

                      {/* Background track */}
                      <circle cx="54" cy="54" r={R} fill="none" stroke="#e5e7eb" strokeWidth="7" />

                      {/* Subtle dotted inner ring */}
                      <circle
                        cx="54" cy="54" r={R - 5}
                        fill="none"
                        stroke={isGoalMet ? "#a7f3d0" : "#e0e7ff"}
                        strokeWidth="1"
                        strokeDasharray="2 6"
                        strokeLinecap="round"
                        opacity="0.6"
                      />

                      {/* Progress arc */}
                      <circle
                        cx="54" cy="54" r={R}
                        fill="none"
                        stroke="url(#stepsGrad)"
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray={circ}
                        strokeDashoffset={offset}
                        transform="rotate(-90 54 54)"
                        filter={isGoalMet ? "url(#stepGlow)" : undefined}
                        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)" }}
                      />

                      {/* Glowing tip dot */}
                      {stepsPct > 2 && stepsPct < 100 && (() => {
                        const angle = ((stepsPct / 100) * 360 - 90) * (Math.PI / 180);
                        const dotX = 54 + R * Math.cos(angle);
                        const dotY = 54 + R * Math.sin(angle);
                        return (
                          <g>
                            <circle cx={dotX} cy={dotY} r="8" fill="#6366f1" opacity="0" filter="url(#stepGlow)">
                              <animate attributeName="r" values="6;11;6" dur="1.8s" repeatCount="indefinite" />
                              <animate attributeName="opacity" values="0.25;0;0.25" dur="1.8s" repeatCount="indefinite" />
                            </circle>
                            <circle cx={dotX} cy={dotY} r="4.5" fill="#6366f1" filter="url(#stepGlow)">
                              <animate attributeName="r" values="4;5;4" dur="1.8s" repeatCount="indefinite" />
                            </circle>
                          </g>
                        );
                      })()}
                    </svg>

                    {/* Center label */}
                    <div className="absolute flex flex-col items-center leading-none">
                      <span className="text-[11px] mb-0.5">👟</span>
                      <span className="text-lg font-extrabold text-gray-900 dark:text-gray-100 leading-tight tabular-nums">
                        {(latestUpdate?.Steps || 0).toLocaleString()}
                      </span>
                      <span className={`text-[10px] font-bold mt-0.5 ${isGoalMet ? "text-emerald-500" : "text-indigo-500"}`}>
                        {stepsPct}%
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                    Goal: {(dietTargetGoalPlans?.Targets.steps || 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            );
          })()}

          {/* Water Intake Card — Animated Bottle */}
          {(() => {
            const waterPct = Math.min(calculatePercentage(latestUpdate?.Water || 0, dietTargetGoalPlans!.Targets.water), 100);
            // Fillable area inside bottle: y from 22 (base of neck) to 98 (bottle base), height = 76
            const fillableTop = 22;
            const fillableBottom = 98;
            const fillableHeight = fillableBottom - fillableTop;
            const fillY = fillableBottom - (waterPct / 100) * fillableHeight;
            const waveAmp = 3;
            const waveBase = fillY;

            const waterStopTop = waterPct > 60 ? "#38bdf8" : waterPct > 30 ? "#7dd3fc" : "#bae6fd";
            const waterStopBot = waterPct > 60 ? "#0369a1" : waterPct > 30 ? "#0284c7" : "#38bdf8";

            const wavePath = (dy: number) =>
              `M10,${waveBase + dy} Q27,${waveBase + dy - waveAmp} 35,${waveBase + dy} Q43,${waveBase + dy + waveAmp} 60,${waveBase + dy} L60,${fillableBottom} L10,${fillableBottom} Z`;

            return (
              <Card
                className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 cursor-pointer overflow-hidden"
                onClick={() => { setWaterAmount(latestUpdate?.Water ?? ""); setWaterInputOpen(true); }}
              >
                <CardContent className="p-3 flex flex-col items-center">
                  <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 self-start tracking-wide uppercase">
                    Water
                  </p>

                  <div className="relative flex items-center justify-center">
                    <svg width="70" height="110" viewBox="0 0 70 110">
                      <defs>
                        {/* Water gradient */}
                        <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor={waterStopTop} stopOpacity="0.95" />
                          <stop offset="100%" stopColor={waterStopBot} stopOpacity="1" />
                        </linearGradient>

                        {/* Bottle clip shape */}
                        <clipPath id="bottleClip">
                          {/* neck + body */}
                          <path d="M24,12 L24,22 Q10,26 10,38 L10,98 Q10,104 16,104 L54,104 Q60,104 60,98 L60,38 Q60,26 46,22 L46,12 Z" />
                        </clipPath>

                        {/* Bubble clip — only inside bottle body */}
                        <clipPath id="bubbleClip">
                          <rect x="10" y="22" width="50" height="82" />
                        </clipPath>

                        {/* Shine gradient */}
                        <linearGradient id="bottleShine" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="white" stopOpacity="0.18" />
                          <stop offset="40%" stopColor="white" stopOpacity="0.04" />
                          <stop offset="100%" stopColor="white" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {/* ── Bottle body background ── */}
                      <path
                        d="M24,12 L24,22 Q10,26 10,38 L10,98 Q10,104 16,104 L54,104 Q60,104 60,98 L60,38 Q60,26 46,22 L46,12 Z"
                        fill="#f0f9ff"
                        stroke="#bae6fd"
                        strokeWidth="1.5"
                      />

                      {/* ── Water fill (clipped to bottle) ── */}
                      <g clipPath="url(#bottleClip)">
                        {/* Solid water body */}
                        <rect x="0" y={fillY} width="70" height="110" fill="url(#waterGrad)" />

                        {/* Animated wave on top of water */}
                        {waterPct > 0 && waterPct < 100 && (
                          <path fill="url(#waterGrad)">
                            <animate
                              attributeName="d"
                              values={`${wavePath(0)};${wavePath(waveAmp)};${wavePath(0)}`}
                              dur="2.2s"
                              repeatCount="indefinite"
                              calcMode="spline"
                              keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"
                            />
                          </path>
                        )}

                        {/* Rising bubbles */}
                        {waterPct > 5 && (
                          <g clipPath="url(#bubbleClip)">
                            <circle cx="22" cy={fillableBottom - 10} r="2" fill="white" fillOpacity="0.4">
                              <animate attributeName="cy" values={`${fillableBottom - 8};${fillY + 5};${fillableBottom - 8}`} dur="3s" repeatCount="indefinite" />
                              <animate attributeName="opacity" values="0.5;0;0.5" dur="3s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="44" cy={fillableBottom - 20} r="1.5" fill="white" fillOpacity="0.3">
                              <animate attributeName="cy" values={`${fillableBottom - 18};${fillY + 5};${fillableBottom - 18}`} dur="4s" begin="1s" repeatCount="indefinite" />
                              <animate attributeName="opacity" values="0.4;0;0.4" dur="4s" begin="1s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="33" cy={fillableBottom - 5} r="1" fill="white" fillOpacity="0.25">
                              <animate attributeName="cy" values={`${fillableBottom - 3};${fillY + 5};${fillableBottom - 3}`} dur="5s" begin="2s" repeatCount="indefinite" />
                              <animate attributeName="opacity" values="0.3;0;0.3" dur="5s" begin="2s" repeatCount="indefinite" />
                            </circle>
                          </g>
                        )}

                        {/* Shine overlay */}
                        <rect x="0" y={fillY} width="70" height="110" fill="url(#bottleShine)" />
                      </g>

                      {/* ── Bottle outline on top ── */}
                      <path
                        d="M24,12 L24,22 Q10,26 10,38 L10,98 Q10,104 16,104 L54,104 Q60,104 60,98 L60,38 Q60,26 46,22 L46,12 Z"
                        fill="none"
                        stroke={waterPct > 50 ? "#60a5fa" : "#bae6fd"}
                        strokeWidth="1.8"
                        style={{ transition: "stroke 0.8s ease" }}
                      />

                      {/* Horizontal measurement lines on bottle */}
                      {[25, 50, 75].map((mark) => {
                        const lineY = fillableBottom - (mark / 100) * fillableHeight;
                        return (
                          <line
                            key={mark}
                            x1="52" y1={lineY} x2="57" y2={lineY}
                            stroke="#93c5fd" strokeWidth="1" strokeLinecap="round"
                          />
                        );
                      })}

                      {/* ── Cap ── */}
                      <rect x="23" y="5" width="24" height="9" rx="3"
                        fill={waterPct > 0 ? "#3b82f6" : "#94a3b8"}
                        style={{ transition: "fill 0.8s ease" }}
                      />
                      {/* Cap highlight */}
                      <rect x="24" y="6" width="10" height="3" rx="1.5" fill="white" fillOpacity="0.3" />

                      {/* ── Percentage label inside bottle ── */}
                      {waterPct > 15 && (
                        <text
                          x="35"
                          y={Math.min(fillY + 18, fillableBottom - 6)}
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight="800"
                          fill="white"
                          fillOpacity="0.95"
                          style={{ userSelect: "none" }}
                        >
                          {waterPct}%
                        </text>
                      )}

                      {/* Empty label */}
                      {waterPct === 0 && (
                        <text x="35" y="68" textAnchor="middle" fontSize="9" fill="#94a3b8">
                          Empty
                        </text>
                      )}
                    </svg>
                  </div>

                  {/* Amount text */}
                  <p className="text-xs font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                    {latestUpdate?.Water || 0}
                    <span className="text-[10px] font-normal text-gray-400"> / {dietTargetGoalPlans?.Targets.water}L</span>
                  </p>

                  {/* Quick add button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[10px] h-6 mt-1.5 w-full bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950/50"
                    onClick={(e) => {
                      e.stopPropagation();
                      let currentWater = latestUpdate?.Water || 0;
                      currentWater = parseFloat("" + currentWater);
                      const newAmount = +(currentWater + 0.25).toFixed(2);
                      setWaterAmount(newAmount.toString());
                      setWaterInputOpen(true);
                    }}
                  >
                    + 250 ml
                  </Button>
                </CardContent>
              </Card>
            );
          })()}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Sleep tracker */}
          <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 cursor-pointer" onClick={() => { setSleepAmount(latestUpdate?.Sleep ?? ""); setSleepStartAngle(0); setSleepInputOpen(true); }}>
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

              {latestUpdate?.WorkOut ? (
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${latestUpdate.WorkOut === 1 ? 'bg-red-500' :
                      latestUpdate.WorkOut === 2 ? 'bg-orange-500' :
                        latestUpdate.WorkOut === 3 ? 'bg-yellow-500' :
                          latestUpdate.WorkOut === 4 ? 'bg-lime-500' :
                            'bg-green-500'
                      }`}>
                      {latestUpdate.WorkOut === 1 && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm2.97 4.43l1.06-1.06 1.06 1.06 1.415-1.414-1.06-1.06 1.06-1.06-1.415-1.416-1.06 1.06-1.06-1.06-1.414 1.415 1.06 1.06-1.06 1.06 1.414 1.415z" />
                        </svg>
                      )}
                      {latestUpdate.WorkOut === 2 && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm8 5H9v2h6v-2z" />
                        </svg>
                      )}
                      {latestUpdate.WorkOut === 3 && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm8 5H9v2h6v-2z" />
                        </svg>
                      )}
                      {latestUpdate.WorkOut === 4 && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm1.146 5.146l1.414 1.414L12 15.12l2.44 2.44 1.414-1.414L12 12.292l-3.854 3.854z" />
                        </svg>
                      )}
                      {(!latestUpdate.WorkOut || latestUpdate.WorkOut === 5) && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm4.592 4.295l2.7-4.055 1.416.943-3.85 5.776-3.374-2.7.943-1.176 2.165 1.212z" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-medium ml-2 text-gray-800 dark:text-gray-200">
                      {latestUpdate.WorkOut || 5}/5
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
                    <span className="text-xs text-pretty text-left text-gray-600 dark:text-gray-400">Strength Program</span> {/* Added truncate */}
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


      {/* alert message dialog */}

      <Dialog open={paymentFailedAlert}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Payment Failed</DialogTitle>
            <DialogDescription>
              Feature are not accessible due to payment failure, please update your payment.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleLogout}>
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* ── Water Dialog ── */}
      <Dialog open={waterInputOpen} onOpenChange={(open) => { setWaterInputOpen(open); if (!open) setWaterAmount(latestUpdate?.Water ?? ""); }}>
        <DialogContent className="sm:max-w-[360px] p-0 overflow-hidden rounded-3xl border-0">
          <style>{`
            @keyframes waterWave {
              0% { transform: translateX(0px); }
              100% { transform: translateX(-80px); }
            }
            .water-wave-anim { animation: waterWave 2s linear infinite; }
            @keyframes bubbleRise {
              0% { transform: translateY(0) scale(1); opacity: 0.7; }
              100% { transform: translateY(-60px) scale(0.4); opacity: 0; }
            }
            .bubble1 { animation: bubbleRise 2.4s ease-in infinite; }
            .bubble2 { animation: bubbleRise 2.4s ease-in 0.8s infinite; }
            .bubble3 { animation: bubbleRise 2.4s ease-in 1.6s infinite; }
            @keyframes cpBurst {
              0% { transform: translate(-50%,-50%) translate(0,0) rotate(0deg) scale(1); opacity: 1; }
              100% { transform: translate(-50%,-50%) translate(var(--tx),var(--ty)) rotate(var(--rz)) scale(0.15); opacity: 0; }
            }
            .cp { position:absolute; top:50%; left:50%; animation: cpBurst 1.3s ease-out both; }
            @keyframes badgePop {
              0% { transform: translateX(-50%) scale(0.4) translateY(12px); opacity: 0; }
              35% { transform: translateX(-50%) scale(1.1) translateY(-3px); opacity: 1; }
              55% { transform: translateX(-50%) scale(1) translateY(0); opacity: 1; }
              80% { opacity: 1; }
              100% { transform: translateX(-50%) scale(0.95) translateY(-8px); opacity: 0; }
            }
            .celeb-badge { position:absolute; left:50%; bottom:16px; animation: badgePop 2.8s ease-out 0.1s both; white-space:nowrap; }
            @keyframes glassShimmer {
              0%,100% { filter: drop-shadow(0 0 6px rgba(251,191,36,0.0)); }
              50% { filter: drop-shadow(0 0 14px rgba(251,191,36,0.9)); }
            }
            .glass-goal { animation: glassShimmer 1s ease-in-out 3; }
          `}</style>
          {(() => {
            const wL = parseFloat("" + waterAmount) || 0;
            const pct = Math.min(wL / 3, 1);
            const goalReached = wL >= 3;
            const fillH = 120 * pct;
            const fillY = 132 - fillH;
            const waveY = fillY - 6;
            const cpColors = ['#fbbf24','#f87171','#34d399','#60a5fa','#a78bfa','#f472b6'];
            return (
              <div className="relative bg-gradient-to-b from-cyan-400 to-blue-600 px-6 pt-6 pb-5 text-white text-center overflow-hidden">
                <h2 className="text-xl font-bold">Water Intake</h2>
                <p className="text-cyan-100 text-xs mt-0.5">Stay hydrated, stay strong</p>
                <div className="flex justify-center mt-3">
                  <svg viewBox="0 0 100 145" width="88" height="127"
                    className={`drop-shadow-xl${goalReached ? ' glass-goal' : ''}`}>
                    <defs>
                      <clipPath id="glassClip">
                        <path d="M14,12 L10,132 Q10,138 17,138 L83,138 Q90,138 90,132 L86,12 Z"/>
                      </clipPath>
                    </defs>
                    <path d="M14,12 L10,132 Q10,138 17,138 L83,138 Q90,138 90,132 L86,12 Z"
                      fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.5)" strokeWidth="2"/>
                    <g clipPath="url(#glassClip)">
                      <rect x="10" y={fillY} width="80" height={fillH + 10}
                        fill={goalReached ? '#f59e0b' : '#1d4ed8'} opacity="0.8"
                        style={{ transition: 'fill 0.4s ease' }}/>
                      {pct > 0 && (
                        <g style={{ transform: `translateY(${waveY}px)`, transition: 'transform 0.5s ease' }}>
                          <g className="water-wave-anim">
                            <path d="M-80,8 Q-70,1 -60,8 Q-50,15 -40,8 Q-30,1 -20,8 Q-10,15 0,8 Q10,1 20,8 Q30,15 40,8 Q50,1 60,8 Q70,15 80,8 Q90,1 100,8 Q110,15 120,8 Q130,1 140,8 Q150,15 160,8 V18 H-80Z"
                              fill={goalReached ? '#d97706' : '#2563eb'} opacity="0.9"/>
                          </g>
                        </g>
                      )}
                      {pct > 0.05 && (
                        <>
                          <circle cx="35" cy={fillY + fillH - 8} r="3" fill="white" opacity="0.4" className="bubble1"/>
                          <circle cx="55" cy={fillY + fillH - 5} r="2" fill="white" opacity="0.3" className="bubble2"/>
                          <circle cx="70" cy={fillY + fillH - 10} r="2.5" fill="white" opacity="0.35" className="bubble3"/>
                        </>
                      )}
                    </g>
                    <path d="M14,12 L10,132 Q10,138 17,138 L83,138 Q90,138 90,132 L86,12 Z"
                      fill="none" stroke={goalReached ? 'rgba(251,191,36,0.9)' : 'rgba(255,255,255,0.7)'} strokeWidth="2"/>
                    <line x1="18" y1="52" x2="26" y2="52" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
                    <text x="28" y="56" fill="rgba(255,255,255,0.4)" fontSize="7.5">1L</text>
                    <line x1="18" y1="92" x2="26" y2="92" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
                    <text x="28" y="96" fill="rgba(255,255,255,0.4)" fontSize="7.5">2L</text>
                    <line x1="18" y1="132" x2="26" y2="132" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
                    <text x="28" y="136" fill="rgba(255,255,255,0.4)" fontSize="7.5">3L</text>
                  </svg>
                </div>
                <div className="mt-2 inline-flex items-baseline gap-1 bg-white/20 rounded-2xl px-5 py-2">
                  <span className="text-4xl font-bold">{wL.toFixed(2)}</span>
                  <span className="text-base font-medium">L</span>
                </div>
                {/* Celebration burst */}
                {goalReached && (
                  <div className="absolute inset-0 pointer-events-none" style={{zIndex: 20}}>
                    {Array.from({length: 20}, (_, i) => {
                      const ang = (i / 20) * 2 * Math.PI;
                      const d = 55 + (i % 4) * 18;
                      return (
                        <div key={i} className="cp" style={{
                          width: 7 + (i % 3) * 3, height: 7 + (i % 3) * 3,
                          backgroundColor: cpColors[i % 6],
                          borderRadius: i % 2 === 0 ? '50%' : '3px',
                          '--tx': `${Math.cos(ang) * d}px`,
                          '--ty': `${Math.sin(ang) * d - 15}px`,
                          '--rz': `${(i * 61) % 360}deg`,
                          animationDelay: `${(i % 5) * 0.05}s`,
                        } as React.CSSProperties}/>
                      );
                    })}
                    <div className="celeb-badge bg-white text-gray-800 font-bold text-sm px-5 py-2 rounded-full shadow-xl"
                      style={{zIndex: 21}}>
                      💧 Daily Goal Reached!
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          <div className="bg-white px-6 pt-4 pb-6 space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {[{ label: "250ml", val: 0.25 }, { label: "500ml", val: 0.5 }, { label: "750ml", val: 0.75 }, { label: "1L", val: 1 }].map(({ label, val }) => (
                <button key={label} onClick={() => setWaterAmount(val.toString())}
                  className="py-2 rounded-xl text-sm font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100 active:scale-95 transition-all">
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[{ label: "+ 250ml", val: 0.25 }, { label: "+ 500ml", val: 0.5 }].map(({ label, val }) => (
                <button key={label}
                  onClick={() => setWaterAmount(((parseFloat("" + waterAmount) || 0) + val).toFixed(2))}
                  className="py-2 rounded-xl text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 active:scale-95 transition-all">
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-2 border border-gray-200">
              <span className="text-gray-400 text-sm">Custom (L)</span>
              <Input type="number" placeholder="0.0" step="0.1" value={waterAmount}
                onChange={(e) => setWaterAmount(e.target.value)}
                className="border-0 bg-transparent p-0 text-right font-semibold text-gray-800 focus-visible:ring-0 text-lg" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setWaterInputOpen(false); setWaterAmount(latestUpdate?.Water ?? ""); }}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleWaterSubmit} disabled={updateWaterMutation.isPending}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-60">
                {updateWaterMutation.isPending ? "Saving…" : "Log Water 💧"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Steps Dialog ── */}
      <Dialog open={stepsInputOpen} onOpenChange={setStepsInputOpen}>
        <DialogContent className="sm:max-w-[360px] p-0 overflow-hidden rounded-3xl border-0">
          <style>{`
            @keyframes shoeStride {
              0%, 100% { transform: translateY(0px) rotate(-8deg); }
              50% { transform: translateY(-8px) rotate(8deg); }
            }
            .shoe-stride { animation: shoeStride 0.7s ease-in-out infinite; }
            @keyframes fpPop {
              0% { opacity: 0; transform: scale(0.3) translateY(4px); }
              25% { opacity: 1; transform: scale(1.1) translateY(0); }
              60% { opacity: 0.8; transform: scale(1); }
              100% { opacity: 0; transform: scale(0.9); }
            }
            .fp-a { animation: fpPop 1.6s ease 0s infinite; }
            .fp-b { animation: fpPop 1.6s ease 0.4s infinite; }
            .fp-c { animation: fpPop 1.6s ease 0.8s infinite; }
            .fp-d { animation: fpPop 1.6s ease 1.2s infinite; }
            @keyframes ringGlow {
              0%,100% { filter: drop-shadow(0 0 4px rgba(251,191,36,0.3)); }
              50% { filter: drop-shadow(0 0 16px rgba(251,191,36,1)); }
            }
            .ring-goal { animation: ringGlow 1s ease-in-out 4; }
            @keyframes starPop {
              0% { transform: translate(-50%,-50%) translate(var(--sx),var(--sy)) scale(0); opacity: 1; }
              50% { opacity: 1; }
              100% { transform: translate(-50%,-50%) translate(var(--sx),var(--sy)) scale(1.4); opacity: 0; }
            }
            .star-burst { position:absolute; top:50%; left:50%; font-size:20px; animation: starPop 1.2s ease-out both; line-height:1; }
          `}</style>
          {(() => {
            const steps = parseInt("" + stepsAmount) || 0;
            const goal = 10000;
            const pct = Math.min(steps / goal, 1);
            const goalReached = steps >= goal;
            const r = 72, circ = 2 * Math.PI * r;
            const dash = circ * pct;
            const stepsLabel = steps >= 1000 ? `${(steps / 1000).toFixed(steps % 1000 === 0 ? 0 : 1)}K` : steps.toString();
            const cpColors = ['#fbbf24','#f87171','#34d399','#60a5fa','#a78bfa','#f472b6'];
            // 8 star positions around center
            const starPositions = Array.from({length: 8}, (_, i) => {
              const a = (i / 8) * 2 * Math.PI;
              const d = 72 + (i % 2) * 20;
              return { sx: `${Math.cos(a) * d}px`, sy: `${Math.sin(a) * d}px`, delay: i * 0.08 };
            });
            return (
              <>
                <div className="relative bg-gradient-to-b from-orange-400 to-rose-600 px-6 pt-5 pb-5 text-white text-center overflow-hidden">
                  <h2 className="text-xl font-bold">Step Count</h2>
                  <p className="text-orange-100 text-xs mt-0.5">Goal: 10,000 steps</p>
                  <div className="flex justify-center mt-3">
                    <svg viewBox="0 0 200 200" width="188" height="188"
                      className={goalReached ? 'ring-goal' : ''}>
                      {/* Background track */}
                      <circle cx="100" cy="100" r={r} fill="none"
                        stroke="rgba(255,255,255,0.2)" strokeWidth="12" strokeLinecap="round"/>
                      {/* Progress arc */}
                      <circle cx="100" cy="100" r={r} fill="none"
                        stroke={goalReached ? '#fbbf24' : 'white'} strokeWidth="12" strokeLinecap="round"
                        strokeDasharray={`${dash} ${circ}`}
                        transform="rotate(-90 100 100)"
                        style={{ transition: 'stroke-dasharray 0.5s ease, stroke 0.3s ease' }}/>
                      {/* Goal tick */}
                      <line x1="100" y1="22" x2="100" y2="16"
                        stroke={goalReached ? '#fbbf24' : 'rgba(255,255,255,0.8)'}
                        strokeWidth="3" strokeLinecap="round"/>
                      {/* Footprints */}
                      {steps > 0 && !goalReached && (
                        <>
                          <ellipse cx="68" cy="160" rx="7" ry="10" fill="rgba(255,255,255,0.25)" className="fp-a"/>
                          <ellipse cx="82" cy="155" rx="7" ry="10" fill="rgba(255,255,255,0.25)" className="fp-b"/>
                          <ellipse cx="96" cy="161" rx="7" ry="10" fill="rgba(255,255,255,0.25)" className="fp-c"/>
                          <ellipse cx="111" cy="156" rx="7" ry="10" fill="rgba(255,255,255,0.25)" className="fp-d"/>
                        </>
                      )}
                      {/* Shoe */}
                      <text x="100" y="94" textAnchor="middle" fontSize="38"
                        className={steps > 0 ? "shoe-stride" : ""}>
                        {goalReached ? "🏆" : "👟"}
                      </text>
                      <text x="100" y="120" textAnchor="middle"
                        fill={goalReached ? '#fbbf24' : 'white'} fontSize="22" fontWeight="700">
                        {stepsLabel}
                      </text>
                      <text x="100" y="136" textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize="11">
                        {goalReached ? "You crushed it! 🎉" : `${Math.round(pct * 100)}% of goal`}
                      </text>
                    </svg>
                  </div>
                  {/* Celebration burst */}
                  {goalReached && (
                    <div className="absolute inset-0 pointer-events-none" style={{zIndex: 20}}>
                      {/* Confetti particles */}
                      {Array.from({length: 20}, (_, i) => {
                        const ang = (i / 20) * 2 * Math.PI;
                        const d = 60 + (i % 4) * 18;
                        return (
                          <div key={i} className="cp" style={{
                            width: 7 + (i % 3) * 3, height: 7 + (i % 3) * 3,
                            backgroundColor: cpColors[i % 6],
                            borderRadius: i % 2 === 0 ? '50%' : '3px',
                            '--tx': `${Math.cos(ang) * d}px`,
                            '--ty': `${Math.sin(ang) * d - 15}px`,
                            '--rz': `${(i * 61) % 360}deg`,
                            animationDelay: `${(i % 5) * 0.05}s`,
                          } as React.CSSProperties}/>
                        );
                      })}
                      {/* Star bursts */}
                      {starPositions.map((s, i) => (
                        <div key={`s${i}`} className="star-burst"
                          style={{ '--sx': s.sx, '--sy': s.sy, animationDelay: `${s.delay}s` } as React.CSSProperties}>
                          ⭐
                        </div>
                      ))}
                      <div className="celeb-badge bg-white text-gray-800 font-bold text-sm px-5 py-2 rounded-full shadow-xl"
                        style={{zIndex: 21}}>
                        🏆 10K Steps Done!
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-white px-6 pt-4 pb-6 space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    {[{ label: "1K", val: 1000 }, { label: "2.5K", val: 2500 }, { label: "5K", val: 5000 }, { label: "10K", val: 10000 }].map(({ label, val }) => (
                      <button key={label} onClick={() => setStepsAmount(val.toString())}
                        className="py-2 rounded-xl text-sm font-semibold bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 active:scale-95 transition-all">
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ label: "+ 1,000", val: 1000 }, { label: "+ 2,500", val: 2500 }].map(({ label, val }) => (
                      <button key={label}
                        onClick={() => setStepsAmount(((parseInt("" + stepsAmount) || 0) + val).toString())}
                        className="py-2 rounded-xl text-sm font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 active:scale-95 transition-all">
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-2 border border-gray-200">
                    <span className="text-gray-400 text-sm">Custom</span>
                    <Input type="number" placeholder="0" value={stepsAmount}
                      onChange={(e) => setStepsAmount(e.target.value)}
                      className="border-0 bg-transparent p-0 text-right font-semibold text-gray-800 focus-visible:ring-0 text-lg" />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button onClick={() => setStepsInputOpen(false)}
                      className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50">
                      Cancel
                    </button>
                    <button onClick={handleStepsSubmit} disabled={updateStepsMutation.isPending}
                      className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-orange-400 to-rose-500 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-60">
                      {updateStepsMutation.isPending ? "Saving…" : "Log Steps 👟"}
                    </button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Sleep Dialog ── */}
      <Dialog open={sleepInputOpen} onOpenChange={(open) => { setSleepInputOpen(open); if (!open) { setSleepAmount(latestUpdate?.Sleep ?? ""); setSleepStartAngle(0); } }}>
        <DialogContent className="sm:max-w-[360px] p-0 overflow-hidden rounded-3xl border-0">
          <style>{`
            @keyframes moonGlow {
              0%,100% { filter: drop-shadow(0 0 6px rgba(167,139,250,0)); }
              50% { filter: drop-shadow(0 0 20px rgba(251,191,36,1)); }
            }
            .moon-glow { animation: moonGlow 1s ease-in-out 4; }
            @keyframes starTwinkle {
              0%,100% { opacity: 0.3; transform: scale(0.8); }
              50% { opacity: 1; transform: scale(1.2); }
            }
            .tw-1 { animation: starTwinkle 1.2s ease-in-out infinite 0s; }
            .tw-2 { animation: starTwinkle 1.2s ease-in-out infinite 0.3s; }
            .tw-3 { animation: starTwinkle 1.2s ease-in-out infinite 0.6s; }
            .tw-4 { animation: starTwinkle 1.2s ease-in-out infinite 0.9s; }
            .tw-5 { animation: starTwinkle 1.2s ease-in-out infinite 1.1s; }
            .tw-6 { animation: starTwinkle 1.2s ease-in-out infinite 0.15s; }
          `}</style>
          {(() => {
            const sH = Math.min(Math.max(parseFloat("" + sleepAmount) || 0, 0), 12);
            const goalReached = sH >= 8;
            const cx = 100, cy = 100, arcR = 68, numR = 82;

            // Two-handle clock: start angle (where sleep began) + end angle (duration offset)
            const endAngleDeg = (sleepStartAngle + (sH / 12) * 360) % 360;
            const startAngleRad = (sleepStartAngle - 90) * (Math.PI / 180);
            const endAngleRad = (endAngleDeg - 90) * (Math.PI / 180);
            const startHandleX = cx + arcR * Math.cos(startAngleRad);
            const startHandleY = cy + arcR * Math.sin(startAngleRad);
            const endHandleX = cx + arcR * Math.cos(endAngleRad);
            const endHandleY = cy + arcR * Math.sin(endAngleRad);
            const largeArc = sH > 6 ? 1 : 0;

            const cpColors = ['#fbbf24','#c4b5fd','#a5f3fc','#f9a8d4','#6ee7b7','#93c5fd'];
            const ringStars = Array.from({length: 6}, (_, i) => {
              const a = (i / 6) * 2 * Math.PI - Math.PI / 2;
              return { x: cx + 92 * Math.cos(a), y: cy + 92 * Math.sin(a), cls: `tw-${i + 1}` };
            });

            const getSvgAngle = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>): number => {
              const svg = e.currentTarget;
              const rect = svg.getBoundingClientRect();
              let clientX: number, clientY: number;
              if ('touches' in e && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
              } else {
                clientX = (e as React.MouseEvent).clientX;
                clientY = (e as React.MouseEvent).clientY;
              }
              const x = (clientX - rect.left) * (200 / rect.width);
              const y = (clientY - rect.top) * (200 / rect.height);
              let ang = Math.atan2(y - cy, x - cx) * 180 / Math.PI + 90;
              if (ang < 0) ang += 360;
              return ang;
            };

            const applyAngle = (ang: number) => {
              if (draggingHandle.current === 'start') {
                // Freeze the end handle's absolute position — only the start moves
                const frozenEnd = endAngleDeg;
                setSleepStartAngle(ang);
                const newDuration = ((frozenEnd - ang + 360) % 360) / 360 * 12;
                setSleepAmount(Math.max(0.5, Math.min(12, +newDuration.toFixed(1))).toString());
              } else {
                // Start stays fixed — only the end handle moves
                const duration = ((ang - sleepStartAngle + 360) % 360) / 360 * 12;
                setSleepAmount(Math.max(0.5, Math.min(12, +duration.toFixed(1))).toString());
              }
            };

            const onPointerDown = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
              const ang = getSvgAngle(e);
              const dStart = Math.min((ang - sleepStartAngle + 360) % 360, (sleepStartAngle - ang + 360) % 360);
              const dEnd = Math.min((ang - endAngleDeg + 360) % 360, (endAngleDeg - ang + 360) % 360);
              draggingHandle.current = dStart <= dEnd ? 'start' : 'end';
              applyAngle(ang);
            };

            const onPointerMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
              if (!draggingHandle.current) return;
              if (!('touches' in e) && (e as React.MouseEvent).buttons !== 1) return;
              applyAngle(getSvgAngle(e));
            };

            const onPointerUp = () => { draggingHandle.current = null; };

            return (
              <>
                <div className="relative bg-gradient-to-b from-indigo-500 to-purple-700 px-6 pt-5 pb-5 text-white text-center overflow-hidden">
                  <h2 className="text-xl font-bold">Sleep Tracker</h2>
                  <p className="text-indigo-200 text-xs mt-0.5">
                    {goalReached ? "Outstanding sleep! Keep it up 🌟" : "Drag both handles to set start & end time"}
                  </p>
                  <div className="flex justify-center mt-3">
                    <svg viewBox="0 0 200 200" width="190" height="190"
                      className={`cursor-pointer select-none${goalReached ? ' moon-glow' : ''}`}
                      onMouseDown={onPointerDown}
                      onTouchStart={(e) => { e.preventDefault(); onPointerDown(e); }}
                      onMouseMove={onPointerMove}
                      onTouchMove={(e) => { e.preventDefault(); onPointerMove(e); }}
                      onMouseUp={onPointerUp}
                      onMouseLeave={onPointerUp}>
                      {/* Outer ring */}
                      <circle cx="100" cy="100" r="96" fill="rgba(255,255,255,0.08)"
                        stroke={goalReached ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.2)'} strokeWidth="2"/>
                      {/* Twinkling stars when goal reached */}
                      {goalReached && ringStars.map((s, i) => (
                        <text key={i} x={s.x} y={s.y} textAnchor="middle" dominantBaseline="central"
                          fontSize="13" className={s.cls}>✨</text>
                      ))}
                      {/* Track ring */}
                      <circle cx="100" cy="100" r={arcR} fill="none"
                        stroke="rgba(255,255,255,0.15)" strokeWidth="10"/>
                      {/* Sleep arc from start to end handle */}
                      {sH > 0 && (
                        <path
                          d={`M ${startHandleX} ${startHandleY} A ${arcR} ${arcR} 0 ${largeArc} 1 ${endHandleX} ${endHandleY}`}
                          fill="none"
                          stroke={goalReached ? '#fbbf24' : 'rgba(255,255,255,0.9)'}
                          strokeWidth="10" strokeLinecap="round"/>
                      )}
                      {/* Hour numbers */}
                      {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h, i) => {
                        const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
                        const isGoalHour = h === 8;
                        return (
                          <text key={h} x={cx + numR * Math.cos(a)} y={cy + numR * Math.sin(a)}
                            textAnchor="middle" dominantBaseline="central"
                            fill={isGoalHour && !goalReached ? 'rgba(251,191,36,0.9)' : goalReached ? '#fde68a' : 'rgba(255,255,255,0.65)'}
                            fontSize={isGoalHour ? 13 : 12} fontWeight="600">
                            {h}
                          </text>
                        );
                      })}
                      {/* Center label */}
                      <text x="100" y="90" textAnchor="middle" fontSize="28" fontWeight="700"
                        fill={goalReached ? '#fbbf24' : 'white'}>
                        {sH % 1 === 0 ? sH : sH.toFixed(1)}
                      </text>
                      <text x="100" y="110" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="11">
                        hours
                      </text>
                      <text x="100" y="126" textAnchor="middle" fontSize="16">
                        {goalReached ? "😴💛" : "🌙"}
                      </text>
                      {/* Start handle (bedtime) — dashed line + hollow circle */}
                      <line x1="100" y1="100" x2={startHandleX} y2={startHandleY}
                        stroke={goalReached ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.4)'}
                        strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3"/>
                      <circle cx={startHandleX} cy={startHandleY} r="8"
                        fill={goalReached ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.2)'}
                        stroke={goalReached ? '#fbbf24' : 'white'} strokeWidth="2"/>
                      <text x={startHandleX} y={startHandleY} textAnchor="middle" dominantBaseline="central"
                        fontSize="7" fill={goalReached ? '#fbbf24' : 'white'} fontWeight="700">ZZ</text>
                      {/* End handle (wake time) — solid line + filled circle */}
                      <line x1="100" y1="100" x2={endHandleX} y2={endHandleY}
                        stroke={goalReached ? '#fbbf24' : 'white'} strokeWidth="3" strokeLinecap="round"/>
                      <circle cx={endHandleX} cy={endHandleY} r="8"
                        fill={goalReached ? '#fbbf24' : 'white'} opacity="0.95"/>
                      <text x={endHandleX} y={endHandleY} textAnchor="middle" dominantBaseline="central"
                        fontSize="9" fill={goalReached ? '#92400e' : '#6366f1'} fontWeight="700">☀</text>
                      {/* Center dot */}
                      <circle cx="100" cy="100" r="5" fill="white"/>
                    </svg>
                  </div>
                  {/* Celebration confetti — particles only, no badge inside the overlay */}
                  {goalReached && (
                    <div className="absolute inset-0 pointer-events-none" style={{zIndex: 20}}>
                      {Array.from({length: 20}, (_, i) => {
                        const ang = (i / 20) * 2 * Math.PI;
                        const d = 55 + (i % 4) * 18;
                        return (
                          <div key={i} className="cp" style={{
                            width: 7 + (i % 3) * 3, height: 7 + (i % 3) * 3,
                            backgroundColor: cpColors[i % 6],
                            borderRadius: i % 2 === 0 ? '50%' : '3px',
                            '--tx': `${Math.cos(ang) * d}px`,
                            '--ty': `${Math.sin(ang) * d - 15}px`,
                            '--rz': `${(i * 61) % 360}deg`,
                            animationDelay: `${(i % 5) * 0.05}s`,
                          } as React.CSSProperties}/>
                        );
                      })}
                    </div>
                  )}
                  {/* Badge — always occupies space to prevent dialog resize/shake */}
                  <div className="flex justify-center mt-2" style={{height: '34px'}}>
                    {goalReached && (
                      <span className="bg-white text-gray-800 font-bold text-sm px-5 py-2 rounded-full shadow-xl">
                        ✨ Perfect Sleep Goal!
                      </span>
                    )}
                  </div>
                </div>
                <div className="bg-white px-6 pt-4 pb-6 space-y-3">
                  <div className="grid grid-cols-5 gap-2">
                    {[{ label: "5h", val: 5 }, { label: "6h", val: 6 }, { label: "7h", val: 7 }, { label: "8h", val: 8 }, { label: "9h", val: 9 }].map(({ label, val }) => (
                      <button key={label} onClick={() => setSleepAmount(val.toString())}
                        className={`py-2 rounded-xl text-sm font-semibold border active:scale-95 transition-all ${
                          val === 8
                            ? 'bg-amber-50 text-amber-700 border-amber-300 ring-1 ring-amber-300'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                        }`}>
                        {label}{val === 8 ? ' ⭐' : ''}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-2 border border-gray-200">
                    <span className="text-gray-400 text-sm">Custom (hrs)</span>
                    <Input type="number" placeholder="0.0" step="0.5" min="0" max="12" value={sleepAmount}
                      onChange={(e) => setSleepAmount(e.target.value)}
                      className="border-0 bg-transparent p-0 text-right font-semibold text-gray-800 focus-visible:ring-0 text-lg" />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button onClick={() => { setSleepInputOpen(false); setSleepAmount(latestUpdate?.Sleep ?? ""); setSleepStartAngle(0); }}
                      className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50">
                      Cancel
                    </button>
                    <button onClick={handleSleepSubmit} disabled={updateSleepMutation.isPending}
                      className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-700 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-60">
                      {updateSleepMutation.isPending ? "Saving…" : "Log Sleep 🌙"}
                    </button>
                  </div>
                </div>
              </>
            );
          })()}
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

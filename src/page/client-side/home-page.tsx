"use client"

import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Droplet, Sun, Moon, Trophy, Dumbbell, Flame, X, CreditCard, Pill, Check, Clock, Pencil, Bell, MessageCircle, Send, Loader2, RefreshCw, ChevronLeft } from "lucide-react";
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
import { IdDietPlan } from "../../interface/IDietPlan";
import { IUser } from "@/interface/models/User";
import { getLoggedUserDetails } from "@/services/ProfileService";
import { useFcmNotification } from "@/hooks/use-fcm-notification";
import { useNotifications } from "@/hooks/use-notifications";
import { getMySupplements, getMySupplementLogs, logSupplement, updateSupplementReminderTime } from "@/services/SupplementService";
import { ISupplement, ISupplementLog, SUPPLEMENT_TIMINGS, TIMING_ICONS } from "@/interface/ISupplement";
import { IMealQuery, getMyMealQueries, askMealQuery, notifyCoachQuery } from "../../services/MealQueryService";

import toast from 'react-hot-toast';


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
  const { status: pushStatus, requestPermission: enablePush } = useFcmNotification();
  const { unreadCount } = useNotifications();

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
  const [showExpiredBanner, setShowExpiredBanner] = useState(false);
  const [sleepStartAngle, setSleepStartAngle] = useState(0); // degrees, 0 = 12 o'clock, clockwise
  const [suppDrawerOpen, setSuppDrawerOpen] = useState(false);
  const [editingTimeId, setEditingTimeId] = useState<number | null>(null);
  const [editingTimeValue, setEditingTimeValue] = useState("");
  const draggingHandle = useRef<'start' | 'end' | null>(null);

  // Coach chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatQuestion, setChatQuestion] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);







  const todayStr = moment().format("DD-MM-YYYY");

  const { data: suppRes } = useQuery({
    queryKey: ["my-supplements"],
    queryFn: () => getMySupplements(),
    enabled: !!user,
    staleTime: 60_000,
  });
  const supplements: ISupplement[] = Array.isArray(suppRes?.data?.data) ? suppRes.data.data : [];

  const { data: suppLogRes, refetch: refetchSuppLogs } = useQuery({
    queryKey: ["my-supplement-logs-home", todayStr],
    queryFn: () => getMySupplementLogs(todayStr),
    enabled: !!user,
    staleTime: 30_000,
  });
  const suppLogs: ISupplementLog[] = Array.isArray(suppLogRes?.data?.data) ? suppLogRes.data.data : [];

  const { mutate: toggleSupp } = useMutation({
    mutationFn: logSupplement,
    onSuccess: () => refetchSuppLogs(),
    onError: () => toast.error("Failed to log supplement"),
  });

  const { mutate: saveReminderTime, isPending: savingTime } = useMutation({
    mutationFn: ({ id, time }: { id: number; time: string }) => updateSupplementReminderTime(id, time),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-supplements"] });
      setEditingTimeId(null);
      toast.success("Reminder time updated");
    },
    onError: () => toast.error("Failed to update time"),
  });

  const suppTakenCount = suppLogs.filter(l => l.IsTaken === 1).length;

  const { data: allMyQueries = [], refetch: refetchChat, isFetching: chatFetching } = useQuery<IMealQuery[]>({
    queryKey: ["all-my-queries"],
    queryFn: async () => {
      const res = await getMyMealQueries({}) as any;
      const d = res.data?.data;
      return Array.isArray(d) ? d : [];
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: chatOpen ? 15000 : 60000,
  });

  const chatUnread = allMyQueries.filter(q => q.Answer).length;

  const askCoachMutation = useMutation({
    mutationFn: (question: string) =>
      askMealQuery({ QueryDate: moment().format("DD-MM-YYYY"), Question: question }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["all-my-queries"] });
      setChatQuestion("");
      toast.success("Question sent to your coach!");
      const idQuery = res?.data?.data?.IdQuery;
      if (idQuery) notifyCoachQuery({ IdQuery: idQuery }).catch(() => {});
    },
    onError: () => toast.error("Failed to send question"),
  });

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
    if (!loggedUserDetails) return;
    const isExpired = loggedUserDetails.EndDate
      ? moment(loggedUserDetails.EndDate).isBefore(moment(), 'day')
      : false;
    if (isExpired) {
      setShowExpiredBanner(true);
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

  {/* Streak + motivational helpers */}
  const streakDays = Array.isArray(dailyUpdatesForWeek)
    ? dailyUpdatesForWeek.filter((d: IDailyStats) =>
        Number(d.Steps) > 0 && Number(d.Water) > 0 && Number(d.Sleep) > 0
      ).length
    : 0;
  const motivations = [
    "Every rep counts. Keep pushing!",
    "Progress, not perfection.",
    "Your future self will thank you.",
    "Small steps lead to big changes.",
    "Show up today. That's the win.",
  ];
  const motivationalLine = motivations[new Date().getDay() % motivations.length];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* ── Header ── */}
      <header className="bg-gradient-to-r from-blue-700 to-blue-600 py-4 px-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-xs font-medium">{formatDate(currentDate)}</p>
            <h1 className="text-xl font-bold text-white mt-0.5">
              Hey, {user?.info?.FirstName} 👋
            </h1>
            <p className="text-blue-100 text-xs mt-0.5 opacity-80">{motivationalLine}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-blue-200" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-blue-200" />
              <Switch
                className="ml-1"
                checked={theme === "dark"}
                onCheckedChange={() => setTheme(theme === "dark" ? "light" : "dark")}
              />
            </div>

            {/* Notification bell with badge */}
            <Link href={RENDER_URL.STUDENT_NOTIFICATIONS}>
              <div className="relative h-9 w-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30 cursor-pointer">
                <Bell className="h-4 w-4 text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] bg-red-500 rounded-full flex items-center justify-center text-[11px] font-bold text-white px-1 leading-none border-2 border-white shadow-md">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
            </Link>

            <Link href={RENDER_URL.STUDENT_ONBOARD}>
              <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30 cursor-pointer">
                <span className="text-white font-semibold text-sm">
                  {user?.info?.FirstName.charAt(0)}{user?.info?.LastName.charAt(0)}
                </span>
              </div>
            </Link>
          </div>
        </div>

        {streakDays > 0 && (
          <div className="mt-3 inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-medium text-white">{streakDays}-day streak</span>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-5 pb-24 sm:px-6 bg-gray-50 dark:bg-gray-950">

        {/* Payment expired banner */}
        {showExpiredBanner && (
          <div className="flex items-start justify-between gap-3 rounded-xl px-4 py-3 mb-4 border border-red-200 bg-white shadow-sm border-l-4 border-l-red-500">
            <div className="flex items-start gap-3 flex-1">
              <CreditCard className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Payment Required</p>
                <p className="text-sm text-blue-600 mt-0.5">Your subscription payment is overdue. Please update your payment.</p>
                <button
                  onClick={() => setShowExpiredBanner(false)}
                  className="mt-2 px-4 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors"
                >
                  Remind Me Later
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowExpiredBanner(false)}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Notification banner — visible until subscribed or dismissed */}
        {pushStatus !== 'granted' && !bannerDismissed && (
          <div className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 mb-4 border ${
            pushStatus === 'denied'
              ? 'bg-red-50 border-red-200'
              : pushStatus === 'requesting'
              ? 'bg-blue-50 border-blue-200'
              : 'bg-orange-50 border-orange-200'
          }`}>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-lg">
                {pushStatus === 'denied' ? '🚫' : pushStatus === 'requesting' ? '⏳' : '🔔'}
              </span>
              <span className={
                pushStatus === 'denied' ? 'text-red-800'
                : pushStatus === 'requesting' ? 'text-blue-700'
                : 'text-orange-800'
              }>
                {pushStatus === 'denied' ? (
                  <span>
                    Notifications blocked.{' '}
                    <strong>To fix:</strong> open your browser Settings → Site Settings → Notifications → find this site → set to <strong>Allow</strong>, then reload the app.
                  </span>
                ) : pushStatus === 'requesting' ? (
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

        {/* ── Today's Supplements ── */}
        {supplements.length > 0 && (
          <>
            <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Today's supplements</p>
            <Card
              className="shadow-sm border border-violet-100 dark:border-violet-900/40 dark:bg-gray-900 mb-5 cursor-pointer active:scale-[0.99] transition-transform"
              onClick={() => setSuppDrawerOpen(true)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center">
                      <Pill className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Supplements</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {suppTakenCount}/{supplements.length} taken today
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {suppTakenCount === supplements.length ? (
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full">All done ✅</span>
                    ) : (
                      <span className="text-xs font-medium text-violet-600 bg-violet-50 dark:bg-violet-900/20 px-2.5 py-1 rounded-full">
                        {supplements.length - suppTakenCount} remaining
                      </span>
                    )}
                  </div>
                </div>
                {/* mini progress bar */}
                <div className="mt-3 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                  <div
                    className="bg-violet-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${supplements.length ? Math.round((suppTakenCount / supplements.length) * 100) : 0}%` }}
                  />
                </div>
                {/* upcoming due */}
                {(() => {
                  const due = supplements.filter(s => {
                    if (!s.ReminderTime) return false;
                    const log = suppLogs.find(l => l.IdSupplement === s.IdSupplement);
                    if (log?.IsTaken === 1) return false;
                    const [h, m] = s.ReminderTime.split(":").map(Number);
                    const diff = moment().hours(h).minutes(m).seconds(0).diff(moment(), "minutes");
                    return diff >= 0 && diff <= 60;
                  });
                  if (!due.length) return null;
                  return (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {due.map(s => (
                        <span key={s.IdSupplement} className="text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 px-2 py-0.5 rounded-full animate-pulse">
                          {TIMING_ICONS[s.Timing]} {s.Name} · {s.ReminderTime}
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </>
        )}

        {/* ── Today's stats ── */}
        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Today's stats</p>
        <div className="grid grid-cols-2 gap-3 mb-5">

          {/* Steps */}
          {(() => {
            const pct = Math.min(calculatePercentage(latestUpdate?.Steps || 0, dietTargetGoalPlans!.Targets.steps), 100);
            const steps = latestUpdate?.Steps || 0;
            const goal = dietTargetGoalPlans?.Targets.steps || 0;
            return (
              <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 cursor-pointer"
                onClick={() => { setStepsAmount(latestUpdate?.Steps ?? ""); setStepsInputOpen(true); }}>
                <CardContent className="p-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center mb-2">
                    <Trophy className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-0.5">Steps</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                    {steps.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                    Goal: {goal.toLocaleString()}
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{
                        width: `${pct}%`,
                        transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Water */}
          {(() => {
            const pct = Math.min(calculatePercentage(latestUpdate?.Water || 0, dietTargetGoalPlans!.Targets.water), 100);
            return (
              <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 cursor-pointer"
                onClick={() => { setWaterAmount(latestUpdate?.Water ?? ""); setWaterInputOpen(true); }}>
                <CardContent className="p-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center mb-2">
                    <Droplet className="h-4 w-4 text-sky-500 dark:text-sky-400" />
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-0.5">Water</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                    {latestUpdate?.Water || 0}
                    <span className="text-sm font-normal text-gray-400 dark:text-gray-500"> L</span>
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                    Goal: {dietTargetGoalPlans?.Targets.water} L
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : 'bg-sky-400'}`} style={{ width: `${pct}%` }} />
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Sleep */}
          {(() => {
            const pct = Math.min(calculatePercentage(latestUpdate?.Sleep || 0, dietTargetGoalPlans!.Targets.sleep), 100);
            return (
              <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 cursor-pointer"
                onClick={() => { setSleepAmount(latestUpdate?.Sleep ?? ""); setSleepStartAngle(0); setSleepInputOpen(true); }}>
                <CardContent className="p-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center mb-2">
                    <Moon className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-0.5">Sleep</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                    {latestUpdate?.Sleep || 0}
                    <span className="text-sm font-normal text-gray-400 dark:text-gray-500"> hrs</span>
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                    Goal: {dietTargetGoalPlans?.Targets.sleep} hrs
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : 'bg-purple-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Workout */}
          <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 cursor-pointer"
            onClick={() => { if (!latestUpdate?.WorkOut) setWorkoutRatingOpen(true); }}>
            <CardContent className="p-3">
              <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center mb-2">
                <Dumbbell className="h-4 w-4 text-orange-500 dark:text-orange-400" />
              </div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-0.5">Workout</p>
              {latestUpdate?.WorkOut ? (
                <>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                    {latestUpdate.WorkOut}
                    <span className="text-sm font-normal text-gray-400 dark:text-gray-500">/5</span>
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Logged today</p>
                  <div className="mt-2 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${latestUpdate.WorkOut >= 4 ? 'bg-emerald-500' : latestUpdate.WorkOut >= 2 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${(latestUpdate.WorkOut / 5) * 100}%` }} />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-tight mt-1">Not logged</p>
                  <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-1">Tap to rate</p>
                </>
              )}
            </CardContent>
          </Card>

        </div>

        {/* ── Quick log ── */}
        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Quick log</p>
        <div className="grid grid-cols-3 gap-2 mb-5">
          <button
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 active:scale-95 transition-transform"
            onClick={() => { setWaterAmount(latestUpdate?.Water ?? ""); setWaterInputOpen(true); }}
          >
            <Droplet className="h-4 w-4 text-sky-500" />
            <span>+ Water</span>
          </button>
          <button
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 active:scale-95 transition-transform"
            onClick={() => { setStepsAmount(latestUpdate?.Steps ?? ""); setStepsInputOpen(true); }}
          >
            <Trophy className="h-4 w-4 text-orange-400" />
            <span>+ Steps</span>
          </button>
          <button
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 active:scale-95 transition-transform"
            onClick={() => { setSleepAmount(latestUpdate?.Sleep ?? ""); setSleepInputOpen(true); }}
          >
            <Moon className="h-4 w-4 text-indigo-400" />
            <span>+ Sleep</span>
          </button>
        </div>

        {/* ── Weekly chart ── */}
        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">This week</p>
        <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 mb-5">
          <CardContent className="p-4">
            {/* Pill tabs */}
            <div className="flex gap-2 mb-4">
              {([
                { key: 'Steps_Percent' as const, label: 'Steps', active: 'bg-blue-600 text-white border-blue-600', inactive: 'text-gray-400 border-gray-200 dark:border-gray-700' },
                { key: 'Water_Percent' as const, label: 'Water', active: 'bg-sky-500 text-white border-sky-500', inactive: 'text-gray-400 border-gray-200 dark:border-gray-700' },
                { key: 'Sleep_Percent' as const, label: 'Sleep', active: 'bg-purple-500 text-white border-purple-500', inactive: 'text-gray-400 border-gray-200 dark:border-gray-700' },
              ]).map(({ key, label, active, inactive }) => (
                <button
                  key={key}
                  onClick={() => setChartDataType(key)}
                  className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${chartDataType === key ? active : inactive}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Bars */}
            <div className="flex items-end gap-1.5" style={{ height: 100 }}>
              {weeklyData.map((data, index) => {
                const h = Math.max(Number(data[chartDataType]) * 0.9, 2);
                const barCls = chartDataType === 'Steps_Percent' ? 'bg-blue-500'
                  : chartDataType === 'Water_Percent' ? 'bg-sky-400' : 'bg-purple-500';
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] text-gray-400 dark:text-gray-500">{data[chartDataType]}%</span>
                    <div className={`w-full rounded-t-sm ${barCls}`} style={{ height: `${h}%`, opacity: data[chartDataType] ? 1 : 0.2 }} />
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{data.WeekDay}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Coach's feedback ── */}
        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Coach's feedback</p>
        <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 mb-5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                PK
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {dietTargetGoalPlans?.FeedBack || 'No feedback yet from your coach.'}
                </p>
                <button
                  className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400"
                  onClick={() => setViewFeedback(true)}
                >
                  View all feedback →
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

      </main>

      <MobileNav />

      {/* ── Ask Coach FAB ── */}
      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-20 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-900 transition-all active:scale-95"
      >
        <MessageCircle className="h-6 w-6 text-white" />
        {chatUnread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {chatUnread}
          </span>
        )}
      </button>

      {/* ── Coach Chat ── */}
      {chatOpen && (
        <div className="fixed inset-0 z-40 flex flex-col bg-white dark:bg-gray-900">
          {/* header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-blue-600 flex-shrink-0">
            <button onClick={() => setChatOpen(false)} className="p-1.5 text-white/80 hover:text-white">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">PK</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">Your Coach</p>
              <p className="text-blue-200 text-[10px]">Ask anything about your fitness or meals</p>
            </div>
            <button onClick={() => refetchChat()} className="p-2 text-white/70 hover:text-white">
              <RefreshCw className={`h-4 w-4 ${chatFetching ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* messages — flat bubbles */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 bg-gray-50 dark:bg-gray-950">
            {allMyQueries.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <MessageCircle className="h-14 w-14 text-gray-200 dark:text-gray-700" />
                <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">No messages yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-600">Send your first message below</p>
              </div>
            )}
            {allMyQueries.flatMap(q => {
              const msgs = [];
              if (q.Question) msgs.push({ key: `q-${q.IdQuery}`, text: q.Question, sender: 'me' as const, time: q.CreatedAt ?? '' });
              if (q.Answer)   msgs.push({ key: `a-${q.IdQuery}`, text: q.Answer,   sender: 'coach' as const, time: q.AnsweredAt ?? '' });
              return msgs;
            }).sort((a, b) => a.time.localeCompare(b.time)).map((msg, i, arr) => {
              const isMe = msg.sender === 'me';
              const prev = arr[i - 1];
              const showDate = !prev || moment(msg.time).format('YYYY-MM-DD') !== moment(prev.time).format('YYYY-MM-DD');
              return (
                <React.Fragment key={msg.key}>
                  {showDate && msg.time && (
                    <div className="flex justify-center py-2">
                      <span className="text-[10px] bg-gray-200 dark:bg-gray-800 text-gray-500 px-3 py-0.5 rounded-full">
                        {moment(msg.time).calendar(null, { sameDay: '[Today]', lastDay: '[Yesterday]', other: 'ddd, MMM D' })}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${isMe ? "justify-end" : "justify-start"} items-end gap-1.5`}>
                    {!isMe && (
                      <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 mb-0.5">
                        <span className="text-[9px] font-bold text-blue-600">PK</span>
                      </div>
                    )}
                    <div className={`max-w-[75%] px-3.5 py-2.5 text-sm shadow-sm ${
                      isMe
                        ? "bg-blue-600 text-white rounded-2xl rounded-br-sm"
                        : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-sm"
                    }`}>
                      <p className="leading-relaxed">{msg.text}</p>
                      {msg.time && (
                        <p className={`text-[10px] mt-0.5 ${isMe ? "opacity-60 text-right" : "text-gray-400"}`}>
                          {moment(msg.time).format("h:mm a")}
                        </p>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* input */}
          <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-3 flex items-end gap-2">
            <textarea
              className="flex-1 min-h-[44px] max-h-[120px] px-3.5 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:ring-2 focus:ring-blue-300 outline-none"
              placeholder="Type a message…"
              value={chatQuestion}
              onChange={e => setChatQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (chatQuestion.trim()) askCoachMutation.mutate(chatQuestion); } }}
            />
            <button
              disabled={!chatQuestion.trim() || askCoachMutation.isPending}
              onClick={() => askCoachMutation.mutate(chatQuestion)}
              className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition-all active:scale-95"
            >
              {askCoachMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      {/* ── Supplement Drawer ── */}
      {suppDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => { setSuppDrawerOpen(false); setEditingTimeId(null); }} />
          <div className="relative bg-white dark:bg-gray-900 rounded-t-2xl max-h-[80vh] flex flex-col shadow-2xl">
            {/* handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
            {/* header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100">Today's Supplements</p>
                <p className="text-xs text-gray-400">{suppTakenCount}/{supplements.length} taken</p>
              </div>
              <button onClick={() => { setSuppDrawerOpen(false); setEditingTimeId(null); }}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            {/* list */}
            <div className="overflow-y-auto px-4 py-3 space-y-3 pb-8">
              {SUPPLEMENT_TIMINGS.map(timing => {
                const group = supplements.filter(s => s.Timing === timing);
                if (!group.length) return null;
                return (
                  <div key={timing}>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                      {TIMING_ICONS[timing]} {timing}
                    </p>
                    <div className="space-y-2">
                      {group.map(s => {
                        const log = suppLogs.find(l => l.IdSupplement === s.IdSupplement);
                        const taken = log?.IsTaken === 1;
                        const isEditing = editingTimeId === s.IdSupplement;
                        return (
                          <div key={s.IdSupplement}
                            className={`rounded-xl border px-3 py-2.5 flex items-center gap-3 transition-colors ${
                              taken ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50"
                                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                            }`}>
                            {/* check button */}
                            <button
                              onClick={() => toggleSupp({ IdSupplement: s.IdSupplement!, LogDate: todayStr, IsTaken: taken ? 0 : 1 })}
                              className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                                taken ? "border-green-500 bg-green-500 text-white"
                                       : "border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700"
                              }`}>
                              {taken && <Check className="h-4 w-4" />}
                            </button>
                            {/* info */}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold truncate ${taken ? "line-through text-gray-400" : "text-gray-800 dark:text-gray-100"}`}>
                                {s.Name}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                {s.Dose && <span className="text-[10px] text-violet-500">{s.Dose}</span>}
                                {s.Duration && <span className="text-[10px] text-gray-400">⏱ {s.Duration}</span>}
                                {taken && log?.TakenAt && (
                                  <span className="text-[10px] text-green-500">✓ {moment(log.TakenAt).format("h:mm a")}</span>
                                )}
                              </div>
                              {/* reminder time — always visible, tap pencil to edit */}
                              <div className="mt-1.5">
                                {isEditing ? (
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 bg-violet-50 dark:bg-violet-900/20 border border-violet-300 dark:border-violet-600 rounded-lg px-2.5 py-1.5">
                                      <Clock className="h-3.5 w-3.5 text-violet-500 flex-shrink-0" />
                                      <input
                                        type="time"
                                        value={editingTimeValue}
                                        onChange={e => setEditingTimeValue(e.target.value)}
                                        className="text-xs bg-transparent text-violet-700 dark:text-violet-300 font-medium outline-none w-24"
                                        autoFocus
                                      />
                                    </div>
                                    <button
                                      onClick={() => saveReminderTime({ id: s.IdSupplement!, time: editingTimeValue })}
                                      disabled={savingTime}
                                      className="text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors">
                                      Save
                                    </button>
                                    <button onClick={() => setEditingTimeId(null)}
                                      className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => { setEditingTimeId(s.IdSupplement!); setEditingTimeValue(s.ReminderTime ?? ""); }}
                                    className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:border-violet-300 border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 transition-colors group"
                                  >
                                    <Clock className="h-3.5 w-3.5 text-gray-400 group-hover:text-violet-500" />
                                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300 group-hover:text-violet-600">
                                      {s.ReminderTime ? s.ReminderTime : "Set reminder time"}
                                    </span>
                                    <Pencil className="h-3 w-3 text-gray-400 group-hover:text-violet-500 ml-0.5" />
                                  </button>
                                )}
                                {!isEditing && (
                                  <p className="text-[9px] text-gray-400 mt-0.5 ml-0.5">Applies to all scheduled days</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
      <Dialog open={stepsInputOpen} onOpenChange={(open) => { setStepsInputOpen(open); if (!open) setStepsAmount(latestUpdate?.Steps ?? ""); }}>
        <DialogContent className="sm:max-w-[360px] p-0 overflow-hidden rounded-3xl border-0">
          <style>{`
            @keyframes footprint {
              0%      { opacity: 0; transform: scale(0.4) translateY(4px); }
              12%     { opacity: 1; transform: scale(1.05) translateY(-1px); }
              20%,55% { opacity: 1; transform: scale(1) translateY(0px); }
              75%,100%{ opacity: 0; transform: scale(0.9) translateY(0px); }
            }
            .ft1 { animation: footprint 2s ease-in-out 0s    infinite; transform-box: fill-box; transform-origin: center; }
            .ft2 { animation: footprint 2s ease-in-out 0.5s  infinite; transform-box: fill-box; transform-origin: center; }
            .ft3 { animation: footprint 2s ease-in-out 1.0s  infinite; transform-box: fill-box; transform-origin: center; }
            .ft4 { animation: footprint 2s ease-in-out 1.5s  infinite; transform-box: fill-box; transform-origin: center; }
            @keyframes arcTipPulse {
              0%,100% { r: 5; opacity: 0.9; }
              50%     { r: 8; opacity: 0.4; }
            }
            .arc-tip { animation: arcTipPulse 1.1s ease-in-out infinite; }
            @keyframes ringGlow {
              0%,100% { filter: drop-shadow(0 0 4px rgba(251,191,36,0.3)); }
              50% { filter: drop-shadow(0 0 20px rgba(251,191,36,1)); }
            }
            .ring-goal { animation: ringGlow 1s ease-in-out infinite; }
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
            // glowing dot position at the arc tip
            const tipAngleRad = (-90 + pct * 360) * (Math.PI / 180);
            const tipX = 100 + r * Math.cos(tipAngleRad);
            const tipY = 100 + r * Math.sin(tipAngleRad);
            const starPositions = Array.from({length: 8}, (_, i) => {
              const a = (i / 8) * 2 * Math.PI;
              const d = 72 + (i % 2) * 20;
              return { sx: `${Math.cos(a) * d}px`, sy: `${Math.sin(a) * d}px`, delay: i * 0.08 };
            });
            return (
              <>
                <div className="relative bg-gradient-to-b from-orange-400 to-rose-600 px-6 pt-5 pb-3 text-white text-center overflow-hidden">
                  <h2 className="text-xl font-bold">Step Count</h2>
                  <p className="text-orange-100 text-xs mt-0.5">Goal: 10,000 steps</p>
                  <div className="flex justify-center mt-3">
                    <svg viewBox="0 0 200 200" width="188" height="188"
                      className={goalReached ? 'ring-goal' : ''}>
                      {/* Background track */}
                      <circle cx="100" cy="100" r={r} fill="none"
                        stroke="rgba(255,255,255,0.18)" strokeWidth="12" strokeLinecap="round"/>
                      {/* Subtle segment marks */}
                      {[0.25, 0.5, 0.75].map((frac) => {
                        const a = (-90 + frac * 360) * (Math.PI / 180);
                        return (
                          <line key={frac}
                            x1={100 + (r - 8) * Math.cos(a)} y1={100 + (r - 8) * Math.sin(a)}
                            x2={100 + (r + 8) * Math.cos(a)} y2={100 + (r + 8) * Math.sin(a)}
                            stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round"/>
                        );
                      })}
                      {/* Progress arc */}
                      <circle cx="100" cy="100" r={r} fill="none"
                        stroke={goalReached ? '#fbbf24' : 'white'} strokeWidth="12" strokeLinecap="round"
                        strokeDasharray={`${dash} ${circ}`}
                        transform="rotate(-90 100 100)"
                        style={{ transition: 'stroke-dasharray 0.45s cubic-bezier(0.34,1.2,0.64,1), stroke 0.3s ease' }}/>
                      {/* Glowing tip dot (only while in progress) */}
                      {pct > 0.02 && pct < 1 && (
                        <circle cx={tipX} cy={tipY} r="5" fill="white" className="arc-tip"
                          filter="url(#tipGlow)"/>
                      )}
                      {/* Goal tick at 12 o'clock */}
                      <line x1="100" y1="20" x2="100" y2="13"
                        stroke={goalReached ? '#fbbf24' : 'rgba(255,255,255,0.7)'}
                        strokeWidth="3" strokeLinecap="round"/>
                      {/* Glow filter */}
                      <defs>
                        <filter id="tipGlow">
                          <feGaussianBlur stdDeviation="3" result="blur"/>
                          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                      </defs>
                      {/* Central icon */}
                      {goalReached ? (
                        <text x="100" y="98" textAnchor="middle" fontSize="36">🏆</text>
                      ) : (
                        <>
                          {/* Footprint trail — 4 steps appearing sequentially bottom→top */}
                          {/* Step 1: left foot, bottom */}
                          <g transform="translate(89,80) rotate(-16)">
                            <g className={steps > 0 ? "ft1" : ""} style={steps === 0 ? {opacity:0.35} : {}}>
                              <path d="M0,-10 C4,-10 7,-6 7,0 C7,6 4,10 0,10 C-4,10 -7,6 -7,0 C-7,-6 -4,-10 0,-10 Z" fill="white"/>
                              <ellipse cx="-2.5" cy="-8" rx="2" ry="1.5" fill="white"/>
                              <ellipse cx="2.5"  cy="-8.5" rx="2" ry="1.5" fill="white"/>
                            </g>
                          </g>
                          {/* Step 2: right foot */}
                          <g transform="translate(112,70) rotate(16)">
                            <g className={steps > 0 ? "ft2" : ""} style={steps === 0 ? {opacity:0.35} : {}}>
                              <path d="M0,-10 C4,-10 7,-6 7,0 C7,6 4,10 0,10 C-4,10 -7,6 -7,0 C-7,-6 -4,-10 0,-10 Z" fill="white"/>
                              <ellipse cx="-2.5" cy="-8" rx="2" ry="1.5" fill="white"/>
                              <ellipse cx="2.5"  cy="-8.5" rx="2" ry="1.5" fill="white"/>
                            </g>
                          </g>
                          {/* Step 3: left foot, top */}
                          <g transform="translate(89,58) rotate(-16)">
                            <g className={steps > 0 ? "ft3" : ""} style={steps === 0 ? {opacity:0.35} : {}}>
                              <path d="M0,-10 C4,-10 7,-6 7,0 C7,6 4,10 0,10 C-4,10 -7,6 -7,0 C-7,-6 -4,-10 0,-10 Z" fill="white"/>
                              <ellipse cx="-2.5" cy="-8" rx="2" ry="1.5" fill="white"/>
                              <ellipse cx="2.5"  cy="-8.5" rx="2" ry="1.5" fill="white"/>
                            </g>
                          </g>
                          {/* Step 4: right foot, top */}
                          <g transform="translate(112,48) rotate(16)">
                            <g className={steps > 0 ? "ft4" : ""} style={steps === 0 ? {opacity:0.35} : {}}>
                              <path d="M0,-10 C4,-10 7,-6 7,0 C7,6 4,10 0,10 C-4,10 -7,6 -7,0 C-7,-6 -4,-10 0,-10 Z" fill="white"/>
                              <ellipse cx="-2.5" cy="-8" rx="2" ry="1.5" fill="white"/>
                              <ellipse cx="2.5"  cy="-8.5" rx="2" ry="1.5" fill="white"/>
                            </g>
                          </g>
                        </>
                      )}
                      <text x="100" y="112" textAnchor="middle"
                        fill={goalReached ? '#fbbf24' : 'white'} fontSize="22" fontWeight="700">
                        {stepsLabel}
                      </text>
                      <text x="100" y="126" textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize="11">
                        {goalReached ? "You crushed it! 🎉" : `${Math.round(pct * 100)}% of goal`}
                      </text>
                    </svg>
                  </div>
                  {/* Confetti particles only — no badge inside overlay */}
                  {goalReached && (
                    <div className="absolute inset-0 pointer-events-none" style={{zIndex: 20}}>
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
                      {starPositions.map((s, i) => (
                        <div key={`s${i}`} className="star-burst"
                          style={{ '--sx': s.sx, '--sy': s.sy, animationDelay: `${s.delay}s` } as React.CSSProperties}>
                          ⭐
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Badge in reserved slot — never overlaps the clock */}
                  <div style={{height: '34px'}} className="flex items-center justify-center">
                    {goalReached && (
                      <span className="bg-white text-gray-800 font-bold text-sm px-5 py-1.5 rounded-full shadow-xl">
                        🏆 10K Steps Done!
                      </span>
                    )}
                  </div>
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
                    <button onClick={() => { setStepsInputOpen(false); setStepsAmount(latestUpdate?.Steps ?? ""); }}
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


    </div>
  );
}

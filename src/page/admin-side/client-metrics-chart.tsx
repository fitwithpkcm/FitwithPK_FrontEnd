import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Calendar, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { format, subDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { IDailyStats, IUpdatesForUser } from "@/interface/IDailyUpdates";
import { getDailyUpdateForAWeek } from "@/services/UpdateServices";
import moment from 'moment';
import { BASE_URL, USER_TARGET } from "@/common/Constant";
import { setBaseUrl } from "../../services/HttpService"
import { calculatePercentage } from "@/lib/utils";
import { WeeklySummary } from "./weekly-summary";
import { MobileAdminNav } from "@/components/layout/mobile-admin-nav";
import { getUserListWithUpdates_ForCoach } from "@/services/AdminServices";
import { WeeklyDay } from "../client-side/home-page";




export interface x_metric {
  key: string
  label: string
  color: string
  lightColor: string
}


export default function ClientMetricsChart() {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedMetric, setSelectedMetric] = useState("Sleep_Percent");

  const currentDate = new Date();

  /**
  * author : basil1112
  * set up base url
   */
  useEffect(() => {
    setBaseUrl(BASE_URL);
  }, []);

  // Metrics options
  const metrics: x_metric[] = [
    { key: "Sleep_Percent", label: "Sleep (hours)", color: "#8B5CF6", lightColor: "#F3E8FF" },
    { key: "Water_Percent", label: "Water (L)", color: "#06B6D4", lightColor: "#ECFEFF" },
    { key: "Steps_Percent", label: "Steps", color: "#10B981", lightColor: "#ECFDF5" }
  ];

  // Get the current metric configuration
  const currentMetric = metrics.find(m => m.key === selectedMetric) || metrics[0];

  /**
   * author : basil1112
   * fetch daily updates for this weeek 
   */
  const { data: dailyUpdatesForWeek = [] } = useQuery<IDailyStats[]>({
    queryKey: ["daily-updates-forweek", selectedClient, startDate],
    queryFn: () => getDailyUpdateForAWeek({ Day: moment(startDate).format("DD-MM-YYYY"), IdUser: selectedClient }).then(res => res.data.data)
  });


  // Fetch user's list 
  const { data: UserList } = useQuery<IUpdatesForUser[]>({
    queryKey: ["coach-userlist"],
    queryFn: () => getUserListWithUpdates_ForCoach({ Day: moment(startDate).format("DD-MM-YYYY") }).then(res => res.data.data)
  });


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

  weeklyData = dailyUpdatesForWeek?.map((element: IDailyStats, index: number) => {
    return {
      ...weeklyData[index],
      ...element,
      Steps_Percent: calculatePercentage(Number(element.Steps), USER_TARGET.DAILY_TARGET.STEPS),
      Sleep_Percent: calculatePercentage(Number(element.Sleep), USER_TARGET.DAILY_TARGET.SLEEP),
      Water_Percent: calculatePercentage(Number(element.Water), USER_TARGET.DAILY_TARGET.WATER),
    };
  });

  const weekTotals: WeeklyDay = {
    WeekDay: "Total",
    Steps: dailyUpdatesForWeek.reduce((sum, day) => sum + Number(day.Steps || 0), 0),
    Water: dailyUpdatesForWeek.reduce((sum, day) => sum + Number(day.Water || 0), 0),
    Sleep: dailyUpdatesForWeek.reduce((sum, day) => sum + Number(day.Sleep || 0), 0),
    Steps_Percent: 0,
    Water_Percent: 0,
    Sleep_Percent: 0,
  };

  // Now TypeScript knows weeklyData is an array of IWeeklyData
  weeklyData.push(weekTotals);

  const renderBarChart = (
    weeklyData: WeeklyDay[],
    metricKey: string
  ) => {
    return (
      <>
        {weeklyData.slice(0, 7).map((data, index) => {
          const percent = Number(data[metricKey]) || 0;

          return (
            <div
              key={`${data.WeekDay}-${metricKey}`}
              className="absolute bottom-10 cursor-pointer"
              onClick={() =>
                console.log("clicked")
              }
              style={{
                left: `${index * 12 + 5}%`,
                height: `${percent * 0.8}%`,
                width: '8%',
                backgroundColor: currentMetric.color,
                borderRadius: '4px 4px 0 0',
              }}
            >
              <div className="absolute -bottom-8 text-center w-full text-xs text-gray-500 dark:text-gray-400">
                {data.WeekDay}
              </div>
              <div className="absolute -top-5 text-center w-full text-xs font-medium text-primary-700 dark:text-primary-400">
                {Math.round(percent)}%
              </div>
            </div>
          );
        })}
      </>
    );
  };

  return (
    <div className="p-4 h-full w-full bg-gray-50">

      <header className="fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-50 flex items-center justify-center px-4">
        <h1 className="font-bold text-lg text-gray-900 dark:text-white">FitwithPKAdmin</h1>
      </header>

      {/* Header with Back Button */}
      {/* {onBack && (
        <div className="flex items-center mb-6">
          <button
            onClick={onBack}
            className="mr-3 p-2 hover:bg-gray-100 rounded-full flex items-center gap-2 text-gray-600"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
        </div>
      )} */}

      <div className="bg-white rounded-lg border p-6">
        {/* Client Selection - Scalable Design */}
        <div className="mb-6">
          <div className="text-sm text-gray-600 mb-3">Select Client</div>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
          >
            {UserList?.map(client => (
              <option key={client.IdUser} value={client.IdUser}>{client.FirstName} {client.LastName}</option>
            ))}
          </select>
        </div>

        {/* Week Navigation */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Weekly Progress</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const currentStart = new Date(startDate);
                  const newStart = new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000);
                  const newEnd = new Date(newStart.getTime() + 6 * 24 * 60 * 60 * 1000);
                  setStartDate(newStart.toISOString().split('T')[0]);
                  setEndDate(newEnd.toISOString().split('T')[0]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft size={20} className="text-gray-600" />
              </button>

              <div className="text-sm font-medium text-gray-700 min-w-[120px] text-center">
                {format(new Date(startDate), 'MMM dd')} - {format(new Date(endDate), 'dd, yyyy')}
              </div>

              <button
                onClick={() => {
                  const currentStart = new Date(startDate);
                  const newStart = new Date(currentStart.getTime() + 7 * 24 * 60 * 60 * 1000);
                  const newEnd = new Date(newStart.getTime() + 6 * 24 * 60 * 60 * 1000);
                  setStartDate(newStart.toISOString().split('T')[0]);
                  setEndDate(newEnd.toISOString().split('T')[0]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight size={20} className="text-gray-600" />
              </button>
            </div>
          </div>

          {/* Calendar Option */}
          <div className="flex items-center justify-center gap-3 py-2">
            <span className="text-xs text-gray-500">Or pick a date:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                const selectedDate = new Date(e.target.value);
                const endDate = new Date(selectedDate.getTime() + 6 * 24 * 60 * 60 * 1000);
                setStartDate(e.target.value);
                setEndDate(endDate.toISOString().split('T')[0]);
              }}
              className="px-3 py-1 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Calendar size={16} className="text-gray-400" />
          </div>
        </div>

        {/* Metric Pills */}
        <div className="flex justify-center mb-6">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {metrics.map(metric => (
              <button
                key={metric.key}
                onClick={() => setSelectedMetric(metric.key)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${selectedMetric === metric.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                {metric.key === 'Sleep_Percent' ? 'Sleep' : metric.key === 'Water_Percent' ? 'Water' : 'Steps'}
              </button>
            ))}
          </div>
        </div>

        {/* graph div starts here */}

        <div className="h-72 w-full bg-white rounded-lg p-6 relative overflow-hidden">
          {renderBarChart(weeklyData, selectedMetric, '#4f46e5', 'Steps')}
        </div>
        {/* graph div ends here */}


        {/* Weekly Summary */}
        <WeeklySummary
          selectedMetric={selectedMetric}
          weeklyData={weeklyData}
          currentMetric={currentMetric}
        />

        {/* Date Range Info */}
        <div className="mt-4 text-center text-xs text-gray-400">
          {selectedClient} • {format(new Date(startDate), 'MMM dd')} - {format(new Date(endDate), 'MMM dd, yyyy')}
        </div>
      </div>

      {/* Bottom Navigation */}
      <MobileAdminNav />

    </div>
  );
}
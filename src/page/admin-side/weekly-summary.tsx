import React,{ useEffect, useState } from "react";
import { USER_TARGET } from "@/common/Constant";
import moment from 'moment';


export function WeeklySummary({ selectedMetric, weeklyData, currentMetric }) {
  // Filter out the "Total" entry for calculations
  const weekDaysData = weeklyData.filter(day => day.WeekDay !== "Total");
  
  // Calculate metrics based on selectedMetric
  const getDailyAverage = () => {
    const count = weekDaysData.length;
    if (count === 0) return 0;
    
    const sum = weekDaysData.reduce((sum, day) => {
      return sum + Number(day[selectedMetric === 'Water_Percent' ? 'Water' : 
                            selectedMetric === 'Steps_Percent' ? 'Steps' : 'Sleep'] || 0);
    }, 0);
    
    return sum / count;
  };

  const getBestDay = () => {
    if (weekDaysData.length === 0) return 0;
    
    return Math.max(...weekDaysData.map(day => 
      Number(day[selectedMetric === 'Water_Percent' ? 'Water' : 
                selectedMetric === 'Steps_Percent' ? 'Steps' : 'Sleep'] || 0)
    ));
  };

  const getGoalAchievement = () => {
    const target = selectedMetric === 'Water_Percent' ? USER_TARGET.DAILY_TARGET.WATER :
                   selectedMetric === 'Steps_Percent' ? USER_TARGET.DAILY_TARGET.STEPS :
                   USER_TARGET.DAILY_TARGET.SLEEP;
    
    const achievementPercentages = weekDaysData.map(day => {
      const value = Number(day[selectedMetric === 'Water_Percent' ? 'Water' : 
                              selectedMetric === 'Steps_Percent' ? 'Steps' : 'Sleep'] || 0);
      return (value / target) * 100;
    });
    
    if (achievementPercentages.length === 0) return 0;
    
    const average = achievementPercentages.reduce((sum, p) => sum + p, 0) / achievementPercentages.length;
    return Math.min(Math.round(average), 100); // Cap at 100%
  };

  const getConsistentDays = () => {
    const target = selectedMetric === 'Water_Percent' ? USER_TARGET.DAILY_TARGET.WATER :
                   selectedMetric === 'Steps_Percent' ? USER_TARGET.DAILY_TARGET.STEPS :
                   USER_TARGET.DAILY_TARGET.SLEEP;
    
    const consistentDays = weekDaysData.filter(day => {
      const value = Number(day[selectedMetric === 'Water_Percent' ? 'Water' : 
                              selectedMetric === 'Steps_Percent' ? 'Steps' : 'Sleep'] || 0);
      return value >= target * 0.8; // At least 80% of target
    });
    
    return consistentDays.length;
  };

  const dailyAverage = getDailyAverage();
  const bestDay = getBestDay();
  const goalAchievement = getGoalAchievement();
  const consistentDays = getConsistentDays();

  const formatValue = (value, metric) => {
    if (metric === 'Water_Percent') return `${(value / 10).toFixed(1)}L`;
    if (metric === 'Steps_Percent') return `${(value / 1000).toFixed(1)}k`;
    return `${value.toFixed(1)}h`;
  };

  const getInsightMessage = () => {
    if (weekDaysData.length === 0) return "No data available for this week.";
    
    if (selectedMetric === 'Water_Percent') {
      if (goalAchievement >= 90) return "Excellent hydration this week! Your client consistently met water intake goals.";
      if (goalAchievement >= 70) return "Good hydration overall. A few days could use improvement.";
      return "Hydration needs attention. Consider strategies to increase daily water intake.";
    }
    
    if (selectedMetric === 'Steps_Percent') {
      if (goalAchievement >= 90) return "Fantastic activity levels! Your client was very active this week.";
      if (goalAchievement >= 70) return "Moderate activity recorded. Look for opportunities to add more movement.";
      return "Low activity levels this week. Encourage more daily steps or physical activity.";
    }
    
    // Sleep metric
    if (goalAchievement >= 90) return "Consistent, quality sleep this week. Your client is well-rested!";
    if (goalAchievement >= 70) return "Sleep patterns are decent but could be more consistent.";
    return "Sleep duration was below targets this week. Consider reviewing bedtime routines.";
  };

  return (
    <div className="mt-8 bg-white rounded-lg p-6 border">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Weekly {selectedMetric === 'Water_Percent' ? 'Hydration' : 
                 selectedMetric === 'Steps_Percent' ? 'Activity' : 'Sleep'} Summary
        </h3>
        <div
          className="px-3 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: `${currentMetric.color}20`,
            color: currentMetric.color
          }}
        >
          7 Days
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold mb-1" style={{ color: currentMetric.color }}>
            {formatValue(dailyAverage, selectedMetric)}
          </div>
          <div className="text-xs text-gray-500">Daily Average</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold mb-1 text-green-600">
            {formatValue(bestDay, selectedMetric)}
          </div>
          <div className="text-xs text-gray-500">Best Day</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold mb-1 text-blue-600">
            {goalAchievement}%
          </div>
          <div className="text-xs text-gray-500">Goal Achievement</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold mb-1 text-purple-600">
            {consistentDays}/7
          </div>
          <div className="text-xs text-gray-500">Consistent Days</div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>Weekly Progress</span>
          <span>{goalAchievement}% Complete</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${goalAchievement}%`,
              background: `linear-gradient(90deg, ${currentMetric.color} 0%, ${currentMetric.color}80 100%)`
            }}
          ></div>
        </div>
      </div>

      {/* Insights */}
      <div
        className="p-4 rounded-lg"
        style={{ backgroundColor: `${currentMetric.color}10` }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
            style={{ backgroundColor: currentMetric.color }}
          ></div>
          <div>
            <div className="text-sm font-medium text-gray-900 mb-1">Weekly Insight</div>
            <div className="text-sm text-gray-600">
              {getInsightMessage()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
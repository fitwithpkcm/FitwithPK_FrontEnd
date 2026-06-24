import React, { useEffect, useState } from "react";
import {
  Target, Save, Check, User, ArrowLeft, FileText, Upload, Eye, Download,
  Utensils, Dumbbell, X, ChevronLeft, ChevronRight, Calendar,
  BarChart2, Footprints, Droplets, Moon
} from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { setBaseUrl } from "../../services/HttpService";
import { BASE_URL, USER_TARGET } from "../../common/Constant";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { IUser } from "../../interface/models/User";
import { IDailyStats, IUpdatesForUser } from "../../interface/IDailyUpdates";
import { addDietPlan, getUserListForACoach, getUserListWithUpdates_ForCoach } from "../../services/AdminServices";
import { MobileAdminNav } from "../../components/layout/mobile-admin-nav";
import { getDietPlan, getDailyUpdateForAWeek } from "../../services/UpdateServices";
import { IdDietPlan } from "../../interface/IDietPlan";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Button } from "../../components/ui/button";
import { calculatePercentage } from "../../lib/utils";
import { WeeklySummary } from "./weekly-summary";
import { WeeklyDay } from "../client-side/home-page";
import moment from "moment";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserTarget {
  steps: number;
  water: number;
  sleep: number;
}

type TabId = "analytics" | "targets" | "plans";

export interface x_metric {
  key: string;
  label: string;
  color: string;
  lightColor: string;
  icon: React.ReactNode;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const METRICS: x_metric[] = [
  { key: "Sleep_Percent", label: "Sleep", color: "#8B5CF6", lightColor: "#F3E8FF", icon: <Moon size={14} /> },
  { key: "Water_Percent", label: "Water", color: "#06B6D4", lightColor: "#ECFEFF", icon: <Droplets size={14} /> },
  { key: "Steps_Percent", label: "Steps", color: "#10B981", lightColor: "#ECFDF5", icon: <Footprints size={14} /> },
];

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "analytics", label: "Analytics", icon: <BarChart2 size={16} /> },
  { id: "targets",   label: "Targets",   icon: <Target size={16} /> },
  { id: "plans",     label: "Plans",     icon: <FileText size={16} /> },
];

// ── TargetSlider ──────────────────────────────────────────────────────────────

interface TargetSliderProps {
  label: string;
  emoji: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  color: string;
  bgColor: string;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}

function TargetSlider({ label, emoji, value, min, max, step, unit, color, bgColor, onChange, format: fmt }: TargetSliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  const display = fmt ? fmt(value) : value.toLocaleString();
  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${bgColor} rounded-full flex items-center justify-center text-lg`}>{emoji}</div>
          <div>
            <p className="font-semibold text-gray-800">{label}</p>
            <p className="text-xs text-gray-400">{unit} per day</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{display}</p>
        </div>
      </div>
      <div className="relative h-3 rounded-full bg-gray-100">
        <div
          className="absolute top-0 left-0 h-3 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{min.toLocaleString()}</span>
        <span>{max.toLocaleString()}</span>
      </div>
    </div>
  );
}

// ── PlanSection ───────────────────────────────────────────────────────────────

interface PlanFile {
  id: number;
  name: string;
  uploadDate: string;
  file?: File;
  url?: string;
}

interface PlanSectionProps {
  title: string;
  icon: React.ReactNode;
  accent: string;
  accentBg: string;
  accentBorder: string;
  plans: PlanFile[];
  planName: string;
  onUpload: () => void;
  onView: (plan: PlanFile) => void;
  onDownload: (plan: PlanFile) => void;
  onRemove: (id: number) => void;
}

function PlanSection({ title, icon, accent, accentBg, accentBorder, plans, planName, onUpload, onView, onDownload, onRemove }: PlanSectionProps) {
  return (
    <div className={`rounded-xl border ${accentBorder} ${accentBg} p-5`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 font-semibold text-gray-800">
          {icon}
          {title}
        </div>
        <button
          onClick={onUpload}
          className={`px-3 py-1.5 ${accent} text-white text-xs rounded-lg flex items-center gap-1 hover:opacity-90 transition-opacity`}
        >
          <Upload size={13} /> Upload PDF
        </button>
      </div>

      {plans.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No plan uploaded yet</p>
      ) : (
        <div className="space-y-2">
          {plans.map(plan => (
            <div key={plan.id} className="flex items-center gap-3 bg-white rounded-lg border p-3">
              <FileText size={18} className="text-gray-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{plan.name || planName}</p>
                <p className="text-xs text-gray-400">Uploaded {plan.uploadDate}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => onView(plan)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="View">
                  <Eye size={15} className="text-gray-500" />
                </button>
                <button onClick={() => onDownload(plan)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Download">
                  <Download size={15} className="text-gray-500" />
                </button>
                <button onClick={() => onRemove(plan.id)} className="p-1.5 hover:bg-red-50 rounded-lg" title="Remove">
                  <X size={15} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UserTargetsScreen() {
  const queryClient = useQueryClient();

  // ── shared state ───────────────────────────────────────────────────────────
  const [selectedClient, setSelectedClient] = useState<IUser | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("analytics");

  // ── targets state ──────────────────────────────────────────────────────────
  const [targets, setTargets] = useState<UserTarget>({ steps: 10000, water: 2.5, sleep: 8.0 });
  const [saved, setSaved] = useState(false);

  // ── plans state ────────────────────────────────────────────────────────────
  const [dietPlans, setDietPlans] = useState<PlanFile[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<PlanFile[]>([]);
  const [coachFeedback, setCoachFeedback] = useState("");
  const [dietPlanName, setDietPlanName] = useState("");
  const [workoutPlanName, setWorkoutPlanName] = useState("");
  const [plansSaved, setPlansSaved] = useState(false);

  // ── PDF viewer state ───────────────────────────────────────────────────────
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [pdfType, setPdfType] = useState<"workout" | "diet">("workout");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // ── analytics state ────────────────────────────────────────────────────────
  const [startDate, setStartDate] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"));
  const [selectedMetric, setSelectedMetric] = useState("Sleep_Percent");

  useEffect(() => {
    setBaseUrl(BASE_URL);
  }, []);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: coach_client_list = [] } = useQuery<IUser[]>({
    queryKey: ["target-userlist"],
    queryFn: () => getUserListForACoach(null).then(res => res.data.data),
  });

  const { data: UserList } = useQuery<IUpdatesForUser[]>({
    queryKey: ["coach-userlist-targets"],
    queryFn: () => getUserListWithUpdates_ForCoach({ Day: moment(startDate).format("DD-MM-YYYY") }).then(res => res.data.data),
  });

  // Auto-select first analytics client
  const [analyticsClient, setAnalyticsClient] = useState("");
  useEffect(() => {
    const first = UserList?.[0]?.IdUser?.toString();
    if (first && !analyticsClient) setAnalyticsClient(first);
  }, [UserList]);

  const { data: dailyUpdatesForWeek = [] } = useQuery<IDailyStats[]>({
    queryKey: ["daily-updates-forweek", analyticsClient, startDate],
    queryFn: () =>
      getDailyUpdateForAWeek({ Day: moment(startDate).format("DD-MM-YYYY"), IdUser: analyticsClient }).then(res => res.data.data),
    enabled: !!analyticsClient,
  });

  const { data: dietPlanFiles } = useQuery<IdDietPlan | null>({
    queryKey: ["dietPlan", selectedClient?.IdUser],
    queryFn: async () => {
      if (!selectedClient) return null;
      const res: ApiResponse<IdDietPlan[]> = await getDietPlan({ IdUser: selectedClient.IdUser });
      const data = res.data?.data?.map(el => ({
        ...el,
        FileName: JSON.parse(el.FileName.toString()),
      }));
      return data.length > 0 ? data[0] : null;
    },
    enabled: !!selectedClient,
  });

  // Populate targets + plans when client's data loads
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["dietPlan", selectedClient?.IdUser] });
    if (selectedClient && dietPlanFiles?.FileName) {
      const dietFileName = dietPlanFiles.FileName.diet_plan;
      const workoutFileName = dietPlanFiles.FileName.workout_plan;
      const newDiet: PlanFile[] = [];
      const newWorkout: PlanFile[] = [];
      if (dietFileName) {
        newDiet.push({ id: Date.now(), name: dietFileName.replace(".pdf", "").replace(/_/g, " "), uploadDate: format(new Date(), "yyyy-MM-dd"), url: `${BASE_URL}/uploads/dietplans/${dietFileName}` });
        setDietPlanName(dietFileName.replace(".pdf", "").replace(/_/g, " "));
      }
      if (workoutFileName) {
        newWorkout.push({ id: Date.now() + 1, name: workoutFileName.replace(".pdf", "").replace(/_/g, " "), uploadDate: format(new Date(), "yyyy-MM-dd"), url: `${BASE_URL}/uploads/workplans/${workoutFileName}` });
        setWorkoutPlanName(workoutFileName.replace(".pdf", "").replace(/_/g, " "));
      }
      setDietPlans(newDiet);
      setWorkoutPlans(newWorkout);
      setTargets(dietPlanFiles.Targets);
      setCoachFeedback(dietPlanFiles.FeedBack);
    }
  }, [selectedClient, dietPlanFiles]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const { mutate: updateTargets, isPending: isSaving } = useMutation({
    mutationFn: addDietPlan,
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2500); },
    onError: () => alert("Failed to save. Please try again."),
  });

  const { mutate: savePlans, isPending: isSavingPlans } = useMutation({
    mutationFn: addDietPlan,
    onSuccess: () => { setPlansSaved(true); setTimeout(() => setPlansSaved(false), 2500); },
    onError: () => alert("Failed to save plans. Please try again."),
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSaveTargets = () => {
    if (!selectedClient) return;
    const fd = new FormData();
    fd.append("IdUser", selectedClient.IdUser!.toString());
    fd.append("Target", JSON.stringify(targets));
    if (coachFeedback) fd.append("Feedback", coachFeedback);
    updateTargets(fd);
  };

  const handleSavePlans = () => {
    if (!selectedClient) return;
    const fd = new FormData();
    fd.append("IdUser", selectedClient.IdUser!.toString());
    fd.append("Target", JSON.stringify(targets));
    if (dietPlans.length > 0) {
      fd.append("DietName", dietPlanName || `Diet Plan ${format(new Date(), "yyyy-MM-dd")}`);
      const lastDiet = dietPlans[dietPlans.length - 1];
      if (lastDiet.file) fd.append("DietPlan", lastDiet.file);
    }
    if (workoutPlans.length > 0) {
      const lastWorkout = workoutPlans[workoutPlans.length - 1];
      if (lastWorkout.file) fd.append("WorkOutPlan", lastWorkout.file);
    }
    if (coachFeedback) fd.append("Feedback", coachFeedback);
    savePlans(fd);
  };

  const handleFileUpload = (type: "diet" | "workout") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf";
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || file.type !== "application/pdf") { alert("Please select a PDF file"); return; }
      const plan: PlanFile = { id: Date.now(), name: file.name.replace(".pdf", ""), uploadDate: format(new Date(), "yyyy-MM-dd"), file };
      if (type === "diet") { setDietPlans(prev => [...prev, plan]); setDietPlanName(plan.name); }
      else { setWorkoutPlans(prev => [...prev, plan]); setWorkoutPlanName(plan.name); }
    };
    input.click();
  };

  const handleViewPDF = (plan: PlanFile) => {
    const url = plan.file ? URL.createObjectURL(plan.file) : plan.url ?? null;
    if (!url) { alert("PDF not available"); return; }
    setPdfUrl(url);
    setPdfType(plan.name.toLowerCase().includes("diet") ? "diet" : "workout");
    setPdfViewerOpen(true);
  };

  const handleDownloadPDF = (plan: PlanFile) => {
    if (!plan.file) { alert("PDF not available for download"); return; }
    const url = URL.createObjectURL(plan.file);
    const a = document.createElement("a");
    a.href = url; a.download = `${plan.name}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Analytics helpers ──────────────────────────────────────────────────────

  const currentMetric = METRICS.find(m => m.key === selectedMetric) ?? METRICS[0];

  const BASE_WEEK: WeeklyDay[] = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => ({
    WeekDay: d, Steps_Percent: 0, Water_Percent: 0, Sleep_Percent: 0,
  }));

  const weeklyData: WeeklyDay[] = dailyUpdatesForWeek.map((el, i) => ({
    ...BASE_WEEK[i],
    ...el,
    Steps_Percent: calculatePercentage(Number(el.Steps), USER_TARGET.DAILY_TARGET.STEPS),
    Sleep_Percent: calculatePercentage(Number(el.Sleep), USER_TARGET.DAILY_TARGET.SLEEP),
    Water_Percent: calculatePercentage(Number(el.Water), USER_TARGET.DAILY_TARGET.WATER),
  }));

  const weekTotals: WeeklyDay = {
    WeekDay: "Total",
    Steps: dailyUpdatesForWeek.reduce((s, d) => s + Number(d.Steps || 0), 0),
    Water: dailyUpdatesForWeek.reduce((s, d) => s + Number(d.Water || 0), 0),
    Sleep: dailyUpdatesForWeek.reduce((s, d) => s + Number(d.Sleep || 0), 0),
    Steps_Percent: 0, Water_Percent: 0, Sleep_Percent: 0,
  };
  const chartData = [...weeklyData, weekTotals];

  const shiftWeek = (dir: 1 | -1) => {
    const ms = dir * 7 * 24 * 60 * 60 * 1000;
    const ns = new Date(new Date(startDate).getTime() + ms);
    const ne = new Date(ns.getTime() + 6 * 24 * 60 * 60 * 1000);
    setStartDate(ns.toISOString().split("T")[0]);
    setEndDate(ne.toISOString().split("T")[0]);
  };

  // ── Client selection screen ────────────────────────────────────────────────

  if (!selectedClient) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b z-50 flex items-center justify-center px-4">
          <h1 className="font-bold text-lg text-gray-900">FitwithPKAdmin</h1>
        </header>

        <div className="p-4 mt-14">
          {/* Page header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
              <Target className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Insights & Targets</h1>
              <p className="text-sm text-gray-500">Select a client to manage</p>
            </div>
          </div>

          {/* Analytics is available without a client */}
          <button
            onClick={() => setActiveTab("analytics")}
            className="w-full mb-4 bg-white border rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow text-left"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <BarChart2 className="text-blue-600" size={20} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">View Analytics</p>
              <p className="text-xs text-gray-500">Weekly progress charts for any client</p>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>

          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">Clients — Targets & Plans</p>

          <div className="space-y-3">
            {coach_client_list.map(client => (
              <button
                key={client.IdUser}
                className="w-full bg-white p-4 rounded-xl border flex items-center gap-4 hover:shadow-md transition-shadow text-left"
                onClick={() => { setSelectedClient(client); setActiveTab("targets"); }}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-violet-100 to-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-violet-700 font-bold text-sm">{client.FirstName?.[0]}{client.LastName?.[0]}</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{client.FirstName} {client.LastName}</p>
                  <p className="text-xs text-gray-500">{client.EmailID}</p>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </button>
            ))}
          </div>
        </div>

        <MobileAdminNav />
      </div>
    );
  }

  // ── Main content ───────────────────────────────────────────────────────────

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b z-50 flex items-center justify-center px-4">
        <h1 className="font-bold text-lg text-gray-900">FitwithPKAdmin</h1>
      </header>

      <div className="min-h-screen bg-gray-50 pb-24 mt-14">
        {/* Page header */}
        <div className="bg-white border-b px-4 pt-4 pb-0">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setSelectedClient(null)} className="p-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
              <Target className="text-white" size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 truncate">{selectedClient.FirstName} {selectedClient.LastName}</p>
              <p className="text-xs text-gray-500 truncate">{selectedClient.EmailID}</p>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-violet-600 text-violet-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 space-y-4">

          {/* ── Analytics Tab ─────────────────────────────────────────────── */}
          {activeTab === "analytics" && (
            <div className="space-y-4">
              {/* Client selector for analytics */}
              <div className="bg-white rounded-xl border p-4">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Client</label>
                <select
                  value={analyticsClient}
                  onChange={e => setAnalyticsClient(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                  {UserList?.map(c => (
                    <option key={c.IdUser} value={c.IdUser}>{c.FirstName} {c.LastName}</option>
                  ))}
                </select>
              </div>

              {/* Week navigation */}
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-gray-800">Weekly Progress</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => shiftWeek(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                      <ChevronLeft size={18} className="text-gray-600" />
                    </button>
                    <span className="text-xs font-medium text-gray-700 min-w-[110px] text-center">
                      {format(new Date(startDate), "MMM dd")} – {format(new Date(endDate), "dd, yyyy")}
                    </span>
                    <button onClick={() => shiftWeek(1)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                      <ChevronRight size={18} className="text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Date picker */}
                <div className="flex items-center justify-center gap-2 py-1 mb-4">
                  <Calendar size={14} className="text-gray-400" />
                  <span className="text-xs text-gray-400">Pick a date:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => {
                      const d = new Date(e.target.value);
                      const end = new Date(d.getTime() + 6 * 24 * 60 * 60 * 1000);
                      setStartDate(e.target.value);
                      setEndDate(end.toISOString().split("T")[0]);
                    }}
                    className="text-xs px-2 py-1 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-400"
                  />
                </div>

                {/* Metric pills */}
                <div className="flex justify-center mb-4">
                  <div className="flex bg-gray-100 rounded-lg p-1 gap-0.5">
                    {METRICS.map(m => (
                      <button
                        key={m.key}
                        onClick={() => setSelectedMetric(m.key)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                          selectedMetric === m.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {m.icon} {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bar chart */}
                <div className="h-64 relative bg-gray-50 rounded-lg overflow-hidden">
                  {/* Grid lines */}
                  {[25, 50, 75, 100].map(pct => (
                    <div
                      key={pct}
                      className="absolute left-0 right-0 border-t border-gray-200"
                      style={{ bottom: `calc(${pct * 0.8}% + 2.5rem)` }}
                    >
                      <span className="absolute -top-3 left-1 text-[10px] text-gray-300">{pct}%</span>
                    </div>
                  ))}

                  {chartData.slice(0, 7).map((data, index) => {
                    const pct = Number(data[selectedMetric]) || 0;
                    return (
                      <div
                        key={data.WeekDay}
                        className="absolute bottom-10"
                        style={{ left: `${index * 12 + 5}%`, height: `${pct * 0.8}%`, width: "8%", backgroundColor: currentMetric.color, borderRadius: "4px 4px 0 0", transition: "height 0.3s ease" }}
                      >
                        <div className="absolute -bottom-7 text-center w-full text-[10px] text-gray-500">{data.WeekDay}</div>
                        {pct > 0 && (
                          <div className="absolute -top-5 text-center w-full text-[10px] font-semibold" style={{ color: currentMetric.color }}>
                            {Math.round(pct)}%
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weekly summary */}
              <div className="bg-white rounded-xl border p-4">
                <WeeklySummary
                  selectedMetric={selectedMetric}
                  weeklyData={chartData}
                  currentMetric={currentMetric}
                />
              </div>
            </div>
          )}

          {/* ── Targets Tab ───────────────────────────────────────────────── */}
          {activeTab === "targets" && (
            <div className="space-y-4">
              <TargetSlider
                label="Daily Steps"
                emoji="👟"
                value={targets.steps}
                min={5000} max={20000} step={500}
                unit="steps"
                color="#3B82F6"
                bgColor="bg-blue-100"
                onChange={v => setTargets(p => ({ ...p, steps: v }))}
              />
              <TargetSlider
                label="Water Intake"
                emoji="💧"
                value={targets.water}
                min={1} max={5} step={0.1}
                unit="liters"
                color="#06B6D4"
                bgColor="bg-cyan-100"
                onChange={v => setTargets(p => ({ ...p, water: v }))}
                format={v => v.toFixed(1)}
              />
              <TargetSlider
                label="Sleep Goal"
                emoji="😴"
                value={targets.sleep}
                min={6} max={10} step={0.5}
                unit="hours"
                color="#8B5CF6"
                bgColor="bg-purple-100"
                onChange={v => setTargets(p => ({ ...p, sleep: v }))}
                format={v => v.toFixed(1)}
              />

              {/* Coach notes in targets */}
              <div className="bg-white rounded-xl border p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">💬</span>
                  <p className="font-semibold text-gray-800">Coach Notes</p>
                </div>
                <textarea
                  rows={3}
                  value={coachFeedback}
                  onChange={e => setCoachFeedback(e.target.value)}
                  placeholder="Add feedback and recommendations…"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              <button
                onClick={handleSaveTargets}
                disabled={isSaving}
                className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                  saved
                    ? "bg-green-500 text-white"
                    : "bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700"
                }`}
              >
                {saved ? <><Check size={18} /> Saved!</> : isSaving ? <span className="animate-pulse">Saving…</span> : <><Save size={18} /> Save Targets</>}
              </button>
            </div>
          )}

          {/* ── Plans Tab ─────────────────────────────────────────────────── */}
          {activeTab === "plans" && (
            <div className="space-y-4">
              <PlanSection
                title="Diet Plans"
                icon={<Utensils size={16} className="text-green-600" />}
                accent="bg-green-600"
                accentBg="bg-green-50"
                accentBorder="border-green-200"
                plans={dietPlans}
                planName={dietPlanName}
                onUpload={() => handleFileUpload("diet")}
                onView={handleViewPDF}
                onDownload={handleDownloadPDF}
                onRemove={id => setDietPlans(p => p.filter(x => x.id !== id))}
              />

              <PlanSection
                title="Workout Plans"
                icon={<Dumbbell size={16} className="text-purple-600" />}
                accent="bg-purple-600"
                accentBg="bg-purple-50"
                accentBorder="border-purple-200"
                plans={workoutPlans}
                planName={workoutPlanName}
                onUpload={() => handleFileUpload("workout")}
                onView={handleViewPDF}
                onDownload={handleDownloadPDF}
                onRemove={id => setWorkoutPlans(p => p.filter(x => x.id !== id))}
              />

              <button
                onClick={handleSavePlans}
                disabled={isSavingPlans}
                className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                  plansSaved
                    ? "bg-green-500 text-white"
                    : "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700"
                }`}
              >
                {plansSaved ? <><Check size={18} /> Saved!</> : isSavingPlans ? <span className="animate-pulse">Saving…</span> : <><Save size={18} /> Save Plans</>}
              </button>
            </div>
          )}

        </div>
      </div>

      <MobileAdminNav />

      {/* PDF Viewer Dialog */}
      <Dialog open={pdfViewerOpen} onOpenChange={setPdfViewerOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{pdfType === "workout" ? "Workout Plan" : "Diet Plan"}</DialogTitle>
            <DialogDescription>
              {pdfType === "workout" ? "Workout Program by Coach" : "Nutrition Guide & Meal Plan by Coach"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto mt-2 mb-4">
            <div className="rounded-md border border-gray-200 bg-gray-50 w-full h-full flex flex-col">
              {pdfUrl ? (
                <Document
                  file={pdfUrl}
                  loading={<div className="flex items-center justify-center p-8 text-gray-500">Loading PDF…</div>}
                  error={<div className="flex items-center justify-center p-8 text-red-500">Failed to load PDF.</div>}
                >
                  <div className="overflow-auto p-2">
                    <Page
                      pageNumber={1}
                      width={Math.min(750, window.innerWidth - 64)}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      className="mx-auto"
                    />
                  </div>
                </Document>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-gray-400">
                  <FileText size={48} className="mb-3" />
                  <p>No PDF available</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex justify-between items-center">
            <span className="text-xs text-gray-400">Last updated: {format(new Date(), "MMMM d, yyyy")}</span>
            <Button onClick={() => setPdfViewerOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../../hooks/use-auth";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Plus, ArrowUpIcon, ChevronRightIcon, Droplet, ActivityIcon, Clock, PencilIcon, FilterIcon, UploadIcon, X, ChevronRight, ChevronLeft, ImageIcon, Footprints, Moon, Scale, StickyNote, Dumbbell, Salad } from "lucide-react";
import { Calendar } from "../../components/ui/calendar";
import { MobileNav } from "../../components/layout/mobile-nav";
import { Button } from "../../components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { useToast } from "../../hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Progress } from "../../components/ui/progress";
/* import { DailyUpdate, BodyMeasurement } from "@shared/schema"; */
import { dailyUpdate, getDailyUpdate, getDailyUpdateForAWeek, getProgressGallery, getSingleDayUpdate, getWeeklyUpdate, weeklyUpdate } from "../../services/UpdateServices";

import { BASE_URL, UNITS, USER_TARGET } from "../../common/Constant";

//import GraphDataChart from "./progressWeeklyChart";

import GraphDataChart from "../admin-side/AdminProgressWeeklyChart";

import { IBodyMeasurement } from '../../interface/IBodyMeasurement'

// ─── Sleep Clock ────────────────────────────────────────────────────────────
function SleepClock({ value, onChange }: { value: number; onChange: (h: number) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<'start' | 'end' | null>(null);
  const cx = 100, cy = 100, R = 80;

  // Digital time state – bedtime default 10 PM, wake default 6 AM
  const [bedtime, setBedtime] = useState('22:00');
  const [waketime, setWaketime] = useState('06:00');

  const snap = (h: number) => Math.round(h * 2) / 2;

  // Minutes since midnight
  const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const minsToTime = (m: number) => {
    const total = ((m % 1440) + 1440) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  };
  const fmt12 = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h < 12 ? 'AM' : 'PM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const durationFromTimes = (bed: string, wake: string) => {
    let diff = toMins(wake) - toMins(bed);
    if (diff <= 0) diff += 1440;
    return snap(Math.min(12, diff / 60));
  };

  // angle on the 12-h clock face for a given time string
  const timeToAngle = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return ((h % 12) / 12 + m / 720) * 360;
  };

  const startAngle = timeToAngle(bedtime);
  const spanDeg   = (value / 12) * 360;
  const endAngle  = (startAngle + spanDeg) % 360;

  const polarToXY = (angleDeg: number) => {
    const a = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  };

  const buildArc = () => {
    if (value <= 0) return '';
    if (spanDeg >= 359.9) {
      const s = polarToXY(startAngle);
      return `M ${s.x} ${s.y} A ${R} ${R} 0 1 1 ${s.x - 0.001} ${s.y}`;
    }
    const start = polarToXY(startAngle);
    const end   = polarToXY(endAngle);
    return `M ${start.x} ${start.y} A ${R} ${R} 0 ${spanDeg > 180 ? 1 : 0} 1 ${end.x} ${end.y}`;
  };

  const angleFromSVG = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    const pt = 'touches' in e ? e.touches[0] : (e as MouseEvent);
    const mx = (pt.clientX - rect.left) * (200 / rect.width) - cx;
    const my = (pt.clientY - rect.top) * (200 / rect.height) - cy;
    let deg = (Math.atan2(my, mx) * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;
    return deg;
  };

  const angleToMins = (ang: number) => Math.round((ang / 360) * 12 * 60 / 30) * 30; // snap to 30 min

  const handleDrag = (e: MouseEvent | TouchEvent) => {
    if (!dragging.current) return;
    e.preventDefault();
    const ang = angleFromSVG(e);
    const dragMins = angleToMins(ang);

    if (dragging.current === 'start') {
      // drag start: keep duration, shift bedtime. Preserve AM/PM from current bedtime.
      const curBedH = parseInt(bedtime.split(':')[0]);
      const isPM = curBedH >= 12;
      const newH = Math.floor(dragMins / 60) % 12 + (isPM ? 12 : 0);
      const newM = dragMins % 60;
      const newBed = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
      setBedtime(newBed);
      // update wake to keep same duration
      const wakeMins = toMins(newBed) + value * 60;
      setWaketime(minsToTime(wakeMins));
    } else {
      // drag end: change wake time → update duration
      const curBedH = parseInt(bedtime.split(':')[0]);
      const isPM_wake = curBedH >= 12 ? false : false; // wake could be AM
      const wakeH = Math.floor(dragMins / 60) % 12;
      const newWakeH = wakeH < (parseInt(bedtime.split(':')[0]) % 12) ? wakeH : wakeH;
      const newWake = `${String(newWakeH).padStart(2, '0')}:${String(dragMins % 60).padStart(2, '0')}`;
      const newWakeFull = minsToTime(toMins(bedtime) + ((dragMins / 60) / 12) * 720);
      setWaketime(newWakeFull);
      const dur = durationFromTimes(bedtime, newWakeFull);
      onChange(dur);
    }
  };

  const startHandleDrag = (handle: 'start' | 'end') => (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    dragging.current = handle;
  };

  useEffect(() => {
    const stop = () => { dragging.current = null; };
    window.addEventListener('mousemove', handleDrag);
    window.addEventListener('mouseup', stop);
    window.addEventListener('touchmove', handleDrag, { passive: false });
    window.addEventListener('touchend', stop);
    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('touchmove', handleDrag);
      window.removeEventListener('touchend', stop);
    };
  });

  const onBedtimeChange = (v: string) => {
    setBedtime(v);
    const dur = durationFromTimes(v, waketime);
    onChange(dur);
  };
  const onWaketimeChange = (v: string) => {
    setWaketime(v);
    const dur = durationFromTimes(bedtime, v);
    onChange(dur);
  };

  const startPos = polarToXY(startAngle);
  const endPos   = polarToXY(endAngle);
  const displayVal = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
  const qualityLabel = value === 0 ? { label: 'Set your sleep', cls: 'text-gray-400' }
    : value < 5  ? { label: 'Too little', cls: 'text-red-500' }
    : value < 7  ? { label: 'Below avg',  cls: 'text-amber-500' }
    : value <= 9 ? { label: 'Good sleep', cls: 'text-indigo-500' }
    :              { label: 'Extra rest', cls: 'text-green-600' };

  const ticks = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 1;
    const deg = (hour / 12) * 360;
    const a = ((deg - 90) * Math.PI) / 180;
    return {
      x1: cx + 76 * Math.cos(a), y1: cy + 76 * Math.sin(a),
      x2: cx + 70 * Math.cos(a), y2: cy + 70 * Math.sin(a),
      lx: cx + 60 * Math.cos(a), ly: cy + 60 * Math.sin(a),
      label: hour,
    };
  });

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Analog clock */}
      <svg ref={svgRef} viewBox="0 0 200 200" width={220} height={220} className="touch-none select-none">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#e5e7eb" strokeWidth={14} className="dark:stroke-gray-700" />
        {value > 0 && <path d={buildArc()} fill="none" stroke="#6366f1" strokeWidth={14} strokeLinecap="round" />}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#9ca3af" strokeWidth={1.5} />
            <text x={t.lx} y={t.ly} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="#9ca3af">{t.label}</text>
          </g>
        ))}
        {/* Start handle */}
        <circle cx={startPos.x} cy={startPos.y} r={10} fill="white" stroke="#6366f1" strokeWidth={3}
          className="cursor-grab" onMouseDown={startHandleDrag('start')} onTouchStart={startHandleDrag('start')} />
        <text x={startPos.x} y={startPos.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize={7} fill="#6366f1" style={{ pointerEvents: 'none' }}>S</text>
        {/* End handle */}
        <circle cx={endPos.x} cy={endPos.y} r={10} fill="#6366f1" stroke="white" strokeWidth={2.5}
          className="cursor-grab" onMouseDown={startHandleDrag('end')} onTouchStart={startHandleDrag('end')} />
        <text x={endPos.x} y={endPos.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize={7} fill="white" style={{ pointerEvents: 'none' }}>E</text>
        {/* Center */}
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize={26} fontWeight={600} fill="currentColor">{displayVal}h</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={10} fill="#9ca3af">sleep</text>
      </svg>

      <span className={`text-xs font-semibold ${qualityLabel.cls}`}>{qualityLabel.label}</span>

      {/* Digital time inputs */}
      <div className="w-full max-w-xs grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center gap-1 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl p-3">
          <span className="text-[10px] font-medium text-indigo-400 uppercase tracking-wide">Bedtime</span>
          <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{fmt12(bedtime)}</span>
          <input
            type="time"
            value={bedtime}
            onChange={e => onBedtimeChange(e.target.value)}
            className="w-full text-xs text-center border border-indigo-200 dark:border-indigo-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
        <div className="flex flex-col items-center gap-1 bg-purple-50 dark:bg-purple-950/30 rounded-xl p-3">
          <span className="text-[10px] font-medium text-purple-400 uppercase tracking-wide">Wake up</span>
          <span className="text-lg font-bold text-purple-700 dark:text-purple-300">{fmt12(waketime)}</span>
          <input
            type="time"
            value={waketime}
            onChange={e => onWaketimeChange(e.target.value)}
            className="w-full text-xs text-center border border-purple-200 dark:border-purple-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-400"
          />
        </div>
      </div>

      {/* Quick presets */}
      <div className="grid grid-cols-4 gap-2 w-full max-w-xs">
        {[5, 6, 7, 8].map(h => (
          <button key={h} type="button"
            onClick={() => { onChange(h); setWaketime(minsToTime(toMins(bedtime) + h * 60)); }}
            className={`py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              value === h
                ? 'bg-indigo-50 border-indigo-400 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-400 dark:text-indigo-300'
                : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400'
            }`}>{h} hrs</button>
        ))}
      </div>
    </div>
  );
}
import moment from 'moment';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { IDailyStats } from "../../interface/IDailyUpdates";
import RatingSmiley from "../../components/ui/rating-smiley";
import { calculatePercentage } from "../../lib/utils";

import { setBaseUrl } from "../../services/HttpService"
import { IStudentGallery } from "../../interface/IStudentGallery";
import { useTheme } from "next-themes";



const dailyUpdateSchema = z.object({
  Steps: z.coerce.number().min(0).max(100000).optional(),
  Water: z.coerce.number().min(0).max(10).optional(),
  Weight: z.coerce.number().min(20).max(300).optional(),
  Sleep: z.coerce.number().min(0).max(24).optional(),
  Diet_Follow: z.coerce.number().min(0).max(5).optional(),
  WorkOut: z.coerce.number().min(0).max(5).optional(),
  Notes: z.string().optional()
});

type DailyUpdateFormValues = z.infer<typeof dailyUpdateSchema>;

// MeasurementItem component from Progress page
interface MeasurementItemProps {
  title: string;
  startValue: number;
  currentValue: number;
  change: number;
  progressPercent: number;
}

function MeasurementItem({ title, startValue, currentValue, change, progressPercent }: MeasurementItemProps) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-800 dark:text-gray-200">{title}</h4>
        <span className={`text-xs ${change <= 0 ? 'text-secondary-700 bg-secondary-100' : 'text-red-700 bg-red-100'} py-1 px-2 rounded`}>
          {change === 0 ? '±0' : change > 0 ? `+${change}` : change}cm
        </span>
      </div>
      <Progress value={progressPercent} className="h-2" />
      <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
        <span>Start: {startValue}cm</span>
        <span>Current: {currentValue}cm</span>
      </div>
    </div>
  );
}

export default function UpdatesPage() {
  const [showForm, setShowForm] = useState(false);
  const [showMeasurementForm, setShowMeasurementForm] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [lastSaved, setLastSaved] = useState<DailyUpdateFormValues | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [measurementForm, setMeasurementForm] = useState({
    Waist: '',
    Chest: '',
    BodyHip: '',
    Weight: '',
    BodyFat: '',
    Neck: '',
    Quadriceps: '',
    UpperArm: '',
    Notes:''
  });
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  //const [selectedDate, setSelectedDate] = useState<string>(new Date().toDateString());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [files, setFiles] = useState<File[]>([])

  const currentDate = new Date();

  const { theme, setTheme } = useTheme();

  console.log(theme);

  // For photo functionality
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  // Type for photos
  type Photo = {
    id: number;
    date: string;
    url: string | null;
  };

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);

  /**
     * author : basil1112
     * set up base url
     */
  useEffect(() => {
    setBaseUrl(BASE_URL);
  }, []);

  useEffect(() => {
    console.log("hello", selectedDate);
  }, [selectedDate])

  /**
   * handle file change 
   * event used at the time of file upload
   * important 
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray: File[] = Array.from(files);
    setFiles(fileArray);

    const newImages: string[] = [];
    let filesProcessed = 0;

    fileArray.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageDataUrl = e.target?.result as string;
        newImages.push(imageDataUrl);
        filesProcessed++;

        if (filesProcessed === fileArray.length) {
          setUploadedImages(prev => [...prev, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
  };

  /**
   * author : basil1112
   * File upload API call 
   */
  const handleSaveImages = () => {
    if (uploadedImages.length > 0) {
      //const today = new Date();
      // const dateString = `${today.toLocaleString('default', { month: 'short' })} ${today.getDate()}`;
      //api calling for saving photos to gallery
      if (uploadedImages?.length) {
        const formdata = new FormData()
        for (let x = 0; x < files?.length; x++) {
          formdata.append("WeeklyFile", files![x]);
        }
        const id = measurements![0]?.IdWeeklyStats;
        formdata.append("IdWeeklyStats", "" + id);
        updateMeasurements(formdata)
      }
      // Reset state
      setUploadedImages([]);
      setShowUploadDialog(false);
    }
  };



  // Fetch user's body measurements
  const { data: measurements } = useQuery<IBodyMeasurement[]>({
    queryKey: ["weekly-updates"],
    queryFn: () => getWeeklyUpdate({ 'limited': true }).then((res: ApiResponse<IBodyMeasurement[]>) => res.data.data)
  });

  const { data: galleryDetails } = useQuery<IStudentGallery[]>({
    queryKey: ["gallery-updates"],
    queryFn: () => getProgressGallery(null).then((res: ApiResponse<IStudentGallery[]>) => res.data.data),
  });

  /**
 * author : basil1112
 * fetch daily updates for this weeek 
 */
  const { data: dailyUpdatesForWeek = [] } = useQuery<IDailyStats[]>({
    queryKey: ["daily-updates-forweek"],
    queryFn: () => getDailyUpdateForAWeek({ Day: moment(currentDate).format("DD-MM-YYYY") }).then((res: ApiResponse<IDailyStats[]>) => res.data.data)
  });


  let weeklyData: IDailyStats[] = [
    { WeekDay: "Mon" },
    { WeekDay: "Tue" },
    { WeekDay: "Wed" },
    { WeekDay: "Thu" },
    { WeekDay: "Fri" },
    { WeekDay: "Sat" },
    { WeekDay: "Sun" },
  ];

  weeklyData = dailyUpdatesForWeek.map((element: IDailyStats, index: number) => {
    return {
      ...weeklyData[index],
      ...element,
      Steps_Percent: calculatePercentage(Number(element.Steps), USER_TARGET.DAILY_TARGET.STEPS),
      Sleep_Percent: calculatePercentage(Number(element.Sleep), USER_TARGET.DAILY_TARGET.SLEEP),
      Water_Percent: calculatePercentage(Number(element.Water), USER_TARGET.DAILY_TARGET.WATER),
    };
  });

  const weekTotals: IDailyStats = {
    WeekDay: "Total",
    Steps: dailyUpdatesForWeek.reduce((sum, day) => sum + Number(day.Steps || 0), 0),
    Water: dailyUpdatesForWeek.reduce((sum, day) => sum + Number(day.Water || 0), 0),
    Sleep: dailyUpdatesForWeek.reduce((sum, day) => sum + Number(day.Sleep || 0), 0),
  };

  // Now TypeScript knows weeklyData is an array of IWeeklyData
  weeklyData.push(weekTotals);



  useEffect(() => {

    if (!galleryDetails || galleryDetails.length === 0) return;

    if (galleryDetails) {

      const allPhotos: Photo[] = galleryDetails?.reduce((photos: Photo[], item: IStudentGallery) => {
        if (!item.FileName) return photos;

        const files = item.FileName
          .map(f => f.trim())
          .filter(Boolean);

        if (files.length === 0) return photos;

        const [day, month, year] = item.DateRange.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const dateLabel = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });

        return [
          ...photos,
          ...files.map((file, index) => ({
            id: date.getTime() + index, // Using timestamp + index for unique ID
            date: dateLabel,
            url: `${BASE_URL}/uploads/weekly/${file}`
          }))
        ];
      }, [] as Photo[]) || [];

      setAllPhotos(allPhotos);

    }

  }, [galleryDetails]);




  const { data: currentDayUpdates = [] } = useQuery<IDailyStats[]>({
    queryKey: ["currentday-updates"],
    queryFn: async () => {
      try {
        const res = await getSingleDayUpdate({ Day: moment(currentDate).format("DD-MM-YYYY") });
        if (res?.data?.data?.length > 0) {
          const updates = res.data.data[0];
          form.reset({
            Steps: updates.Steps ?? undefined,
            Water: updates.Water ?? undefined,
            Weight: updates.Weight ?? undefined,
            Sleep: updates.Sleep ?? undefined,
            Diet_Follow: updates.Diet_Follow ?? undefined,
            WorkOut: updates.WorkOut ?? undefined,
            Notes:updates.Notes ?? undefined
          });
          return [updates]; // Wrap in array to match IDailyStats[]
        }
        return []; // Return empty array instead of null
      } catch (error) {
        console.error(error);
        return []; // Return empty array on error
      }
    },
  });


  const { mutate: updateMeasurements } = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await weeklyUpdate(formData);
      if (!res.data?.success) {
        throw new Error(res.data?.message || "Failed to save weekly measurements");
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-updates"] });
      // The trend chart (GraphDataChart) reads weekly measurements under this
      // key — it must also be invalidated or it keeps showing stale data.
      queryClient.invalidateQueries({ queryKey: ["daily-updates"] });
      setShowMeasurementForm(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });


  const addUpdateBodyMeasurementWeekly = () => {
    const formdata = new FormData()

    // BodyFat is calculated server-side (using the profile height on file),
    // so the client no longer computes or sends it here.
    formdata.append("DateRange", `${moment(selectedDate).format("YYYY-MM-DD")}`);
    formdata.append("Weight", measurementForm.Weight);
    formdata.append("Waist", measurementForm.Waist);
    formdata.append("Neck", measurementForm.Neck);
    formdata.append("Chest", measurementForm.Chest);
    formdata.append("UpperArm", measurementForm.UpperArm);
    formdata.append("Quadriceps", measurementForm.Quadriceps);
    formdata.append("BodyHip", measurementForm.BodyHip);
    formdata.append("Notes",measurementForm.Notes);
    updateMeasurements(formdata)
  }


  // Current weight and body fat from latest measurement
  const latestMeasurement = measurements && measurements.length > 0
    ? measurements[0] //basil index 0 since from api we are getting last value
    : null;

  // Previous weight and body fat for comparison
  const previousMeasurement = measurements && measurements.length > 1
    ? measurements[1] //basil index 1 since from api we are getting last value
    : null;

  // Calculate changes
  const weightChange = (() => {
    if (!latestMeasurement || !previousMeasurement) return 0;
    if (latestMeasurement.Weight == null || previousMeasurement.Weight == null) return 0;
    return Number((latestMeasurement.Weight - previousMeasurement.Weight).toFixed(1));
  })();

  const bodyFatChange = (() => {
    if (!latestMeasurement || !previousMeasurement) return 0;
    if (latestMeasurement.BodyFat == null || previousMeasurement.BodyFat == null) return 0;
    return Number((latestMeasurement.BodyFat - previousMeasurement.BodyFat).toFixed(1));
  })();

  // Form setup
  const form = useForm<DailyUpdateFormValues>({
    resolver: zodResolver(dailyUpdateSchema),
    defaultValues: {
      Steps: undefined,
      Water: undefined,
      Weight: undefined,
      Sleep: undefined,
      Diet_Follow: undefined,
      WorkOut: undefined,
      Notes:undefined
    },
  });

  useEffect(() => {
    const handleOpenForm = () => {
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('open-update-form', handleOpenForm);

    // Auto-fill form with data from home page
    const waterAmount = localStorage.getItem('waterAmount');
    const stepsAmount = localStorage.getItem('stepsAmount');
    const sleepAmount = localStorage.getItem('sleepAmount');
    const workoutCompleted = localStorage.getItem('workoutCompleted');

    if (waterAmount) form.setValue('Water', parseFloat(waterAmount));
    if (stepsAmount) form.setValue('Steps', parseInt(stepsAmount));
    if (sleepAmount) form.setValue('Sleep', parseFloat(sleepAmount));
    if (workoutCompleted === 'true') form.setValue('WorkOut', 0);

    return () => {
      window.removeEventListener('open-update-form', handleOpenForm);
    };
  }, [form]);


  const { data: fetchedUpdates = [] } = useQuery<IDailyStats[]>({
    queryKey: ["daily-updates"],
    queryFn: () => getDailyUpdate().then(res => (res as ApiResponse<IDailyStats[]>).data.data)
  });


  // Use fetched data if available, otherwise use mock data
  const dailyUpdates = fetchedUpdates.length > 0 ? fetchedUpdates : [];

  // Sort updates by date (newest first)
  const sortedUpdates = [...dailyUpdates].sort((a, b) => {
    const dateA = a.DayDate ? new Date(a.DayDate) : new Date();
    const dateB = b.DayDate ? new Date(b.DayDate) : new Date();
    return dateB.getTime() - dateA.getTime();
  });

  const mutation = useMutation({
    mutationFn: async (data: DailyUpdateFormValues) => {
      // Transform string enum values to boolean and validate all fields present

      console.log("datea", selectedDate);

      const transformedData = {
        Steps: data.Steps || null,
        Water: data.Water || null,
        Weight: data.Weight || null,
        Sleep: data.Sleep || null,
        Diet_Follow: data.Diet_Follow,
        WorkOut: data.WorkOut,
        Day: moment(selectedDate).format("DD-MM-YYYY"),
        Notes:data.Notes || null
      };

      console.log("Submitting data:", transformedData);

      const res = await dailyUpdate(transformedData);
      if (!res.data?.success) {
        throw new Error(res.data?.message || "Failed to log your updates");
      }
      return res;
    },
    onSuccess: (_, submitted) => {
      queryClient.invalidateQueries({ queryKey: ["daily-updates"] });
      setLastSaved(submitted);
      form.reset();
      setShowForm(false);
      setShowNotes(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to log your updates. Please try again." + error,
        variant: "destructive",
      });
    },
  });


  const renderGalleryProgressFunction = ({ showAll = false } = {}) => {
    if (allPhotos.length === 0) return null;
    // Determine which photos to show based on mode
    const photosToShow = showAll ? allPhotos : allPhotos.slice(0, 3);

    return photosToShow.map((photo) => (
      <div
        key={photo.id}
        className={`aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 relative cursor-pointer ${showAll ? 'transform transition-transform hover:scale-105' : ''
          }`}
        onClick={() => {
          setSelectedPhoto(photo.url);
          setShowPhotoGallery(false);
          setShowPhotoPreview(true);
        }}
      >
        <img
          src={photo.url ? photo.url : ""}
          alt={`Progress photo ${photo.date}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className={`absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 ${showAll ? 'py-2 px-3' : 'py-1 px-2'
          }`}>
          <span className={`text-${showAll ? 'sm' : 'xs'} text-white`}>
            {photo.date}
          </span>
        </div>
      </div>
    ));
  };

  //todo
  const renderMeasurementBar = () => {
    // Get first (oldest) and last (newest) measurements
    const firstMeasurement = measurements![measurements!.length - 1];
    const lastMeasurement = measurements![0];

    console.log(firstMeasurement);
    console.log(lastMeasurement);

    // Helper function to calculate change and progress percentage
    const getChangeDetails = (firstVal: number, lastVal: number) => {
      const change = lastVal - firstVal;
      const progressPercent = ((firstVal - lastVal) / firstVal) * 100; // % change (positive = improvement)
      return { change, progressPercent };
    };

    return (
      <>
        <MeasurementItem
          title="Weight"
          startValue={firstMeasurement.Weight!}
          currentValue={lastMeasurement.Weight!}
          {...getChangeDetails(firstMeasurement.Weight!, lastMeasurement.Weight!)}
        />
        <MeasurementItem
          title="Waist"
          startValue={firstMeasurement.Waist!}
          currentValue={lastMeasurement.Waist!}
          {...getChangeDetails(firstMeasurement.Waist!, lastMeasurement.Waist!)}
        />
        <MeasurementItem
          title="Body Fat %"
          startValue={firstMeasurement.BodyFat!}
          currentValue={lastMeasurement.BodyFat!}
          {...getChangeDetails(firstMeasurement.BodyFat!, lastMeasurement.BodyFat!)}
        />
        <MeasurementItem
          title="Neck"
          startValue={firstMeasurement.Neck!}
          currentValue={lastMeasurement.Neck!}
          {...getChangeDetails(firstMeasurement.Neck!, lastMeasurement.Neck!)}
        />
        <MeasurementItem
          title="Chest"
          startValue={firstMeasurement.Chest!}
          currentValue={lastMeasurement.Chest!}
          {...getChangeDetails(firstMeasurement.Chest!, lastMeasurement.Chest!)}
        />
        <MeasurementItem
          title="Upper Arm"
          startValue={firstMeasurement.UpperArm!}
          currentValue={lastMeasurement.UpperArm!}
          {...getChangeDetails(firstMeasurement.UpperArm!, lastMeasurement.UpperArm!)}
        />
        <MeasurementItem
          title="Quadriceps"
          startValue={firstMeasurement.Quadriceps!}
          currentValue={lastMeasurement.Quadriceps!}
          {...getChangeDetails(firstMeasurement.Quadriceps!, lastMeasurement.Quadriceps!)}
        />
      </>
    );
  };

  /**
   * Method list the daily updates
   * @author basil1112
   */
  const renderDailyUpdatesList = () => {
    return (<>
      {sortedUpdates.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500 dark:text-gray-400">No daily updates logged yet.</p>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Tap the + button below to add one.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* //looops */}
          {sortedUpdates.map((update, index) => {
            const dayNumber = sortedUpdates.length - index;
            // Format the date properly
            const formattedDate = moment(update.DayDate, "DD-MM-YYYY").format("ddd, MMM D");
            return (
              <Card key={index} className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
                <CardContent className="p-5">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {formattedDate}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Day {dayNumber}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700" onClick={() => {
                      if (update.DayDate) {
                        const dateParts = update.DayDate.split('-');
                        if (dateParts.length === 3) {
                          const day = parseInt(dateParts[0], 10);
                          const month = parseInt(dateParts[1], 10) - 1;
                          const year = parseInt(dateParts[2], 10);
                          const date = new Date(year, month, day);
                          setSelectedDate(date);
                        }
                      }
                      form.reset({
                        Steps: update.Steps ?? undefined,
                        Water: update.Water ?? undefined,
                        Weight: update.Weight ?? undefined,
                        Sleep: update.Sleep ?? undefined,
                        Diet_Follow: update.Diet_Follow ?? undefined,
                        WorkOut: update.WorkOut ?? undefined,
                      });
                      setShowForm(true);
                    }}>
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
                        <Footprints className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Steps</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{update.Steps || '-'}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center mr-3">
                        <Droplet className="h-4 w-4 text-sky-500 dark:text-sky-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Water</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{update.Water ? `${update.Water} L` : '-'}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mr-3">
                        <Moon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Sleep</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{update.Sleep ? `${update.Sleep} hrs` : '-'}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mr-3">
                        <Scale className="h-4 w-4 text-rose-500 dark:text-rose-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Weight</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{update.Weight ? `${update.Weight} kg` : '-'}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-3">
                        <Salad className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Diet follow</p>
                        <div className={`font-medium ${update.Diet_Follow == 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {typeof update.Diet_Follow === 'number' && update.Diet_Follow > 0 && (
                            <RatingSmiley rating={update.Diet_Follow} />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mr-3">
                        <Dumbbell className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Workout</p>
                        <div className={`font-medium ${update.WorkOut ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {typeof update.WorkOut === 'number' && update.WorkOut > 0 && (
                            <RatingSmiley rating={update.WorkOut} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {update.Notes && update.Notes.trim() !== "" && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{update.Notes}</p>
                    </div>
                  )}

                </CardContent>
              </Card>
            );
          })}


        </div>
      )}
    </>)
  }

  function onSubmit(data: DailyUpdateFormValues) {
    console.log("on submit reached");
    mutation.mutate(data);
  }

  // Photo upload handlers
  const handleUploadPhoto = () => {
    setUploadedImages([]);
    setShowUploadDialog(true);
  };

  const [activeView, setActiveView] = useState<"daily" | "weekly">("daily");

  const addUpdateShowView = () => {
    if (activeView === "daily") {
      setShowForm(!showForm)
    } else {
      setShowMeasurementForm(true)
    }

  }


  //for rendering the bar charts
  type MetricKey = 'Steps_Percent' | 'Sleep_Percent' | 'Water_Percent';

  const renderBarChart = (
    weeklyData: IDailyStats[],
    metricKey: MetricKey,
    color: string = '#4f46e5',
    label: string = 'Value'
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
                toast({
                  title: `${data.WeekDay} ${label}`,
                  description: `${Math.round(percent)}% of goal`,
                })
              }
              style={{
                left: `${index * 12 + 5}%`,
                height: `${percent * 0.8}%`,
                width: '8%',
                backgroundColor: color,
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

  console.log(">>>>HERE ", selectedDate);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="flex-shrink-0 bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Updates</h1>
              <p className="text-xs text-blue-200">{selectedDate!.toDateString()}</p>
            </div>
            <Button
              onClick={() => {
                setIsEditing(false);
                setEditingItemId(null);
                addUpdateShowView();
              }}
              variant="outline" size="sm"
              className="bg-white/15 border-white/30 text-white hover:bg-white/25 text-xs backdrop-blur-sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Update
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <Tabs value={activeView} onValueChange={(val) => setActiveView(val as "daily" | "weekly")}>
              <TabsList className="grid w-40 grid-cols-2 bg-white/20">
                <TabsTrigger value="daily" className="text-white data-[state=active]:bg-white data-[state=active]:text-blue-700 text-xs">Daily</TabsTrigger>
                <TabsTrigger value="weekly" className="text-white data-[state=active]:bg-white data-[state=active]:text-blue-700 text-xs">Weekly</TabsTrigger>
              </TabsList>
            </Tabs>
            <button
              onClick={() => setShowCalendar(true)}
              className="flex items-center justify-center rounded-full w-9 h-9 bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <CalendarIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Calendar popup */}
      {showCalendar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">Select Date</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCalendar(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={moment(selectedDate).toDate()}
                onSelect={(date: Date | undefined) => {
                  if (date) {
                    setSelectedDate(date);
                    setShowCalendar(false);
                  }
                }}
                className="rounded-md border w-full"
              />
            </CardContent>
          </Card>
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-4 py-6 pb-28 sm:px-6 bg-gray-50 dark:bg-gray-950 relative">
        {activeView === "weekly" ? (
          <div className="pb-16">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Weekly Progress</h2>
            </div>

            {/* Empty section for spacing only */}
            <div className="mb-6"></div>

            {/* Progress Highlights */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Current Weight</p>
                    <span className={`text-xs ${weightChange <= 0 ? 'text-red-700 bg-red-100' : 'text-secondary-700 bg-secondary-100'} py-1 px-2 rounded`}>
                      {weightChange === 0 ? '±0' : weightChange > 0 ? `+${weightChange}` : weightChange}kg
                    </span>
                  </div>
                  <div className="flex items-end">
                    <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{latestMeasurement?.Weight || "--"}</span>
                    <span className="ml-1 text-gray-500 dark:text-gray-400 text-sm mb-1">kg</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Body Fat</p>
                    <span className={`text-xs ${bodyFatChange <= 0 ? 'text-red-700 bg-red-100' : 'text-secondary-700 bg-green-100'} py-1 px-2 rounded`}>
                      {bodyFatChange === 0 ? '±0' : bodyFatChange > 0 ? `+${bodyFatChange}` : bodyFatChange}%
                    </span>
                  </div>
                  <div className="flex items-end">
                    <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{latestMeasurement?.BodyFat || "--"}</span>
                    <span className="ml-1 text-gray-500 dark:text-gray-400 text-sm mb-1">%</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:border-gray-800">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Waist-Hip Ratio</p>
                  <div className="flex items-end">
                    <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {latestMeasurement?.Waist && latestMeasurement?.BodyHip
                        ? (latestMeasurement.Waist / latestMeasurement.BodyHip).toFixed(2)
                        : "--"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:border-gray-800">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">BMR</p>
                  <div className="flex items-end">
                    <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{latestMeasurement?.BMR ?? "--"}</span>
                    <span className="ml-1 text-gray-500 dark:text-gray-400 text-sm mb-1">cal/day</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:border-gray-800">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">TDEE</p>
                  <div className="flex items-end">
                    <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{latestMeasurement?.TDEE ?? "--"}</span>
                    <span className="ml-1 text-gray-500 dark:text-gray-400 text-sm mb-1">cal/day</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/*Graph Data Details */}
            {/*   <GraphDataChart selectedDate={selectedDate} /> */}

            <GraphDataChart selectedDate={selectedDate} darkMode={theme == "dark" ? true : false} />


            {/* Body Measurements */}
            {/*       <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:border-gray-800 overflow-hidden mb-6">
              <CardHeader className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-medium text-gray-800 dark:text-gray-200">Body Measurements</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="link"
                    className="text-primary-600 text-sm p-0 h-auto flex items-center"
                    onClick={() => {
                      setIsEditing(false);
                      setEditingItemId(null);
                      setShowMeasurementForm(true);
                    }}
                  >
                    <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Add New
                  </Button>
                  {measurements && measurements.length > 0 && (
                    <Button
                      variant="link"
                      className="text-blue-600 text-sm p-0 h-auto flex items-center"
                      onClick={() => {
                        if (latestMeasurement) {
                          setIsEditing(true);
                          setEditingItemId(latestMeasurement.id);
                          setShowMeasurementForm(true);
                        }
                      }}
                    >
                      <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11 4H4C3.44772 4 3 4.44772 3 5V20C3 20.5523 3.44772 21 4 21H19C19.5523 21 20 20.5523 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M18.5 2.5C18.7761 2.22386 19.1228 2.07164 19.4885 2.00689C19.8541 1.94214 20.2322 1.96712 20.5844 2.08028C20.9366 2.19344 21.2515 2.39066 21.4945 2.65147C21.7375 2.91229 21.9003 3.2309 21.9672 3.57659C22.034 3.92228 22.0027 4.28037 21.8777 4.61096C21.7526 4.94155 21.5382 5.23511 21.2626 5.45683C20.987 5.67854 20.6501 5.82249 20.2902 5.87533C19.9303 5.92818 19.5629 5.88771 19.22 5.76L15.76 9.22L14.78 8.24L18.24 4.78C18.1123 4.4371 18.0718 4.0697 18.1247 3.70982C18.1775 3.34994 18.3215 3.01302 18.5432 2.73743C18.7649 2.46184 19.0585 2.24746 19.3891 2.12239C19.7197 1.99732 20.0778 1.96605 20.4235 2.03292C20.7692 2.09979 21.0878 2.26255 21.3486 2.50557C21.6094 2.74858 21.803 3.06233 21.9 3.40881" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Edit Latest
                    </Button>
                  )}
                </div>
              </CardHeader>

              <div className="divide-y divide-gray-100 h-full max-h-64 overflow-scroll">

                {renderMeasurementBar()}

              </div>
            </Card> */}

            {/* Progress Photos */}
            <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:border-gray-800 overflow-hidden mb-6">
              <CardHeader className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-medium text-gray-800 dark:text-gray-200">Progress Photos</CardTitle>
                <Button
                  variant="link"
                  className="text-primary-600 text-sm p-0 h-auto flex items-center"
                  onClick={handleUploadPhoto}
                >
                  <UploadIcon className="h-4 w-4 mr-1" />
                  Upload
                </Button>
              </CardHeader>

              <CardContent className="p-5">
                <div className="grid grid-cols-3 gap-3">
                  {/* 
                    gallery component rendering
                    only show three files 
                 */}
                  {renderGalleryProgressFunction({ showAll: false })}
                </div>

                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  size="sm"
                  onClick={() => {
                    setShowPhotoGallery(true)
                  }}
                >
                  View All Photos
                </Button>
              </CardContent>


            </Card>


            {/* Weekly Stats Cards moved after Progress Photos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Weekly Step Count */}
              <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-gray-900 dark:text-gray-100">Step Count</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center mb-4">
                    <div className="h-16 w-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-400 mr-4">
                      <ActivityIcon className="h-8 w-8" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{weeklyData.length > 0 ? `${weeklyData[weeklyData.length - 1].Steps} Steps` : ""}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Weekly Total</div>
                    </div>
                    <div className="ml-auto flex items-center text-green-600">
                      <ArrowUpIcon className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">--</span>
                    </div>
                  </div>

                  <div className="relative h-44 w-full">

                    {renderBarChart(weeklyData, 'Steps_Percent', '#4f46e5', 'Steps')}

                  </div>
                </CardContent>
              </Card>

              {/* Weekly Water Intake */}
              <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-gray-900 dark:text-gray-100">Water Intake</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center mb-4">
                    <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mr-4">
                      <Droplet className="h-8 w-8" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{weeklyData.length > 0 ? `${weeklyData[weeklyData.length - 1].Water} Ltr` : ""}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Weekly Total</div>
                    </div>
                    <div className="ml-auto flex items-center text-red-600">
                      <ArrowUpIcon className="h-4 w-4 mr-1 rotate-180" />
                      <span className="text-sm font-medium">--</span>
                    </div>
                  </div>

                  <div className="relative h-44 w-full">

                    {renderBarChart(weeklyData, 'Water_Percent', '#3b82f6', 'Water')}

                  </div>
                </CardContent>
              </Card>

              {/* Weekly Sleep */}
              <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-gray-900 dark:text-gray-100">Sleep Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center mb-4">
                    <div className="h-16 w-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 mr-4">
                      <Clock className="h-8 w-8" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{weeklyData.length > 0 ? `${weeklyData[weeklyData.length - 1].Sleep} Hrs` : ""}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Weekly Total</div>
                    </div>
                    <div className="ml-auto flex items-center text-green-600">
                      <ArrowUpIcon className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">--</span>
                    </div>
                  </div>

                  <div className="relative h-44">
                    {renderBarChart(weeklyData, 'Sleep_Percent', '#10b981', 'Sleep')}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : showMeasurementForm ? (
          <div className="pb-16">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {isEditing ? "Edit Measurements" : "Add New Measurements"}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMeasurementForm(false)}
                className="text-gray-500 dark:text-gray-400"
              >
                Cancel
              </Button>
            </div>

            <div className="space-y-5">
              {/* Measurement Form */}
              <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
                <CardContent className="p-5">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Weight (kg)
                      </label>
                      <Input
                        type="number"
                        placeholder="Enter weight in kg"
                        value={measurementForm.Weight}
                        onChange={(e) => setMeasurementForm({ ...measurementForm, Weight: e.target.value })}
                        min="20"
                        max="300"
                        step="0.1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Body Fat (%)
                      </label>
                      <Input
                        type="number"
                        placeholder="Enter body fat percentage"
                        value={measurementForm.BodyFat}
                        onChange={(e) => setMeasurementForm({ ...measurementForm, BodyFat: e.target.value })}
                        min="1"
                        max="70"
                        step="0.1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Waist (cm)
                      </label>
                      <Input
                        type="number"
                        placeholder="Enter waist measurement"
                        value={measurementForm.Waist}
                        onChange={(e) => setMeasurementForm({ ...measurementForm, Waist: e.target.value })}
                        min="20"
                        max="200"
                        step="0.1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Chest (cm)
                      </label>
                      <Input
                        type="number"
                        placeholder="Enter chest measurement"
                        value={measurementForm.Chest}
                        onChange={(e) => setMeasurementForm({ ...measurementForm, Chest: e.target.value })}
                        min="30"
                        max="200"
                        step="0.1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Hips (cm)
                      </label>
                      <Input
                        type="number"
                        placeholder="Enter hips measurement"
                        value={measurementForm.BodyHip}
                        onChange={(e) => setMeasurementForm({ ...measurementForm, BodyHip: e.target.value })}
                        min="30"
                        max="200"
                        step="0.1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Neck (cm)
                      </label>
                      <Input
                        type="number"
                        placeholder="Enter neck measurement"
                        value={measurementForm.Neck}
                        onChange={(e) => setMeasurementForm({ ...measurementForm, Neck: e.target.value })}
                        min="20"
                        max="100"
                        step="0.1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Thigh (cm)
                      </label>
                      <Input
                        type="number"
                        placeholder="Enter thigh measurement"
                        value={measurementForm.Quadriceps}
                        onChange={(e) => setMeasurementForm({ ...measurementForm, Quadriceps: e.target.value })}
                        min="20"
                        max="100"
                        step="0.1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Biceps (cm)
                      </label>
                      <Input
                        type="number"
                        placeholder="Enter biceps measurement"
                        value={measurementForm.UpperArm}
                        onChange={(e) => setMeasurementForm({ ...measurementForm, UpperArm: e.target.value })}
                        min="15"
                        max="80"
                        step="0.1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  // Save the measurement data
                  toast({
                    title: isEditing ? "Measurement Updated" : "Measurement Added",
                    description: isEditing ? "Your measurements have been updated successfully!" : "Your new measurements have been saved!",
                  });

                  // Reset form and close
                  setMeasurementForm({
                    Waist: '',
                    Chest: '',
                    BodyHip: '',
                    Weight: '',
                    BodyFat: '',
                    Neck: '',
                    Quadriceps: '',
                    UpperArm: '',
                    Notes:''
                  });
                  setShowMeasurementForm(false);
                  setIsEditing(false);
                  setEditingItemId(null);
                }}
              >
                {isEditing ? "Update Measurements" : "Save Measurements"}
              </Button>
            </div>
          </div>
        ) : showForm ? (
          <div className="pb-16">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Add Daily Update</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowForm(false)}
                className="text-gray-500 dark:text-gray-400"
              >
                Cancel
              </Button>
            </div>

            {/* Previous day prefill */}
            {(() => {
              const selectedMs = moment(selectedDate).startOf('day').valueOf();
              const prev = sortedUpdates.find(u => moment(u.DayDate, 'DD-MM-YYYY').startOf('day').valueOf() < selectedMs);
              if (!prev) return null;
              const prevLabel = moment(prev.DayDate, 'DD-MM-YYYY').format('ddd, MMM D');
              return (
                <button
                  type="button"
                  onClick={() => form.reset({
                    Steps: prev.Steps ?? undefined,
                    Water: prev.Water ?? undefined,
                    Weight: prev.Weight ?? undefined,
                    Sleep: prev.Sleep ?? undefined,
                    Diet_Follow: prev.Diet_Follow ?? undefined,
                    WorkOut: prev.WorkOut ?? undefined,
                    Notes: prev.Notes ?? undefined,
                  })}
                  className="w-full mb-4 flex items-center justify-between px-4 py-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Use values from {prevLabel}</span>
                  </div>
                  <span className="text-xs text-blue-500 dark:text-blue-400">Tap to fill</span>
                </button>
              );
            })()}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* Steps */}
                <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex-shrink-0 flex items-center justify-center">
                          <Footprints className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="ml-3 font-medium text-gray-800 dark:text-gray-200">Steps</h3>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Goal: 10,000</div>
                    </div>
                    <FormField
                      control={form.control}
                      name="Steps"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center">
                            <FormControl>
                              <Input type="number" placeholder="Enter steps" min="0" max="100000" className="flex-1" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <span className="ml-3 text-gray-500 dark:text-gray-400">steps</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Water Intake */}
                <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center">
                          <Droplet className="h-4 w-4 text-sky-500 dark:text-sky-400" />
                        </div>
                        <h3 className="ml-3 font-medium text-gray-800 dark:text-gray-200">Water Intake</h3>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Goal: 2.5L</div>
                    </div>
                    <FormField
                      control={form.control}
                      name="Water"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center">
                            <FormControl>
                              <Input type="number" placeholder="Enter water intake" min="0" step="0.1" className="flex-1" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <span className="ml-3 text-gray-500 dark:text-gray-400">liters</span>
                          </div>
                          <FormMessage />
                          {/* Quick add (increments) */}
                          <div className="flex space-x-2 mt-3">
                            <Button size="sm" variant="outline" className="flex-1 text-xs" type="button"
                              onClick={() => form.setValue('Water', parseFloat("" + (field.value || 0)) + 0.25)}>+250ml</Button>
                            <Button size="sm" variant="outline" className="flex-1 text-xs" type="button"
                              onClick={() => form.setValue('Water', (field.value || 0) + 0.5)}>+500ml</Button>
                            <Button size="sm" variant="outline" className="flex-1 text-xs" type="button"
                              onClick={() => form.setValue('Water', (field.value || 0) + 0.75)}>+750ml</Button>
                            <Button size="sm" variant="outline" className="flex-1 text-xs" type="button"
                              onClick={() => form.setValue('Water', (field.value || 0) + 1)}>+1L</Button>
                          </div>
                          {/* Set total */}
                          <div className="flex space-x-2 mt-2">
                            {[1, 1.5, 2, 2.5, 3].map(v => (
                              <button key={v} type="button"
                                onClick={() => form.setValue('Water', v)}
                                className={`flex-1 py-1 text-xs rounded-lg border transition-colors ${Number(field.value) === v ? 'bg-sky-100 border-sky-400 text-sky-700 dark:bg-sky-900/40 dark:border-sky-500 dark:text-sky-300' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                {v}L
                              </button>
                            ))}
                          </div>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Weight */}
                <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
                  <CardContent className="p-5">
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 rounded-full bg-secondary-100 flex-shrink-0 flex items-center justify-center">
                        <Scale className="h-4 w-4 text-rose-500 dark:text-rose-400" />
                      </div>
                      <h3 className="ml-3 font-medium text-gray-800 dark:text-gray-200">Weight</h3>
                    </div>
                    <FormField
                      control={form.control}
                      name="Weight"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center">
                            <FormControl>
                              <Input type="number" placeholder="Enter weight" min="0" step="0.1" className="flex-1" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <span className="ml-3 text-gray-500 dark:text-gray-400">kg</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Sleep */}
                <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
                  <CardContent className="p-5">
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex-shrink-0 flex items-center justify-center">
                        <Moon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h3 className="ml-3 font-medium text-gray-800 dark:text-gray-200">Sleep</h3>
                    </div>
                    <FormField
                      control={form.control}
                      name="Sleep"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <SleepClock value={Number(field.value) || 0} onChange={(h) => field.onChange(h)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Notes – collapsible */}
                {!showNotes ? (
                  <button type="button" onClick={() => setShowNotes(true)}
                    className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 hover:text-amber-500 dark:hover:text-amber-400 transition-colors px-1">
                    <StickyNote className="h-4 w-4" />
                    <span>Add a note <span className="text-xs">(optional)</span></span>
                  </button>
                ) : (
                  <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-amber-100 flex-shrink-0 flex items-center justify-center">
                            <StickyNote className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <h3 className="ml-3 font-medium text-gray-800 dark:text-gray-200">Notes</h3>
                        </div>
                        <button type="button" onClick={() => { setShowNotes(false); form.setValue('Notes', ''); }}
                          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Remove</button>
                      </div>
                      <FormField
                        control={form.control}
                        name="Notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="text" placeholder="How was your day?" className="flex-1 w-full" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Diet Follow */}
                <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-5 pb-3">
                      <div className="flex items-center mb-2">
                        <h3 className="font-medium text-gray-800 dark:text-gray-200">Did you follow your diet plan today?</h3>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Did you follow your planned diet today?</p>
                    </div>
                    <FormField
                      control={form.control}
                      name="Diet_Follow"
                      render={({ field }) => (
                        <FormItem className="mb-0">
                          <FormLabel className="px-5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Diet Adherence (Rate 1-5)
                          </FormLabel>
                          <FormControl>
                            <div className="flex items-center justify-between w-full py-2 px-5 relative">
                              {[1, 2, 3, 4, 5].map((rating) => (
                                <div key={rating} className="flex flex-col items-center" onClick={() => field.onChange(rating)}>
                                  <div className={`cursor-pointer w-10 h-10 rounded-full flex items-center justify-center transition-colors ${Number(field.value) === rating ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${rating === 1 ? 'bg-red-500' : rating === 2 ? 'bg-orange-500' : rating === 3 ? 'bg-yellow-500' : rating === 4 ? 'bg-lime-500' : 'bg-green-500'} ${Number(field.value) === rating ? 'ring-2 ring-offset-2 ring-gray-300 dark:ring-gray-600' : 'opacity-60'}`}>
                                      {rating}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Workout Follow */}
                <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-5 pb-3">
                      <div className="flex items-center mb-2">
                        <h3 className="font-medium text-gray-800 dark:text-gray-200">Did you complete your workout today?</h3>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Did you follow your planned workout routine today?</p>
                    </div>
                    <FormField
                      control={form.control}
                      name="WorkOut"
                      render={({ field }) => (
                        <FormItem className="mb-0">
                          <FormLabel className="px-5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Workout Adherence (Rate 1-5)
                          </FormLabel>
                          <FormControl>
                            <div className="flex items-center justify-between w-full py-2 px-5 relative">
                              {[1, 2, 3, 4, 5].map((rating) => (
                                <div key={rating} className="flex flex-col items-center" onClick={() => field.onChange(rating)}>
                                  <div className={`cursor-pointer w-10 h-10 rounded-full flex items-center justify-center transition-colors ${Number(field.value) === rating ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${rating === 1 ? 'bg-red-500' : rating === 2 ? 'bg-orange-500' : rating === 3 ? 'bg-yellow-500' : rating === 4 ? 'bg-lime-500' : 'bg-green-500'} ${Number(field.value) === rating ? 'ring-2 ring-offset-2 ring-gray-300 dark:ring-gray-600' : 'opacity-60'}`}>
                                      {rating}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <div className="w-100 mt-6 text-center">
                  <Button type="submit" variant="outline" size="sm" className="mr-2 text-xs" disabled={mutation.isPending}>
                    {mutation.isPending ? "Submitting..." : "Submit Update"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Update History</h2>

            {/* Success banner after submit */}
            {lastSaved && (
              <div className="mb-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-semibold text-green-700 dark:text-green-400">Update saved!</span>
                  </div>
                  <button onClick={() => setLastSaved(null)} className="text-green-400 hover:text-green-600 dark:hover:text-green-300 text-xs">Dismiss</button>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {lastSaved.Steps != null && (
                    <div className="flex items-center gap-1.5">
                      <Footprints className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                      <span className="text-xs text-gray-700 dark:text-gray-300">{Number(lastSaved.Steps).toLocaleString()} steps</span>
                    </div>
                  )}
                  {lastSaved.Water != null && (
                    <div className="flex items-center gap-1.5">
                      <Droplet className="h-3.5 w-3.5 text-sky-500 flex-shrink-0" />
                      <span className="text-xs text-gray-700 dark:text-gray-300">{lastSaved.Water} L</span>
                    </div>
                  )}
                  {lastSaved.Sleep != null && (
                    <div className="flex items-center gap-1.5">
                      <Moon className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                      <span className="text-xs text-gray-700 dark:text-gray-300">{lastSaved.Sleep} hrs</span>
                    </div>
                  )}
                  {lastSaved.Weight != null && (
                    <div className="flex items-center gap-1.5">
                      <Scale className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" />
                      <span className="text-xs text-gray-700 dark:text-gray-300">{lastSaved.Weight} kg</span>
                    </div>
                  )}
                  {lastSaved.Diet_Follow != null && (
                    <div className="flex items-center gap-1.5">
                      <Salad className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      <span className="text-xs text-gray-700 dark:text-gray-300">Diet {lastSaved.Diet_Follow}/5</span>
                    </div>
                  )}
                  {lastSaved.WorkOut != null && (
                    <div className="flex items-center gap-1.5">
                      <Dumbbell className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                      <span className="text-xs text-gray-700 dark:text-gray-300">Workout {lastSaved.WorkOut}/5</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {renderDailyUpdatesList()}

          </div>
        )}

        {/* Floating Action Button - only show in daily view */}
        {activeView === "daily" && (
          <Button
            onClick={() => setShowForm(!showForm)}
            className="fixed bottom-20 right-5 w-14 h-14 rounded-full shadow-lg flex items-center justify-center to-primary-600 hover:from-rose-600 hover:to-primary-700 text-white transition-all dark:shadow-lg dark:shadow-rose-500/20 border-2 border-white dark:border-gray-800"
          >
            {showForm ? (
              <Plus className="h-6 w-6 text-white" />
            ) : (
              <Plus className="h-6 w-6 text-white" />
            )}
          </Button>
        )}
        {/* Body Measurement Form Modal */}
        {showMeasurementForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <Card className="w-full max-w-md max-h-[90vh] overflow-auto">
              <CardHeader className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-medium text-gray-800 dark:text-gray-200">Add Body Measurement</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMeasurementForm(false)}
                    className="text-gray-500 dark:text-gray-400 h-8 w-8 p-0"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-5">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Weight (kg)</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="30"
                      max="250"
                      placeholder="78.4"
                      value={measurementForm.Weight}
                      onChange={(e) => setMeasurementForm({ ...measurementForm, Weight: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Waist (cm)</label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="90"
                      value={measurementForm.Waist}
                      onChange={(e) => setMeasurementForm({ ...measurementForm, Waist: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Hip (cm)</label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="97"
                      value={measurementForm.BodyHip}
                      onChange={(e) => setMeasurementForm({ ...measurementForm, BodyHip: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Neck (cm)</label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="41"
                      value={measurementForm.Neck || ''}
                      onChange={(e) => setMeasurementForm({ ...measurementForm, Neck: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Chest (cm)</label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="102.5"
                      value={measurementForm.Chest}
                      onChange={(e) => setMeasurementForm({ ...measurementForm, Chest: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Thigh (cm)</label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="61.5"
                      value={measurementForm.Quadriceps || ''}
                      onChange={(e) => setMeasurementForm({ ...measurementForm, Quadriceps: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Biceps (cm)</label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="34.3"
                      value={measurementForm.UpperArm || ''}
                      onChange={(e) => setMeasurementForm({ ...measurementForm, UpperArm: e.target.value })}
                    />
                  </div>

                  <div className="pt-3 flex justify-end space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowMeasurementForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        console.log("Your body measurement", measurementForm)
                        addUpdateBodyMeasurementWeekly();
                      }}
                    >
                      Save Measurements
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <MobileNav />

      {/* Hidden file input for photo upload */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        multiple
        onChange={handleFileChange}
      />

      {/* Photo Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Upload Progress Photos</DialogTitle>
            <DialogDescription>You can upload multiple photos at once</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {uploadedImages.length > 0 ? (
              <div className="space-y-4">
                {/* Added max height with scrolling for multiple images */}
                <div className={`${uploadedImages.length > 6 ? 'max-h-[50vh] overflow-y-auto pr-2' : ''}`}>
                  <div className="grid grid-cols-2 gap-3">
                    {uploadedImages.map((image, index) => (
                      <div key={index} className="relative aspect-square w-full rounded-md overflow-hidden mb-3">
                        <img
                          src={image}
                          alt={`Progress photo preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 rounded-full"
                          onClick={() => handleRemoveImage(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add More Photos
                </Button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-md p-8 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <ImageIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Click to select photos
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    Supports JPG, PNG, WEBP (multiple photos allowed)
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setUploadedImages([]);
                  setShowUploadDialog(false);
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={uploadedImages.length === 0}
                onClick={handleSaveImages}
              >
                Save Photos
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Gallery Dialog */}
      <Dialog open={showPhotoGallery} onOpenChange={setShowPhotoGallery}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Progress Photo Gallery</DialogTitle>
          </DialogHeader>

          <div className="mt-2 pb-4">
            {/* Fixed height container with scrolling for many photos */}
            <div className="max-h-[65vh] overflow-y-auto pr-2 pb-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">

                {renderGalleryProgressFunction({ showAll: true })}

              </div>

              {photos.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No progress photos yet
                </div>
              )}
            </div>

            {/* Add button to upload more photos */}
            <div className="mt-4 flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPhotoGallery(false);
                  setUploadedImages([]);
                  setShowUploadDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Photos
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Preview Dialog */}
      <Dialog open={showPhotoPreview} onOpenChange={setShowPhotoPreview}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] p-1 overflow-hidden">
          <div className="relative h-full w-full flex items-center justify-center">
            {selectedPhoto && (
              <>
                <img
                  src={selectedPhoto}
                  alt="Progress photo fullsize"
                  className="max-w-full max-h-[80vh] object-contain rounded"
                />

                {/* Previous button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full"
                  onClick={() => {
                    // Find current photo index
                    const currentIndex = allPhotos.findIndex(photo => photo.url === selectedPhoto);
                    if (currentIndex < 0) return;
                    // Find previous photo with a URL
                    let prevIndex = currentIndex;
                    do {
                      prevIndex = (prevIndex - 1 + photos.length) % allPhotos.length;
                      if (allPhotos[prevIndex].url) {
                        setSelectedPhoto(allPhotos[prevIndex].url);
                        break;
                      }
                    } while (prevIndex !== currentIndex);
                  }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                {/* Next button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full"
                  onClick={() => {
                    // Find current photo index
                    const currentIndex = allPhotos.findIndex(photo => {
                      return photo.url === selectedPhoto
                    })
                    if (currentIndex < 0) return;
                    // Find next photo with a URL
                    let nextIndex = currentIndex;
                    do {
                      nextIndex = (nextIndex + 1) % allPhotos.length;
                      if (allPhotos[nextIndex].url) {
                        setSelectedPhoto(allPhotos[nextIndex].url);
                        break;
                      }
                    } while (nextIndex !== currentIndex);
                  }}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}

          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
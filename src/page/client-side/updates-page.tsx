import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Plus, ArrowUpIcon, ChevronRightIcon, Droplet, ActivityIcon, Clock, PencilIcon, FilterIcon, UploadIcon, X, ChevronRight, ChevronLeft, ImageIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
/* import { DailyUpdate, BodyMeasurement } from "@shared/schema"; */
import { dailyUpdate, getDailyUpdate, getDailyUpdateForAWeek, getProgressGallery, getSingleDayUpdate, getWeeklyUpdate, weeklyUpdate } from "../../services/UpdateServices";

import { BASE_URL, UNITS, USER_TARGET } from "../../common/Constant";
import GraphDataChart from "./progressWeeklyChart";
import { IBodyMeasurement } from '../../interface/IBodyMeasurement'
import moment from 'moment';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { IDailyStats } from "@/interface/IDailyUpdates";
import RatingSmiley from "@/components/ui/rating-smiley";
import { calculatePercentage } from "@/lib/utils";

import { setBaseUrl } from "../../services/HttpService"
import { ManageLocalStorage } from "../../services/Localstorage"
import { ILoginUserData } from "@/interface/ILoginUserData";



const dailyUpdateSchema = z.object({
  Steps: z.coerce.number().min(0).max(100000).optional(),
  Water: z.coerce.number().min(0).max(10).optional(),
  Weight: z.coerce.number().min(20).max(300).optional(),
  Sleep: z.coerce.number().min(0).max(24).optional(),
  Diet_Follow: z.coerce.number().min(0).max(5).optional(),
  WorkOut: z.coerce.number().min(0).max(5).optional(),
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
  });
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [files, setFiles] = useState<File[]>([])

  const currentDate = new Date();

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

  const { data: galleryDetails } = useQuery<IBodyMeasurement[]>({
    queryKey: ["gallery-updates"],
    queryFn: () => getProgressGallery(null).then((res: ApiResponse<IBodyMeasurement[]>) => res.data.data),
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

      const allPhotos = galleryDetails.reduce((photos, item) => {
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
          ...files.map(file => ({
            url: `${BASE_URL}/uploads/weekly/${file}`,
            date: dateLabel,
            id: `${file}-${date.getTime()}` // Unique ID for keys
          }))
        ];
      }, []);

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
    mutationFn: (formData: FormData) => weeklyUpdate(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-updates"] });
      setShowMeasurementForm(false);
    }
  });


  const addUpdateBodyMeasurementWeekly = () => {
    const formdata = new FormData()

    const userData: string = ManageLocalStorage.get("userData") || "{}";
    const _userData: ILoginUserData = userData ? JSON.parse(userData) : {};
    const userHeight = JSON.parse(_userData?.info.Attributes).height;
    //todo need to check female or male 
    if (userHeight != undefined) {
      const waistMinusNeck = parseFloat(measurementForm.Waist) - parseFloat(measurementForm.Neck);
      const height = parseFloat(userHeight);
      const bodyFatPercentage = 86.010 * Math.log10(waistMinusNeck / 2.54) - 70.041 * Math.log10(height / 2.54) + 36.76;
      formdata.append("BodyFat", bodyFatPercentage.toFixed(2));
    }

    formdata.append("DateRange", `${moment(selectedDate).format("YYYY-MM-DD")}`);
    formdata.append("Weight", measurementForm.Weight);
    formdata.append("Waist", measurementForm.Waist);
    formdata.append("Neck", measurementForm.Neck);
    formdata.append("Chest", measurementForm.Chest);
    formdata.append("UpperArm", measurementForm.UpperArm);
    formdata.append("Quadriceps", measurementForm.Quadriceps);
    formdata.append("BodyHip", measurementForm.BodyHip);
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

      const transformedData = {
        Steps: data.Steps || null,
        Water: data.Water || null,
        Weight: data.Weight || null,
        Sleep: data.Sleep || null,
        Diet_Follow: data.Diet_Follow,
        WorkOut: data.WorkOut,
        Day: moment(selectedDate).format("DD-MM-YYYY")
      };

      console.log("Submitting data:", transformedData);

      return dailyUpdate(transformedData).then((res) => {

        return res;

      }).catch((error) => {
        return error
      })

    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-updates"] });
      toast({
        title: "Success",
        description: "Your daily updates have been logged",
      });
      form.reset();
      setShowForm(false);
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
                      form.reset({
                        Steps: update.Steps ?? undefined,
                        Water: update.Water ?? undefined,
                        Weight: update.Weight ?? undefined,
                        Sleep: update.Sleep ?? undefined,
                        Diet_Follow: update.Diet_Follow ?? undefined,
                        WorkOut: update.WorkOut ?? undefined,
                      });
                      setShowForm(true);
                    }}  >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
                        <ActivityIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Steps</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{update.Steps || '-'}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
                        <Droplet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Water</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{update.Water ? `${update.Water} L` : '-'}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mr-3">
                        <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Sleep</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{update.Sleep ? `${update.Sleep} hrs` : '-'}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mr-3">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-rose-600 dark:text-rose-400">
                          <path d="M19 5C19 3.9 18.1 3 17 3H7C5.9 3 5 3.9 5 5M19 5V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V5M19 5H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M12 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Weight</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{update.Weight ? `${update.Weight} kg` : '-'}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-3">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-600 dark:text-green-400">
                          <path d="M10 8V16M14 8V16M18 8V16M6 8V16M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
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
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mr-3">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-purple-600 dark:text-purple-400">
                          <path d="M5 9C5 5.13401 8.13401 2 12 2C15.866 2 19 5.13401 19 9V14C19 17.866 15.866 21 12 21C8.13401 21 5 17.866 5 14V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M9 9H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M9 13H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M12 9V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
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
                  {/* Notes section - only show if notes exist */}
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

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 py-4 px-4 sm:px-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Updates</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{format(selectedDate, "EEEE, MMMM d")}</p>
            </div>
            <Button
              onClick={() => {
                setIsEditing(false);
                setEditingItemId(null);
                //form showed based on tab selected daily/weekly
                addUpdateShowView();

              }}
              className="bg-primary-600 hover:bg-primary-700 text-white flex items-center gap-1"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Add Update
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <Tabs value={activeView} onValueChange={(val) => setActiveView(val as "daily" | "weekly")}>
              <TabsList className="grid w-40 grid-cols-2">
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
              </TabsList>
            </Tabs>
            <button
              onClick={() => setShowCalendar(true)}
              className="flex items-center justify-center rounded-full w-9 h-9 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
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
                selected={selectedDate}
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
            </div>

            {/*Graph Data Details */}
            <GraphDataChart selectedDate={selectedDate} />


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

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* Steps */}
                <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex-shrink-0 flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary-600">
                            <path d="M19 5.5C19 6.9 16.7 8 16 8C15.3 8 13 6.9 13 5.5C13 4.1 14.1 3 16 3C17.9 3 19 4.1 19 5.5ZM16 10C16 10 7 10 7 14.5C7 18.5 12 21 16 21C20 21 21 18 21 14.5C21 11 16 10 16 10ZM11 5.5C11 6.9 8.7 8 8 8C7.3 8 5 6.9 5 5.5C5 4.1 6.1 3 8 3C9.9 3 11 4.1 11 5.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
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
                              <Input
                                type="number"
                                placeholder="Enter steps"
                                min="0"
                                max="100000"
                                className="flex-1"
                                {...field}
                                value={field.value ?? ""}
                              />
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
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-600">
                            <path d="M12 2L16 6.5M12 2L8 6.5M12 2V10.5M16 6.5C18.2091 6.5 20 8.29086 20 10.5C20 15 14.5 18.5 12 22C9.5 18.5 4 15 4 10.5C4 8.29086 5.79086 6.5 8 6.5M16 6.5H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
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
                              <Input
                                type="number"
                                placeholder="Enter water intake"
                                min="0"
                                step="0.1"
                                className="flex-1"
                                {...field}
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <span className="ml-3 text-gray-500 dark:text-gray-400">liters</span>
                          </div>
                          <FormMessage />

                          {/* Water quick add buttons */}
                          <div className="flex space-x-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs"
                              type="button"
                              onClick={() => {
                                const currentAmount = field.value || 0;
                                form.setValue('Water', parseFloat("" + currentAmount) + 0.25);
                              }}
                            >
                              +250ml
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs"
                              type="button"
                              onClick={() => {
                                const currentAmount = field.value || 0;
                                form.setValue('Water', currentAmount + 0.5);
                              }}
                            >
                              +500ml
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs"
                              type="button"
                              onClick={() => {
                                const currentAmount = field.value || 0;
                                form.setValue('Water', currentAmount + 0.75);
                              }}
                            >
                              +750ml
                            </Button>
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
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-secondary-600">
                          <path d="M12 9C14.2091 9 16 7.20914 16 5C16 2.79086 14.2091 1 12 1C9.79086 1 8 2.79086 8 5C8 7.20914 9.79086 9 12 9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M3 19C3 14.0294 7.02944 10 12 10C16.9706 10 21 14.0294 21 19V22C21 22.5523 20.5523 23 20 23H4C3.44772 23 3 22.5523 3 22V19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
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
                              <Input
                                type="number"
                                placeholder="Enter weight"
                                min="0"
                                step="0.1"
                                className="flex-1"
                                {...field}
                                value={field.value ?? ""}
                              />
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
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-indigo-600">
                          <path d="M10.5 2C2 2 2 10.5 2 10.5C2 19 10.5 19 10.5 19C19 19 19 10.5 19 10.5M10.5 2C19 2 19 10.5 19 10.5M10.5 2C10.5 2 10.5 6.5 14.5 8.5M19 10.5C19 10.5 14.5 10.5 12.5 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <h3 className="ml-3 font-medium text-gray-800 dark:text-gray-200">Sleep</h3>
                    </div>

                    <FormField
                      control={form.control}
                      name="Sleep"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center">
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Hours of sleep"
                                min="0"
                                max="24"
                                step="0.5"
                                className="flex-1"
                                {...field}
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <span className="ml-3 text-gray-500 dark:text-gray-400">hours</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

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
                                <div
                                  key={rating}
                                  className="flex flex-col items-center"
                                  onClick={() => field.onChange(rating)}
                                >
                                  <div
                                    className={`cursor-pointer w-10 h-10 rounded-full flex items-center justify-center transition-colors ${Number(field.value) === rating ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                                  >
                                    <div
                                      className={`w-8 h-8 rounded-full flex items-center justify-center ${rating === 1 ? 'bg-red-500' :
                                        rating === 2 ? 'bg-orange-500' :
                                          rating === 3 ? 'bg-yellow-500' :
                                            rating === 4 ? 'bg-lime-500' :
                                              'bg-green-500'
                                        } ${Number(field.value) === rating ? 'ring-2 ring-offset-2 ring-gray-300 dark:ring-gray-600' : 'opacity-60'}`}
                                    >
                                      {rating === 1 && (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm2.97 4.43l1.06-1.06 1.06 1.06 1.415-1.414-1.06-1.06 1.06-1.06-1.415-1.416-1.06 1.06-1.06-1.06-1.414 1.415 1.06 1.06-1.06 1.06 1.414 1.415z" />
                                        </svg>
                                      )}
                                      {rating === 2 && (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm8 5H9v2h6v-2z" />
                                        </svg>
                                      )}
                                      {rating === 3 && (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm8 5H9v2h6v-2z" />
                                        </svg>
                                      )}
                                      {rating === 4 && (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm1.146 5.146l1.414 1.414L12 15.12l2.44 2.44 1.414-1.414L12 12.292l-3.854 3.854z" />
                                        </svg>
                                      )}
                                      {rating === 5 && (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '-1px' }}>
                                          <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm4.592 4.295l2.7-4.055 1.416.943-3.85 5.776-3.374-2.7.943-1.176 2.165 1.212z" />
                                        </svg>
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-xs font-medium mt-1">{rating}</span>
                                </div>
                              ))}

                              <div className="absolute bottom-2 right-4">
                                <button
                                  type="button"
                                  className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const infoEl = document.getElementById("diet-rating-info");
                                    if (infoEl) {
                                      // Close any other open popups first
                                      document.getElementById("workout-rating-info")?.classList.add("hidden");
                                      // Toggle this popup
                                      infoEl.classList.toggle("hidden");
                                    }
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-600 dark:text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="16" x2="12" y2="12" />
                                    <line x1="12" y1="8" x2="12.01" y2="8" />
                                  </svg>
                                </button>

                                <div id="diet-rating-info" className="hidden absolute right-0 bottom-8 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 z-50 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                  <div className="flex items-start">
                                    <span className="w-3 h-3 rounded-full bg-red-500 mr-2 mt-1 flex-shrink-0"></span>
                                    <span>1 – Off Plan (Did not follow the diet)</span>
                                  </div>
                                  <div className="flex items-start">
                                    <span className="w-3 h-3 rounded-full bg-orange-500 mr-2 mt-1 flex-shrink-0"></span>
                                    <span>2 – Some Effort (Few healthy choices)</span>
                                  </div>
                                  <div className="flex items-start">
                                    <span className="w-3 h-3 rounded-full bg-yellow-500 mr-2 mt-1 flex-shrink-0"></span>
                                    <span>3 – Partially On Track (Balanced day)</span>
                                  </div>
                                  <div className="flex items-start">
                                    <span className="w-3 h-3 rounded-full bg-lime-500 mr-2 mt-1 flex-shrink-0"></span>
                                    <span>4 – Mostly On Track (Minor deviations)</span>
                                  </div>
                                  <div className="flex items-start">
                                    <span className="w-3 h-3 rounded-full bg-green-500 mr-2 mt-1 flex-shrink-0"></span>
                                    <span>5 – Fully On Track (Perfect adherence)</span>
                                  </div>
                                  <div className="absolute -bottom-2 right-1 w-4 h-4 bg-white dark:bg-gray-800 border-b border-r border-gray-200 dark:border-gray-700 rotate-45"></div>
                                </div>
                              </div>
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
                                <div
                                  key={rating}
                                  className="flex flex-col items-center"
                                  onClick={() => field.onChange(rating)}
                                >
                                  <div
                                    className={`cursor-pointer w-10 h-10 rounded-full flex items-center justify-center transition-colors ${Number(field.value) === rating ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                                  >
                                    <div
                                      className={`w-8 h-8 rounded-full flex items-center justify-center ${rating === 1 ? 'bg-red-500' :
                                        rating === 2 ? 'bg-orange-500' :
                                          rating === 3 ? 'bg-yellow-500' :
                                            rating === 4 ? 'bg-lime-500' :
                                              'bg-green-500'
                                        } ${Number(field.value) === rating ? 'ring-2 ring-offset-2 ring-gray-300 dark:ring-gray-600' : 'opacity-60'}`}
                                    >
                                      {rating === 1 && (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm2.97 4.43l1.06-1.06 1.06 1.06 1.415-1.414-1.06-1.06 1.06-1.06-1.415-1.416-1.06 1.06-1.06-1.06-1.414 1.415 1.06 1.06-1.06 1.06 1.414 1.415z" />
                                        </svg>
                                      )}
                                      {rating === 2 && (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm8 5H9v2h6v-2z" />
                                        </svg>
                                      )}
                                      {rating === 3 && (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm8 5H9v2h6v-2z" />
                                        </svg>
                                      )}
                                      {rating === 4 && (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm1.146 5.146l1.414 1.414L12 15.12l2.44 2.44 1.414-1.414L12 12.292l-3.854 3.854z" />
                                        </svg>
                                      )}
                                      {rating === 5 && (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '-1px' }}>
                                          <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm4.592 4.295l2.7-4.055 1.416.943-3.85 5.776-3.374-2.7.943-1.176 2.165 1.212z" />
                                        </svg>
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-xs font-medium mt-1">{rating}</span>
                                </div>
                              ))}

                              <div className="absolute bottom-2 right-4">
                                <button
                                  type="button"
                                  className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const infoEl = document.getElementById("workout-rating-info");
                                    if (infoEl) {
                                      // Close any other open popups first
                                      document.getElementById("diet-rating-info")?.classList.add("hidden");
                                      // Toggle this popup
                                      infoEl.classList.toggle("hidden");
                                    }
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-600 dark:text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="16" x2="12" y2="12" />
                                    <line x1="12" y1="8" x2="12.01" y2="8" />
                                  </svg>
                                </button>

                                <div id="workout-rating-info" className="hidden absolute right-0 bottom-8 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 z-50 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                  <div className="flex items-start">
                                    <span className="w-3 h-3 rounded-full bg-red-500 mr-2 mt-1 flex-shrink-0"></span>
                                    <span>1 – Off Plan (Did not do workout)</span>
                                  </div>
                                  <div className="flex items-start">
                                    <span className="w-3 h-3 rounded-full bg-orange-500 mr-2 mt-1 flex-shrink-0"></span>
                                    <span>2 – Some Effort (Minimal workout)</span>
                                  </div>
                                  <div className="flex items-start">
                                    <span className="w-3 h-3 rounded-full bg-yellow-500 mr-2 mt-1 flex-shrink-0"></span>
                                    <span>3 – Partially On Track (Modified workout)</span>
                                  </div>
                                  <div className="flex items-start">
                                    <span className="w-3 h-3 rounded-full bg-lime-500 mr-2 mt-1 flex-shrink-0"></span>
                                    <span>4 – Workout Completed, Steps Missed (Completed workout, missed step goal)</span>
                                  </div>
                                  <div className="flex items-start">
                                    <span className="w-3 h-3 rounded-full bg-green-500 mr-2 mt-1 flex-shrink-0"></span>
                                    <span>5 – Workout and Step Goal Completed (Completed both)</span>
                                  </div>
                                  <div className="absolute -bottom-2 right-1 w-4 h-4 bg-white dark:bg-gray-800 border-b border-r border-gray-200 dark:border-gray-700 rotate-45"></div>
                                </div>
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Submit button */}
                <div className="w-100 mt-6 text-center">
                  <Button
                    type="submit"
                    className="bg-primary-600 w-100 border hover:bg-primary-700 text-white"
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending ? "Submitting..." : "Submit Update"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Update History</h2>

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
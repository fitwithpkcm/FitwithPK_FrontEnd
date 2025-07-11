import React, { useState, useEffect } from "react";
import { format, parse, subDays, subMonths } from "date-fns";
import { ArrowLeft, ChevronDown, ChevronUp, Plus, X, Calculator, Activity, FileText, Upload, Eye, Download, Utensils, Dumbbell } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import PhotoViewer from "./photo-viewer";
import AllPhotosView from "./all-photos-viewer";
import MeasurementHistory from "./measurement-histroy";
import { BASE_URL } from "@/common/Constant";
import { setBaseUrl } from "../../services/HttpService"
import { IDailyStats } from "@/interface/IDailyUpdates";
import { IWeeklyStatsExtended, IWeeklyUpdatesForUser } from "@/interface/IWeeklyUpdates";
import { getUserListWithWeeklyUpdates_ForCoach } from "@/services/AdminServices";
import { useQuery } from "@tanstack/react-query";
import { MobileAdminNav } from "@/components/layout/mobile-admin-nav";
import GraphDataChart from "./AdminProgressWeeklyChart";
import { IBodyMeasurement } from "@/interface/IBodyMeasurement";
import { getProgressGallery, getWeeklyUpdate } from "@/services/UpdateServices";

// Interface for body measurements
interface BodyMeasurement {
  date: string;
  weight: number;
  bodyFat?: number;
  waist?: number;
  hip?: number;
  neck?: number;
  chest?: number;
  upperArms?: number;
  quadriceps?: number;
}

// Interface for progress photos
interface ProgressPhoto {
  id: number|undefined|string;
  date: string | undefined;
  imageUrl: string |undefined;
}

// Interface for the component props
interface WeeklyTrackingViewProps {
  userId: number;
  onBack: () => void;
}

// Sample user data
const USERS = [
  {
    id: 1,
    name: "John Doe",
    avatar: "https://ui-avatars.com/api/?name=John+Doe&background=random",
  },
  {
    id: 2,
    name: "Jane Smith",
    avatar: "https://ui-avatars.com/api/?name=Jane+Smith&background=random",
  },
  {
    id: 3,
    name: "Mike Johnson",
    avatar: "https://ui-avatars.com/api/?name=Mike+Johnson&background=random",
  },
  {
    id: 4,
    name: "Sarah Williams",
    avatar: "https://ui-avatars.com/api/?name=Sarah+Williams&background=random",
  },
  {
    id: 5,
    name: "Alex Brown",
    avatar: "https://ui-avatars.com/api/?name=Alex+Brown&background=random",
  }
];

// Generate sample measurement data
const generateSampleMeasurements = (userId: number, period: "week" | "month" | "6month" | "year" = "month"): BodyMeasurement[] => {
  // Use userId as a seed for consistent but varied data
  const seed = userId;
  const baseWeight = 65 + (seed % 20);
  const measurements: BodyMeasurement[] = [];

  // Determine data points and interval based on period
  let dataPoints = 0;
  let intervalDays = 0;

  switch (period) {
    case "week":
      dataPoints = 7;
      intervalDays = 1; // Daily data for a week
      break;
    case "month":
      dataPoints = 30;
      intervalDays = 1; // Daily data for a month
      break;
    case "6month":
      dataPoints = 26;
      intervalDays = 7; // Weekly data for 6 months
      break;
    case "year":
      dataPoints = 52;
      intervalDays = 7; // Weekly data for a year
      break;
    default:
      dataPoints = 30;
      intervalDays = 1;
  }

  // Generate data for the selected period
  for (let i = 0; i < dataPoints; i++) {
    const date = subDays(new Date(), i * intervalDays);
    // Create more noticeable progress based on time period
    const progressFactor = i / dataPoints; // Higher for older dates
    const fluctuation = Math.sin(i * 0.5) * 0.8; // Create small fluctuations

    measurements.push({
      date: format(date, "yyyy-MM-dd"),
      weight: parseFloat((baseWeight + fluctuation).toFixed(1)),
      bodyFat: parseFloat((20 + (seed % 10) / 10 - i * 0.1 + fluctuation * 0.2).toFixed(1)),
      waist: parseFloat((80 + (seed % 15) - i * 0.1 + fluctuation).toFixed(1)),
      hip: parseFloat((90 + (seed % 10) - i * 0.05 + fluctuation * 0.5).toFixed(1)),
      neck: parseFloat((38 + (seed % 5) - i * 0.01 + fluctuation * 0.1).toFixed(1)),
      chest: parseFloat((95 + (seed % 15) - i * 0.1 + fluctuation * 0.3).toFixed(1)),
      upperArms: parseFloat((33 + (seed % 7) - i * 0.03 + fluctuation * 0.2).toFixed(1)),
      quadriceps: parseFloat((55 + (seed % 10) - i * 0.05 + fluctuation * 0.3).toFixed(1)),
    });
  }

  return measurements.reverse(); // Return in chronological order
};

// Generate sample progress photos
const generateSampleProgressPhotos = (userId: number): ProgressPhoto[] => {
  return [
    {
      id: 1,
      date: format(subMonths(new Date(), 2), "yyyy-MM-dd"),
      imageUrl: `https://ui-avatars.com/api/?name=May+1&size=200&background=random&seed=${userId + 1}`,
    },
    {
      id: 2,
      date: format(subMonths(new Date(), 1), "yyyy-MM-dd"),
      imageUrl: `https://ui-avatars.com/api/?name=May+15&size=200&background=random&seed=${userId + 2}`,
    },
    {
      id: 3,
      date: format(new Date(), "yyyy-MM-dd"),
      imageUrl: `https://ui-avatars.com/api/?name=May+30&size=200&background=random&seed=${userId + 3}`,
    },
  ];
};

export default function WeeklyTrackingView({ userId, onBack }: WeeklyTrackingViewProps) {
  const [user, setUser] = useState<IWeeklyUpdatesForUser>();
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);

  const [progressPhotos1, setProgressPhotos1] = useState<ProgressPhoto[]>([]);

  const [selectedMeasurement, setSelectedMeasurement] = useState<string>("weight");
  const [showPhotos, setShowPhotos] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showMetabolics, setShowMetabolics] = useState(false);
  const [selectedActivityLevel, setSelectedActivityLevel] = useState("sedentary");
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [selectedPDF, setSelectedPDF] = useState<{ name: string, url: string } | null>(null);
  const [dietPlans, setDietPlans] = useState([
    { id: 1, name: "Weight Loss Diet Plan", uploadDate: "2024-01-10", url: "" },
    { id: 2, name: "Maintenance Diet Plan", uploadDate: "2024-01-20", url: "" }
  ]);
  const [workoutPlans, setWorkoutPlans] = useState([
    { id: 1, name: "Beginner Strength Training", uploadDate: "2024-01-12", url: "" }
  ]);


  /**
  * author : basil1112
  * set up base url
   */
  useEffect(() => {
    setBaseUrl(BASE_URL);
  }, []);


  //fetch weekly 
  const { data: UserListWithWeeklyUpdates } = useQuery<IWeeklyUpdatesForUser[]>({
    queryKey: ["coach-userlist-weekly"],
    queryFn: () => getUserListWithWeeklyUpdates_ForCoach(0).then((res) => res.data.data)
  });

  // Fetch user's body measurements
  //currently fetch all the data
  const { data: weekly_updates_measurement_history } = useQuery<IBodyMeasurement[]>({
    queryKey: [`weekly-updates_${userId}`],
    queryFn: () => getWeeklyUpdate({ IdUser: userId }).then(res => res.data.data)
  });

  const { data: galleryProgressDetails } = useQuery<IBodyMeasurement[]>({
    queryKey: [`gallery-updates_${userId}`],
    queryFn: () => getProgressGallery({ IdUser: userId }).then(res => {

      return res.data.data
    }),
  });


  // Format date for display
  const formatDisplayDate = (dateString: string) => {
    const parsedDate = parse(dateString, 'dd-MM-yyyy', new Date());
    return format(parsedDate, 'd MMM');
  };

  useEffect(() => {
    if (!galleryProgressDetails?.length) return;

    const newData: ProgressPhoto[] = galleryProgressDetails.flatMap((gallery: IBodyMeasurement, index: number) => {
      return gallery.FileName?.map(file => ({
        id: `${file}_${new Date().getUTCMilliseconds()}`,
        date: gallery.DateRange,
        imageUrl: `${BASE_URL}/uploads/weekly/${file}`
      })) || [];
    });

    setProgressPhotos(newData);
  }, [galleryProgressDetails]);


  // Time period for the graph
  const [timePeriod, setTimePeriod] = useState<"week" | "month" | "6month" | "year">("month");

  // Sample user profile data for calculations
  const userProfile = {
    age: 28,
    gender: "female",
    height: 165, // cm
    weight: 68, // kg
    bodyFat: 22, // %
  };

  // Activity level multipliers for TDEE calculation
  const activityLevels = {
    sedentary: { label: "Sedentary (desk job)", multiplier: 1.2 },
    light: { label: "Light exercise (1-3 days/week)", multiplier: 1.375 },
    moderate: { label: "Moderate exercise (3-5 days/week)", multiplier: 1.55 },
    active: { label: "Active (6-7 days/week)", multiplier: 1.725 },
    veryActive: { label: "Very active (2x/day)", multiplier: 1.9 }
  };

  // BMR calculation using Mifflin-St Jeor equation
  const calculateBMR = () => {
    const { weight, height, age, gender } = userProfile;
    if (gender === "male") {
      return 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      return 10 * weight + 6.25 * height - 5 * age - 161;
    }
  };

  // TDEE calculation
  const calculateTDEE = (activityLevel: string) => {
    const bmr = calculateBMR();
    const multiplier = activityLevels[activityLevel as keyof typeof activityLevels]?.multiplier || 1.2;
    return bmr * multiplier;
  };

  // Body composition calculations
  const calculateBodyComposition = () => {
    const { weight, height, bodyFat } = userProfile;
    const latestMeasurement = measurements[measurements.length - 1];
    const waist = latestMeasurement?.waist || 75;
    const hip = latestMeasurement?.hip || 95;

    // Lean Body Mass
    const leanBodyMass = weight * (1 - bodyFat / 100);

    // Waist-to-Hip Ratio
    const waistToHipRatio = waist / hip;

    // Ideal Body Weight using Devine formula
    const heightInInches = height / 2.54;
    const idealBodyWeight = userProfile.gender === "male"
      ? 50 + 2.3 * (heightInInches - 60)
      : 45.5 + 2.3 * (heightInInches - 60);

    // BMI
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);

    return {
      leanBodyMass: leanBodyMass.toFixed(1),
      waistToHipRatio: waistToHipRatio.toFixed(2),
      idealBodyWeight: idealBodyWeight.toFixed(1),
      bmi: bmi.toFixed(1)
    };
  };

  useEffect(() => {
    // Find user
    const foundUser = UserListWithWeeklyUpdates?.find(u => u.IdUser === userId);
    if (foundUser) {
      setUser(foundUser);
    }
  }, [userId, timePeriod]);



  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  return (
    <div className="p-0 h-full w-full">

      {/* Header */}
      <div className="flex items-center mb-4 px-2">
        <div className="flex-1">
          <h1 className="text-xl font-bold">Updates</h1>
          <h3>{`${user?.FirstName} ${user?.LastName}`}</h3>
          <p className="text-sm text-gray-500">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex bg-gray-100 mb-4 p-1 mx-0">
        <button
          className="flex-1 py-2 rounded-md text-gray-500 text-sm"
          onClick={() => {
            onBack();
            // This will redirect to the daily view of the same user
            setTimeout(() => {
              const dailyButton = document.querySelector('.flex.rounded-lg.bg-gray-100 button:first-child') as HTMLButtonElement;
              if (dailyButton) dailyButton.click();
            }, 100);
          }}
        >
          Daily
        </button>
        <button
          className="flex-1 py-2 bg-white rounded-md shadow-sm font-medium text-sm"
        >
          Weekly
        </button>
      </div>


      {/* Current Stats Display */}
      <div className="grid grid-cols-2 gap-3 mb-4 px-2">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-gray-500 mb-1">Weight</div>
          <div className="text-2xl font-bold">{measurements[0]?.weight || 68.2} kg</div>
          <div className="text-xs text-green-500">+ 2.3 kg</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-gray-500 mb-1">Body Fat</div>
          <div className="text-2xl font-bold">{measurements[0]?.bodyFat || 19.5}%</div>
          <div className="text-xs text-green-500">↑ 1.2%</div>
        </div>
      </div>

      {/* Metabolic & Body Composition Calculator */}
      <div className="bg-white mb-4 border w-full">
        <button
          onClick={() => setShowMetabolics(!showMetabolics)}
          className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            <span className="font-medium">Metabolic Calculator</span>
          </div>
          {showMetabolics ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {showMetabolics && (
          <div className="px-4 pb-4 space-y-4">
            {/* Activity Level Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Activity Level</label>
              <select
                value={selectedActivityLevel}
                onChange={(e) => setSelectedActivityLevel(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(activityLevels).map(([key, value]) => (
                  <option key={key} value={key}>{value.label}</option>
                ))}
              </select>
            </div>

            {/* BMR & TDEE Display */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <div className="text-sm text-blue-700 font-medium mb-1">BMR (Basal Metabolic Rate)</div>
                <div className="text-xl font-bold text-blue-800">{Math.round(calculateBMR())} cal/day</div>
                <div className="text-xs text-blue-600">Mifflin-St Jeor equation</div>
              </div>

              <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                <div className="text-sm text-green-700 font-medium mb-1">TDEE</div>
                <div className="text-xl font-bold text-green-800">{Math.round(calculateTDEE(selectedActivityLevel))} cal/day</div>
                <div className="text-xs text-green-600">With activity level</div>
              </div>
            </div>

            {/* Body Composition Metrics */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-gray-600 mb-1">BMI</div>
                <div className="font-semibold">{calculateBodyComposition().bmi}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-gray-600 mb-1">Lean Body Mass</div>
                <div className="font-semibold">{calculateBodyComposition().leanBodyMass} kg</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-gray-600 mb-1">Waist-Hip Ratio</div>
                <div className="font-semibold">{calculateBodyComposition().waistToHipRatio}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-gray-600 mb-1">Ideal Weight</div>
                <div className="font-semibold">{calculateBodyComposition().idealBodyWeight} kg</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Body Measurements Graph */}

      <GraphDataChart selectedDate={selectedDate} userId={userId} />

      {/* Measurement History Section */}
      <div className="mb-2">
        {weekly_updates_measurement_history && <MeasurementHistory measurements={weekly_updates_measurement_history} />}
      </div>

      {/* Progress Photos Section */}
      <div className="bg-white overflow-hidden border mb-2 w-full">
        <div
          className="p-3 flex justify-between items-center cursor-pointer"
          onClick={() => setShowPhotos(!showPhotos)}
        >
          <h2 className="text-lg font-semibold">Progress Photos</h2>
          <button>
            {showPhotos ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {showPhotos && (
          <div className="p-4 pt-0 border-t mt-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4 max-h-[30vh] overflow-y-scroll">
              {progressPhotos.map((photo, index) => (
                <div
                  key={index}
                  className="relative rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
                  onClick={() => {
                    setSelectedPhoto(photo);
                    setViewerOpen(true);
                  }}
                >
                  <img
                    src={photo.imageUrl}
                    alt={`Progress photo from ${formatDisplayDate(photo.date)}`}
                    className="w-full h-auto object-cover aspect-square"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gray-700 bg-opacity-70 text-white text-xs py-1 px-2 truncate">
                    {formatDisplayDate(photo.date)}
                  </div>
                </div>
              ))}
            </div>

            <button
              className="w-full py-2 text-center border rounded-md text-sm"
              onClick={() => setShowAllPhotos(true)}
            >
              View All Photos
            </button>
          </div>
        )}
      </div>


      {/* Photo viewer modal */}
      {viewerOpen && selectedPhoto && (
        <PhotoViewer
          photos={progressPhotos}
          initialIndex={progressPhotos.findIndex(p => p.id === selectedPhoto.id)}
          onClose={() => setViewerOpen(false)}
        />
      )}

      {/* All photos view as popup */}
      {showAllPhotos && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col overflow-auto">
          <div className="flex items-center justify-between p-4 text-white">
            <h2 className="text-xl font-bold">All Progress Photos</h2>
            <button
              onClick={() => setShowAllPhotos(false)}
              className="p-2 hover:bg-gray-800 rounded-full"
            >
              <X size={24} />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <AllPhotosView
              userId={userId}
              allPhotos={progressPhotos}
              onBack={() => setShowAllPhotos(false)}
            />
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {showPDFViewer && selectedPDF && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 text-white bg-black">
            <h2 className="text-xl font-bold">{selectedPDF.name}</h2>
            <button
              onClick={() => setShowPDFViewer(false)}
              className="p-2 hover:bg-gray-800 rounded-full"
            >
              <X size={24} />
            </button>
          </div>
          <div className="flex-1 overflow-auto bg-gray-100">
            {selectedPDF.url ? (
              <iframe
                src={selectedPDF.url}
                className="w-full h-full"
                title={selectedPDF.name}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <FileText size={64} className="mx-auto mb-4" />
                  <p>PDF not available for viewing</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
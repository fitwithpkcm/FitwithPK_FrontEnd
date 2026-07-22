import React, { useState, useEffect } from "react";
import { format, parse } from "date-fns";
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
import { BASE_URL } from "../../common/Constant";
import { setBaseUrl } from "../../services/HttpService"
import { IDailyStats } from "../../interface/IDailyUpdates";
import { IWeeklyStatsExtended, IWeeklyUpdatesForUser } from "../../interface/IWeeklyUpdates";
import { getUserListWithWeeklyUpdates_ForCoach } from "../../services/AdminServices";
import { useQuery } from "@tanstack/react-query";
import { MobileAdminNav } from "../../components/layout/mobile-admin-nav";
import { AdminPageHeader } from "../../components/layout/page-header";
import GraphDataChart from "./AdminProgressWeeklyChart";
import { IBodyMeasurement } from "../../interface/IBodyMeasurement";
import { getProgressGallery, getWeeklyUpdate } from "../../services/UpdateServices";

// Interface for progress photos
export interface ProgressPhoto {
  id: number | undefined | string;
  date: string | undefined;
  imageUrl: string | undefined;
}

// Interface for the component props
interface WeeklyTrackingViewProps {
  userId: number;
  onBack: () => void;
}

export default function WeeklyTrackingView({ userId, onBack }: WeeklyTrackingViewProps) {
  const [user, setUser] = useState<IWeeklyUpdatesForUser>();
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);

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

  // Most recent real weekly entry — BMR/TDEE/Height/Gender on it are computed
  // server-side (getWeeklyStatus) from the client's actual onboarding profile and
  // that entry's own weight, so this view never falls back to placeholder data.
  const latestMeasurement = weekly_updates_measurement_history?.[weekly_updates_measurement_history.length - 1];

  // Activity level multipliers — same keys collected on the client's intake form.
  const activityLevels = {
    'sedentary': { label: "Sedentary (desk job)", multiplier: 1.2 },
    'lightly-active': { label: "Light exercise (1-3 days/week)", multiplier: 1.375 },
    'moderately-active': { label: "Moderate exercise (3-5 days/week)", multiplier: 1.55 },
    'very-active': { label: "Active (6-7 days/week)", multiplier: 1.725 },
    'super-active': { label: "Very active (2x/day)", multiplier: 1.9 },
  };

  // "What-if" TDEE preview for a different activity level — recomputed from the
  // real server-calculated BMR, so switching the dropdown never uses fake inputs.
  const calculateWhatIfTDEE = (activityLevel: string): number | null => {
    if (!latestMeasurement?.BMR) return null;
    const multiplier = activityLevels[activityLevel as keyof typeof activityLevels]?.multiplier ?? 1.2;
    return Math.round(latestMeasurement.BMR * multiplier);
  };

  // Body composition calculations — all from the latest real weekly entry.
  const calculateBodyComposition = () => {
    const weight = latestMeasurement?.Weight;
    const height = latestMeasurement?.Height;
    const bodyFat = latestMeasurement?.BodyFat;
    const waist = latestMeasurement?.Waist;
    const hip = latestMeasurement?.BodyHip;
    const gender = latestMeasurement?.Gender;

    if (!weight || !height) {
      return { leanBodyMass: null, waistToHipRatio: null, idealBodyWeight: null, bmi: null };
    }

    const leanBodyMass = bodyFat != null ? weight * (1 - bodyFat / 100) : null;
    const waistToHipRatio = waist && hip ? waist / hip : null;

    // Ideal Body Weight using Devine formula
    const heightInInches = height / 2.54;
    const idealBodyWeight = (gender ?? '').toLowerCase() === 'female'
      ? 45.5 + 2.3 * (heightInInches - 60)
      : 50 + 2.3 * (heightInInches - 60);

    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);

    return {
      leanBodyMass: leanBodyMass !== null ? leanBodyMass.toFixed(1) : null,
      waistToHipRatio: waistToHipRatio !== null ? waistToHipRatio.toFixed(2) : null,
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

      <AdminPageHeader
        title="Weekly Tracking"
        subtitle={user ? `${user.FirstName} ${user.LastName}` : undefined}
        onBack={onBack}
      />

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
          <div className="text-2xl font-bold">{latestMeasurement?.Weight ?? "—"} kg</div>
          {!!latestMeasurement?.WeightDifference && (
            <div className={`text-xs ${latestMeasurement.WeightDifference < 0 ? "text-green-500" : "text-orange-500"}`}>
              {latestMeasurement.WeightDifference > 0 ? "+" : ""}{latestMeasurement.WeightDifference.toFixed(1)} kg
            </div>
          )}
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-gray-500 mb-1">Body Fat</div>
          <div className="text-2xl font-bold">{latestMeasurement?.BodyFat ?? "—"}%</div>
          {!!latestMeasurement?.BodyFatDifference && (
            <div className={`text-xs ${latestMeasurement.BodyFatDifference < 0 ? "text-green-500" : "text-orange-500"}`}>
              {latestMeasurement.BodyFatDifference > 0 ? "+" : ""}{latestMeasurement.BodyFatDifference.toFixed(1)}%
            </div>
          )}
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

        {showMetabolics && (!latestMeasurement?.BMR ? (
          <div className="px-4 pb-4 text-sm text-gray-500">
            Can't calculate — the client needs their height and age set in their profile, and at least one weekly update logged.
          </div>
        ) : (
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
                <div className="text-xl font-bold text-blue-800">{Math.round(latestMeasurement.BMR)} cal/day</div>
                <div className="text-xs text-blue-600">Mifflin-St Jeor equation</div>
              </div>

              <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                <div className="text-sm text-green-700 font-medium mb-1">TDEE</div>
                <div className="text-xl font-bold text-green-800">{calculateWhatIfTDEE(selectedActivityLevel) ?? "—"} cal/day</div>
                <div className="text-xs text-green-600">With activity level</div>
              </div>
            </div>

            {/* Body Composition Metrics */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-gray-600 mb-1">BMI</div>
                <div className="font-semibold">{calculateBodyComposition().bmi ?? "—"}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-gray-600 mb-1">Lean Body Mass</div>
                <div className="font-semibold">{calculateBodyComposition().leanBodyMass ?? "—"} kg</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-gray-600 mb-1">Waist-Hip Ratio</div>
                <div className="font-semibold">{calculateBodyComposition().waistToHipRatio ?? "—"}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-gray-600 mb-1">Ideal Weight</div>
                <div className="font-semibold">{calculateBodyComposition().idealBodyWeight ?? "—"} kg</div>
              </div>
            </div>
          </div>
        ))}
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
                    alt={`Progress photo from ${formatDisplayDate(photo.date!)}`}
                    className="w-full h-auto object-cover aspect-square"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gray-700 bg-opacity-70 text-white text-xs py-1 px-2 truncate">
                    {formatDisplayDate(photo.date!)}
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
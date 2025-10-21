import React, { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, ArrowLeft, Edit, Mail, MapPin, Calendar, FileText, Image, Eye, Download, X, Upload, Dumbbell, Utensils, Edit3, CreditCard, Pen, Save } from "lucide-react";
import { getLoggedUserDetails } from "../../services/ProfileService";
import { IUser } from "../../interface/models/User";
import { setBaseUrl } from "../../services/HttpService";
import { BASE_URL } from "../../common/Constant";
import moment from "moment";
import { RENDER_URL } from "@/common/Urls";
import { useNavigate, useLocation } from "react-router-dom";

export default function ClientProfileScreen() {

  const navigate = useNavigate();
  const location = useLocation();
  const selectedUserID = location.state?.selectedUserID;

  const [editingPayment, setEditingPayment] = useState(false);
  const [updateBufferDays, setUpdateBufferDays] = useState<string | undefined>("0");


  /**
  * author : basil1112
  * set up base url
   */
  useEffect(() => {
    setBaseUrl(BASE_URL);
  }, []);


  const { data: profileData } = useQuery<Partial<IUser> | undefined>({
    queryKey: [`subscription_date_${selectedUserID}`],
    queryFn: async () => {
      const res = await getLoggedUserDetails({ IdUser: selectedUserID });
      return res.data.data[0]; // assuming this is an array
    },
  });


  useEffect(() => {

    if (profileData) {
      setUpdateBufferDays(profileData?.BufferDay)
    }
  }, [profileData])


  const showHistoryPage = () => {

    navigate(RENDER_URL.ADMIN_PAYMENT_HISTORY, {
      state: {
        selectedUserID: selectedUserID
      }
    });

  }


  const renderPaymentDetail = () => (<div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-800">Payment & Subscription</h3>
      <button
        onClick={() => {
          if (editingPayment) {
            setEditingPayment(false);
            // Here you would save the changes to the backend
          } else {
            setEditingPayment(true);
          }
        }}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Pen className="w-4 h-4 text-gray-600" />
      </button>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="text-sm text-gray-500 mb-1">Current Plan</div>
        <div className="font-medium">{profileData?.PlanName}</div>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="text-sm text-gray-500 mb-1">Status</div>
        <div className={`font-medium `}>
          Active
        </div>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="text-sm text-gray-500 mb-1">Last Payment</div>
        <div className="font-medium">
          {moment(profileData?.PaidDate).format('DD-MM-yyyy')}
        </div>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="text-sm text-gray-500 mb-1">Next Due Date</div>
        <div className="font-medium">{moment(profileData?.EndDate).format('DD-MM-yyyy')}</div>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="text-sm text-gray-500 mb-1">Buffer Days</div>
        {editingPayment ?
          <input
            type="number"
            value={updateBufferDays}
            onChange={(e) => { setUpdateBufferDays(e.target.value) }}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          :
          <div className="font-medium">{updateBufferDays} </div>
        }
      </div>

      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="text-sm text-gray-500 mb-1">Total Due</div>
        <div className="font-medium">{profileData?.BalanceAmount}</div>
      </div>

    </div>

    <div className="p-3">
      <div className={`grid grid-cols-2 gap-4`}>
        <button
          className={`flex items-center px-3 py-1 bg-green-100 text-gray-700 rounded-md text-sm hover:bg-green-200`}
          style={{ visibility: editingPayment ? "visible" : "hidden" }}
        >
          <Save size={14} className="mr-1" />
          Save
        </button>

        <button
          className="flex items-center p-3 bg-blue-100 text-gray-700 rounded-md text-sm hover:bg-blue-200"
          onClick={() => { showHistoryPage() }}
        >
          <Eye size={14} className="mr-1" />
          Payment Histroy
        </button>


      </div>
    </div>

  </div>)


  const renderMeasurements = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-sm text-gray-500 mb-1">Height</div>
          <div className="font-medium">{profileData?.OnBoardUserAttributes?.height} cm</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-sm text-gray-500 mb-1">Weight</div>
          <div className="font-medium">{profileData?.OnBoardUserAttributes?.weight} kg</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-sm text-gray-500 mb-1">Waist</div>
          <div className="font-medium">{profileData?.OnBoardUserAttributes?.waist} cm</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-sm text-gray-500 mb-1">Hip</div>
          <div className="font-medium">{profileData?.OnBoardUserAttributes?.hip} cm</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-sm text-gray-500 mb-1">Chest</div>
          <div className="font-medium">{profileData?.OnBoardUserAttributes?.chest} cm</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-sm text-gray-500 mb-1">Neck</div>
          <div className="font-medium">{profileData?.OnBoardUserAttributes?.neck} cm</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-sm text-gray-500 mb-1">Biceps</div>
          <div className="font-medium">{profileData?.OnBoardUserAttributes?.biceps} cm</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-sm text-gray-500 mb-1">Quadriceps</div>
          <div className="font-medium">{profileData?.OnBoardUserAttributes?.quadriceps} cm</div>
        </div>
      </div>
    </div>
  );

  const renderDiet = () => (
    <div className="space-y-4">
      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="text-sm text-gray-500 mb-1">Diet Type</div>
        <div className="font-medium">{profileData?.OnBoardUserAttributes?.dietType}</div>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="text-sm text-gray-500 mb-2">Breakfast</div>
        <div className="text-sm">{profileData?.OnBoardUserAttributes?.breakfast}</div>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="text-sm text-gray-500 mb-2">Lunch</div>
        <div className="text-sm">{profileData?.OnBoardUserAttributes?.lunch}</div>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="text-sm text-gray-500 mb-2">Evening Snack</div>
        <div className="text-sm">{profileData?.OnBoardUserAttributes?.eveningSnack}</div>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="text-sm text-gray-500 mb-2">Dinner</div>
        <div className="text-sm">{profileData?.OnBoardUserAttributes?.dinner}</div>
      </div>

      <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
        <div className="text-sm text-orange-700 font-medium mb-2">Skipped Meals</div>
        <div className="text-sm text-orange-600">{profileData?.OnBoardUserAttributes?.skipMeals}</div>
      </div>

      <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
        <div className="text-sm text-yellow-700 font-medium mb-2">Disliked Foods</div>
        <div className="text-sm text-yellow-600">{profileData?.OnBoardUserAttributes?.dislikedFoods}</div>
      </div>

      <div className="bg-red-50 p-3 rounded-lg border border-red-200">
        <div className="text-sm text-red-700 font-medium mb-2">Dietary Restrictions</div>
        <div className="text-sm text-red-600">{profileData?.OnBoardUserAttributes?.dietaryRestrictions}</div>
      </div>
    </div>
  );

  const renderLifestyle = () => (
    <div className="space-y-4">
      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="text-sm text-gray-500 mb-2">Smoking & Drinking Habits</div>
        <div className="text-sm">{profileData?.OnBoardUserAttributes?.smokingDrinking}</div>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="text-sm text-gray-500 mb-2">Daily Activity Level</div>
        <div className="text-sm">{profileData?.OnBoardUserAttributes?.activityLevel}</div>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="text-sm text-gray-500 mb-2">Sleep Pattern</div>
        <div className="text-sm">{profileData?.OnBoardUserAttributes?.sleepHours}</div>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="text-sm text-gray-500 mb-2">Current Exercise Routine</div>
        <div className="text-sm">{profileData?.OnBoardUserAttributes?.currentExercise}</div>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="text-sm text-gray-500 mb-2">Workout Preference</div>
        <div className="text-sm">{profileData?.OnBoardUserAttributes?.workoutPreference}</div>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="text-sm text-gray-500 mb-2">Time Available for Workouts</div>
        <div className="text-sm">{profileData?.OnBoardUserAttributes?.workoutAvailability}</div>
      </div>

      <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
        <div className="text-sm text-yellow-700 font-medium mb-2">Stress & Schedule</div>
        <div className="text-sm text-yellow-600">{profileData?.OnBoardUserAttributes?.stressLevel}</div>
      </div>
    </div>
  );

  const renderMedical = () => (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-sm font-medium text-gray-700 mb-2">Medical Conditions</div>
          <div className="text-gray-600">{profileData?.OnBoardUserAttributes?.medicalConditions}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-sm font-medium text-gray-700 mb-2">Current Medications</div>
          <div className="text-gray-600">{profileData?.OnBoardUserAttributes?.medications}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-sm font-medium text-gray-700 mb-2">Supplement Preferences</div>
          <div className="text-gray-600">{profileData?.OnBoardUserAttributes?.supplementWillingness}</div>
        </div>
      </div>

      {/* Blood Reports Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Blood Reports</h3>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${profileData?.OnBoardUserAttributes?.recentBloodTest
            ? 'bg-green-100 text-green-700'
            : 'bg-orange-100 text-orange-700'
            }`}>
            {profileData?.OnBoardUserAttributes?.recentBloodTest ? 'Recent Test Available' : 'No Recent Test'}
          </div>
        </div>


        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <div>No blood reports uploaded yet</div>
        </div>

      </div>
    </div>
  );

  const renderGoals = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
        <div className="text-sm text-blue-700 font-medium mb-2">Fitness Goals</div>
        <div className="text-sm text-blue-600">{profileData?.OnBoardUserAttributes?.fitnessGoals}</div>
      </div>

      <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
        <div className="text-sm text-orange-700 font-medium mb-2">Biggest Challenge</div>
        <div className="text-sm text-orange-600">{profileData?.OnBoardUserAttributes?.biggestChallenge}</div>
      </div>

      <div className="bg-red-50 p-3 rounded-lg border border-red-200">
        <div className="text-sm text-red-700 font-medium mb-2">Challenging Habits</div>
        <div className="text-sm text-red-600">{profileData?.OnBoardUserAttributes?.challengingHabits}</div>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="text-sm text-gray-500 mb-2">Past Diet Experience</div>
        <div className="text-sm">{profileData?.OnBoardUserAttributes?.pastDietExperience}</div>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="text-sm text-gray-500 mb-2">Past Coaching Experience</div>
        <div className="text-sm">{profileData?.OnBoardUserAttributes?.pastCoachExperience}</div>
      </div>

      <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
        <div className="text-sm text-purple-700 font-medium mb-2">Motivation</div>
        <div className="text-sm text-purple-600">{profileData?.OnBoardUserAttributes?.motivation}</div>
      </div>
    </div>
  );

  // Consolidated client profile view
  const renderCompleteProfile = () => (
    <div className="space-y-6">

      {renderPaymentDetail()}

      {/* Basic Information */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          Personal Information
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-500 mb-1">Age</div>
            <div className="font-medium">{profileData?.OnBoardUserAttributes?.age} years</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-500 mb-1">Gender</div>
            <div className="font-medium">{profileData?.OnBoardUserAttributes?.gender}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-500 mb-1">Profession</div>
            <div className="font-medium">{profileData?.OnBoardUserAttributes?.profession}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-500 mb-1">Location</div>
            <div className="font-medium">{profileData?.OnBoardUserAttributes?.location}</div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Body Measurements</h3>
        {renderMeasurements()}
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Diet Data</h3>
        {renderDiet()}
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Life Style</h3>
        {renderLifestyle()}
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Medical Details</h3>
        {renderMedical()}
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Goals</h3>
        {renderGoals()}
      </div>

    </div>
  );


  return (
    <div className="p-4 h-full w-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => { }}
          className="mr-3 p-2 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
          <span className="text-blue-600 font-semibold">{`${profileData?.FirstName?.charAt(0)}${profileData?.LastName?.charAt(0)}`}</span>
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{`${profileData?.FirstName} - ${profileData?.LastName} `}</h1>
          <div className="flex items-center text-sm text-gray-500">
            <Mail size={14} className="mr-1" />
            {profileData?.EmailID}
          </div>
        </div>
      </div>

      <div className="mb-20">
        {renderCompleteProfile()}
      </div>
    </div>
  );
}
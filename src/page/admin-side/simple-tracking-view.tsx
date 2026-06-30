import React, { useEffect, useState } from "react";
import { format, subDays } from "date-fns";
import { Check, X, AlertTriangle, Calendar, Bell, ArrowLeft, Loader2 } from "lucide-react";
import WeeklyTrackingView from "./weekly-track-view";
import { BASE_URL } from "../../common/Constant";
import { setBaseUrl } from "../../services/HttpService"
import { getUserListWithUpdates_ForCoach, getUserListWithWeeklyUpdates_ForCoach, sendReminderNotification } from "../../services/AdminServices";
import { IUser } from "../../interface/models/User";
import { useQuery, useMutation } from "@tanstack/react-query";
import moment from 'moment';
import { IDailyStats, IUpdatesForUser } from "../../interface/IDailyUpdates";
import { getRandomColor, isEmpty } from "../../lib/utils";
import UserDailyDetailView from "./user-details-view";
import { IWeeklyStatsExtended, IWeeklyUpdatesForUser } from "../../interface/IWeeklyUpdates";
import { MobileAdminNav } from "../../components/layout/mobile-admin-nav";
import { AdminPageHeader } from "../../components/layout/page-header";
import toast from "react-hot-toast";
// Sample user data with tracking status
const USERS = [
  {
    id: 1,
    name: "John Doe",
    avatar: "https://ui-avatars.com/api/?name=John+Doe&background=random",
    updatedToday: true,
    lastUpdate: new Date().toISOString()
  },
  {
    id: 2,
    name: "Jane Smith",
    avatar: "https://ui-avatars.com/api/?name=Jane+Smith&background=random",
    updatedToday: true,
    lastUpdate: new Date().toISOString()
  },
  {
    id: 3,
    name: "Mike Johnson",
    avatar: "https://ui-avatars.com/api/?name=Mike+Johnson&background=random",
    updatedToday: false,
    lastUpdate: subDays(new Date(), 2).toISOString()
  },
  {
    id: 4,
    name: "Sarah Williams",
    avatar: "https://ui-avatars.com/api/?name=Sarah+Williams&background=random",
    updatedToday: true,
    lastUpdate: new Date().toISOString()
  },
  {
    id: 5,
    name: "Alex Brown",
    avatar: "https://ui-avatars.com/api/?name=Alex+Brown&background=random",
    updatedToday: false,
    lastUpdate: subDays(new Date(), 1).toISOString()
  },
  {
    id: 6,
    name: "Lisa Taylor",
    avatar: "https://ui-avatars.com/api/?name=Lisa+Taylor&background=random",
    updatedToday: false,
    lastUpdate: subDays(new Date(), 3).toISOString()
  }
];

export default function SimpleTrackingView() {
  const [activeTab, setActiveTab] = useState("all");
  const [activeWeeklyTab, setActiveWeeklyTab] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily");

  const currentDate = new Date();

  /**
  * author : basil1112
  * set up base url
   */
  useEffect(() => {
    setBaseUrl(BASE_URL);
  }, []);


  const yesterday = moment(currentDate).subtract(1, "days").format("DD-MM-YYYY");

  // Fetch user list with their update status for yesterday
  const { data: UserListWithUpdates } = useQuery<IUpdatesForUser[]>({
    queryKey: ["coach-userlist", yesterday],
    queryFn: () => getUserListWithUpdates_ForCoach({ Day: yesterday }).then(res => res.data.data),
    staleTime: 0,
  });

  //fetch weekly 
  const { data: UserListWithWeeklyUpdates } = useQuery<IWeeklyUpdatesForUser[]>({
    queryKey: ["coach-userlist-weekly"],
    queryFn: () => getUserListWithWeeklyUpdates_ForCoach(0).then(res => res.data.data),
    staleTime: 0,
  });



  // Format date for display
  const formatDate = (dateString: string) => {
    console.log(dateString);
    if (!isEmpty(dateString)) {
      const [day, month, year] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return format(date, "d MMM yyyy");
    }
    else {
      return "";
    }

  };

  // Track which user's reminder button is in loading state
  const [sendingReminderId, setSendingReminderId] = useState<number | null>(null);

  const { mutate: sendReminder } = useMutation({
    mutationFn: (userId: number) => sendReminderNotification({ IdUser: userId }),
    onMutate: (userId) => setSendingReminderId(userId),
    onSuccess: (data: any, userId) => {
      setSendingReminderId(null);
      const user = UserListWithUpdates?.find(u => u.IdUser === userId);
      const name = user ? `${user.FirstName} ${user.LastName}` : 'the client';
      // Backend always returns 200 — check success flag for real outcome
      if (data?.data?.success) {
        toast.success(`Reminder sent to ${name}!`);
      } else {
        toast(`📵 ${name}: ${data?.data?.message ?? 'Notification not available'}`, { icon: '⚠️' });
      }
    },
    onError: (_err, userId) => {
      setSendingReminderId(null);
      const user = UserListWithUpdates?.find(u => u.IdUser === userId);
      const name = user ? `${user.FirstName} ${user.LastName}` : 'the client';
      toast.error(`Failed to send reminder to ${name}. Please try again.`);
    },
  });

  /**
   * "Updated" = the user submitted a COMPLETE daily update for yesterday.
   * Requirements:
   *  1. An IdStats row exists for yesterday's date specifically.
   *  2. Every required field is filled in (not just a partial submission).
   */
  const isComplete = (user: IUpdatesForUser): boolean => {
    if (user.IdStats == null) return false;
    // The update row must belong to yesterday
    if (user.Day !== yesterday) return false;
    return (
      user.Steps != null &&
      user.Water != null &&
      user.Diet_Follow != null &&
      (user.WorkOut_Follow != null || user.WorkOut != null) &&
      user.Weight != null &&
      user.Sleep != null
    );
  };

  // Filter users based on active tab
  const filteredUsers = UserListWithUpdates?.filter(user => {
    if (activeTab === "updated") return isComplete(user);
    if (activeTab === "missed") return !isComplete(user);
    return true; // "all" tab
  });

  // Count updated and missed users — both driven by the same isComplete check
  const updatedCount = UserListWithUpdates?.filter(isComplete).length ?? 0;
  const missedCount = (UserListWithUpdates?.length ?? 0) - updatedCount;

  const isWeeklyComplete = (user: IWeeklyUpdatesForUser): boolean => {
    if (!user.IdWeeklyStats || !user.DateRange) return false;
    const [day, month, year] = user.DateRange.split('-').map(Number);
    const updateDate = new Date(year, month - 1, day);
    const daysDiff = (currentDate.getTime() - updateDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  };

  const weeklyUpdatedCount = UserListWithWeeklyUpdates?.filter(isWeeklyComplete).length ?? 0;
  const weeklyMissedCount = (UserListWithWeeklyUpdates?.length ?? 0) - weeklyUpdatedCount;

  const filteredWeeklyUsers = UserListWithWeeklyUpdates?.filter(user => {
    if (activeWeeklyTab === "updated") return isWeeklyComplete(user);
    if (activeWeeklyTab === "missed") return !isWeeklyComplete(user);
    return true;
  });

  // Handle user selection
  const handleSelectUser = (userId: number) => {
    setSelectedUserId(userId);
  };

  // Handle back from user detail view
  const handleBackToList = () => {
    setSelectedUserId(null);
  };

  // Toggle between daily and weekly views
  const toggleViewMode = (mode: "daily" | "weekly") => {
    setViewMode(mode);
  };



  return (
    <>
      {!selectedUserId && (
        <AdminPageHeader
          title="Client Tracking"
          subtitle="FitwithPK Admin"
        />
      )}

      <div className="mb-14 p-4 h-full w-full">
        {selectedUserId ? (
          viewMode === "daily" ? (
            <UserDailyDetailView userId={selectedUserId} onBack={handleBackToList} />
          ) : (
            <WeeklyTrackingView userId={selectedUserId} onBack={handleBackToList} />
          )
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-xl font-bold">Updates</h1>
              <p className="text-sm text-gray-500">{format(new Date(), "EEEE, MMMM d")}</p>
            </div>

            {/* View Tabs */}
            <div className="flex rounded-lg bg-gray-100 mb-6 p-1">
              <button
                className={`flex-1 py-2 rounded-md text-sm ${viewMode === 'daily' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}
                onClick={() => toggleViewMode('daily')}
              >
                Daily
              </button>
              <button
                className={`flex-1 py-2 rounded-md text-sm ${viewMode === 'weekly' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}
                onClick={() => toggleViewMode('weekly')}
              >
                Weekly
              </button>
            </div>

            {viewMode === "daily" ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div
                    className="bg-green-50 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-green-100 transition-colors"
                    onClick={() => setActiveTab('updated')}
                  >
                    <div>
                      <p className="text-sm text-gray-600">Updated Yesterday</p>
                      <p className="text-2xl font-bold">{updatedCount}</p>
                    </div>
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="text-green-600" size={20} />
                    </div>
                  </div>

                  <div
                    className="bg-red-50 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-red-100 transition-colors"
                    onClick={() => setActiveTab('missed')}
                  >
                    <div>
                      <p className="text-sm text-gray-600">Missing Updates</p>
                      <p className="text-2xl font-bold">{missedCount}</p>
                    </div>
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="text-red-600" size={20} />
                    </div>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex border-b mb-4">
                  <button
                    className={`py-2 px-4 font-medium ${activeTab === 'all' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('all')}
                  >
                    All Users ({UserListWithUpdates?.length})
                  </button>
                  <button
                    className={`py-2 px-4 font-medium ${activeTab === 'updated' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('updated')}
                  >
                    Updated ({updatedCount})
                  </button>
                  <button
                    className={`py-2 px-4 font-medium ${activeTab === 'missed' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('missed')}
                  >
                    Missed ({missedCount})
                  </button>
                </div>

                {/* User List */}
                <div className="space-y-4">
                  {filteredUsers?.map(user => {
                    // Get initials from name
                    const fullname = `${user.FirstName} ${user.LastName}`;
                    const initials = fullname
                      .split(' ')
                      .map(part => part[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase();

                    const hasUpdated = isComplete(user);

                    return (
                      <div
                        key={user.IdUser}
                        className="flex items-center justify-between p-4 bg-white rounded-lg border hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleSelectUser(user.IdUser!)}
                      >
                        <div className="flex items-center">
                          <div className={`w-14 h-14 ${getRandomColor(fullname)} rounded-full flex items-center justify-center text-white text-xl font-bold mr-4`}>
                            {initials}
                          </div>
                          <div>
                            <p className="text-lg font-semibold">{user.FirstName} {user.LastName}</p>
                            <p className="text-sm text-gray-500">
                              {hasUpdated
                                ? `Updated: ${formatDate(user.Day!)}`
                                : user.Day
                                  ? `Last update: ${formatDate(user.Day!)}`
                                  : "No update yet"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${hasUpdated ? 'bg-green-100' : 'bg-red-100'}`}>
                            {hasUpdated ? (
                              <Check size={20} className="text-green-600" />
                            ) : (
                              <X size={20} className="text-red-600" />
                            )}
                          </div>
                          {!hasUpdated && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                sendReminder(user.IdUser!);
                              }}
                              disabled={sendingReminderId === user.IdUser}
                              className="p-2 bg-orange-100 hover:bg-orange-200 rounded-full transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                              title="Send Reminder"
                            >
                              {sendingReminderId === user.IdUser
                                ? <Loader2 size={16} className="text-orange-600 animate-spin" />
                                : <Bell size={16} className="text-orange-600" />
                              }
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {filteredUsers?.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      No users found in this category
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div
                    className="bg-green-50 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-green-100 transition-colors"
                    onClick={() => setActiveWeeklyTab('updated')}
                  >
                    <div>
                      <p className="text-sm text-gray-600">Updated This Week</p>
                      <p className="text-2xl font-bold">{weeklyUpdatedCount}</p>
                    </div>
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="text-green-600" size={20} />
                    </div>
                  </div>

                  <div
                    className="bg-red-50 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-red-100 transition-colors"
                    onClick={() => setActiveWeeklyTab('missed')}
                  >
                    <div>
                      <p className="text-sm text-gray-600">Missing Updates</p>
                      <p className="text-2xl font-bold">{weeklyMissedCount}</p>
                    </div>
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="text-red-600" size={20} />
                    </div>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex border-b mb-4">
                  <button
                    className={`py-2 px-4 font-medium ${activeWeeklyTab === 'all' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                    onClick={() => setActiveWeeklyTab('all')}
                  >
                    All ({UserListWithWeeklyUpdates?.length})
                  </button>
                  <button
                    className={`py-2 px-4 font-medium ${activeWeeklyTab === 'updated' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                    onClick={() => setActiveWeeklyTab('updated')}
                  >
                    Updated ({weeklyUpdatedCount})
                  </button>
                  <button
                    className={`py-2 px-4 font-medium ${activeWeeklyTab === 'missed' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                    onClick={() => setActiveWeeklyTab('missed')}
                  >
                    Missed ({weeklyMissedCount})
                  </button>
                </div>

                {/* User List */}
                <div className="space-y-4">
                  {filteredWeeklyUsers?.map(user => {
                    const fullname = `${user.FirstName} ${user.LastName}`;
                    const initials = fullname
                      .split(' ')
                      .map(part => part[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase();
                    const hasUpdated = isWeeklyComplete(user);

                    return (
                      <div
                        key={user.IdUser}
                        className="flex items-center justify-between p-4 bg-white rounded-lg border hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleSelectUser(user.IdUser)}
                      >
                        <div className="flex items-center">
                          <div className={`w-14 h-14 ${getRandomColor(fullname)} rounded-full flex items-center justify-center text-white text-xl font-bold mr-4`}>
                            {initials}
                          </div>
                          <div>
                            <p className="text-lg font-semibold">{fullname}</p>
                            <p className="text-sm text-gray-500">
                              {formatDate(user.DateRange!) === ""
                                ? "No update yet"
                                : `Last update: ${formatDate(user.DateRange!)}`}
                            </p>
                          </div>
                        </div>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${hasUpdated ? 'bg-green-100' : 'bg-red-100'}`}>
                          {hasUpdated
                            ? <Check size={20} className="text-green-600" />
                            : <X size={20} className="text-red-600" />}
                        </div>
                      </div>
                    );
                  })}

                  {filteredWeeklyUsers?.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      No users found in this category
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <MobileAdminNav />

    </>

  );
}
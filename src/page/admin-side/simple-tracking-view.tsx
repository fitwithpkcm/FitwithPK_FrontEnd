import React, { useEffect, useState } from "react";
import { format, subDays } from "date-fns";
import { Check, X, AlertTriangle, Calendar, Bell } from "lucide-react";
import WeeklyTrackingView from "./weekly-track-view";
import { BASE_URL } from "../../common/Constant";
import { setBaseUrl } from "../../services/HttpService"
import { getUserListWithUpdates_ForCoach, getUserListWithWeeklyUpdates_ForCoach } from "../../services/AdminServices";
import { IUser } from "../../interface/models/User";
import { useQuery } from "@tanstack/react-query";
import moment from 'moment';
import { IDailyStats, IUpdatesForUser } from "../../interface/IDailyUpdates";
import { getRandomColor, isEmpty } from "../../lib/utils";
import UserDailyDetailView from "./user-details-view";
import { IWeeklyStatsExtended, IWeeklyUpdatesForUser } from "../../interface/IWeeklyUpdates";
import { MobileAdminNav } from "../../components/layout/mobile-admin-nav";
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


  // Fetch user's list 
  const { data: UserListWithUpdates } = useQuery<IUpdatesForUser[]>({
    queryKey: ["coach-userlist"],
    queryFn: () => getUserListWithUpdates_ForCoach({ Day: moment(currentDate).subtract(1, 'days').format("DD-MM-YYYY") }).then(res => res.data.data)
  });

  //fetch weekly 
  const { data: UserListWithWeeklyUpdates } = useQuery<IWeeklyUpdatesForUser[]>({
    queryKey: ["coach-userlist-weekly"],
    queryFn: () => getUserListWithWeeklyUpdates_ForCoach(0).then(res => res.data.data)
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

  // Handle sending reminder to user
  const handleSendReminder = (userId: number) => {
    const user = USERS.find(u => u.id === userId);
    if (user) {
      alert(`Reminder sent to ${user.name}!`);
    }
  };

  // Filter users based on active tab
  const filteredUsers = UserListWithUpdates?.filter(user => {
    if (activeTab === "updated") return user.IdStats != null;
    if (activeTab === "missed") return user.IdStats == null;
    return true; // "all" tab
  });


  // Count updated and missed users
  const updatedCount = UserListWithUpdates?.filter(user => (moment(user.Day!, "DD-MM-YYYY").format("DD-MM-YYYY") == moment(currentDate).subtract(1, 'days').format("DD-MM-YYYY"))).length;

  const missedCount = UserListWithUpdates?.length ? (UserListWithUpdates.length - updatedCount!): 0;

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
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-50 flex items-center justify-center px-4">
        <h1 className="font-bold text-lg text-gray-900 dark:text-white">FitwithPKAdmin</h1>
      </header>

      <div className="mt-14 mb-14 p-4 h-full w-full">
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
                      <p className="text-sm text-gray-600">Updated Today</p>
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
                    console.log("each user", user);
                    const fullname = `${user.FirstName} ${user.LastName}`;
                    const initials = fullname
                      .split(' ')
                      .map(part => part[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase();

                    console.log("111>>", moment(user.Day!, "DD-MM-YYYY").format("DD-MM-YYYY"));
                    console.log("222", moment(currentDate).subtract(1, 'days').format("DD-MM-YYYY"));

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
                              {(moment(user.Day!, "DD-MM-YYYY").format("DD-MM-YYYY") == moment(currentDate).subtract(1, 'days').format("DD-MM-YYYY")) ? `Last update: ${formatDate(user.Day!)}` : `Last update: ${formatDate(user.Day!)}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${(moment(user.Day!, "DD-MM-YYYY").format("DD-MM-YYYY") == moment(currentDate).subtract(1, 'days').format("DD-MM-YYYY")) ? 'bg-green-100' : 'bg-red-100'}`}>
                            {(moment(user.Day!, "DD-MM-YYYY").format("DD-MM-YYYY") == moment(currentDate).subtract(1, 'days').format("DD-MM-YYYY")) ? (
                              <Check size={20} className="text-green-600" />
                            ) : (
                              <X size={20} className="text-red-600" />
                            )}
                          </div>
                          {(moment(user.Day!, "DD-MM-YYYY").format("DD-MM-YYYY") != moment(currentDate).subtract(1, 'days').format("DD-MM-YYYY")) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendReminder(user.IdUser!);
                              }}
                              className="p-2 bg-orange-100 hover:bg-orange-200 rounded-full transition-colors"
                              title="Send Reminder"
                            >
                              <Bell size={16} className="text-orange-600" />
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
              // Weekly view mode - show a prompt to select a user
              <div>
                <div className="text-center mb-6">
                  <Calendar size={40} className="mx-auto text-gray-400 mb-4" />
                  <h3 className="font-medium mb-2">Select a User</h3>
                  <p className="text-gray-500 text-sm">
                    Please select a user to view their weekly progress, body measurements, and progress photos.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {UserListWithWeeklyUpdates?.map(user => {
                    // Get initials from name
                    const fullname = `${user.FirstName} ${user.LastName}`;
                    const initials = fullname
                      .split(' ')
                      .map(part => part[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase();

                    return (
                      <div
                        key={user.IdUser}
                        className="flex items-center p-4 bg-white rounded-lg border hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleSelectUser(user.IdUser)}
                      >
                        <div className={`w-14 h-14 ${getRandomColor(fullname)} rounded-full flex items-center justify-center text-white text-xl font-bold mr-4`}>
                          {initials}
                        </div>
                        <div>
                          <p className="text-lg font-semibold">{fullname}</p>
                          <p className="text-sm text-gray-500">

                            {formatDate(user.DateRange!) == "" ? "Not Available" : `Last update: ${formatDate(user.DateRange!)}`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
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
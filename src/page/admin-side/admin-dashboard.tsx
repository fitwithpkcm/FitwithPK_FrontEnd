// Create a new file at src/page/admin-side/admin-dashboard.tsx
import React, { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../hooks/use-auth";
import { RENDER_URL } from "../../common/Urls";
import { MobileAdminNav } from "../../components/layout/mobile-admin-nav";
import { ArrowRightLeft, BarChart2, ClipboardCheck, Plus, Target, Trash2, UserCheck, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { IUser, SuperAdminResponse } from "../../interface/models/User";
import { getUserListForACoach, getUserListWithUpdates_ForCoach, isSuperAdminApi } from "../../services/AdminServices";
import { ACCESS_STATUS, BASE_URL } from "../../common/Constant";
import { setBaseUrl } from "../../services/HttpService";
import { IUpdatesForUser } from "../../interface/IDailyUpdates";
import moment from "moment";
import { useTheme } from "next-themes";

export default function AdminDashboard() {

  const data = useAuth();
  const [, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  const currentDate = new Date();

  const { user, } = useAuth();



  /**
  * author : basil1112
  * set up base url
   */
  useEffect(() => {
    setBaseUrl(BASE_URL);
    setTheme('light')
  }, []);

  // Fetch user's list 
  const { data: coach_client_list } = useQuery<IUser[]>({
    queryKey: ["coach-userlist-dashboard"],
    queryFn: () => getUserListForACoach(null).then(res => res.data.data)
  });

  // Fetch user's list 
  const { data: UserListWithUpdates } = useQuery<IUpdatesForUser[]>({
    queryKey: ["coach-userlist-dashboard"],
    queryFn: () => getUserListWithUpdates_ForCoach({ Day: moment(currentDate).format("DD-MM-YYYY") }).then(res => res.data.data)
  });


  const { data: isSuperAdmin } = useQuery<SuperAdminResponse>({
    queryKey: ["is-super-admin"],
    queryFn: () => isSuperAdminApi(0).then(res => res.data.data)
  });





  const [quickNotes, setQuickNotes] = useState<string[]>([
    "Weekly progress reviews due this Friday",
    "New nutrition plans available",
    "Check client feedback messages"
  ]);
  const [newNote, setNewNote] = useState("");

  // Add new quick note
  const addQuickNote = () => {
    if (newNote.trim()) {
      setQuickNotes([...quickNotes, newNote.trim()]);
      setNewNote("");
    }
  };

  // Delete quick note
  const deleteQuickNote = (index: number) => {
    setQuickNotes(quickNotes.filter((_, i) => i !== index));
  };

  const getActiveUserCount = (clientList: IUser[]): number => {
    const data = clientList.filter((element) => {
      return element.ActiveStatus == ACCESS_STATUS.ACTIVE.NUMBER
    })
    return data ? data.length : 0
  }

  const getUpdatedCount = (UserListWithUpdates: IUpdatesForUser[]) => {
    const updatedCount = UserListWithUpdates?.filter(user => user.IdStats != null).length;
    return updatedCount ? updatedCount : 0;
  }

  return (

    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-50 flex items-center justify-center px-4">
        <h1 className="font-bold text-lg text-gray-900 dark:text-white">FitwithPKAdmin</h1>
      </header>

      {/* Main Content */}
      <main className="pt-16">

        <div className="p-4 space-y-6">
          {/* Today's Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setLocation(RENDER_URL.ADMIN_CLIENT_MANAGEMENT) }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active Clients</p>
                  <p className="text-2xl font-bold text-green-600">{`${getActiveUserCount(coach_client_list ? coach_client_list : [])}/${coach_client_list?.length}`}</p>
                  <p className="text-xs text-gray-400">Tap to manage</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Users className="text-green-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setLocation(RENDER_URL.ADMIN_UPDATES) }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Daily Updates</p>
                  <p className="text-2xl font-bold text-blue-600">{`${getUpdatedCount(UserListWithUpdates ? UserListWithUpdates : [])}/${coach_client_list?.length}`}</p>
                  <p className="text-xs text-gray-400">Tap to view</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <ClipboardCheck className="text-blue-600" size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                className="bg-white p-4 rounded-lg border text-left hover:shadow-md transition-shadow"
                onClick={() => { setLocation(RENDER_URL.ADMIN_UPDATES) }}
              >
                <div className="flex items-center mb-2">
                  <ClipboardCheck className="text-blue-600 mr-2" size={20} />
                  <span className="font-medium">Check Updates</span>
                </div>
                <p className="text-xs text-gray-500">View recent client progress</p>
              </button>

              <button
                className="bg-white p-4 rounded-lg border text-left hover:shadow-md transition-shadow"
                onClick={() => { setLocation(RENDER_URL.ADMIN_TARGETS) }}
              >
                <div className="flex items-center mb-2">
                  <Target className="text-purple-600 mr-2" size={20} />
                  <span className="font-medium">Targets</span>
                </div>
                <p className="text-xs text-gray-500">Set goals & manage plans</p>
              </button>

              <button
                className="bg-white p-4 rounded-lg border text-left hover:shadow-md transition-shadow"
                onClick={() => { setLocation(RENDER_URL.ADMIN_NUTRISWAP) }}
              >
                <div className="flex items-center mb-2">
                  <ArrowRightLeft className="text-orange-600 mr-2" size={20} />
                  <span className="font-medium">NutriSwap</span>
                </div>
                <p className="text-xs text-gray-500">Manage food alternatives</p>
              </button>

              <button
                className="bg-white p-4 rounded-lg border text-left hover:shadow-md transition-shadow"
                onClick={() => { setLocation(RENDER_URL.ADMIN_ANALYTICS) }}
              >
                <div className="flex items-center mb-2">
                  <BarChart2 className="text-green-600 mr-2" size={20} />
                  <span className="font-medium">Analytics</span>
                </div>
                <p className="text-xs text-gray-500">View detailed metrics</p>
              </button>
              {isSuperAdmin?.IsSuperAdmin == 1 &&
                <button
                  className="bg-white p-4 rounded-lg border text-left hover:shadow-md transition-shadow"
                  onClick={() => { setLocation(RENDER_URL.ADMIN_COACH_MANAGE) }}
                >
                  <div className="flex items-center mb-2">
                    <UserCheck className="text-indigo-600 mr-2" size={20} />
                    <span className="font-medium">Coaches</span>
                  </div>
                  <p className="text-xs text-gray-500">Manage coach profiles</p>
                </button>
              }
            </div>
          </div>

          {/* Quick Notes */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Quick Notes</h2>
            <div className="bg-white rounded-lg border p-4">
              {/* Add Note Input */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a quick note..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && addQuickNote()}
                />
                <button
                  onClick={addQuickNote}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>

              {/* Notes List */}
              <div className="space-y-2">
                {quickNotes.map((note, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <span className="text-sm text-gray-800">{note}</span>
                    <button
                      onClick={() => deleteQuickNote(index)}
                      className="p-1 text-red-500 hover:bg-red-100 rounded-full transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {quickNotes.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">No notes yet. Add your first note above!</p>
                )}
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Bottom Navigation */}
      <MobileAdminNav />
    </div>
  );
}
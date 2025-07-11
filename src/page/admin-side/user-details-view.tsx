import React, { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
import { ActivityIcon, ArrowLeft, Check, Clock, Droplet, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { IDailyStats, IUpdatesForUser } from "@/interface/IDailyUpdates";
import { getUserListWithUpdates_ForCoach } from "@/services/AdminServices";
import { BASE_URL } from "@/common/Constant";
import { setBaseUrl } from "../../services/HttpService"
import moment from 'moment';
import { getDailyUpdate } from "@/services/UpdateServices";
import RatingSmiley from "@/components/ui/rating-smiley";
import { Card, CardContent } from "@/components/ui/card";
import { isEmpty } from "@/lib/utils";


// Interface for the component props
interface UserDetailViewProps {
  userId: number;
  onBack: () => void;
}

export default function UserDailyDetailView({ userId, onBack }: UserDetailViewProps) {

  const [user, setUser] = useState<any>(null);

  const currentDate = new Date();

  /**
     * author : basil1112
     * set up base url
     */
  useEffect(() => {
    setBaseUrl(BASE_URL);
  }, []);

  const { data: UserListWithUpdates } = useQuery<IUpdatesForUser[]>({
    queryKey: ["coach-userlist"],
    queryFn: () => getUserListWithUpdates_ForCoach({ Day: moment(currentDate).format("DD-MM-YYYY") }).then(res => res.data.data)
  });

  const { data: dailyUpdates = [] } = useQuery<IDailyStats[]>({
    queryKey: [`daily_updates_for_${userId}`],
    queryFn: () => getDailyUpdate({ IdUser: userId, showEmpty: true }).then((res) => res.data.data)
  });

  useEffect(() => {
    // Find the user based on ID
    const foundUser = UserListWithUpdates?.find(u => u.IdUser === userId);
    if (foundUser) {
      setUser(foundUser);
    }
  }, [userId]);

  if (!user) {
    return (
      <div className="p-4 text-center">
        <p>User not found</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md"
        >
          Back to List
        </button>
      </div>
    );
  }


  /**
 * Method list the daily updates
 * @author basil1112
 */
  const renderDailyUpdatesList = () => {
    return (<>
      {dailyUpdates.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500 dark:text-gray-400">No daily updates logged yet.</p>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Tap the + button below to add one.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* //looops */}
          {dailyUpdates.map((update, index) => {
            const dayNumber = dailyUpdates.length - index;
            const IdStats = update.IdStats;

            const formattedDate = IdStats ? moment(update.Day, "DD-MM-YYYY").format("ddd, MMM D") :
              moment(update.DayDate, "DD-MM-YYYY").format("ddd, MMM D")
              ;

            if (!isEmpty(IdStats)) {
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
                            {typeof update.Diet_Follow === 'number' && (

                              <div>
                                <div className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${update.Diet_Follow >= 3 ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
                                  }`}>
                                  {update.Diet_Follow}/5
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-3">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-600 dark:text-green-400">
                            <path d="M10 8V16M14 8V16M18 8V16M6 8V16M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Workout</p>
                          <div className={`font-medium ${update.WorkOut == 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {typeof update.WorkOut === 'number' && (

                              <div>
                                <div className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${update.WorkOut_Follow! >= 3 ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
                                  }`}>
                                  {update.WorkOut}/5
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Notes section - only show if notes exist */}
                    {update.Notes && update.Notes.trim() !== "" && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</h4>
                        <p className="text-sm">{update.Notes}</p>
                      </div>
                    )}

                  </CardContent>
                </Card>
              );
            }
            else {
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
                    </div>
                    <div className="py-6 text-center text-gray-500">
                      <p>No tracking data for this day</p>
                    </div>
                  </CardContent></Card>
              );
            }

          })}


        </div>
      )}
    </>)
  }

  return (
    <div className="p-0">
      {/* Header */}
      <div className="flex items-center mb-3 px-2">
        <div>
          <h1 className="text-xl font-bold">{user.name}</h1>
          <p className="text-sm text-gray-500">Tracking History</p>
        </div>
      </div>

      {/* Daily tracking cards */}

      {renderDailyUpdatesList()}


    </div>
  );
}
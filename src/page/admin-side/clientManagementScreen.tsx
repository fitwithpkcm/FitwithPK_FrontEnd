import React, { useEffect, useState } from "react";
import { Users, Play, Pause, X, Search } from "lucide-react";
import { MobileAdminNav } from "../../components/layout/mobile-admin-nav";
import { IUpdatesForUser } from "../../interface/IDailyUpdates";
import { IUser } from "../../interface/models/User";
import { useQuery } from "@tanstack/react-query";
import { getUserListForACoach } from "../../services/AdminServices";
import { ACCESS_STATUS } from "../../common/Constant";

import { BASE_URL } from "../../common/Constant";
import { setBaseUrl } from "../../services/HttpService"

export default function ClientManagementScreen() {
  const [clientList, setClientList] = useState<IUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const handleStatusChange = (clientId: number | undefined, newStatus: "active" | "paused" | "inactive") => {
    setClientList(prev =>
      prev.map(client =>
        client.IdUser === clientId ? { ...client, status: newStatus } : client
      )
    );
  };


  /**
  * author : basil1112
  * set up base url
   */
  useEffect(() => {
    setBaseUrl(BASE_URL);
  }, []);


  // Fetch user's list 
  const { data: coach_client_list } = useQuery<IUser[]>({
    queryKey: ["coach-userlist"],
    queryFn: () => getUserListForACoach(null).then(res => res.data.data)
  });


  const filteredClients = coach_client_list?.filter(client =>
    client.FirstName!.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.EmailID!.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: number | undefined) => {
    switch (status) {
      case ACCESS_STATUS.ACTIVE.NUMBER: return "bg-green-100 text-green-800";
      case ACCESS_STATUS.PAUSE.NUMBER: return "bg-yellow-100 text-yellow-800";
      case ACCESS_STATUS.DE_ACTIVE.NUMBER: return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: number | undefined) => {
    switch (status) {
      case ACCESS_STATUS.ACTIVE.NUMBER: return "🟢";
      case ACCESS_STATUS.PAUSE.NUMBER: return "⏸️";
      case ACCESS_STATUS.DE_ACTIVE.NUMBER: return "⭕";
      default: return "⭕";
    }
  };

  return (

    <>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-50 flex items-center justify-center px-4">
        <h1 className="font-bold text-lg text-gray-900 dark:text-white">FitwithPKAdmin</h1>
      </header>

      <div className="p-4 mt-14 h-full w-full bg-gray-50">
        {/* Header */}
        <div className="flex items-center mb-6">
          <div className="bg-blue-100 p-3 rounded-full mr-4">
            <Users className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Client Management</h1>
            <p className="text-gray-500">Manage client status and activity</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search clients by name or email..."
            className="w-full pl-10 pr-4 py-3 border rounded-lg bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border text-center">
            <div className="text-2xl font-bold text-green-600">
              {coach_client_list?.filter(c => c.ActiveStatus === ACCESS_STATUS.ACTIVE.NUMBER).length}
            </div>
            <div className="text-sm text-gray-500">Active</div>
          </div>
          <div className="bg-white p-4 rounded-lg border text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {coach_client_list?.filter(c => c.ActiveStatus === ACCESS_STATUS.PAUSE.NUMBER).length}
            </div>
            <div className="text-sm text-gray-500">Paused</div>
          </div>
          <div className="bg-white p-4 rounded-lg border text-center">
            <div className="text-2xl font-bold text-gray-600">
              {coach_client_list?.filter(c =>
                c.ActiveStatus === ACCESS_STATUS.DE_ACTIVE.NUMBER ||
                c.ActiveStatus === ACCESS_STATUS.DELETE.NUMBER
              ).length}
            </div>
            <div className="text-sm text-gray-500">Inactive</div>
          </div>
        </div>


        {/* Client List */}
        <div className="space-y-3 mb-20">
          {filteredClients?.map(client => (
            <div key={client.IdUser} className="bg-white p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center flex-1 cursor-pointer hover:bg-gray-50 p-2 rounded-md -m-2"
                  onClick={() => { alert('viewing removed') }}
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <span className="text-blue-600 font-semibold">{client.FirstName?.[0] ?? ''}{client.LastName?.[0] ?? ''}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{client.FirstName} {client.LastName}</h3>
                    <p className="text-sm text-gray-500">{client.EmailID}</p>
                    <p className="text-xs text-blue-500">Tap to view profile</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(client.ActiveStatus)}`}>
                    {getStatusIcon(client.ActiveStatus)} {client.ActiveStatus}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end mt-3 space-x-2">
                {client.ActiveStatus !== ACCESS_STATUS.ACTIVE.NUMBER && (
                  <button
                    onClick={() => handleStatusChange(client.IdUser, "active")}
                    className="flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200"
                  >
                    <Play size={14} className="mr-1" />
                    Activate
                  </button>
                )}

                {client.ActiveStatus === ACCESS_STATUS.ACTIVE.NUMBER && (
                  <button
                    onClick={() => handleStatusChange(client.IdUser, "paused")}
                    className="flex items-center px-3 py-1 bg-yellow-100 text-yellow-700 rounded-md text-sm hover:bg-yellow-200"
                  >
                    <Pause size={14} className="mr-1" />
                    Pause
                  </button>
                )}

                {client.ActiveStatus !== ACCESS_STATUS.DE_ACTIVE.NUMBER && (
                  <button
                    onClick={() => handleStatusChange(client.IdUser, "inactive")}
                    className="flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200"
                  >
                    <X size={14} className="mr-1" />
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <MobileAdminNav />
    </>

  );
}
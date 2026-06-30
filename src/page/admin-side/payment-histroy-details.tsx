import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, XCircle, Calendar } from "lucide-react";
import { setBaseUrl } from "../../services/HttpService";
import { BASE_URL } from "../../common/Constant";
import { ICoachingPlan, IUser } from "../../interface/models/User";
import { getLoggedUserDetails, getCoachingHistory } from "../../services/ProfileService";
import moment from "moment";
import { useLocation, useNavigate } from "react-router-dom";
import { AdminPageHeader } from "../../components/layout/page-header";

export default function PaymentHistoryScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedUserID = location.state?.selectedUserID;

  useEffect(() => { setBaseUrl(BASE_URL); }, []);

  const { data: profileData } = useQuery<Partial<IUser> | undefined>({
    queryKey: [`profile_${selectedUserID}`],
    queryFn: async () => {
      const res = await getLoggedUserDetails({ IdUser: selectedUserID });
      return res.data.data[0];
    },
  });

  const { data: history = [] } = useQuery<ICoachingPlan[]>({
    queryKey: [`coaching_history_${selectedUserID}`],
    queryFn: async () => {
      const res = await getCoachingHistory({ IdUser: selectedUserID });
      return res.data.data ?? [];
    },
  });

  const statusBadge = (record: ICoachingPlan) => {
    if (!record.EndDate) return null;
    const days = moment(record.EndDate).diff(moment().startOf('day'), 'days');
    if (days >= 0) {
      return (
        <span className="flex items-center gap-1 text-green-700 bg-green-100 px-2.5 py-1 text-xs font-semibold rounded-full">
          <CheckCircle size={12} /> Active
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-gray-500 bg-gray-100 px-2.5 py-1 text-xs font-semibold rounded-full">
        <XCircle size={12} /> Expired
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminPageHeader
        title="Coaching History"
        subtitle={profileData ? `${profileData.FirstName} ${profileData.LastName}` : undefined}
        onBack={() => navigate(-1)}
      />

      <div className="p-4 space-y-3">
        {history.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Calendar size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No coaching periods yet</p>
          </div>
        ) : (
          history.map((record, idx) => {
            const daysLeft = record.EndDate
              ? moment(record.EndDate).diff(moment().startOf('day'), 'days')
              : null;
            const isActive = daysLeft !== null && daysLeft >= 0;

            return (
              <div
                key={record.IdPlan ?? idx}
                className={`bg-white rounded-xl border shadow-sm p-4 ${isActive ? 'border-green-300' : 'border-gray-100'}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <p className="font-semibold text-gray-900">{record.PlanName || 'Coaching Plan'}</p>
                  {statusBadge(record)}
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-xs text-gray-500">Amount</p>
                    <p className="font-semibold text-gray-800">€{record.Price ?? 0}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-xs text-gray-500">Start Date</p>
                    <p className="font-medium text-gray-800">
                      {record.StartDate ? moment(record.StartDate).format('DD MMM YYYY') : '—'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-xs text-gray-500">End Date</p>
                    <p className="font-medium text-gray-800">
                      {record.EndDate ? moment(record.EndDate).format('DD MMM YYYY') : '—'}
                    </p>
                  </div>
                  {isActive && daysLeft !== null && (
                    <div className="bg-blue-50 rounded-lg p-2.5">
                      <p className="text-xs text-blue-600">Days Left</p>
                      <p className="font-bold text-blue-700">{daysLeft} days</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

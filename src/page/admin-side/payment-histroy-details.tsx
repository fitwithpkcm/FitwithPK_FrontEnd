import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  Edit3,
  Save,
  X,
} from "lucide-react";
import { setBaseUrl } from "../../services/HttpService";
import { BASE_URL } from "../../common/Constant";
import { ISubscriptionHistory, IUser } from "../../interface/models/User";
import {
  getLoggedUserDetails,
  getSubscriptionHistroy,
} from "../../services/ProfileService";
import moment from "moment";
import { setUpdatePaymentHistory } from "../../services/AdminServices";
import { useLocation } from "react-router-dom";

export default function PaymentHistoryScreen() {


  const location = useLocation();
  const selectedUserID = location.state?.selectedUserID;

  useEffect(() => {
    setBaseUrl(BASE_URL);
  }, []);

  const queryClient = useQueryClient();

  const { data: profileData } = useQuery<Partial<IUser> | undefined>({
    queryKey: [`subscription_date_${selectedUserID}`],
    queryFn: async () => {
      const res = await getLoggedUserDetails({ IdUser: selectedUserID });
      return res.data.data[0];
    },
  });

  const { data: subscriptionHistroyData = [] } = useQuery<
    ISubscriptionHistory[]
  >({
    queryKey: [`subscription_history_${selectedUserID}`],
    queryFn: async () => {
      const res = await getSubscriptionHistroy({ IdUser: selectedUserID });
      return res.data.data;
    },
  });

  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editedData, setEditedData] = useState<Record<string, number>>({});

  const handleEdit = (index: number, data: ISubscriptionHistory) => {
    setEditIndex(index);
    setEditedData({
      PaidAmount: data.PaidAmount,
      BufferDay: data.BufferDay,
    });
  };

  const handleCancel = () => {
    setEditIndex(null);
    setEditedData({});
  };

  const handleSave = (id: number) => {
    console.log("Saving updated data:", { id, ...editedData });

    updatePaymentHistoryDetails({
      IdSubHistroy: id,
      ...editedData
    })

    setEditIndex(null);

  };


  const { mutate: updatePaymentHistoryDetails } = useMutation({
    mutationFn: async (data: unknown) => {
      const response = await setUpdatePaymentHistory(data)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`subscription_history_${selectedUserID}`] });

    },
    onError: (error) => {
      console.error('Error saving payment history:', error);
    }
  });


  const renderStatusBadge = (data: ISubscriptionHistory) => {
    if (data.PaidAmount === 0)
      return (
        <span className="flex items-center gap-1 text-amber-600 bg-amber-100 px-2 py-1 text-xs font-medium rounded-full">
          <Clock size={14} /> Pending
        </span>
      );

    if (data.BalanceAmount > 0)
      return (
        <span className="flex items-center gap-1 text-red-600 bg-red-100 px-2 py-1 text-xs font-medium rounded-full">
          <XCircle size={14} /> Partial
        </span>
      );

    return (
      <span className="flex items-center gap-1 text-green-600 bg-green-100 px-2 py-1 text-xs font-medium rounded-full">
        <CheckCircle size={14} /> Paid
      </span>
    );
  };

  const renderPaymentDetail = () => (
    <div className="mt-4 flex flex-col gap-4">
      {subscriptionHistroyData.map((data, idx) => {
        const isEditing = editIndex === idx;

        return (
          <div
            key={idx}
            className={`relative bg-white border rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-5 ${data.IsAlive ? "border-blue-400 bg-blue-50/30" : "border-gray-100"
              }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {data.PlanName}
                </h3>
                <p className="text-sm text-gray-500">{data.PlanDescription}</p>
              </div>
              <div className="flex items-center gap-2">
                {renderStatusBadge(data)}

                {isEditing ? (
                  <>
                    <button
                      onClick={() => handleSave(data.IdSubHistroy)}
                      className="p-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700"
                    >
                      <Save size={16} />
                    </button>
                    <button
                      onClick={handleCancel}
                      className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-600"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleEdit(idx, data)}
                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    <Edit3 size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Start Date</p>
                <p className="font-medium">
                  {moment(data.StartDate).format("DD MMM YYYY")}
                </p>
              </div>

              <div>
                <p className="text-gray-500">End Date</p>
                <p className="font-medium">
                  {moment(data.EndDate).format("DD MMM YYYY")}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Paid Date</p>
                <p className="font-medium">
                  {data.PaidDate
                    ? moment(data.PaidDate).format("DD MMM YYYY")
                    : "-"}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Buffer Days</p>
                {isEditing ? (
                  <input
                    type="number"
                    value={editedData.BufferDay}
                    onChange={(e) =>
                      setEditedData({
                        ...editedData,
                        BufferDay: Number(e.target.value),
                      })
                    }
                    className="w-full border rounded-lg px-2 py-1 text-gray-800 focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                ) : (
                  <p className="font-medium">{data.BufferDay}</p>
                )}
              </div>

              <div>
                <p className="text-gray-500">Total</p>
                <p className="font-medium text-gray-800">₹{data.TotalDue}</p>
              </div>

              <div>
                <p className="text-gray-500">Paid Amount</p>
                {isEditing ? (
                  <input
                    type="number"
                    value={editedData.PaidAmount}
                    onChange={(e) =>
                      setEditedData({
                        ...editedData,
                        PaidAmount: Number(e.target.value),
                      })
                    }
                    className="w-full border rounded-lg px-2 py-1 text-gray-800 focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                ) : (
                  <p className="font-medium text-green-700">
                    ₹{data.PaidAmount}
                  </p>
                )}
              </div>

              <div>
                <p className="text-gray-500">Balance Due</p>
                <p className="font-medium text-red-600">₹{data.BalanceAmount}</p>
              </div>


            </div>

            {data.IsAlive ? (
              <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs px-3 py-1 rounded-full shadow">
                Active
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="p-4 md:p-6 h-full w-full bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center mb-8">
        <button
          onClick={() => { }}
          className="mr-3 p-2 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
          <span className="text-blue-600 font-semibold text-lg">
            {`${profileData?.FirstName?.charAt(0)}${profileData?.LastName?.charAt(0)}`}
          </span>
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">
            {`${profileData?.FirstName} ${profileData?.LastName}`}
          </h1>
          <div className="flex items-center text-sm text-gray-500">
            <Mail size={14} className="mr-1" />
            {profileData?.EmailID}
          </div>
        </div>
      </div>

      <div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">
            Payment History
          </h3>
          <span className="text-sm text-gray-500">
            {subscriptionHistroyData.length} Records
          </span>
        </div>

        {renderPaymentDetail()}
      </div>
    </div>
  );
}

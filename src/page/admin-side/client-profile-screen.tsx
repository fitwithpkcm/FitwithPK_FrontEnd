import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Calendar, FileText, Eye, Plus, Save, X, CheckCircle, AlertTriangle, Upload, Trash2 } from "lucide-react";
import { getLoggedUserDetails } from "../../services/ProfileService";
import { setCoachingPlan, uploadMedicalDocument, getMedicalDocuments, deleteMedicalDocument } from "../../services/AdminServices";
import toast from "react-hot-toast";
import { IUser } from "../../interface/models/User";
import { IMedicalDocument, MedicalDocumentType } from "../../interface/IMedicalDocument";
import { setBaseUrl } from "../../services/HttpService";
import { BASE_URL } from "../../common/Constant";
import moment from "moment";
import { RENDER_URL } from "@/common/Urls";
import { useNavigate, useLocation } from "react-router-dom";
import { AdminPageHeader } from "../../components/layout/page-header";

export default function ClientProfileScreen() {

  const navigate = useNavigate();
  const location = useLocation();
  const selectedUserID = location.state?.selectedUserID;

  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState({ PlanName: '', Price: '', StartDate: '', EndDate: '' });
  const queryClient = useQueryClient();

  // Medical documents / blood reports
  const [showMedicalUpload, setShowMedicalUpload] = useState(false);
  const [medicalFiles, setMedicalFiles] = useState<File[]>([]);
  const [medicalDocType, setMedicalDocType] = useState<MedicalDocumentType>('Blood Report');
  const [medicalNotes, setMedicalNotes] = useState('');
  const medicalFileInputRef = useRef<HTMLInputElement>(null);


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


  const { mutate: savePlan, isPending: savingPlan } = useMutation({
    mutationFn: (data: Parameters<typeof setCoachingPlan>[0]) => setCoachingPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`subscription_date_${selectedUserID}`] });
      setShowPlanForm(false);
      setPlanForm({ PlanName: '', Price: '', StartDate: '', EndDate: '' });
      toast.success('Coaching plan saved!');
    },
    onError: () => toast.error('Failed to save plan'),
  });

  const { data: medicalDocuments = [], isLoading: medicalDocsLoading } = useQuery<IMedicalDocument[]>({
    queryKey: [`medical_documents_${selectedUserID}`],
    enabled: !!selectedUserID,
    queryFn: async () => {
      const res = await getMedicalDocuments({ IdUser: selectedUserID });
      return res.data?.data ?? [];
    },
  });

  const resetMedicalForm = () => {
    setMedicalFiles([]);
    setMedicalDocType('Blood Report');
    setMedicalNotes('');
    setShowMedicalUpload(false);
  };

  const { mutate: uploadMedical, isPending: uploadingMedical } = useMutation({
    mutationFn: (formData: FormData) => uploadMedicalDocument(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`medical_documents_${selectedUserID}`] });
      resetMedicalForm();
      toast.success('Document(s) uploaded successfully!');
    },
    onError: () => toast.error('Failed to upload document'),
  });

  const { mutate: deleteMedical } = useMutation({
    mutationFn: (params: { IdDocument: number }) => deleteMedicalDocument(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`medical_documents_${selectedUserID}`] });
      toast.success('Document deleted');
    },
    onError: () => toast.error('Failed to delete document'),
  });

  const handleMedicalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setMedicalFiles(Array.from(files));
  };

  const handleUploadMedical = () => {
    if (medicalFiles.length === 0) {
      toast.error('Please choose at least one file');
      return;
    }
    const formData = new FormData();
    formData.append('IdUser', String(selectedUserID));
    formData.append('DocumentType', medicalDocType);
    if (medicalNotes.trim()) formData.append('Notes', medicalNotes.trim());
    medicalFiles.forEach(file => formData.append('MedicalDoc', file));
    uploadMedical(formData);
  };

  const handleDeleteMedical = (doc: IMedicalDocument) => {
    if (!doc.IdDocument) return;
    if (!window.confirm(`Delete "${doc.OriginalName || doc.FileName}"? This cannot be undone.`)) return;
    deleteMedical({ IdDocument: doc.IdDocument });
  };


  const showHistoryPage = () => {

    navigate(RENDER_URL.ADMIN_PAYMENT_HISTORY, {
      state: {
        selectedUserID: selectedUserID
      }
    });

  }


  const renderPaymentDetail = () => {
    const endDate = profileData?.EndDate ? moment(profileData.EndDate) : null;
    const daysLeft = endDate ? endDate.diff(moment().startOf('day'), 'days') : null;
    const isActive = daysLeft !== null && daysLeft >= 0;
    const isExpiringSoon = daysLeft !== null && daysLeft <= 10 && daysLeft >= 0;

    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">Coaching Plan</h3>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setPlanForm({
                  PlanName: profileData?.PlanName || '',
                  Price: profileData?.Price ? String(profileData.Price) : '',
                  StartDate: profileData?.StartDate ? moment(profileData.StartDate).format('YYYY-MM-DD') : '',
                  EndDate: profileData?.EndDate ? moment(profileData.EndDate).format('YYYY-MM-DD') : '',
                });
                setShowPlanForm(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={13} />
              {profileData?.PlanName ? 'New Period' : 'Add Plan'}
            </button>
            <button
              onClick={showHistoryPage}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <Eye size={13} />
              History
            </button>
          </div>
        </div>

        {/* Add / Edit form */}
        {showPlanForm && (
          <div className="px-4 py-4 bg-blue-50 border-b border-blue-100">
            <p className="text-sm font-medium text-blue-800 mb-3">New Coaching Period</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Plan Name</label>
                <input
                  type="text"
                  placeholder="e.g. 3-Month Transformation"
                  value={planForm.PlanName}
                  onChange={e => setPlanForm(f => ({ ...f, PlanName: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Amount (€)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={planForm.Price}
                  onChange={e => setPlanForm(f => ({ ...f, Price: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={planForm.StartDate}
                    onChange={e => setPlanForm(f => ({ ...f, StartDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">End Date</label>
                  <input
                    type="date"
                    value={planForm.EndDate}
                    onChange={e => setPlanForm(f => ({ ...f, EndDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    if (!planForm.PlanName || !planForm.StartDate || !planForm.EndDate) {
                      toast.error('Fill in all fields');
                      return;
                    }
                    savePlan({
                      IdUser: selectedUserID,
                      PlanName: planForm.PlanName,
                      Price: parseFloat(planForm.Price) || 0,
                      StartDate: planForm.StartDate,
                      EndDate: planForm.EndDate,
                      PaidAmount: parseFloat(planForm.Price) || 0,
                    });
                  }}
                  disabled={savingPlan}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  <Save size={14} />
                  {savingPlan ? 'Saving…' : 'Save Plan'}
                </button>
                <button
                  onClick={() => setShowPlanForm(false)}
                  className="px-3 py-2 bg-white border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Current plan display */}
        <div className="px-4 py-4">
          {profileData?.PlanName ? (
            <div className="space-y-3">
              {/* Status banner */}
              {isExpiringSoon ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                  <AlertTriangle size={15} />
                  Expires in {daysLeft} day{daysLeft === 1 ? '' : 's'} — renew soon
                </div>
              ) : !isActive ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <X size={15} />
                  Plan expired — add a new period
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                  <div className="text-xs text-gray-500 mb-0.5">Plan</div>
                  <div className="font-semibold text-gray-900">{profileData.PlanName}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs text-gray-500 mb-0.5">Amount</div>
                  <div className="font-semibold text-gray-900">€{profileData.Price ?? 0}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs text-gray-500 mb-0.5">Status</div>
                  <div className={`flex items-center gap-1 text-sm font-medium ${isActive ? 'text-green-600' : 'text-red-500'}`}>
                    {isActive ? <CheckCircle size={13} /> : <X size={13} />}
                    {isActive ? 'Active' : 'Expired'}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs text-gray-500 mb-0.5">Start</div>
                  <div className="font-medium text-sm">{profileData.StartDate ? moment(profileData.StartDate).format('DD MMM YYYY') : '—'}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs text-gray-500 mb-0.5">End</div>
                  <div className={`font-medium text-sm ${isExpiringSoon ? 'text-amber-600' : ''}`}>
                    {endDate ? endDate.format('DD MMM YYYY') : '—'}
                  </div>
                </div>
                {isActive && daysLeft !== null && (
                  <div className="bg-blue-50 p-3 rounded-lg col-span-2">
                    <div className="text-xs text-blue-600 mb-0.5">Days Remaining</div>
                    <div className="font-bold text-blue-700 text-lg">{daysLeft} days</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <Calendar size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No coaching plan set</p>
              <p className="text-xs mt-1">Click "Add Plan" to set up a coaching period</p>
            </div>
          )}
        </div>
      </div>
    );
  };


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

      {/* Medical Documents & Blood Reports */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Medical Documents & Blood Reports</h3>
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${profileData?.OnBoardUserAttributes?.recentBloodTest
              ? 'bg-green-100 text-green-700'
              : 'bg-orange-100 text-orange-700'
              }`}>
              {profileData?.OnBoardUserAttributes?.recentBloodTest ? 'Recent Test Available' : 'No Recent Test'}
            </div>
            <button
              onClick={() => (showMedicalUpload ? resetMedicalForm() : setShowMedicalUpload(true))}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {showMedicalUpload ? <X size={13} /> : <Plus size={13} />}
              {showMedicalUpload ? 'Cancel' : 'Upload'}
            </button>
          </div>
        </div>

        {/* Upload form */}
        {showMedicalUpload && (
          <div className="bg-white rounded-lg p-4 mb-4 border border-blue-200 space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Document Type</label>
              <select
                value={medicalDocType}
                onChange={e => setMedicalDocType(e.target.value as MedicalDocumentType)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Blood Report">Blood Report</option>
                <option value="Medical Document">Medical Document</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Files</label>
              <input
                type="file"
                ref={medicalFileInputRef}
                className="hidden"
                accept="image/*,.pdf"
                multiple
                onChange={handleMedicalFileSelect}
              />
              <button
                type="button"
                onClick={() => medicalFileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600"
              >
                <Upload size={14} />
                {medicalFiles.length > 0 ? `${medicalFiles.length} file(s) selected` : 'Choose files (image or PDF)'}
              </button>
              {medicalFiles.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {medicalFiles.map((file, i) => (
                    <li key={i} className="text-xs text-gray-500 truncate">{file.name}</li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Notes (optional)</label>
              <textarea
                value={medicalNotes}
                onChange={e => setMedicalNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Vitamin D deficiency flagged, follow up in 3 months"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <button
              onClick={handleUploadMedical}
              disabled={uploadingMedical || medicalFiles.length === 0}
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              <Save size={14} />
              {uploadingMedical ? 'Uploading…' : 'Save Document(s)'}
            </button>
          </div>
        )}

        {/* Document list */}
        {medicalDocsLoading ? (
          <div className="text-center py-6 text-gray-400 text-sm">Loading…</div>
        ) : medicalDocuments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <div>No medical documents uploaded yet</div>
          </div>
        ) : (
          <div className="space-y-2">
            {medicalDocuments.map(doc => (
              <div key={doc.IdDocument} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100">
                <a
                  href={`${BASE_URL}/uploads/medical/${doc.FileName}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 min-w-0"
                >
                  <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{doc.OriginalName || doc.FileName}</p>
                    <p className="text-xs text-gray-400">
                      {doc.DocumentType} · {doc.UploadedAt ? moment(doc.UploadedAt).format('DD MMM YYYY') : ''}
                    </p>
                    {doc.Notes && <p className="text-xs text-gray-500 mt-0.5">{doc.Notes}</p>}
                  </div>
                </a>
                <button
                  onClick={() => handleDeleteMedical(doc)}
                  className="p-1.5 text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
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
    <div className="h-full w-full bg-gray-50 flex flex-col">
      <AdminPageHeader
        title="Client Profile"
        subtitle={profileData ? `${profileData.FirstName} ${profileData.LastName}` : undefined}
        onBack={() => navigate(-1)}
      />

      <div className="p-4 pb-20">
        {renderCompleteProfile()}
      </div>
    </div>
  );
}
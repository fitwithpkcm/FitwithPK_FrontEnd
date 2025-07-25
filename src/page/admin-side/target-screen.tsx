import React, { useEffect, useState } from "react";
import { Target, Save, Check, User, ArrowLeft, FileText, Upload, Eye, Download, Utensils, Dumbbell, X } from "lucide-react";
import { format } from "date-fns";
import { setBaseUrl } from "../../services/HttpService";
import { BASE_URL } from "../../common/Constant";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { IUser } from "../../interface/models/User";
import { addDietPlan, getUserListForACoach } from "../../services/AdminServices";
import { MobileAdminNav } from "../../components/layout/mobile-admin-nav";
import { getDietPlan } from "../../services/UpdateServices";
import { IdDietPlan } from "../../interface/IDietPlan";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Button } from "../../components/ui/button";

interface UserTarget {
    steps: number;
    water: number;
    sleep: number;
}

export default function UserTargetsScreen() {
    const queryClient = useQueryClient()
    const [selectedClient, setSelectedClient] = useState<IUser | null>(null);
    const [targets, setTargets] = useState<UserTarget>({
        steps: 10000,
        water: 2.5,
        sleep: 8.0
    });
    const [showPDFViewer, setShowPDFViewer] = useState(false);
    const [selectedPDF, setSelectedPDF] = useState<{ name: string, url: string } | null>(null);
    const [dietPlans, setDietPlans] = useState<Array<{ id: number, name: string, uploadDate: string, file?: File }>>([]);
    const [workoutPlans, setWorkoutPlans] = useState<Array<{ id: number, name: string, uploadDate: string, file?: File }>>([]);
    const [coachFeedback, setCoachFeedback] = useState<string>("");
    const [saved, setSaved] = useState(false);
    const [dietPlanName, setDietPlanName] = useState("");
    const [workoutPlanName, setWorkoutPlanName] = useState("");

    const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
    const [pdfType, setPdfType] = useState<'workout' | 'diet'>('workout');
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    useEffect(() => {
        setBaseUrl(BASE_URL);
    }, []);

    const { data: dietPlanFiles } = useQuery<IdDietPlan | null>({
        queryKey: ['dietPlan', selectedClient?.IdUser],
        queryFn: async () => {
            if (!selectedClient) return null;

            const inputData = {
                IdUser: selectedClient.IdUser
            };
            const res: ApiResponse<IdDietPlan[]> = await getDietPlan(inputData);
            const data = res.data?.data?.map(element => ({
                ...element,
                FileName: JSON.parse(element.FileName.toString()),
            }));


            return data.length > 0 ? data[0] : null;
        },
        enabled: !!selectedClient
    });


    useEffect(() => {

        queryClient.invalidateQueries({ queryKey: ['dietPlan', selectedClient?.IdUser] })

        if (selectedClient && dietPlanFiles?.FileName) {
            // Parse the file names from the response
            const dietFileName = dietPlanFiles.FileName.diet_plan;
            const workoutFileName = dietPlanFiles.FileName.workout_plan;

            // Create plan objects for existing files
            const newDietPlans = [];
            const newWorkoutPlans = [];

            if (dietFileName) {
                newDietPlans.push({
                    id: Date.now(),
                    name: dietFileName.replace('.pdf', '').replace(/_/g, ' '),
                    uploadDate: format(new Date(), 'yyyy-MM-dd'),
                    url: `${BASE_URL}/uploads/dietplans/${dietFileName}`
                });
                setDietPlanName(dietFileName.replace('.pdf', '').replace(/_/g, ' '));
            }

            if (workoutFileName) {
                newWorkoutPlans.push({
                    id: Date.now() + 1,
                    name: workoutFileName.replace('.pdf', '').replace(/_/g, ' '),
                    uploadDate: format(new Date(), 'yyyy-MM-dd'),
                    url: `${BASE_URL}/uploads/workplans/${workoutFileName}`
                });
                setWorkoutPlanName(workoutFileName.replace('.pdf', '').replace(/_/g, ' '));
            }

            setDietPlans(newDietPlans);
            setWorkoutPlans(newWorkoutPlans);
            setTargets(dietPlanFiles.Targets)
            setCoachFeedback(dietPlanFiles.FeedBack);
        }
    }, [selectedClient, dietPlanFiles]);

    // Fetch user's list 
    const { data: coach_client_list = [] } = useQuery<IUser[]>({
        queryKey: ["target-userlist"],
        queryFn: () => getUserListForACoach(null).then(res => res.data.data)
    });


    // Mutation for updating targets and plans
    const { mutate: updateTargets } = useMutation({
        mutationFn: addDietPlan,
        onSuccess: () => {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        },
        onError: (error) => {
            console.error('Error updating targets:', error);
            alert('Failed to save targets');
        }
    });

    const handleSave = () => {
        if (!selectedClient) return;

        const formData = new FormData();
        formData.append('IdUser', selectedClient!.IdUser!.toString());
        formData.append('Target', JSON.stringify(targets));

        // Add diet plan if exists
        if (dietPlans.length > 0) {
            const latestDietPlan = dietPlans[dietPlans.length - 1];
            formData.append('DietName', dietPlanName || `Diet Plan ${format(new Date(), 'yyyy-MM-dd')}`);
            if (latestDietPlan.file) {
                formData.append('DietPlan', latestDietPlan.file);
            }
        }

        // Add workout plan if exists
        if (workoutPlans.length > 0) {
            const latestWorkoutPlan = workoutPlans[workoutPlans.length - 1];
            if (latestWorkoutPlan.file) {
                formData.append('WorkOutPlan', latestWorkoutPlan.file);
            }
        }

        // Add coach feedback if exists
        if (coachFeedback) {
            formData.append('Feedback', coachFeedback);
        }

        updateTargets(formData);
    };

    const handleInputChange = (field: keyof UserTarget, value: number) => {
        setTargets(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleFileUpload = (type: 'diet' | 'workout') => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file && file.type === 'application/pdf') {
                const newPlan = {
                    id: Date.now(),
                    name: file.name.replace('.pdf', ''),
                    uploadDate: format(new Date(), 'yyyy-MM-dd'),
                    file: file
                };

                if (type === 'diet') {
                    setDietPlans([...dietPlans, newPlan]);
                    setDietPlanName(file.name.replace('.pdf', ''));
                } else {
                    setWorkoutPlans([...workoutPlans, newPlan]);
                    setWorkoutPlanName(file.name.replace('.pdf', ''));
                }
            } else {
                alert('Please select a PDF file');
            }
        };
        input.click();
    };

    const handleViewPDF = (plan: { name: string, file?: File, url?: string }) => {
        if (plan.file) {
            const url = URL.createObjectURL(plan.file);
            setPdfUrl(url);
            setPdfType(plan.name.toLowerCase().includes('diet') ? 'diet' : 'workout');
            setPdfViewerOpen(true);
        } else if (plan.url) {
            setPdfUrl(plan.url);
            setPdfType(plan.name.toLowerCase().includes('diet') ? 'diet' : 'workout');
            setPdfViewerOpen(true);
        } else {
            alert('PDF not available for viewing');
        }
    };

    const handleDownloadPDF = (plan: { name: string, file?: File }) => {
        if (plan.file) {
            const url = URL.createObjectURL(plan.file);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${plan.name}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } else {
            alert('PDF not available for download');
        }
    };

    if (!selectedClient) {
        return (
            <div className="p-4 h-full w-full bg-gray-50">
                {/* Header */}
                <header className="fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-50 flex items-center justify-center px-4">
                    <h1 className="font-bold text-lg text-gray-900 dark:text-white">FitwithPKAdmin</h1>
                </header>

                <div className="flex items-center mb-6 mt-14">
                    <div className="bg-blue-100 p-3 rounded-full mr-4">
                        <User className="text-blue-600" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Select Client</h1>
                        <p className="text-gray-500">Choose a client to set targets for</p>
                    </div>
                </div>

                {/* Client List */}
                <div className="space-y-3">
                    {coach_client_list.map(client => (
                        <div
                            key={client.IdUser}
                            className="bg-white p-4 rounded-lg border flex items-center justify-between cursor-pointer hover:bg-gray-50"
                            onClick={() => setSelectedClient(client)}
                        >
                            <div className="flex items-center">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                                    <span className="text-blue-600 font-semibold">{client.FirstName}</span>
                                </div>
                                <div>
                                    <h3 className="font-semibold">{client.FirstName} {client.LastName}</h3>
                                    <p className="text-sm text-gray-500">Tap to set targets</p>
                                </div>
                            </div>
                            <ArrowLeft className="rotate-180 text-gray-400" size={20} />
                        </div>
                    ))}
                </div>

                <MobileAdminNav />
            </div>
        );
    }

    return (
        <>
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-50 flex items-center justify-center px-4">
                <h1 className="font-bold text-lg text-gray-900 dark:text-white">FitwithPKAdmin</h1>
            </header>
            <div className="p-4 h-full w-full bg-gray-50 mt-14">
                {/* Header with back button */}
                <div className="flex items-center mb-6">
                    <button
                        onClick={() => setSelectedClient(null)}
                        className="mr-3 p-2 hover:bg-gray-100 rounded-full"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="bg-blue-100 p-3 rounded-full mr-4">
                        <Target className="text-blue-600" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Daily Targets</h1>
                        <p className="text-gray-500">Set goals for {selectedClient.FirstName} {selectedClient.LastName}</p>
                    </div>
                </div>

                {/* Target Cards */}
                <div className="space-y-4 mb-8">
                    {/* Steps Target */}
                    <div className="bg-white p-6 rounded-lg border">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                    <span className="text-blue-600 text-sm">👟</span>
                                </div>
                                <div>
                                    <h3 className="font-semibold">Daily Steps</h3>
                                    <p className="text-sm text-gray-500">Steps per day</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold">{targets.steps.toLocaleString()}</div>
                                <div className="text-xs text-gray-500">steps</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <input
                                type="range"
                                min="5000"
                                max="20000"
                                step="500"
                                value={targets.steps}
                                onChange={(e) => handleInputChange('steps', parseInt(e.target.value))}
                                className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer slider"
                            />
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>5,000</span>
                                <span>20,000</span>
                            </div>
                        </div>
                    </div>

                    {/* Water Target */}
                    <div className="bg-white p-6 rounded-lg border">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                                <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center mr-3">
                                    <span className="text-cyan-600 text-sm">💧</span>
                                </div>
                                <div>
                                    <h3 className="font-semibold">Water Intake</h3>
                                    <p className="text-sm text-gray-500">Liters per day</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold">{targets.water.toFixed(1)}</div>
                                <div className="text-xs text-gray-500">liters</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <input
                                type="range"
                                min="1"
                                max="5"
                                step="0.1"
                                value={targets.water}
                                onChange={(e) => handleInputChange('water', parseFloat(e.target.value))}
                                className="w-full h-2 bg-cyan-200 rounded-lg appearance-none cursor-pointer slider"
                            />
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>1.0L</span>
                                <span>5.0L</span>
                            </div>
                        </div>
                    </div>

                    {/* Sleep Target */}
                    <div className="bg-white p-6 rounded-lg border">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                                    <span className="text-purple-600 text-sm">😴</span>
                                </div>
                                <div>
                                    <h3 className="font-semibold">Sleep Goal</h3>
                                    <p className="text-sm text-gray-500">Hours per night</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold">{targets.sleep.toFixed(1)}</div>
                                <div className="text-xs text-gray-500">hours</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <input
                                type="range"
                                min="6"
                                max="10"
                                step="0.5"
                                value={targets.sleep}
                                onChange={(e) => handleInputChange('sleep', parseFloat(e.target.value))}
                                className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer slider"
                            />
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>6h</span>
                                <span>10h</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Diet & Workout Plans Section */}
                <div className="bg-white p-6 rounded-lg border mb-8">
                    <h3 className="text-lg font-semibold mb-6">Diet & Workout Plans for {selectedClient.FirstName} {selectedClient.LastName}</h3>

                    <div className="space-y-6">
                        {/* Diet Plans */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-medium text-gray-700 flex items-center gap-2">
                                    <Utensils className="w-5 h-5 text-green-600" />
                                    Diet Plans
                                </h4>
                                <button
                                    onClick={() => handleFileUpload('diet')}
                                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                                >
                                    <Upload className="w-4 h-4" />
                                    Upload New
                                </button>
                            </div>

                            {dietPlans.length > 0 && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Diet Plan Name</label>
                                    <input
                                        type="text"
                                        value={dietPlanName}
                                        disabled
                                        onChange={(e) => setDietPlanName(e.target.value)}
                                        className="w-full p-2 border rounded-lg"
                                        placeholder="Enter diet plan name"
                                    />
                                </div>
                            )}

                            <div className="space-y-3">
                                {dietPlans.map((plan) => (
                                    <div key={plan.id} className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-100">
                                        <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                                            <FileText className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-gray-800 truncate">{plan.name}</div>
                                            <div className="text-sm text-gray-500">Uploaded: {plan.uploadDate}</div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => handleViewPDF(plan)}
                                                className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDownloadPDF(plan)}
                                                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                            >
                                                <Download className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}


                            </div>
                        </div>

                        {/* Workout Plans */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-medium text-gray-700 flex items-center gap-2">
                                    <Dumbbell className="w-5 h-5 text-purple-600" />
                                    Workout Plans
                                </h4>
                                <button
                                    onClick={() => handleFileUpload('workout')}
                                    className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                                >
                                    <Upload className="w-4 h-4" />
                                    Upload New
                                </button>
                            </div>

                            {workoutPlans.length > 0 && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Workout Plan Name</label>
                                    <input
                                        type="text"
                                        value={workoutPlanName}
                                        disabled
                                        onChange={(e) => setWorkoutPlanName(e.target.value)}
                                        className="w-full p-2 border rounded-lg"
                                        placeholder="Enter workout plan name"
                                    />
                                </div>
                            )}

                            <div className="space-y-3">


                                {workoutPlans.map((plan) => (
                                    <div key={plan.id} className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg border border-purple-100">
                                        <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                                            <FileText className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-gray-800 truncate">{plan.name}</div>
                                            <div className="text-sm text-gray-500">Uploaded: {plan.uploadDate}</div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => handleViewPDF(plan)}
                                                className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDownloadPDF(plan)}
                                                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                            >
                                                <Download className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                            </div>
                        </div>
                    </div>
                </div>

                {/* Coach Feedback Section */}
                <div className="bg-white p-6 rounded-lg border mb-8">
                    <div className="flex items-center mb-4">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-green-600 text-sm">💬</span>
                        </div>
                        <div>
                            <h3 className="font-semibold">Coach Feedback</h3>
                            <p className="text-sm text-gray-500">Add personalized notes for {selectedClient.FirstName} {selectedClient.LastName}</p>
                        </div>
                    </div>

                    <textarea
                        placeholder="Enter your feedback and recommendations for the client..."
                        className="w-full p-3 border rounded-lg resize-none h-24 text-sm"
                        value={coachFeedback}
                        onChange={(e) => setCoachFeedback(e.target.value)}
                    />
                </div>

                {/* Save Button */}
                <div className="mb-4">
                    <button
                        onClick={handleSave}
                        className={`w-full py-4 rounded-lg font-semibold transition-all duration-300 ${saved
                            ? 'bg-green-600 text-white'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                    >
                        {saved ? (
                            <div className="flex items-center justify-center">
                                <Check size={20} className="mr-2" />
                                Targets Saved!
                            </div>
                        ) : (
                            <div className="flex items-center justify-center">
                                <Save size={20} className="mr-2" />
                                Save Targets
                            </div>
                        )}
                    </button>
                </div>

                {/* Tips Section */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-20">
                    <h4 className="font-semibold text-blue-900 mb-2">💡 Tips for Success</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Start with realistic goals and gradually increase them</li>
                        <li>• Track your progress daily to stay motivated</li>
                        <li>• Adjust targets based on your lifestyle and fitness level</li>
                    </ul>
                </div>


            </div>
            <MobileAdminNav />


            {/* PDF Viewer Dialog */}
            <Dialog open={pdfViewerOpen} onOpenChange={setPdfViewerOpen}>
                <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{pdfType === 'workout' ? 'Workout Plan' : 'Diet Plan'}</DialogTitle>
                        <DialogDescription>
                            {pdfType === 'workout'
                                ? 'Workout Program by Coach'
                                : 'Nutrition Guide & Meal Plan by Coach'}
                        </DialogDescription>
                    </DialogHeader>

                    {/* PDF Viewer Container */}
                    <div className="flex-1 overflow-y-auto mt-2 mb-4">
                        <div className="rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 w-full h-full flex flex-col">
                            {pdfUrl ? (
                                <Document
                                    file={pdfUrl}
                                    loading={
                                        <div className="flex-1 flex items-center justify-center p-4">
                                            <p>Loading {pdfType} plan...</p>
                                        </div>
                                    }
                                    error={
                                        <div className="flex-1 flex items-center justify-center p-4 text-red-500">
                                            Failed to load {pdfType} plan PDF.
                                        </div>
                                    }
                                    className="flex-1 flex flex-col min-h-0"
                                >
                                    <div className="flex-1 overflow-auto p-2">
                                        <Page
                                            pageNumber={1}
                                            width={Math.min(750, window.innerWidth - 64)}
                                            renderTextLayer={false}
                                            renderAnnotationLayer={false}
                                            className="mx-auto"
                                        />
                                    </div>
                                </Document>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-4">
                                    <FileText className="h-16 w-16 text-primary-500 mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">
                                        {pdfType === 'workout' ? 'Workout' : 'Diet'} Plan PDF
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        No {pdfType} plan available
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="flex justify-between items-center">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            Last updated: {format(new Date(), 'MMMM d, yyyy')}
                        </div>
                        <Button onClick={() => setPdfViewerOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>



        </>
    );
}
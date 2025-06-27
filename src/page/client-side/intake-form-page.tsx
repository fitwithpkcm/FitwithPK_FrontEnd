import React,{ useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { MobileNav } from "@/components/layout/mobile-nav";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { ChevronLeft, ChevronRight, Save, ImageIcon, Upload, FileText, X, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { fetchOnBoardUserAttributes, onBoardFileUpload, onBoardProfileAttributeUpdates } from "@/services/LoginServices";
import { RENDER_URL } from "@/common/Urls";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// Define the interface for the user profile
interface UserProfile {
  age?: number;
  gender?: string;
  profession?: string;
  location?: string;
  height?: number;
  weight?: number;
  waist?: number;
  hip?: number;
  chest?: number;
  neck?: number;
  biceps?: number;
  quadriceps?: number;
  dietType?: string;
  morningMeal?: string;
  breakfast?: string;
  lunch?: string;
  eveningSnack?: string;
  dinner?: string;
  skipMeals?: string;
  dietaryRestrictions?: string;
  dislikedFoods?: string;
  smokingDrinking?: string;
  sleepHours?: string;
  stressLevel?: string;
  activityLevel?: string;
  currentExercise?: string;
  workoutPreference?: string;
  workoutAvailability?: string;
  medicalConditions?: string;
  medications?: string;
  supplementWillingness?: string;
  recentBloodTest?: boolean;
  fitnessGoals?: string;
  biggestChallenge?: string;
  challengingHabits?: string;
  pastDietExperience?: string;
  pastCoachExperience?: string;
  motivation?: string;
}

// Define the form validation schema using Zod
const intakeFormSchema = z.object({
  age: z.number().min(1).max(120).optional(),
  gender: z.string().optional(),
  profession: z.string().optional(),
  location: z.string().optional(),
  height: z.number().min(1).optional(),
  weight: z.number().min(1).optional(),
  waist: z.number().min(1).optional(),
  hip: z.number().min(1).optional(),
  chest: z.number().min(1).optional(),
  neck: z.number().min(1).optional(),
  biceps: z.number().min(1).optional(),
  quadriceps: z.number().min(1).optional(),
  dietType: z.string().optional(),
  morningMeal: z.string().optional(),
  breakfast: z.string().optional(),
  lunch: z.string().optional(),
  eveningSnack: z.string().optional(),
  dinner: z.string().optional(),
  skipMeals: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
  dislikedFoods: z.string().optional(),
  smokingDrinking: z.string().optional(),
  sleepHours: z.string().optional(),
  stressLevel: z.string().optional(),
  activityLevel: z.string().optional(),
  currentExercise: z.string().optional(),
  workoutPreference: z.string().optional(),
  workoutAvailability: z.string().optional(),
  medicalConditions: z.string().optional(),
  medications: z.string().optional(),
  supplementWillingness: z.string().optional(),
  recentBloodTest: z.boolean().optional(),
  uploadFileNames: z.string().optional(),
  fitnessGoals: z.string().optional(),
  biggestChallenge: z.string().optional(),
  challengingHabits: z.string().optional(),
  pastDietExperience: z.string().optional(),
  pastCoachExperience: z.string().optional(),
  motivation: z.string().optional()
});

type IntakeFormValues = z.infer<typeof intakeFormSchema>;

// Local storage key
const LOCAL_STORAGE_KEY = "clientIntakeFormData";

export default function IntakeFormPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("basic-info");

  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  //for storing the filename after files being uploaded
  const [uploadedFileNames, setUploadedFileNames] = useState<string>("");

  // Fetch existing profile data
  const { data: profileData, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["onboarduser-attributes"],
    queryFn: () => fetchOnBoardUserAttributes().then(res => res.data.data)
  });

  // Form setup
  const form = useForm<IntakeFormValues>({
    resolver: zodResolver(intakeFormSchema),
    defaultValues: {
      age: undefined,
      gender: undefined,
      profession: undefined,
      location: undefined,
      height: undefined,
      weight: undefined,
      waist: undefined,
      hip: undefined,
      chest: undefined,
      neck: undefined,
      biceps: undefined,
      quadriceps: undefined,
      dietType: undefined,
      morningMeal: undefined,
      breakfast: undefined,
      lunch: undefined,
      eveningSnack: undefined,
      dinner: undefined,
      skipMeals: undefined,
      dietaryRestrictions: undefined,
      dislikedFoods: undefined,
      smokingDrinking: undefined,
      sleepHours: undefined,
      stressLevel: undefined,
      activityLevel: undefined,
      currentExercise: undefined,
      workoutPreference: undefined,
      workoutAvailability: undefined,
      medicalConditions: undefined,
      medications: undefined,
      supplementWillingness: undefined,
      recentBloodTest: undefined,
      uploadFileNames: undefined,
      fitnessGoals: undefined,
      biggestChallenge: undefined,
      challengingHabits: undefined,
      pastDietExperience: undefined,
      pastCoachExperience: undefined,
      motivation: undefined
    }
  });

  useEffect(() => {

    queryClient.invalidateQueries({ queryKey: ["onboarduser-attributes"] });

  }, []);

  // Load saved form data from localStorage on initial render
  useEffect(() => {
    const savedFormData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedFormData) {
      try {
        const parsedData = JSON.parse(savedFormData);
        form.reset(parsedData);
      } catch (error) {
        console.error("Failed to parse saved form data", error);
      }
    }
  }, [form]);

  // Update form values when profile data is loaded
  useEffect(() => {

    if (profileData) {
      // Convert numeric fields and boolean fields
      const numericFields = ['age', 'height', 'weight', 'waist', 'hip', 'chest', 'neck', 'biceps', 'quadriceps'];
      const booleanFields = ['recentBloodTest'];

      const formattedData = Object.fromEntries(
        Object.entries(profileData).map(([key, value]) => {
          if (value === null) return [key, undefined];
          if (numericFields.includes(key)) return [key, Number(value)];
          if (booleanFields.includes(key)) return [key, Boolean(value)];
          return [key, value];
        })
      );

      form.reset(formattedData);
    }
  }, [profileData, form]);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    const subscription = form.watch((value) => {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Submit profile update
  const updateProfileMutation = useMutation({
    mutationFn: async (data: IntakeFormValues) => {

      return onBoardProfileAttributeUpdates(data).then((res) => {
        if (res.data.success) {
          return res;
        }
      }).catch((error) => {
        return error
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarduser-attributes"] });
      // Clear the saved form data from localStorage after successful submission
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      toast({
        title: "Profile Updated",
        description: "Your information has been saved successfully.",
      });
      /* if (activeTab == 'goals') {
        setLocation(RENDER_URL.STUDENT_DASHBOARD);
      } */
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  function onSubmit(data: IntakeFormValues) {
    updateProfileMutation.mutate(data);
  }

  // Tab navigation
  const tabs = [
    { id: "basic-info", label: "Basic Info" },
    { id: "measurements", label: "Measurements" },
    { id: "diet", label: "Diet" },
    { id: "lifestyle", label: "Lifestyle" },
    { id: "medical", label: "Medical" },
    { id: "goals", label: "Goals" },
  ];

  const nextTab = (e?: React.MouseEvent) => {
    e?.preventDefault(); // Prevent default form submission
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevTab = () => {
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1].id);
    } else {
      setLocation(RENDER_URL.STUDENT_DASHBOARD);
    }
  };

  /*
  author basil1112 
  file upload handle funtions  
  */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Convert FileList to array and add to existing files
    const newFiles = Array.from(files);
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Create mutation for file upload
  const uploadMutation = useMutation({
    mutationFn: (files: FormData) => {
      return onBoardFileUpload(files).then(res => res);
    },
    onSuccess: (response: unknown) => {
      if (response.data) {

        setUploadedFileNames(response.data.data.join(","));
        // Update only the uploadFileNames field in the form
        form.setValue('uploadFileNames', response.data.data.join(","));
      }
      setUploadedFiles([]);
      setShowUploadDialog(false);
    },
    onError: (error) => {
      console.error('Upload error:', error);
      // Optionally show error toast/message
    }
  });

  const handleUploadFiles = () => {
    if (uploadedFiles.length === 0) return;

    const formData = new FormData();
    uploadedFiles.forEach((file) => {
      formData.append('files', file);
    });

    uploadMutation.mutate(formData);
  };


  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 py-4 px-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="mb-2"
              onClick={() => setLocation(RENDER_URL.STUDENT_DASHBOARD)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div className="w-full flex">
              <div className="">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Client Intake Form</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Update your profile information</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["onboarduser-attributes"] });
                }
                }
                className="flex items-center gap-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 16h5v5" />
                </svg>
                Refresh
              </Button>
            </div>


          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-3xl mx-auto p-4 sm:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-3 sm:grid-cols-6 mb-4 min-h-[80px]">
                  {tabs.map(tab => (
                    <TabsTrigger key={tab.id} value={tab.id} className="text-xs sm:text-sm p-2">
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* Basic Information */}
                <TabsContent value="basic-info">
                  <Card>
                    <CardHeader>
                      <CardTitle>Personal Information</CardTitle>
                      <CardDescription>
                        Please provide your basic personal information
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="age"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Age</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Enter your age"
                                {...field}
                                onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gender</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value || undefined}
                              value={field.value || undefined}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="non-binary">Non-binary</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="profession"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Profession</FormLabel>
                            <FormControl>
                              <Input placeholder="Your profession or occupation" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            <FormControl>
                              <Input placeholder="City, Country" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Measurements */}
                <TabsContent value="measurements">
                  <Card>
                    <CardHeader>
                      <CardTitle>Body Measurements</CardTitle>
                      <CardDescription>
                        Track your physical measurements for progress tracking
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="height"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Height (cm)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Height in centimeters"
                                {...field}
                                onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="weight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Weight (kg)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Weight in kilograms"
                                step="0.1"
                                {...field}
                                onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="waist"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Waist (cm)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="Waist circumference"
                                  step="0.1"
                                  {...field}
                                  onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="hip"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Hip (cm)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="Hip circumference"
                                  step="0.1"
                                  {...field}
                                  onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="chest"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Chest (cm)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="Chest circumference"
                                  step="0.1"
                                  {...field}
                                  onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="neck"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Neck (cm)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="Neck circumference"
                                  step="0.1"
                                  {...field}
                                  onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="biceps"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Biceps (cm)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="Biceps circumference"
                                  step="0.1"
                                  {...field}
                                  onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="quadriceps"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Thighs (cm)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="Thigh circumference"
                                  step="0.1"
                                  {...field}
                                  onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Diet Information */}
                <TabsContent value="diet">
                  <Card>
                    <CardHeader>
                      <CardTitle>Diet Information</CardTitle>
                      <CardDescription>
                        Tell us about your eating habits and preferences
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="dietType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Diet Type</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value || undefined}
                              value={field.value || undefined}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your diet type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="non-vegetarian">Non-Vegetarian</SelectItem>
                                <SelectItem value="vegetarian">Vegetarian</SelectItem>
                                <SelectItem value="vegan">Vegan</SelectItem>
                                <SelectItem value="eggetarian">Eggetarian</SelectItem>
                                <SelectItem value="pescatarian">Pescatarian</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="morningMeal"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>After waking up</FormLabel>
                            <FormControl>
                              <Textarea placeholder="What do you typically consume after waking up?" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="breakfast"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Breakfast</FormLabel>
                            <FormControl>
                              <Textarea placeholder="What do you typically have for breakfast?" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="lunch"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lunch</FormLabel>
                            <FormControl>
                              <Textarea placeholder="What do you typically have for lunch?" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="eveningSnack"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Evening Snack</FormLabel>
                            <FormControl>
                              <Textarea placeholder="What do you typically have as an evening snack?" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dinner"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dinner</FormLabel>
                            <FormControl>
                              <Textarea placeholder="What do you typically have for dinner?" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="skipMeals"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Do you skip any meals?</FormLabel>
                            <FormControl>
                              <Input placeholder="Which meals do you skip, if any?" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dietaryRestrictions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dietary Restrictions</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Any allergies, intolerances, or dietary restrictions?" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dislikedFoods"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Foods You Dislike</FormLabel>
                            <FormControl>
                              <Textarea placeholder="What foods do you dislike or want to avoid?" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Lifestyle */}
                <TabsContent value="lifestyle">
                  <Card>
                    <CardHeader>
                      <CardTitle>Lifestyle</CardTitle>
                      <CardDescription>
                        Tell us about your lifestyle and daily activities
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="smokingDrinking"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Smoking & Drinking Habits</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Do you smoke or drink? If yes, what is the frequency?" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="sleepHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sleep Pattern</FormLabel>
                            <FormControl>
                              <Textarea placeholder="How many hours of sleep do you get on average? Is it restful?" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="stressLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stress & Schedule</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Do you have a busy or stressful schedule that impacts your eating or exercise habits?" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="activityLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Daily Activity Level</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value || undefined}
                              value={field.value || undefined}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your activity level" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="sedentary">Sedentary (little to no exercise)</SelectItem>
                                <SelectItem value="lightly-active">Lightly Active (light exercise 1-3 days/week)</SelectItem>
                                <SelectItem value="moderately-active">Moderately Active (moderate exercise 3-5 days/week)</SelectItem>
                                <SelectItem value="very-active">Very Active (hard exercise 6-7 days/week)</SelectItem>
                                <SelectItem value="super-active">Super Active (very hard exercise & physical job)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="currentExercise"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Exercise Routine</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Do you currently exercise? If yes, what kind of exercise and how often?" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="workoutPreference"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Workout Preference</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value || undefined}
                              value={field.value || undefined}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your preference" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="gym">Gym</SelectItem>
                                <SelectItem value="home">Home</SelectItem>
                                <SelectItem value="both">Both</SelectItem>
                                <SelectItem value="outdoor">Outdoor</SelectItem>
                                <SelectItem value="no-preference">No Preference</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="workoutAvailability"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time Available for Workouts</FormLabel>
                            <FormControl>
                              <Input placeholder="How many days/hours a day can you allocate for workouts?" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Medical Information */}
                <TabsContent value="medical">
                  <Card>
                    <CardHeader>
                      <CardTitle>Medical Information</CardTitle>
                      <CardDescription>
                        Please provide information about your health conditions
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="medicalConditions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Medical Conditions</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Any existing medical conditions, e.g., diabetes, high blood pressure, thyroid, PCOS, PCOD, etc." {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="medications"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Medications</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Are you taking any medications or supplements?" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="supplementWillingness"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Supplements</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Are you willing to take any supplements if required? If not, please specify why." {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="recentBloodTest"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Recent Blood Test</FormLabel>
                              <FormDescription>
                                Have you had a blood test recently?
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value || false}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <div
                        className="flex flex-row items-center justify-between rounded-lg border p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setShowUploadDialog(true)}
                      >
                        <div className="flex items-center gap-2">
                          <Upload className="h-4 w-4 text-gray-500" />
                          <span>Upload Files</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>

                      {/* Hidden Input for Form */}
                      <FormField
                        control={form.control}
                        name="uploadFileNames"
                        render={({ field }) => (
                          <Input {...field} value={field.value || ''} type="hidden" />
                        )}
                      />


                      {uploadedFileNames.length > 0 && (
                        <div className="space-y-2 mt-2">
                          {uploadedFileNames.split(",").map((fileName, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                            >
                              <div className="flex items-center gap-3">
                                {fileName.endsWith('.pdf') ? (
                                  <FileText className="h-5 w-5 text-red-500" />
                                ) : (
                                  <ImageIcon className="h-5 w-5 text-blue-500" />
                                )}
                                <span className="text-sm  truncate max-w-[180px]">
                                  {fileName}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Goals and Challenges */}
                <TabsContent value="goals">
                  <Card>
                    <CardHeader>
                      <CardTitle>Goals and Challenges</CardTitle>
                      <CardDescription>
                        Tell us about your fitness goals and challenges
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="fitnessGoals"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fitness Goals</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Health and Fitness goals (e.g. weight loss/management, muscle gain, energy boost/improved stamina, better overall health, etc)" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="biggestChallenge"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Biggest Challenge</FormLabel>
                            <FormControl>
                              <Textarea placeholder="What do you see as your biggest challenge to achieving your health goals? (e.g. time, motivation, cravings)" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="challengingHabits"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Challenging Habits</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Any habits you struggle with that may impact your progress?" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="pastDietExperience"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Past Diet Experience</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Have you followed any diets in the past? What was your experience?" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="pastCoachExperience"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Past Coaching Experience</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Have you worked with a nutritionist or fitness coach before? What worked and what didn't?" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="motivation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Motivation</FormLabel>
                            <FormControl>
                              <Textarea placeholder="What motivates you to stay healthy? (e.g. family, self-care, specific event?)" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

             {/* // Update your navigation buttons */}
              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={prevTab}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  {activeTab === "basic-info" ? "Cancel" : "Previous"}
                </Button>

                {activeTab === "goals" ? (
                  <Button
                    type="submit" // Only this button submits the form
                    disabled={updateProfileMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
                  </Button>
                ) : (
                  <Button
                    type="button" // Important: Must be type="button"
                    onClick={(e) => nextTab(e)} // Pass the event to prevent default
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>
      </main>


      {/* author basil1112  
      upload medical report and blood report 
       */}

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        accept="image/*,.pdf"
        onChange={handleFileChange}
      />

      {/* todo */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>You can upload multiple files at once</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {uploadedFiles.length > 0 ? (
              <div className="space-y-4">
                {/* File list container with scrolling */}
                <div className={`${uploadedFiles.length > 6 ? 'max-h-[50vh] overflow-y-auto pr-2' : ''}`}>
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                        <div className="flex items-center gap-3">
                          {file.type.startsWith('image/') ? (
                            <ImageIcon className="h-5 w-5 text-gray-500" />
                          ) : (
                            <FileText className="h-5 w-5 text-gray-500" />
                          )}
                          <span className="text-sm truncate max-w-[200px]">
                            {file.name}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full"
                          onClick={() => handleRemoveFile(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add More Files
                </Button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-md p-8 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <Upload className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Click to select files
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    Supports JPG, PNG, PDF, etc. (multiple files allowed)
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setUploadedFiles([]);
                  setShowUploadDialog(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={uploadedFiles.length === 0}
                onClick={handleUploadFiles}
              >
                Upload Files
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MobileNav />
    </div>
  );
}
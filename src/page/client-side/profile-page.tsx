import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Settings, PencilIcon, Award, HeartPulse, Terminal, Mail, Phone, ArrowLeft } from "lucide-react";
import { Facebook, Instagram, Twitter, Linkedin, Youtube, Globe } from 'lucide-react';
import { format } from "date-fns";
import { ThemeSettings } from "@/components/theme-settings";
import { useToast } from "@/hooks/use-toast";
import { getLoggedUserDetails, getMyCoachDetails } from "@/services/ProfileService";
import { ICoach } from "@/interface/models/Coach";
import { BASE_URL, UNITS } from "@/common/Constant";
import { setBaseUrl } from "../../services/HttpService"
import { IUser } from "@/interface/models/User";

type GoalType = "weight-loss" | "muscle-gain" | "maintenance";

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"profile" | "coach">("profile");
  const [themeSettingsOpen, setThemeSettingsOpen] = useState(false);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [goalWeight, setGoalWeight] = useState("70");
  const [goalType, setGoalType] = useState<"weight-loss" | "muscle-gain" | "maintenance">("weight-loss");
  const [showTestimonialForm, setShowTestimonialForm] = useState(false);
  const [testimonialText, setTestimonialText] = useState("");
  const [testimonialRating, setTestimonialRating] = useState(5);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>("/attached_assets/WhatsApp%20Image%202025-05-11%20at%2016.52.46.jpeg");
  const [testimonialPhotos, setTestimonialPhotos] = useState<string[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showProfilePhotoPreview, setShowProfilePhotoPreview] = useState(false);

  /**
     * author : basil1112
     * set up base url
     */
  useEffect(() => {
    setBaseUrl(BASE_URL);
  }, []);


  // Fetch user's body measurements
  const { data: myCoachDetails } = useQuery<ICoach>({
    queryKey: ["get_coach"],
    queryFn: () => getMyCoachDetails(0).then((res: ApiResponse<ICoach[]>) => res.data.data)
  });

  const { data: loggedUserDetails } = useQuery<Partial<IUser>>({
    queryKey: ["get_mydetails"],
    queryFn: () => getLoggedUserDetails(0).then((res: ApiResponse<Partial<IUser>>) => {
      if (Array.isArray(res.data.data)) {
        return res.data.data[0]
      } else {
        return null;
      }
    }).catch((error: unknown) => {
      console.log("error handling", error);
    })
  });




  console.log("logged user details", loggedUserDetails);

  const handleLogout = () => {
    logoutMutation.mutate();
  };



  const RenderCertifications = () => {
    return (
      <div className="space-y-6">
        {myCoachDetails?.ProfessionalDetails.certifications.map((certification, index) => (
          <div key={index} className="flex items-start">
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex-shrink-0 flex items-center justify-center">
              <Award className="h-4 w-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="ml-3 flex-1">
              <h4 className="font-medium text-gray-800 dark:text-gray-200">
                {certification.name}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                {certification.centre}
              </p>

              <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <img
                  src={`${BASE_URL}${certification.file_url}`}
                  alt={`${certification.name} Certificate`}
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };


  const RenderSpecializations = () => {
    // Array of color classes for light and dark mode
    const colorClasses = [

      {
        light: 'bg-secondary-100 text-secondary-800',
        dark: 'dark:bg-secondary-900/30 dark:text-secondary-300'
      },
      {
        light: 'bg-amber-100 text-amber-800',
        dark: 'dark:bg-amber-900/30 dark:text-amber-300'
      },
      {
        light: 'bg-emerald-100 text-emerald-800',
        dark: 'dark:bg-emerald-900/30 dark:text-emerald-300'
      },
      {
        light: 'bg-blue-100 text-blue-800',
        dark: 'dark:bg-blue-900/30 dark:text-blue-300'
      },
      {
        light: 'bg-purple-100 text-purple-800',
        dark: 'dark:bg-purple-900/30 dark:text-purple-300'
      },
      {
        light: 'bg-rose-100 text-rose-800',
        dark: 'dark:bg-rose-900/30 dark:text-rose-300'
      },
      {
        light: 'bg-indigo-100 text-indigo-800',
        dark: 'dark:bg-indigo-900/30 dark:text-indigo-300'
      }
    ];

    return (
      <div className="flex flex-wrap gap-2">
        {myCoachDetails?.ProfessionalDetails.specializations.map((specialization, index) => {
          const colorIndex = index % colorClasses.length;
          const colors = colorClasses[colorIndex];
          return (
            <div
              key={index}
              className={`rounded-full px-3 py-1 text-sm font-medium ${colors.light} ${colors.dark}`}
            >
              {specialization}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 py-4 px-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Profile</h1>
          </div>
          <div className="flex items-center gap-4">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "profile" | "coach")} className="w-[200px]">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="profile">My Profile</TabsTrigger>
                <TabsTrigger value="coach">Coach</TabsTrigger>
              </TabsList>
            </Tabs>

            <button className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 pb-28 sm:px-6 bg-gray-50 dark:bg-gray-950">
        <Tabs value={activeTab} className="w-full">
          <TabsContent value="profile" className="mt-0 space-y-6">
            {/* Profile Info */}
            <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
              {loggedUserDetails && <CardContent className="p-5">
                <div className="flex items-center">
                  <div className="relative">
                    <div
                      className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center text-gray-500 dark:text-gray-400 cursor-pointer"
                      onClick={() => setShowProfilePhotoPreview(true)}
                    >
                      {loggedUserDetails?.FirstName ? (
                        <span className="text-2xl font-semibold">
                          {loggedUserDetails.FirstName.substring(0, 1).toUpperCase()}
                        </span>
                      ) : (
                        <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <button
                      className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-950 rounded-full p-1 shadow-sm cursor-pointer"
                      onClick={() => document.getElementById('profile-photo-input')?.click()}
                    >
                      <div className="bg-secondary-500 rounded-full w-6 h-6 flex items-center justify-center">
                        <PencilIcon className="h-3 w-3 text-white" />
                      </div>
                    </button>
                    <input
                      id="profile-photo-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Create a preview of the uploaded image
                          const previewUrl = URL.createObjectURL(file);
                          setProfilePhotoPreview(previewUrl);

                          // This would be replaced with an API call in a real app
                          setTimeout(() => {
                            alert("Profile photo updated successfully!");
                          }, 500);
                        }
                      }}
                    />
                  </div>
                  <div className="ml-5">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100"><h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {loggedUserDetails?.FirstName && loggedUserDetails?.LastName
                        ? `${loggedUserDetails.FirstName} ${loggedUserDetails.LastName}`
                        : "----"}
                    </h2></h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{loggedUserDetails?.EmailID}</p>
                    <div className="flex items-center mt-1 text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 py-1 px-2 rounded inline-block">
                      <Award className="h-3 w-3 mr-1 text-amber-500" />
                      <span>Member since {2025}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Weight</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{loggedUserDetails?.MainBodyAttributes?.weight} {UNITS.WEIGHT.KILO}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Height</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{loggedUserDetails?.MainBodyAttributes?.height} {UNITS.HEIGHT.CENTI} </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Body Fat</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">--</p>
                  </div>
                </div>
              </CardContent>
              }
            </Card>

            {/* Fitness Goal */}
            <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-800 dark:text-gray-200">Fitness Goal</h3>
                  <Button
                    variant="link"
                    className="text-primary-600 text-sm p-0 h-auto"
                    onClick={() => {
                      // Pre-populate with existing data
                      setGoalWeight("70");
                      setGoalType(goalType);
                      // Open the dialog
                      setShowGoalDialog(true);
                    }}
                  >
                    Edit
                  </Button>
                </div>

                <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-gray-50 dark:bg-gray-950">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex-shrink-0 flex items-center justify-center">
                      <svg className="h-4 w-4 text-primary-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 21V16.8C8 16.2477 8.44772 15.8 9 15.8H15C15.5523 15.8 16 16.2477 16 16.8V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 12L17 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M10.3 8.5C10.1071 8.37389 9.94812 8.20813 9.83235 8.01479C9.71659 7.82146 9.64706 7.60461 9.62949 7.38114C9.61193 7.15767 9.64674 6.93359 9.73064 6.726C9.81455 6.51841 9.94506 6.33252 10.1156 6.18128C10.2861 6.03004 10.4918 5.91768 10.7138 5.85336C10.9359 5.78903 11.1686 5.77456 11.3962 5.81079C11.6238 5.84702 11.8404 5.93306 12.031 6.06275C12.2216 6.19244 12.3813 6.36282 12.5 6.562L12 7.5L12.5 6.562C12.6187 6.76118 12.7784 6.93156 12.969 7.06125C13.1596 7.19094 13.3762 7.27698 13.6038 7.31321C13.8314 7.34944 14.0641 7.33497 14.2862 7.27064C14.5082 7.20632 14.7139 7.09396 14.8844 6.94272C15.0549 6.79148 15.1854 6.60559 15.2694 6.398C15.3533 6.19041 15.3881 5.96633 15.3705 5.74286C15.3529 5.51939 15.2834 5.30254 15.1676 5.10921C15.0519 4.91587 14.8929 4.75011 14.7 4.624L12 7.5L14.7 4.624C14.3102 4.33133 13.8499 4.16665 13.3753 4.15305C12.9007 4.13946 12.4329 4.27752 12.0286 4.54684C11.6243 4.81616 11.3028 5.2042 11.1077 5.65865C10.9127 6.11309 10.8533 6.61344 10.9379 7.09768C11.0225 7.58192 11.2477 8.02783 11.5833 8.38095C11.9189 8.73407 12.3491 8.97918 12.8204 9.08611C13.2917 9.19305 13.7831 9.15595 14.234 8.97925C14.6849 8.80255 15.0742 8.49391 15.35 8.095L12 7.5L15.35 8.095C15.6275 7.69507 15.7884 7.22797 15.8144 6.74419C15.8404 6.26041 15.7305 5.7797 15.4969 5.35402C15.2633 4.92833 14.9142 4.57426 14.4869 4.33027C14.0596 4.08628 13.5712 3.96267 13.0753 3.9747C12.5793 3.98673 12.0967 4.13391 11.6826 4.40069C11.2686 4.66748 10.9374 5.04359 10.7254 5.4835C10.5135 5.92342 10.4291 6.41259 10.4819 6.89748C10.5347 7.38237 10.7228 7.84353 11.0245 8.225" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {loggedUserDetails?.OnBoardUserAttributes?.fitnessGoals}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Target: {loggedUserDetails?.OnBoardUserAttributes?.fitnessGoals}</p>
                    </div>
                  </div>

                  <Progress value={45} className="h-2" />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Start: 77.5kg</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Current: 72.5kg</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Goal: {"72"}kg</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
              <CardHeader className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <CardTitle className="text-base font-medium text-gray-800 dark:text-gray-200">Contact Information</CardTitle>
              </CardHeader>

              <div className="p-5 space-y-4">
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{loggedUserDetails?.EmailID || "user@example.com"}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{loggedUserDetails?.Mobile || "+1 (555) 123-4567"}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Settings Shortcuts */}
            <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
              <CardHeader className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <CardTitle className="text-base font-medium text-gray-800 dark:text-gray-200">Settings</CardTitle>
              </CardHeader>

              <div className="divide-y divide-gray-100">
                <SettingsLink
                  icon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 5C10 4.46957 10.2107 3.96086 10.5858 3.58579C10.9609 3.21071 11.4696 3 12 3C12.5304 3 13.0391 3.21071 13.4142 3.58579C13.7893 3.96086 14 4.46957 14 5M14 5C14 5.53043 13.7893 6.03914 13.4142 6.41421C13.0391 6.78929 12.5304 7 12 7C11.4696 7 10.9609 6.78929 10.5858 6.41421C10.2107 6.03914 10 5.53043 10 5M14 5H18C19.1046 5 20 5.89543 20 7V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V7C4 5.89543 4.89543 5 6 5H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M8 11H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M8 15H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  }
                  label="Notifications"
                />

                <SettingsLink
                  icon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 15V17M6 21H18C19.1046 21 20 20.1046 20 19V13C20 11.8954 19.1046 11 18 11H6C4.89543 11 4 11.8954 4 13V19C4 20.1046 4.89543 21 6 21ZM16 11V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V11H16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  }
                  label="Privacy & Security"
                />

                <SettingsLink
                  icon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 18H21M8 6H21M3 12H21M3 6L5 8L3 10M3 18L5 16L3 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  }
                  label="Linked Apps"
                />

                <button
                  onClick={() => setThemeSettingsOpen(true)}
                  className="flex items-center justify-between w-full px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mr-3">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className="font-medium text-sm text-gray-700 dark:text-gray-300">Theme & Appearance</span>
                  </div>
                  <svg className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                <div className="p-5 flex flex-col">
                  <Button
                    variant="outline"
                    className="w-full text-gray-700 dark:text-gray-300"
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                  >
                    {logoutMutation.isPending ? "Logging out..." : "Logout"}
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>


          {/* {coach basil details } */}
          {myCoachDetails &&
            <TabsContent value="coach" className="mt-0 space-y-6">
              {/* Coach Info */}
              <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={`${BASE_URL}${myCoachDetails.BasicDetails.banner_image}`}
                    alt="Fitness background"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-600/80 to-secondary-600/80"></div>
                  <div className="absolute left-0 right-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent"></div>
                </div>

                <div className="relative px-6 pb-6">
                  <div className="flex flex-col items-center -mt-16">
                    <div className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-900 overflow-hidden bg-white dark:bg-gray-800">
                      <img
                        src={`${BASE_URL}${myCoachDetails.BasicDetails.profile_picture}`}
                        alt="Coach PK"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">{myCoachDetails?.CoachName}</h2>
                    <p className="text-gray-500 dark:text-gray-400">{myCoachDetails?.BasicDetails?.subject}</p>

                    <div className="flex items-center mt-2 mb-4">
                      <div className="flex items-center text-amber-500">
                        <svg fill="currentColor" className="w-4 h-4" viewBox="0 0 24 24">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path>
                        </svg>
                        <svg fill="currentColor" className="w-4 h-4" viewBox="0 0 24 24">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path>
                        </svg>
                        <svg fill="currentColor" className="w-4 h-4" viewBox="0 0 24 24">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path>
                        </svg>
                        <svg fill="currentColor" className="w-4 h-4" viewBox="0 0 24 24">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path>
                        </svg>
                        <svg fill="currentColor" className="w-4 h-4" viewBox="0 0 24 24">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path>
                        </svg>
                      </div>
                      <span className="ml-2 text-gray-600 dark:text-gray-400 text-sm">5.0 (124 reviews)</span>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2 mb-4">
                      <Button variant="secondary" size="sm" className="gap-1 rounded-full">
                        <Mail className="h-4 w-4" />
                        <span>Message</span>
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1 rounded-full" onClick={() => {
                        console.log(myCoachDetails.BasicDetails.phone);
                      }}>
                        <Phone className="h-4 w-4" />
                        <span>Call</span>
                      </Button>

                    </div>
                    <div className="flex flex-wrap justify-center gap-2 mb-4">
                      {myCoachDetails.BasicDetails.social_media.map((social, index) => {
                        // Determine the appropriate icon based on the platform
                        let IconComponent;
                        switch (social.platform.toLowerCase()) {
                          case 'facebook':
                            IconComponent = Facebook;
                            break;
                          case 'instagram':
                            IconComponent = Instagram;
                            break;
                          case 'twitter':
                            IconComponent = Twitter;
                            break;
                          case 'linkedin':
                            IconComponent = Linkedin;
                            break;
                          case 'youtube':
                            IconComponent = Youtube;
                            break;
                          default:
                            IconComponent = Globe; // Default icon for unknown platforms
                        }

                        return (
                          <a
                            key={index}
                            href={social.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="outline" size="sm" className="rounded-full">
                              <span>
                                <IconComponent className="h-4 w-4" />
                              </span>
                            </Button>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Card>

              {/* About */}
              <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
                <CardContent className="p-5">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">About</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {myCoachDetails.ProfessionalDetails.about}
                  </p>
                </CardContent>
              </Card>

              {/* Certifications */}
              <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
                <CardContent className="p-5">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Certifications</h3>
                  <div className="space-y-6">

                    {RenderCertifications()}
                  </div>
                </CardContent>
              </Card>

              {/* Specialties */}
              <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
                <CardContent className="p-5">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Specialties</h3>
                  {RenderSpecializations()}
                </CardContent>
              </Card>

              {/* Testimonials */}
              <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
                <CardContent className="p-5">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Client Testimonials</h3>
                  <div className="space-y-5">
                    <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white">
                          <span className="text-xs font-bold">JS</span>
                        </div>
                        <div className="ml-3">
                          <h4 className="font-medium text-gray-800 dark:text-gray-200 text-sm">Jennifer S.</h4>
                          <div className="flex items-center text-amber-500">
                            <svg fill="currentColor" className="w-3 h-3" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                            <svg fill="currentColor" className="w-3 h-3" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                            <svg fill="currentColor" className="w-3 h-3" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                            <svg fill="currentColor" className="w-3 h-3" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                            <svg fill="currentColor" className="w-3 h-3" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        "Coach PK completely transformed my approach to fitness. I lost 25 pounds in 6 months and finally have the energy to keep up with my kids. His nutrition plan was realistic and the workouts were challenging but doable."
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center mb-2">
                        <div className="w-8 h-8 rounded-full bg-secondary-500 flex items-center justify-center text-white">
                          <span className="text-xs font-bold">MT</span>
                        </div>
                        <div className="ml-3">
                          <h4 className="font-medium text-gray-800 dark:text-gray-200 text-sm">Michael T.</h4>
                          <div className="flex items-center text-amber-500">
                            <svg fill="currentColor" className="w-3 h-3" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                            <svg fill="currentColor" className="w-3 h-3" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                            <svg fill="currentColor" className="w-3 h-3" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                            <svg fill="currentColor" className="w-3 h-3" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                            <svg fill="currentColor" className="w-3 h-3" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        "After years of trying different programs without results, Coach PK helped me gain 15 pounds of muscle in just 4 months. His attention to form and technique was crucial for my progress."
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 text-center">
                    <Button
                      variant="outline"
                      className="mb-2 w-full"
                      onClick={() => setShowTestimonialForm(true)}
                    >
                      Leave a testimonial
                    </Button>
                    <Button variant="link" className="text-primary-600" onClick={() => setShowAllReviews(true)}>
                      View all 124 reviews
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          }
        </Tabs>
      </main>

      <MobileNav />

      {/* Theme Settings Dialog */}
      <ThemeSettings open={themeSettingsOpen} onOpenChange={setThemeSettingsOpen} />

      {/* Fitness Goal Dialog */}
      <FitnessGoalDialog
        open={showGoalDialog}
        onOpenChange={setShowGoalDialog}
        goalWeight={goalWeight}
        setGoalWeight={setGoalWeight}
        goalType={goalType}
        setGoalType={setGoalType}
      />

      {/* Testimonial Form Dialog */}
      <Dialog open={showTestimonialForm} onOpenChange={setShowTestimonialForm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Share Your Experience</DialogTitle>
            <DialogDescription>
              Your testimonial will help others learn about Coach PK's coaching style and results.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rating" className="text-right">
                Rating
              </Label>
              <div className="col-span-3">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`text-2xl ${testimonialRating >= star ? 'text-amber-500' : 'text-gray-300'
                        }`}
                      onClick={() => setTestimonialRating(star)}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="testimonial" className="text-right">
                Your Experience
              </Label>
              <div className="col-span-3">
                <textarea
                  id="testimonial"
                  className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Share your experience with Coach PK..."
                  value={testimonialText}
                  onChange={(e) => setTestimonialText(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Photos
              </Label>
              <div className="col-span-3">
                <div className="flex flex-col space-y-2">
                  <p className="text-xs text-gray-500">Upload up to 3 pictures showing your transformation</p>

                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {testimonialPhotos.map((photo, index) => (
                      <div key={index} className="relative aspect-square rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
                        <img
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          className="absolute top-1 right-1 bg-gray-900/70 rounded-full p-1"
                          onClick={() => {
                            const newPhotos = [...testimonialPhotos];
                            newPhotos.splice(index, 1);
                            setTestimonialPhotos(newPhotos);
                          }}
                        >
                          <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    ))}

                    {testimonialPhotos.length < 3 && (
                      <label className="cursor-pointer aspect-square rounded-md border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center hover:border-gray-400 dark:hover:border-gray-600">
                        <svg className="h-8 w-8 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-xs text-gray-500 mt-1">Add photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && testimonialPhotos.length < 3) {
                              const previewUrl = URL.createObjectURL(file);
                              setTestimonialPhotos([...testimonialPhotos, previewUrl]);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTestimonialForm(false);
                setTestimonialPhotos([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                // This would be an API call in a real app to submit the testimonial
                const photoText = testimonialPhotos.length > 0 ?
                  ` with ${testimonialPhotos.length} transformation photos` : '';
                alert(`Thank you for your testimonial! Rating: ${testimonialRating}/5${photoText}`);
                setShowTestimonialForm(false);
                setTestimonialText("");
                setTestimonialRating(5);
                setTestimonialPhotos([]);
              }}
              disabled={testimonialText.trim().length < 10}
            >
              Submit Testimonial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Photo Preview Dialog */}
      <Dialog open={showProfilePhotoPreview} onOpenChange={setShowProfilePhotoPreview}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Profile Photo</DialogTitle>
            <DialogDescription>View your profile photo</DialogDescription>
          </DialogHeader>
          {profilePhotoPreview && (
            <div className="relative">
              <img
                src={profilePhotoPreview}
                alt="Profile"
                className="w-full h-auto"
              />
              <div className="absolute bottom-3 right-3 w-24 h-24 border-2 border-white rounded-full overflow-hidden shadow-lg">
                <img
                  src={profilePhotoPreview}
                  alt="Profile thumbnail"
                  className="w-full h-full object-cover"
                />
              </div>
              <Button
                className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full bg-black/50 hover:bg-black/70"
                variant="ghost"
                onClick={() => setShowProfilePhotoPreview(false)}
              >
                <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* All Reviews Dialog */}
      <Dialog open={showAllReviews} onOpenChange={setShowAllReviews}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Testimonials (124)</DialogTitle>
            <DialogDescription>
              What our clients say about Coach PK's training programs
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* More testimonials */}
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center mb-2">
                <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white">
                  <span className="text-xs font-bold">SJ</span>
                </div>
                <div className="ml-3">
                  <h4 className="font-medium text-gray-800 dark:text-gray-200 text-sm">Sarah J.</h4>
                  <div className="flex items-center text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} fill="currentColor" className="w-3 h-3" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                    ))}
                  </div>
                </div>
                <div className="ml-auto text-xs text-gray-500">2 months ago</div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                "Coach PK completely transformed my approach to fitness. I lost 25 pounds in 6 months and finally have the energy to keep up with my kids. His nutrition plan was realistic and the workouts were challenging but doable."
              </p>
              <div className="mt-3 flex gap-2">
                <div className="w-16 h-16 rounded-md overflow-hidden">
                  <img src="/attached_assets/WhatsApp%20Image%202025-05-10%20at%2022.42.42.jpeg" alt="Before" className="w-full h-full object-cover" />
                </div>
                <div className="w-16 h-16 rounded-md overflow-hidden">
                  <img src="/attached_assets/WhatsApp%20Image%202025-05-11%20at%2016.52.46.jpeg" alt="After" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center mb-2">
                <div className="w-10 h-10 rounded-full bg-secondary-500 flex items-center justify-center text-white">
                  <span className="text-xs font-bold">MT</span>
                </div>
                <div className="ml-3">
                  <h4 className="font-medium text-gray-800 dark:text-gray-200 text-sm">Michael T.</h4>
                  <div className="flex items-center text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} fill="currentColor" className="w-3 h-3" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                    ))}
                  </div>
                </div>
                <div className="ml-auto text-xs text-gray-500">3 months ago</div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                "After years of trying different programs without results, Coach PK helped me gain 15 pounds of muscle in just 4 months. His attention to form and technique was crucial for my progress."
              </p>
              <div className="mt-3 flex gap-2">
                <div className="w-16 h-16 rounded-md overflow-hidden">
                  <img src="/attached_assets/WhatsApp%20Image%202025-05-11%20at%2017.01.47.jpeg" alt="Before" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center mb-2">
                <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white">
                  <span className="text-xs font-bold">RK</span>
                </div>
                <div className="ml-3">
                  <h4 className="font-medium text-gray-800 dark:text-gray-200 text-sm">Rohit K.</h4>
                  <div className="flex items-center text-amber-500">
                    {[...Array(4)].map((_, i) => (
                      <svg key={i} fill="currentColor" className="w-3 h-3" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                    ))}
                    <svg fill="currentColor" className="w-3 h-3 text-gray-300" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                  </div>
                </div>
                <div className="ml-auto text-xs text-gray-500">5 months ago</div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                "The personalized workout plans and nutrition guidance were exactly what I needed. Coach PK is very responsive and adjusts the program based on my progress and feedback. Highly recommend for busy professionals!"
              </p>
            </div>

            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center mb-2">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
                  <span className="text-xs font-bold">JD</span>
                </div>
                <div className="ml-3">
                  <h4 className="font-medium text-gray-800 dark:text-gray-200 text-sm">Jennifer D.</h4>
                  <div className="flex items-center text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} fill="currentColor" className="w-3 h-3" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                    ))}
                  </div>
                </div>
                <div className="ml-auto text-xs text-gray-500">1 month ago</div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                "Coach PK's approach to nutrition was eye-opening. No restrictive diets, just practical advice that I could actually follow. The weekly check-ins kept me accountable and the results speak for themselves."
              </p>
              <div className="mt-3 flex gap-2">
                <div className="w-16 h-16 rounded-md overflow-hidden">
                  <img src="/attached_assets/WhatsApp%20Image%202025-05-11%20at%2020.58.26.jpeg" alt="Progress" className="w-full h-full object-cover" />
                </div>
                <div className="w-16 h-16 rounded-md overflow-hidden">
                  <img src="/attached_assets/WhatsApp%20Image%202025-05-11%20at%2016.48.36.jpeg" alt="Progress" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAllReviews(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface SettingsLinkProps {
  icon: React.ReactNode;
  label: string;
}

function SettingsLink({ icon, label }: SettingsLinkProps) {
  return (
    <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <div className="flex items-center">
        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
          {icon}
        </div>
        <span className="ml-3 font-medium text-gray-700 dark:text-gray-300">{label}</span>
      </div>
      <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// Add fitness goal dialog at the end of the component
export function FitnessGoalDialog({ open, onOpenChange, goalWeight, setGoalWeight, goalType, setGoalType }: {
   open: boolean;
  onOpenChange: (open: boolean) => void;
  goalWeight: string;
  setGoalWeight: (weight: string) => void;
  goalType: GoalType;  
  setGoalType: (type: GoalType) => void;  
}) {
  const { toast } = useToast();
  // Create local state to track changes before saving
  const [localGoalWeight, setLocalGoalWeight] = useState(goalWeight);
  const [localGoalType, setLocalGoalType] = useState(goalType);

  // Update local state when props change (when dialog opens)
  useEffect(() => {
    if (open) {
      setLocalGoalWeight(goalWeight);
      setLocalGoalType(goalType);
    }
  }, [open, goalWeight, goalType]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Fitness Goal</DialogTitle>
          <DialogDescription>
            Set your fitness goal and target weight to help us personalize your experience.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="goalWeight" className="text-right">
              Goal Weight
            </Label>
            <div className="col-span-3 flex items-center">
              <Input
                id="goalWeight"
                type="number"
                value={localGoalWeight}
                onChange={(e) => setLocalGoalWeight(e.target.value)}
                className="flex-1"
                placeholder="Enter target weight"
              />
              <span className="ml-2 text-sm text-gray-500">kg</span>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="goalType" className="text-right">
              Goal Type
            </Label>
            <div className="col-span-3">
              <div className="flex flex-col space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={localGoalType === "weight-loss"}
                    onChange={() => setLocalGoalType("weight-loss")}
                    className="h-4 w-4 text-indigo-600"
                  />
                  <span>Weight Loss</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={localGoalType === "muscle-gain"}
                    onChange={() => setLocalGoalType("muscle-gain")}
                    className="h-4 w-4 text-indigo-600"
                  />
                  <span>Muscle Gain</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={localGoalType === "maintenance"}
                    onChange={() => setLocalGoalType("maintenance")}
                    className="h-4 w-4 text-indigo-600"
                  />
                  <span>Maintenance</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              // Update the parent state with local values
              setGoalWeight(localGoalWeight);
              setGoalType(localGoalType);

              // Show success message
              toast({
                title: "Fitness goal updated!",
                description: `Target: ${localGoalWeight}kg, Type: ${localGoalType === "weight-loss" ? "Weight Loss" : localGoalType === "muscle-gain" ? "Muscle Gain" : "Maintenance"}`,
              });

              // Close the dialog
              onOpenChange(false);
            }}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
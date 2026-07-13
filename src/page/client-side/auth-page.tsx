import React, { useState, useEffect } from "react";
import axios from "axios";
import { useLocation } from "wouter";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../hooks/use-auth";
import { RENDER_URL } from "../../common/Urls";
import { validateToken, resetPasswordByEmail } from "../..//services/LoginServices";
import { useQuery } from "@tanstack/react-query";
import { BASE_URL } from "../../common/Constant";
import { setBaseUrl } from "../../services/HttpService";
import { Dumbbell, Zap, TrendingUp, Eye, EyeOff, ChevronLeft, ChevronRight } from "lucide-react";
import { InstallAppButton } from "../../components/InstallGuideDialog";

interface UserType {
  IsAdmin: number;
  IsUser: number;
}

// Full onboarding profile, collected during registration itself so no
// separate "complete your profile" step is needed after first login.
interface OnboardProfile {
  age: string;
  gender: string;
  profession: string;
  location: string;
  dietType: string;
  morningMeal: string;
  breakfast: string;
  lunch: string;
  eveningSnack: string;
  dinner: string;
  skipMeals: string;
  dietaryRestrictions: string;
  dislikedFoods: string;
  smokingDrinking: string;
  sleepHours: string;
  stressLevel: string;
  activityLevel: string;
  currentExercise: string;
  workoutPreference: string;
  workoutAvailability: string;
  medicalConditions: string;
  medications: string;
  supplementWillingness: string;
  recentBloodTest: boolean;
  fitnessGoals: string;
  biggestChallenge: string;
  challengingHabits: string;
  pastDietExperience: string;
  pastCoachExperience: string;
  motivation: string;
}

const emptyProfile: OnboardProfile = {
  age: "", gender: "", profession: "", location: "",
  dietType: "", morningMeal: "", breakfast: "", lunch: "", eveningSnack: "", dinner: "",
  skipMeals: "", dietaryRestrictions: "", dislikedFoods: "",
  smokingDrinking: "", sleepHours: "", stressLevel: "", activityLevel: "", currentExercise: "",
  workoutPreference: "", workoutAvailability: "",
  medicalConditions: "", medications: "", supplementWillingness: "", recentBloodTest: false,
  fitnessGoals: "", biggestChallenge: "", challengingHabits: "", pastDietExperience: "",
  pastCoachExperience: "", motivation: "",
};

const SIGNUP_STEPS = ["Account", "Basic Info", "Diet", "Lifestyle", "Medical", "Goals"] as const;

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [signupStep, setSignupStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  const { user, loginMutation, registerMutation } = useAuth();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerMobile, setRegisterMobile] = useState("");
  const [profile, setProfile] = useState<OnboardProfile>(emptyProfile);
  const [error, setError] = useState("");

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");

  const setField = <K extends keyof OnboardProfile>(key: K, value: OnboardProfile[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  useEffect(() => {
    setBaseUrl(BASE_URL);
  }, []);

  const { data: userType, refetch } = useQuery<UserType>({
    queryKey: ["validateToken"],
    queryFn: async () => {
      const stored = localStorage.getItem("userData");
      if (!stored) throw new Error("No user data");
      const userData = JSON.parse(stored);
      if (!userData?.token) throw new Error("No token found");
      const response = await validateToken(0);
      return response.data?.data as UserType;
    },
    enabled: false,
  });

  useEffect(() => {
    const stored = localStorage.getItem("userData");
    if (stored) refetch();
  }, [refetch]);

  useEffect(() => {
    if (userType) {
      if (userType.IsAdmin === 1) setLocation(RENDER_URL.ADMIN_DASHBOARD);
      else if (userType.IsUser === 1) setLocation(RENDER_URL.STUDENT_DASHBOARD);
    }
  }, [userType]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate(
      { EmailID: loginEmail, Password: loginPassword, LoginType: "normal" },
      {
        onSuccess: (userData) => {
          if (userData.info.IsAdmin === 1) setLocation(RENDER_URL.ADMIN_DASHBOARD);
          else setLocation(RENDER_URL.STUDENT_DASHBOARD);
        },
        onError: (error) => {
          setError("Invalid email or password. Please try again.");
        },
      }
    );
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMessage("");
    setForgotSubmitting(true);
    try {
      const res = await resetPasswordByEmail({ EmailID: forgotEmail, NewPassword: forgotNewPassword });
      if (res.data.success) {
        setForgotMessage("Password updated! You can now log in with your new password.");
        setForgotEmail("");
        setForgotNewPassword("");
      } else {
        setForgotMessage(res.data.message || "Could not update password.");
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setForgotMessage(err.response?.data?.message || "Something went wrong.");
      } else {
        setForgotMessage("Something went wrong.");
      }
    } finally {
      setForgotSubmitting(false);
    }
  };

  const resetSignup = () => {
    setSignupStep(0);
    setRegisterName("");
    setRegisterEmail("");
    setRegisterPassword("");
    setRegisterMobile("");
    setProfile(emptyProfile);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    registerMutation.mutate(
      {
        EmailID: registerEmail,
        Password: registerPassword,
        FirstName: registerName.split(" ")[0],
        LastName: registerName.split(" ")[1] || "",
        Mobile: registerMobile,
        IsUser: 1,
        LoginType: "normal",
        OnBoardUserAttributes: {
          ...profile,
          age: profile.age ? Number(profile.age) : undefined,
        },
      },
      {
        onSuccess: () => {
          setError("Registration successful! Your coach will verify your details shortly.");
          resetSignup();
          setActiveTab("login");
        },
        onError: (error) => {
          if (axios.isAxiosError(error)) {
            setError(error.response?.data?.message || "Registration failed");
          } else if (error instanceof Error) {
            setError(error.message);
          } else {
            setError("Registration failed");
          }
        },
      }
    );
  };

  const nextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setSignupStep((s) => Math.min(s + 1, SIGNUP_STEPS.length - 1));
  };

  const prevStep = () => setSignupStep((s) => Math.max(s - 1, 0));

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 transition-all duration-200 text-sm";
  const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";
  const selectClass = inputClass;
  const textareaClass = `${inputClass} min-h-[80px] resize-y`;

  return (
    <div className="min-h-screen flex">
      {/* Left — Brand panel (hidden on small screens) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/5 rounded-full" />
          <div className="absolute top-1/3 -right-16 w-64 h-64 bg-white/5 rounded-full" />
          <div className="absolute -bottom-16 left-1/4 w-80 h-80 bg-white/5 rounded-full" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl">FitwithPK</span>
          </div>

          <h1 className="text-5xl font-extrabold text-white leading-tight mb-6">
            Transform your<br />
            <span className="text-blue-200">fitness journey</span>
          </h1>
          <p className="text-blue-100 text-lg leading-relaxed max-w-sm">
            Track workouts, monitor nutrition, and get personalised coaching — all in one place.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {[
            { icon: Zap, text: "Daily progress tracking" },
            { icon: TrendingUp, text: "Personalised coach feedback" },
            { icon: Dumbbell, text: "Workout & diet plans" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <Icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-blue-100 text-sm font-medium">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right — Form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <span className="text-gray-900 font-bold text-xl">FitwithPK</span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {activeTab === "login" ? "Welcome back" : "Create account"}
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                {activeTab === "login"
                  ? "Sign in to continue your fitness journey"
                  : "Tell us about yourself so your coach can personalise your plan"}
              </p>
            </div>

            {/* Tab switcher */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-6 gap-1">
              {(["login", "signup"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setError(""); if (tab === "signup") setSignupStep(0); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    activeTab === tab
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab === "login" ? "Log In" : "Sign Up"}
                </button>
              ))}
            </div>

            {/* Error / success message */}
            {error && (
              <div
                className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
                  error.startsWith("Registration successful")
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {error}
              </div>
            )}

            {activeTab === "login" ? (
              showForgotPassword ? (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Enter your account email and choose a new password.
                  </p>

                  {forgotMessage && (
                    <div
                      className={`px-4 py-3 rounded-xl text-sm font-medium ${
                        forgotMessage.startsWith("Password updated")
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {forgotMessage}
                    </div>
                  )}

                  <div>
                    <label className={labelClass}>Email</label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className={inputClass}
                      placeholder="you@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>New Password</label>
                    <input
                      type="password"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      className={inputClass}
                      placeholder="At least 6 characters"
                      minLength={6}
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 rounded-xl px-4"
                      onClick={() => { setShowForgotPassword(false); setForgotMessage(""); }}
                    >
                      Back to Login
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 h-12 rounded-xl text-sm font-semibold"
                      disabled={forgotSubmitting}
                    >
                      {forgotSubmitting ? "Updating…" : "Update Password"}
                    </Button>
                  </div>
                </form>
              ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className={labelClass}>Email</label>
                  <input
                    id="login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className={inputClass}
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="login-password" className={labelClass}>Password</label>
                    <button
                      type="button"
                      onClick={() => { setShowForgotPassword(true); setError(""); }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 mb-1.5"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className={`${inputClass} pr-12`}
                      placeholder="Your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl text-sm font-semibold mt-2"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Signing in…" : "Sign In"}
                </Button>

                <InstallAppButton />
              </form>
              )
            ) : (
              <form onSubmit={signupStep === SIGNUP_STEPS.length - 1 ? handleRegisterSubmit : nextStep} className="space-y-4">
                {/* Step indicator */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500">
                    Step {signupStep + 1} of {SIGNUP_STEPS.length} — {SIGNUP_STEPS[signupStep]}
                  </span>
                </div>
                <div className="flex gap-1 mb-4">
                  {SIGNUP_STEPS.map((step, i) => (
                    <div
                      key={step}
                      className={`h-1 flex-1 rounded-full ${i <= signupStep ? "bg-blue-600" : "bg-gray-200"}`}
                    />
                  ))}
                </div>

                {signupStep === 0 && (
                  <>
                    <div>
                      <label className={labelClass}>Full Name</label>
                      <input
                        type="text"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        className={inputClass}
                        placeholder="First and last name"
                        required
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Email Address</label>
                      <input
                        type="email"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        className={inputClass}
                        placeholder="you@example.com"
                        required
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={registerPassword}
                          onChange={(e) => setRegisterPassword(e.target.value)}
                          className={`${inputClass} pr-12`}
                          placeholder="Create a strong password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Mobile Number</label>
                      <input
                        type="tel"
                        value={registerMobile}
                        onChange={(e) => setRegisterMobile(e.target.value)}
                        className={inputClass}
                        placeholder="Your mobile number"
                        required
                      />
                    </div>
                  </>
                )}

                {signupStep === 1 && (
                  <>
                    <div>
                      <label className={labelClass}>Age</label>
                      <input type="number" value={profile.age} onChange={(e) => setField("age", e.target.value)} className={inputClass} placeholder="Enter your age" />
                    </div>
                    <div>
                      <label className={labelClass}>Gender</label>
                      <select value={profile.gender} onChange={(e) => setField("gender", e.target.value)} className={selectClass}>
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="non-binary">Non-binary</option>
                        <option value="other">Other</option>
                        <option value="prefer-not-to-say">Prefer not to say</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Profession</label>
                      <input type="text" value={profile.profession} onChange={(e) => setField("profession", e.target.value)} className={inputClass} placeholder="Your profession or occupation" />
                    </div>
                    <div>
                      <label className={labelClass}>Location</label>
                      <input type="text" value={profile.location} onChange={(e) => setField("location", e.target.value)} className={inputClass} placeholder="City, Country" />
                    </div>
                  </>
                )}

                {signupStep === 2 && (
                  <>
                    <div>
                      <label className={labelClass}>Diet Type</label>
                      <select value={profile.dietType} onChange={(e) => setField("dietType", e.target.value)} className={selectClass}>
                        <option value="">Select your diet type</option>
                        <option value="non-vegetarian">Non-Vegetarian</option>
                        <option value="vegetarian">Vegetarian</option>
                        <option value="vegan">Vegan</option>
                        <option value="eggetarian">Eggetarian</option>
                        <option value="pescatarian">Pescatarian</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>After waking up</label>
                      <textarea value={profile.morningMeal} onChange={(e) => setField("morningMeal", e.target.value)} className={textareaClass} placeholder="What do you typically consume after waking up?" />
                    </div>
                    <div>
                      <label className={labelClass}>Breakfast</label>
                      <textarea value={profile.breakfast} onChange={(e) => setField("breakfast", e.target.value)} className={textareaClass} placeholder="What do you typically have for breakfast?" />
                    </div>
                    <div>
                      <label className={labelClass}>Lunch</label>
                      <textarea value={profile.lunch} onChange={(e) => setField("lunch", e.target.value)} className={textareaClass} placeholder="What do you typically have for lunch?" />
                    </div>
                    <div>
                      <label className={labelClass}>Evening Snack</label>
                      <textarea value={profile.eveningSnack} onChange={(e) => setField("eveningSnack", e.target.value)} className={textareaClass} placeholder="What do you typically have as an evening snack?" />
                    </div>
                    <div>
                      <label className={labelClass}>Dinner</label>
                      <textarea value={profile.dinner} onChange={(e) => setField("dinner", e.target.value)} className={textareaClass} placeholder="What do you typically have for dinner?" />
                    </div>
                    <div>
                      <label className={labelClass}>Do you skip any meals?</label>
                      <input type="text" value={profile.skipMeals} onChange={(e) => setField("skipMeals", e.target.value)} className={inputClass} placeholder="Which meals do you skip, if any?" />
                    </div>
                    <div>
                      <label className={labelClass}>Dietary Restrictions</label>
                      <textarea value={profile.dietaryRestrictions} onChange={(e) => setField("dietaryRestrictions", e.target.value)} className={textareaClass} placeholder="Any allergies, intolerances, or dietary restrictions?" />
                    </div>
                    <div>
                      <label className={labelClass}>Foods You Dislike</label>
                      <textarea value={profile.dislikedFoods} onChange={(e) => setField("dislikedFoods", e.target.value)} className={textareaClass} placeholder="What foods do you dislike or want to avoid?" />
                    </div>
                  </>
                )}

                {signupStep === 3 && (
                  <>
                    <div>
                      <label className={labelClass}>Smoking & Drinking Habits</label>
                      <textarea value={profile.smokingDrinking} onChange={(e) => setField("smokingDrinking", e.target.value)} className={textareaClass} placeholder="Do you smoke or drink? If yes, what is the frequency?" />
                    </div>
                    <div>
                      <label className={labelClass}>Sleep Pattern</label>
                      <textarea value={profile.sleepHours} onChange={(e) => setField("sleepHours", e.target.value)} className={textareaClass} placeholder="How many hours of sleep do you get on average? Is it restful?" />
                    </div>
                    <div>
                      <label className={labelClass}>Stress & Schedule</label>
                      <textarea value={profile.stressLevel} onChange={(e) => setField("stressLevel", e.target.value)} className={textareaClass} placeholder="Do you have a busy or stressful schedule that impacts your eating or exercise habits?" />
                    </div>
                    <div>
                      <label className={labelClass}>Daily Activity Level</label>
                      <select value={profile.activityLevel} onChange={(e) => setField("activityLevel", e.target.value)} className={selectClass}>
                        <option value="">Select your activity level</option>
                        <option value="sedentary">Sedentary (little to no exercise)</option>
                        <option value="lightly-active">Lightly Active (light exercise 1-3 days/week)</option>
                        <option value="moderately-active">Moderately Active (moderate exercise 3-5 days/week)</option>
                        <option value="very-active">Very Active (hard exercise 6-7 days/week)</option>
                        <option value="super-active">Super Active (very hard exercise & physical job)</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Current Exercise Routine</label>
                      <textarea value={profile.currentExercise} onChange={(e) => setField("currentExercise", e.target.value)} className={textareaClass} placeholder="Do you currently exercise? If yes, what kind of exercise and how often?" />
                    </div>
                    <div>
                      <label className={labelClass}>Workout Preference</label>
                      <select value={profile.workoutPreference} onChange={(e) => setField("workoutPreference", e.target.value)} className={selectClass}>
                        <option value="">Select your preference</option>
                        <option value="gym">Gym</option>
                        <option value="home">Home</option>
                        <option value="both">Both</option>
                        <option value="outdoor">Outdoor</option>
                        <option value="no-preference">No Preference</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Time Available for Workouts</label>
                      <input type="text" value={profile.workoutAvailability} onChange={(e) => setField("workoutAvailability", e.target.value)} className={inputClass} placeholder="How many days/hours a day can you allocate for workouts?" />
                    </div>
                  </>
                )}

                {signupStep === 4 && (
                  <>
                    <div>
                      <label className={labelClass}>Medical Conditions</label>
                      <textarea value={profile.medicalConditions} onChange={(e) => setField("medicalConditions", e.target.value)} className={textareaClass} placeholder="Any existing medical conditions, e.g., diabetes, high blood pressure, thyroid, PCOS, PCOD, etc." />
                    </div>
                    <div>
                      <label className={labelClass}>Current Medications</label>
                      <textarea value={profile.medications} onChange={(e) => setField("medications", e.target.value)} className={textareaClass} placeholder="Are you taking any medications or supplements?" />
                    </div>
                    <div>
                      <label className={labelClass}>Supplements</label>
                      <textarea value={profile.supplementWillingness} onChange={(e) => setField("supplementWillingness", e.target.value)} className={textareaClass} placeholder="Are you willing to take any supplements if required? If not, please specify why." />
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Recent Blood Test</p>
                        <p className="text-xs text-gray-500">Have you had a blood test recently?</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={profile.recentBloodTest}
                        onChange={(e) => setField("recentBloodTest", e.target.checked)}
                        className="w-5 h-5 accent-blue-600"
                      />
                    </div>
                    <p className="text-xs text-gray-400">
                      You can upload medical or blood test reports later from your profile once your account is approved.
                    </p>
                  </>
                )}

                {signupStep === 5 && (
                  <>
                    <div>
                      <label className={labelClass}>Fitness Goals</label>
                      <textarea value={profile.fitnessGoals} onChange={(e) => setField("fitnessGoals", e.target.value)} className={textareaClass} placeholder="Health and Fitness goals (e.g. weight loss/management, muscle gain, energy boost/improved stamina, better overall health, etc)" />
                    </div>
                    <div>
                      <label className={labelClass}>Biggest Challenge</label>
                      <textarea value={profile.biggestChallenge} onChange={(e) => setField("biggestChallenge", e.target.value)} className={textareaClass} placeholder="What do you see as your biggest challenge to achieving your health goals? (e.g. time, motivation, cravings)" />
                    </div>
                    <div>
                      <label className={labelClass}>Challenging Habits</label>
                      <textarea value={profile.challengingHabits} onChange={(e) => setField("challengingHabits", e.target.value)} className={textareaClass} placeholder="Any habits you struggle with that may impact your progress?" />
                    </div>
                    <div>
                      <label className={labelClass}>Past Diet Experience</label>
                      <textarea value={profile.pastDietExperience} onChange={(e) => setField("pastDietExperience", e.target.value)} className={textareaClass} placeholder="Have you followed any diets in the past? What was your experience?" />
                    </div>
                    <div>
                      <label className={labelClass}>Past Coaching Experience</label>
                      <textarea value={profile.pastCoachExperience} onChange={(e) => setField("pastCoachExperience", e.target.value)} className={textareaClass} placeholder="Have you worked with a nutritionist or fitness coach before? What worked and what didn't?" />
                    </div>
                    <div>
                      <label className={labelClass}>Motivation</label>
                      <textarea value={profile.motivation} onChange={(e) => setField("motivation", e.target.value)} className={textareaClass} placeholder="What motivates you to stay healthy? (e.g. family, self-care, specific event?)" />
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-2">
                  {signupStep > 0 && (
                    <Button type="button" variant="outline" className="h-12 rounded-xl px-4" onClick={prevStep}>
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Back
                    </Button>
                  )}
                  <Button
                    type="submit"
                    className="flex-1 h-12 rounded-xl text-sm font-semibold"
                    disabled={registerMutation.isPending}
                  >
                    {signupStep === SIGNUP_STEPS.length - 1
                      ? (registerMutation.isPending ? "Creating account…" : "Create Account")
                      : (<>Next <ChevronRight className="w-4 h-4 ml-1" /></>)}
                  </Button>
                </div>
              </form>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            By continuing you agree to our Terms of Service & Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}

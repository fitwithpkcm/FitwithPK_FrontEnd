import React, { useState, useEffect } from "react";
import axios from "axios";
import { useLocation } from "wouter";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../hooks/use-auth";
import { RENDER_URL } from "../../common/Urls";
import { validateToken } from "../..//services/LoginServices";
import { useQuery } from "@tanstack/react-query";
import { BASE_URL } from "../../common/Constant";
import { setBaseUrl } from "../../services/HttpService";
import { Dumbbell, Zap, TrendingUp, Eye, EyeOff } from "lucide-react";
import { InstallAppButton } from "../../components/InstallGuideDialog";

interface UserType {
  IsAdmin: number;
  IsUser: number;
}

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [registerMobile, setRegisterMobile] = useState("");
  const [registerHeight, setRegisterHeight] = useState("");
  const [registerWeight, setRegisterWeight] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { user, loginMutation, registerMutation } = useAuth();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const handleRegister = async (e: React.FormEvent) => {
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
        Height: registerHeight,
        Weight: registerWeight,
      },
      {
        onSuccess: () => {
          setError("Registration successful! Your coach will verify your details shortly.");
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

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 transition-all duration-200 text-sm";
  const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

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
                  : "Join and start your transformation today"}
              </p>
            </div>

            {/* Tab switcher */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-6 gap-1">
              {(["login", "signup"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setError(""); }}
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
                  <label htmlFor="login-password" className={labelClass}>Password</label>
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
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Height (cm)</label>
                    <input
                      type="number"
                      value={registerHeight}
                      onChange={(e) => setRegisterHeight(e.target.value)}
                      className={inputClass}
                      placeholder="175"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Weight (kg)</label>
                    <input
                      type="number"
                      value={registerWeight}
                      onChange={(e) => setRegisterWeight(e.target.value)}
                      className={inputClass}
                      placeholder="70"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl text-sm font-semibold mt-2"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? "Creating account…" : "Create Account"}
                </Button>
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

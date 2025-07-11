import React, { useState, useEffect } from "react";
import axios from "axios";
import { useLocation, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { RENDER_URL } from "@/common/Urls";
import { validateToken } from "@/services/LoginServices";
import { useQuery } from "@tanstack/react-query";
import { BASE_URL } from "@/common/Constant";
import { setBaseUrl } from "../../services/HttpService"

interface UserType {
  IsAdmin: number;
  IsUser: number;
}

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");

  const { user, loginMutation, registerMutation } = useAuth();

  // State variables remain the same
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  //constructor basil
  useEffect(() => {
    setBaseUrl(BASE_URL);
  }, []);



  const { data: userType, refetch } = useQuery<UserType>({
    queryKey: ['validateToken'],
    queryFn: async () => {
      const stored = localStorage.getItem("userData");
      if (!stored) throw new Error("No user data");

      const userData = JSON.parse(stored);
      if (!userData?.token) throw new Error("No token found");

      const response = await validateToken(0);
      return response.data?.data as UserType; // Type assertion here
    },
    enabled: false
  });

  useEffect(() => {
    const stored = localStorage.getItem("userData");
    if (stored) {
      refetch(); // Manually trigger the query
    }
  }, [refetch]);

  useEffect(() => {
    if (userType) {
      console.log("User type from token response", userType);
      if (userType.IsAdmin === 1) {
        setLocation(RENDER_URL.ADMIN_DASHBOARD);
      }
      else if (userType.IsUser === 1) {
        setLocation(RENDER_URL.STUDENT_DASHBOARD);
      }
      //todo coach
    }
  }, [userType]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    loginMutation.mutate(
      { EmailID: loginEmail, Password: loginPassword, LoginType: "normal" },
      {
        onSuccess: (userData) => {
          console.log("Login successful page:", userData);
          if (userData.IsAdmin === 1) {
            setLocation(RENDER_URL.ADMIN_DASHBOARD);
          } else {
            setLocation(RENDER_URL.STUDENT_DASHBOARD);
          }
        },
        onError: (error) => {
          console.error("Login error:", error);
          alert("Login failed:page " + error.message);
        }
      }
    );
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);
      const response = await axios.post("/api/Account/register", { // Changed endpoint
        name: registerName,
        email: registerEmail,
        password: registerPassword,
        // Add any additional required fields from old API
      });

      if (response.data?.success) {
        const userData = response.data.data;
        localStorage.setItem("userData", JSON.stringify(userData)); // Changed key
        // setLocation(RENDER_URL.STAFF_DASHBOARD); // Or appropriate redirect
      } else {
        setError(response.data?.message || "Registration failed");
      }
    } catch (err) {
      console.error("Registration error:", err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Registration failed");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white text-black p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-4">
          FitwithPK {activeTab === "login" ? "Login" : "Sign Up"}
        </h1>

        <div className="flex gap-4 mb-6">
          <button
            type="button"
            className={`px-4 py-2 rounded ${activeTab === "login" ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
            onClick={() => setActiveTab("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded ${activeTab === "signup" ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
            onClick={() => setActiveTab("signup")}
          >
            Sign Up
          </button>
        </div>

        {error && <div className="mb-4 text-red-600">{error}</div>}

        {activeTab === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Your email"
                required
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium mb-1">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Your password"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 mt-4"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Log In"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="register-name" className="block text-sm font-medium mb-1">
                Full Name
              </label>
              <input
                id="register-name"
                type="text"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Your full name"
                required
              />
            </div>

            <div>
              <label htmlFor="register-email" className="block text-sm font-medium mb-1">
                Email Address
              </label>
              <input
                id="register-email"
                type="email"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Your email address"
                required
              />
            </div>

            <div>
              <label htmlFor="register-password" className="block text-sm font-medium mb-1">
                Password
              </label>
              <input
                id="register-password"
                type="password"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Create a password"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 mt-4"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

import React, { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { useToast } from "../hooks/use-toast";
import { API_URL, RENDER_URL } from "../common/Urls"; // Make sure this path is correct
import { login, registerUser } from "../services/LoginServices";
import { queryClient } from "../lib/queryClient"; // adjust the import path as needed
import { ILoginUserData, Info } from "../interface/ILoginUserData";


type IUserData = {
  token: string
  EmailID: string
  FirstName: string
  LastName: string
  IsAdmin: number
  IsUser: number
  // Add other user properties from your API response
};

type AuthContextType = {
  user: ILoginUserData | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<ILoginUserData, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<unknown, Error, RegisterData>;
};

type LoginData = {
  EmailID: string;
  Password: string;
  LoginType: "normal";
};

type RegisterData = {
  EmailID: string;
  Password: string;
  FirstName: string;
  LastName: string;
  Mobile: string;
  IsUser: number;
  LoginType: string;
  Height: string;
  Weight: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  // Check localStorage for existing session
  const { data: user, error, isLoading, refetch } = useQuery<ILoginUserData | null, Error>({
    queryKey: ["userData"],
    queryFn: async () => {
      const storedUser = localStorage.getItem("userData");
      return storedUser ? JSON.parse(storedUser) : null;
    },
    initialData: null
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const storedUser = localStorage.getItem("userData");
      refetch(); // This will update the user data
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refetch]);

  function handleLogin(credentials: LoginData): Promise<ILoginUserData> {
    return login(credentials)
      .then((res: ApiResponse<ILoginUserData>) => {
        if (!res.data.success) {
          throw new Error(res.data.message || "Login failed");
        }

        const userData: ILoginUserData = {
          token: res.data.data?.token || '',
          info: res.data.data?.info || undefined
        };
        localStorage.setItem("userData", JSON.stringify(userData));
        return userData;
      })
      .catch((error) => {
        // Optional: Enhance error before re-throwing
        throw new Error(error?.message || "An unexpected error occurred");
      });
  }
  // Use the named async function in the mutation
  const loginMutation = useMutation<ILoginUserData, Error, LoginData>({
    mutationFn: handleLogin,
    onSuccess: (userData: unknown) => {
      queryClient.setQueryData(["userData"], userData);
    },
    onError: (error: unknown) => {
      console.log("error", error)
    },
  });

  const registerMutation = useMutation<unknown, Error, RegisterData>({
    mutationFn: async (credentials: RegisterData) => {
      const response = await registerUser(credentials);

      if (!response.data.success) {
        throw new Error(response.data.message || "Registration failed");
      }
    },
    onSuccess: () => {
      toast({
        title: "Registration successful",
        description: "Your account has been created successfully",
        variant: "default"
      });
    },
    onError: (error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      localStorage.removeItem("userData");
    },
    onSuccess: () => {
      queryClient.setQueryData(["userData"], null);
      window.location.href = RENDER_URL.LOGIN_URL;
    },
    onError: (error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      error,
      loginMutation,
      logoutMutation,
      registerMutation
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
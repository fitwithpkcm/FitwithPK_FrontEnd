import React from "react";
import { useAuth } from "../hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Redirect, Route } from "wouter";
import { fetchOnBoardUserAttributes } from "../services/LoginServices";
import { RENDER_URL } from "../common/Urls";

const Spinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-border" />
  </div>
);

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: (props?: any) => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <Route path={path}><Spinner /></Route>;
  if (!user) return <Route path={path}><Redirect to="/auth" /></Route>;

  return <Route path={path} component={Component} />;
}

/**
 * Route guard for client/student pages.
 * If the user's profile has never been filled (age is null), they are
 * redirected to the onboarding form before they can access any other page.
 * The onboarding route itself is always accessible so there is no redirect loop.
 */
export function ClientRoute({
  path,
  component: Component,
}: {
  path: string;
  component: (props?: any) => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  const { data: profileData, isLoading: profileLoading } = useQuery<any>({
    queryKey: ["onboarduser-attributes"],
    queryFn: () => fetchOnBoardUserAttributes(null).then((res: any) => res.data?.data ?? null),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || (!!user && profileLoading)) {
    return <Route path={path}><Spinner /></Route>;
  }

  if (!user) {
    return <Route path={path}><Redirect to="/auth" /></Route>;
  }

  // Profile is complete only when all four key fields are filled
  const profileComplete = !!(profileData?.age && profileData?.height && profileData?.weight && profileData?.fitnessGoals);
  const profileIncomplete = profileData != null && !profileComplete;
  const isOnboardRoute = path === RENDER_URL.STUDENT_ONBOARD;

  if (profileIncomplete && !isOnboardRoute) {
    return <Route path={path}><Redirect to={RENDER_URL.STUDENT_ONBOARD} /></Route>;
  }

  return <Route path={path} component={Component} />;
}

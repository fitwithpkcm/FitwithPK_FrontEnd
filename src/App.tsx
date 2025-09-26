import React, { useEffect, useState } from 'react'
import { Switch, Route } from "wouter";
import { registerSW } from './pwa'
import { TooltipProvider } from "./components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import AuthPage from './page/client-side/auth-page';
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from './hooks/use-auth';
import { setBaseUrl } from "./services/HttpService"
import { BASE_URL } from './common/Constant';
import { RENDER_URL } from './common/Urls';
import HomePage from './page/client-side/home-page'
import UpdatesPage from './page/client-side/updates-page';
import NutritionPage from './page/client-side/nutrition-page';
import OnBoardPage from './page/client-side/intake-form-page';
import ProfilePage from './page/client-side/profile-page';
import AdminDashboard from './page/admin-side/admin-dashboard';
import SimpleTrackingView from './page/admin-side/simple-tracking-view';
import ClientMetricsChart from './page/admin-side/client-metrics-chart';
import ClientManagementScreen from './page/admin-side/clientManagementScreen'
import NutriSwapScreen from './page/admin-side/nutriswap-screen';
import SettingsScreen from './page/admin-side/admin-setting';
import UserTargetsScreen from './page/admin-side/target-screen';
import CoachManagementScreen from './page/admin-side/coach-management';




function Router() {
  console.log("Router rendering");
  return (
    <Switch>
      <Route path="/" component={AuthPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path={RENDER_URL.STUDENT_DASHBOARD} component={HomePage} />
      <Route path={RENDER_URL.STUDENT_ONBOARD} component={OnBoardPage} />
      <Route path={RENDER_URL.STUDENT_UPDATES} component={UpdatesPage} />
      <Route path={RENDER_URL.STUDENT_NUTRI_SWAP} component={NutritionPage} />
      <Route path={RENDER_URL.STUDENT_PROFILE} component={ProfilePage} />


      {/* admin pages */}
      <Route path={RENDER_URL.ADMIN_DASHBOARD} component={AdminDashboard} />
      <Route path={RENDER_URL.ADMIN_UPDATES} component={SimpleTrackingView} />
      <Route path={RENDER_URL.ADMIN_ANALYTICS} component={ClientMetricsChart} />
      <Route path={RENDER_URL.ADMIN_CLIENT_MANAGEMENT} component={ClientManagementScreen} />
      <Route path={RENDER_URL.ADMIN_NUTRISWAP} component={NutriSwapScreen} />
      <Route path={RENDER_URL.ADMIN_SETTINGS} component={SettingsScreen} />
      <Route path={RENDER_URL.ADMIN_TARGETS} component={UserTargetsScreen} />
      <Route path={RENDER_URL.ADMIN_COACH_MANAGE} component={CoachManagementScreen} />

    </Switch>
  );
}

function App() {

  useEffect(() => {
    console.log("App rendering");
    setBaseUrl(BASE_URL)
    registerSW()
  }, []);




  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AuthProvider>
          <TooltipProvider>
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
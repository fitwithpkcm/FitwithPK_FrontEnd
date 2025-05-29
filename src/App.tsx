import { useEffect, useState } from 'react'
import { Switch, Route } from "wouter";
import { TooltipProvider } from "./components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import AuthPage from './page/auth-page';
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from './hooks/use-auth';
import { setBaseUrl } from "../src/Services/HttpService"
import { BASE_URL } from './common/Constant';
import { RENDER_URL } from './common/Urls';
import HomePage from './page/home-page'
import UpdatesPage from './page/updates-page';
import NutritionPage from './page/nutrition-page';
import OnBoardPage from './page/intake-form-page';
import ProfilePage from './page/profile-page';

function Router() {
  console.log("Router rendering");
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path={RENDER_URL.STUDENT_DASHBOARD} component={HomePage} />
      <Route path={RENDER_URL.STUDENT_ONBOARD} component={OnBoardPage} />
      <Route path={RENDER_URL.STUDENT_UPDATES} component={UpdatesPage} />
      <Route path={RENDER_URL.STUDENT_NUTRI_SWAP} component={NutritionPage} />
      <Route path={RENDER_URL.STUDENT_PROFILE} component={ProfilePage} />
    </Switch>
  );
}

function App() {

  useEffect(() => {
    console.log("App rendering");
    setBaseUrl(BASE_URL)
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
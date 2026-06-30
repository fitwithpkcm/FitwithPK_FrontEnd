import React, { useEffect, useState, Component, ReactNode } from 'react'
import { Switch, Route, Redirect, useLocation } from "wouter";
import { BrowserRouter } from 'react-router-dom';
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
import { idbConsumePendingNav } from './lib/notif-idb';
import HomePage from './page/client-side/home-page'
import UpdatesPage from './page/client-side/updates-page';
import NutritionPage from './page/client-side/nutrition-page';
import OnBoardPage from './page/client-side/intake-form-page';
import { ClientRoute } from './lib/protected-route';
import ProfilePage from './page/client-side/profile-page';
import AdminDashboard from './page/admin-side/admin-dashboard';
import SimpleTrackingView from './page/admin-side/simple-tracking-view';
import ClientMetricsChart from './page/admin-side/client-metrics-chart';
import ClientManagementScreen from './page/admin-side/clientManagementScreen'
import NutriSwapScreen from './page/admin-side/nutriswap-screen';
import SettingsScreen from './page/admin-side/admin-setting';
import UserTargetsScreen from './page/admin-side/target-screen';
import CoachManagementScreen from './page/admin-side/coach-management';
import ClientProfileScreen from './page/admin-side/client-profile-screen';
import PaymentHistoryScreen from './page/admin-side/payment-histroy-details';
import PricingPlanManagementScreen from './page/admin-side/admin-pricing-plan';
import AdminMealPlanPage from './page/admin-side/meal-plan-page';
import MealTrackingPage from './page/client-side/meal-tracking-page';
import AdminWorkoutPlanPage from './page/admin-side/workout-plan-page';
import WorkoutTrackingPage from './page/client-side/workout-tracking-page';
import AdminSupplementPage from './page/admin-side/supplement-page';
import SupplementPage from './page/client-side/supplement-page';
import NotificationsPage from './page/client-side/notifications-page';
import AdminNotificationsPage from './page/admin-side/admin-notifications-page';
import { Toaster } from 'react-hot-toast';

class AppErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean; message: string; stack: string }> {
  state = { crashed: false, message: '', stack: '' };
  static getDerivedStateFromError(err: Error) {
    return { crashed: true, message: err?.message ?? String(err), stack: err?.stack ?? '' };
  }
  componentDidCatch(err: Error) { console.error('[AppErrorBoundary]', err); }
  render() {
    if (this.state.crashed) {
      return (
        <div className="flex flex-col min-h-screen gap-4 p-6 bg-white dark:bg-gray-950 overflow-auto">
          <p className="text-base font-bold text-red-600">App Error</p>
          <pre className="text-xs text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded p-3 whitespace-pre-wrap break-all">
            {this.state.message}{'\n\n'}{this.state.stack}
          </pre>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm self-start"
            onClick={() => { this.setState({ crashed: false, message: '', stack: '' }); window.location.href = '/'; }}
          >
            Go to home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Router() {
  console.log("Router rendering");
  const [, navigate] = useLocation();

  // Consume any pending navigation written by the SW on notification click.
  // Runs on mount (app was closed → opened fresh) AND on every visibility
  // change (app was backgrounded → brought to foreground by client.focus()).
  useEffect(() => {
    const consumeNav = () => {
      idbConsumePendingNav().then(url => {
        if (url && window.location.pathname !== url) navigate(url);
      }).catch(() => {});
    };

    // Slight delay so auth/React have settled before pushing a route
    const timer = setTimeout(consumeNav, 200);

    const onVisible = () => {
      if (document.visibilityState === 'visible') consumeNav();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [navigate]);

  // Handle NAVIGATE messages posted by the service worker (e.g. on notification click)
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'NAVIGATE' && event.data?.url) {
        navigate(event.data.url);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, [navigate]);

  return (
    <Switch>
      <Route path="/" component={AuthPage} />
      <Route path="/auth" component={AuthPage} />
      <ClientRoute path={RENDER_URL.STUDENT_ONBOARD} component={OnBoardPage} />
      <ClientRoute path={RENDER_URL.STUDENT_DASHBOARD} component={HomePage} />
      <ClientRoute path={RENDER_URL.STUDENT_UPDATES} component={UpdatesPage} />
      <ClientRoute path={RENDER_URL.STUDENT_NUTRI_SWAP} component={NutritionPage} />
      <ClientRoute path={RENDER_URL.STUDENT_PROFILE} component={ProfilePage} />


      {/* admin pages */}
      <Route path={RENDER_URL.ADMIN_DASHBOARD} component={AdminDashboard} />
      <Route path={RENDER_URL.ADMIN_UPDATES} component={SimpleTrackingView} />
      <Route path={RENDER_URL.ADMIN_ANALYTICS} component={UserTargetsScreen} />
      <Route path={RENDER_URL.ADMIN_CLIENT_MANAGEMENT} component={ClientManagementScreen} />
      <Route path={RENDER_URL.ADMIN_NUTRISWAP} component={NutriSwapScreen} />
      <Route path={RENDER_URL.ADMIN_SETTINGS} component={SettingsScreen} />
      <Route path={RENDER_URL.ADMIN_TARGETS} component={UserTargetsScreen} />
      <Route path={RENDER_URL.ADMIN_COACH_MANAGE} component={CoachManagementScreen} />
      <Route path={RENDER_URL.ADMIN_CLIENT_PROFILE} component={ClientProfileScreen} />
      <Route path={RENDER_URL.ADMIN_PAYMENT_HISTORY} component={PaymentHistoryScreen} />
      <Route path={RENDER_URL.ADMIN_COACH_PRICING} component={PricingPlanManagementScreen} />
      <Route path={RENDER_URL.ADMIN_MEAL_PLAN} component={AdminMealPlanPage} />
      <Route path={RENDER_URL.STUDENT_MEAL_TRACKING} component={MealTrackingPage} />
      <Route path={RENDER_URL.ADMIN_WORKOUT_PLAN} component={AdminWorkoutPlanPage} />
      <ClientRoute path={RENDER_URL.STUDENT_WORKOUT} component={WorkoutTrackingPage} />
      <Route path={RENDER_URL.ADMIN_SUPPLEMENTS} component={AdminSupplementPage} />
      <ClientRoute path={RENDER_URL.STUDENT_SUPPLEMENTS} component={SupplementPage} />
      <ClientRoute path={RENDER_URL.STUDENT_NOTIFICATIONS} component={NotificationsPage} />
      <Route path={RENDER_URL.ADMIN_NOTIFICATIONS} component={AdminNotificationsPage} />

      {/* Catch-all: redirect any unmatched path to auth instead of showing blank */}
      <Route><Redirect to="/auth" /></Route>
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
        <BrowserRouter>
          <AuthProvider>
            <TooltipProvider>
              <AppErrorBoundary>
                <Router />
              </AppErrorBoundary>
              <Toaster toastOptions={{ duration: 3000 }} />
            </TooltipProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
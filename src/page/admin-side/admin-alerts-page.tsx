import React, { useEffect } from "react";
import { MobileAdminNav } from "../../components/layout/mobile-admin-nav";
import { NotificationsPanel } from "../client-side/notifications-page";
import { BASE_URL } from "../../common/Constant";
import { setBaseUrl } from "../../services/HttpService";

// Full-page notifications list for the admin/coach — mirrors the client's
// notifications-page.tsx experience exactly, just wrapped for the admin shell.
export default function AdminAlertsPage() {
  useEffect(() => {
    setBaseUrl(BASE_URL);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <div className="pt-safe-top">
        <NotificationsPanel />
      </div>
      <MobileAdminNav />
    </div>
  );
}

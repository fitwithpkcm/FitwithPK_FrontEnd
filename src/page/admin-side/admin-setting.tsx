import React from "react";
import { MobileAdminNav } from "../../components/layout/mobile-admin-nav";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../hooks/use-auth";
import { BASE_URL } from "../../common/Constant";
import { setBaseUrl } from "../../services/HttpService";
import { useEffect } from "react";

export default function SettingsScreen() {
    const { user, logoutMutation } = useAuth();

    console.log(user);

    useEffect(() => {
        setBaseUrl(BASE_URL);
    }, []);

    const handleLogout = () => {
        logoutMutation.mutate();
    };

    return (
        <>
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-50 flex items-center justify-center px-4">
                <h1 className="font-bold text-lg text-gray-900 dark:text-white">FitwithPKAdmin</h1>
            </header>

            <div className="p-4 mt-14">
                <h1 className="text-xl font-bold mb-6">Settings</h1>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-md mx-auto">
                    <h2 className="text-lg font-semibold mb-4">User Profile</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
                            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                                <p className="text-gray-900 dark:text-white">{user? user?.info.FirstName : ""}</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Email</label>
                            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                                <p className="text-gray-900 dark:text-white">{user?.info.EmailID || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button
                            onClick={() => { handleLogout() }}
                            variant="destructive"
                            className="w-full"
                        >
                            Logout
                        </Button>
                    </div>
                </div>
            </div>

            {/* Bottom Navigation */}
            <MobileAdminNav />
        </>
    );
}
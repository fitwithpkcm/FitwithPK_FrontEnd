import { Link, useLocation } from "wouter";
import { Home, BarChart, Calendar, FileText, Settings, Plus, Apple, Dumbbell, Clipboard } from "lucide-react";
import { RENDER_URL } from "@/common/Urls";
import React from "react";

export function MobileNav() {
  const [location] = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20">

      <nav className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex-shrink-0 shadow-lg">
        <div className="flex justify-around">
          <NavItem
            icon={<Home className="h-6 w-6" />}
            label="Home"
            href={RENDER_URL.STUDENT_DASHBOARD}
            isActive={location === RENDER_URL.STUDENT_DASHBOARD}
          />
          <NavItem
            icon={<BarChart className="h-6 w-6" />}
            label="Updates"
            href={RENDER_URL.STUDENT_UPDATES}
            isActive={location === RENDER_URL.STUDENT_UPDATES}
          />
          <NavItem
            icon={<Apple className="h-6 w-6" />}
            label="NutriSwap"
            href={RENDER_URL.STUDENT_NUTRI_SWAP}
            isActive={location === RENDER_URL.STUDENT_NUTRI_SWAP}
          />
          <NavItem
            icon={<Dumbbell className="h-6 w-6" />}
            label="Workouts"
            href="/my-exercises"
            isActive={location === "/my-exercises"}
          />
          <NavItem
            icon={<FileText className="h-6 w-6" />}
            label="Diet/Plan"
            href="/diet-workout"
            isActive={location === "/diet-workout"}
          />
          <NavItem
            icon={<Settings className="h-6 w-6" />}
            label="Profile"
            href={RENDER_URL.STUDENT_PROFILE}
            isActive={location === RENDER_URL.STUDENT_PROFILE}
          />
        </div>
      </nav>
    </div>
  );
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive: boolean;
}

function NavItem({ icon, label, href, isActive }: NavItemProps) {
  return (
    <Link href={href}>
      <a className={`flex flex-col items-center py-3 px-2 ${isActive
          ? 'text-primary-600 dark:text-primary-400'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }`}>
        {icon}
        <span className="text-xs mt-1">{label}</span>
      </a>
    </Link>
  );
}

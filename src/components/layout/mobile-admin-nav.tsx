import { Link, useLocation } from "wouter";
import { Home, ClipboardCheck, Target, ArrowRightLeft, UtensilsCrossed, Cog } from "lucide-react";
import { RENDER_URL } from "../../common/Urls";
import React from "react";

export function MobileAdminNav() {
  const [location] = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20">
      <nav className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg">
        <div className="flex justify-around px-1 py-1">
          <NavItem icon={<Home className="h-5 w-5" />} label="Home" href={RENDER_URL.ADMIN_DASHBOARD} isActive={location === RENDER_URL.ADMIN_DASHBOARD} />
          <NavItem icon={<ClipboardCheck className="h-5 w-5" />} label="Updates" href={RENDER_URL.ADMIN_UPDATES} isActive={location === RENDER_URL.ADMIN_UPDATES} />
          <NavItem icon={<Target className="h-5 w-5" />} label="Insights" href={RENDER_URL.ADMIN_TARGETS} isActive={location === RENDER_URL.ADMIN_TARGETS || location === RENDER_URL.ADMIN_ANALYTICS} />
          <NavItem icon={<ArrowRightLeft className="h-5 w-5" />} label="NutriSwap" href={RENDER_URL.ADMIN_NUTRISWAP} isActive={location === RENDER_URL.ADMIN_NUTRISWAP} />
          <NavItem icon={<UtensilsCrossed className="h-5 w-5" />} label="Meals" href={RENDER_URL.ADMIN_MEAL_PLAN} isActive={location === RENDER_URL.ADMIN_MEAL_PLAN} />
          <NavItem icon={<Cog className="h-5 w-5" />} label="Settings" href={RENDER_URL.ADMIN_SETTINGS} isActive={location === RENDER_URL.ADMIN_SETTINGS} />
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
      <a className="flex flex-col items-center py-2 px-2 gap-0.5">
        <div
          className={`flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200 ${
            isActive
              ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
              : "text-gray-400 dark:text-gray-500"
          }`}
        >
          {icon}
        </div>
        <span
          className={`text-[10px] font-semibold transition-colors duration-200 ${
            isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
          }`}
        >
          {label}
        </span>
      </a>
    </Link>
  );
}

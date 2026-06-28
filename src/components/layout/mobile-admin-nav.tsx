import { Link, useLocation } from "wouter";
import { Home, ClipboardCheck, Target, ArrowRightLeft, UtensilsCrossed, Cog, Dumbbell, Pill } from "lucide-react";
import { RENDER_URL } from "../../common/Urls";
import React from "react";

interface MobileAdminNavProps {
  /** Return false to block navigation and handle it yourself (e.g. show unsaved-changes dialog). */
  onNavAttempt?: (href: string) => boolean;
}

export function MobileAdminNav({ onNavAttempt }: MobileAdminNavProps = {}) {
  const [location] = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20">
      <nav className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg">
        <div className="flex justify-around px-0 py-1">
          <NavItem icon={<Home className="h-5 w-5" />} label="Home" href={RENDER_URL.ADMIN_DASHBOARD} isActive={location === RENDER_URL.ADMIN_DASHBOARD} onNavAttempt={onNavAttempt} />
          <NavItem icon={<ClipboardCheck className="h-5 w-5" />} label="Updates" href={RENDER_URL.ADMIN_UPDATES} isActive={location === RENDER_URL.ADMIN_UPDATES} onNavAttempt={onNavAttempt} />
          <NavItem icon={<Target className="h-5 w-5" />} label="Insights" href={RENDER_URL.ADMIN_TARGETS} isActive={location === RENDER_URL.ADMIN_TARGETS || location === RENDER_URL.ADMIN_ANALYTICS} onNavAttempt={onNavAttempt} />
          <NavItem icon={<ArrowRightLeft className="h-5 w-5" />} label="Nutri" href={RENDER_URL.ADMIN_NUTRISWAP} isActive={location === RENDER_URL.ADMIN_NUTRISWAP} onNavAttempt={onNavAttempt} />
          <NavItem icon={<UtensilsCrossed className="h-5 w-5" />} label="Meals" href={RENDER_URL.ADMIN_MEAL_PLAN} isActive={location === RENDER_URL.ADMIN_MEAL_PLAN} onNavAttempt={onNavAttempt} />
          <NavItem icon={<Dumbbell className="h-5 w-5" />} label="Workouts" href={RENDER_URL.ADMIN_WORKOUT_PLAN} isActive={location === RENDER_URL.ADMIN_WORKOUT_PLAN} onNavAttempt={onNavAttempt} />
          <NavItem icon={<Pill className="h-5 w-5" />} label="Supps" href={RENDER_URL.ADMIN_SUPPLEMENTS} isActive={location === RENDER_URL.ADMIN_SUPPLEMENTS} onNavAttempt={onNavAttempt} />
          <NavItem icon={<Cog className="h-5 w-5" />} label="Settings" href={RENDER_URL.ADMIN_SETTINGS} isActive={location === RENDER_URL.ADMIN_SETTINGS} onNavAttempt={onNavAttempt} />
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
  onNavAttempt?: (href: string) => boolean;
}

function NavItem({ icon, label, href, isActive, onNavAttempt }: NavItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (onNavAttempt && onNavAttempt(href) === false) {
      e.preventDefault();
    }
  };

  return (
    <Link href={href} onClick={handleClick} className="flex flex-col items-center py-1.5 px-0 gap-0.5 flex-1">
      <div
        className={`flex items-center justify-center w-8 h-6 rounded-full transition-all duration-200 ${
          isActive
            ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
            : "text-gray-400 dark:text-gray-500"
        }`}
      >
        {icon}
      </div>
      <span
        className={`text-[9px] font-semibold transition-colors duration-200 truncate w-full text-center ${
          isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}

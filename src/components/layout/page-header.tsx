import React from "react";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  /** When provided, shows a back button that calls this function */
  onBack?: () => void;
  /** Use a lighter gradient variant (e.g. for sub-pages) */
  variant?: "gradient" | "flat";
}

/** Shared client-side page header with the brand gradient */
export function PageHeader({
  title,
  subtitle,
  right,
  onBack,
  variant = "gradient",
}: PageHeaderProps) {
  const bg =
    variant === "gradient"
      ? "bg-gradient-to-r from-blue-700 to-blue-600"
      : "bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800";

  const titleColor = variant === "gradient" ? "text-white" : "text-gray-900 dark:text-white";
  const subtitleColor = variant === "gradient" ? "text-blue-200" : "text-gray-500 dark:text-gray-400";
  const backColor = variant === "gradient" ? "text-white/80 hover:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700";

  return (
    <header className={`flex-shrink-0 px-4 py-4 sm:px-6 ${bg}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${backColor}`}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0">
            {subtitle && (
              <p className={`text-xs font-medium mb-0.5 ${subtitleColor}`}>{subtitle}</p>
            )}
            <h1 className={`text-lg font-bold truncate ${titleColor}`}>{title}</h1>
          </div>
        </div>
        {right && <div className="flex items-center gap-2 flex-shrink-0">{right}</div>}
      </div>
    </header>
  );
}

/** Shared admin page header — same gradient, with "FitwithPK" brand chip */
interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onBack?: () => void;
}

export function AdminPageHeader({ title, subtitle, right, onBack }: AdminPageHeaderProps) {
  return (
    <header className="flex-shrink-0 bg-gradient-to-r from-blue-700 to-blue-600 px-4 header-safe-top pb-4 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="flex-shrink-0 p-1.5 rounded-lg text-white/80 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0">
            {subtitle && (
              <p className="text-xs font-medium text-blue-200 mb-0.5">{subtitle}</p>
            )}
            <h1 className="text-lg font-bold text-white truncate">{title}</h1>
          </div>
        </div>
        {right && <div className="flex items-center gap-2 flex-shrink-0">{right}</div>}
      </div>
    </header>
  );
}

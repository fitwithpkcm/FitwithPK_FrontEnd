import React from 'react';

// Same 1-5 color scale as the rating picker on the Updates form
// (src/page/client-side/updates-page.tsx), just spelled out as a
// number + word instead of an ambiguous icon.
const TIERS: Record<number, { label: string; classes: string }> = {
  1: { label: 'Poor',  classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  2: { label: 'Fair',  classes: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  3: { label: 'Okay',  classes: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  4: { label: 'Good',  classes: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300' },
  5: { label: 'Great', classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
};

interface DietAdherenceBadgeProps {
  rating: number;
  className?: string;
}

const DietAdherenceBadge: React.FC<DietAdherenceBadgeProps> = ({ rating, className = '' }) => {
  if (typeof rating !== 'number' || rating <= 0) return null;
  const tier = TIERS[Math.min(5, Math.max(1, Math.round(rating)))];

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${tier.classes} ${className}`}>
      {rating}/5 · {tier.label}
    </span>
  );
};

export default DietAdherenceBadge;

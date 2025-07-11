import React,{ useState, useEffect, useRef } from "react";
import { cn } from "../../lib/utils";
import { Trophy } from "lucide-react";


interface GoalProgressRingProps {
  progress: number; // 0 to 100
  size?: number;
  thickness?: number;
  className?: string;
  goal?: string;
  animate?: boolean;
  onComplete?: () => void;
}

export function GoalProgressRing({
  progress,
  size = 200,
  thickness = 12,
  className,
  goal = "Weekly Goal",
  animate = true,
  onComplete
}: GoalProgressRingProps) {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [animationKey, setAnimationKey] = useState(0); // Force re-render with key changes
  const prevProgress = useRef(progress);
  const circleRef = useRef<SVGCircleElement>(null);
  
  // Calculate the circle properties
  const center = size / 2;
  const radius = center - thickness / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Progress percentage clamped between 0-100
  const progressPercent = Math.min(100, Math.max(0, progress));
  
  // Calculate stroke dashoffset based on progress
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  // Get color based on progress
  const getProgressColor = () => {
    if (progress < 30) return "#f97316"; // orange-500
    if (progress < 60) return "#facc15"; // yellow-400
    if (progress < 90) return "#84cc16"; // lime-500
    return "#10b981"; // emerald-500
  };
  
  // This will handle the circle animation
  useEffect(() => {
    console.log(`Progress changed from ${prevProgress.current} to ${progress}`);
    
    // Don't animate on first render
    if (prevProgress.current !== progress) {
      // Force circle to re-render with animation
      setAnimationKey(prev => prev + 1);
      
      // Animate the counter
      if (animate) {
        const startValue = displayProgress;
        const endValue = Math.round(progress);
        const duration = 800; // ms
        const frames = 20; // total animation frames
        const increment = (endValue - startValue) / frames;
        
        let currentFrame = 0;
        let currentValue = startValue;
        
        const animationInterval = setInterval(() => {
          currentFrame++;
          currentValue += increment;
          
          if (currentFrame >= frames) {
            clearInterval(animationInterval);
            currentValue = endValue;
            
            // Handle completion
            if (endValue >= 100 && !showCelebration) {
              setShowCelebration(true);
              if (onComplete) onComplete();
              
              // Hide celebration after 3 seconds
              setTimeout(() => setShowCelebration(false), 3000);
            }
          }
          
          setDisplayProgress(Math.round(currentValue));
        }, duration / frames);
        
        return () => clearInterval(animationInterval);
      } else {
        // No animation, just set the value
        setDisplayProgress(Math.round(progress));
      }
    } else if (displayProgress !== Math.round(progress)) {
      // Initial set without animation
      setDisplayProgress(Math.round(progress));
    }
    
    prevProgress.current = progress;
  }, [progress, animate, onComplete]);
  
  return (
    <div className={cn("relative flex flex-col items-center justify-center", className)}>
      {/* Progress ring */}
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={thickness}
            className="text-gray-200 dark:text-gray-800"
          />
        </svg>
        
        {/* Progress circle */}
        <svg 
          width={size} 
          height={size} 
          viewBox={`0 0 ${size} ${size}`}
          className="absolute"
          style={{ transform: "rotate(-90deg)" }} // Start from top
        >
          <circle
            key={animationKey} // Force re-render on key change
            ref={circleRef}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={getProgressColor()}
            strokeWidth={thickness}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 0.8s ease-in-out, stroke 0.5s ease",
            }}
          />
        </svg>
        
        {/* Progress percentage */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
          <div className="text-3xl font-bold flex items-center">
            <span className="transition-all duration-300" key={displayProgress}>
              {displayProgress}%
            </span>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {goal}
          </div>
        </div>
        
        {/* Celebration - simple version */}
        {showCelebration && (
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-500 text-white p-2 rounded-full animate-bounce">
            <Trophy size={24} />
          </div>
        )}
      </div>
    </div>
  );
}
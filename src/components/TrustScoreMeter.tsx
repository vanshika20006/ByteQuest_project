import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TrustScoreMeterProps {
  score: number;
  isAnimating?: boolean;
  size?: "small" | "default";
}

const TrustScoreMeter = ({ score, isAnimating = false, size = "default" }: TrustScoreMeterProps) => {
  const [displayScore, setDisplayScore] = useState(0);
  
  const isSmall = size === "small";
  
  useEffect(() => {
    if (isAnimating) {
      setDisplayScore(0);
      const duration = 1500;
      const steps = 60;
      const increment = score / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= score) {
          setDisplayScore(score);
          clearInterval(timer);
        } else {
          setDisplayScore(Math.round(current));
        }
      }, duration / steps);
      
      return () => clearInterval(timer);
    } else {
      setDisplayScore(score);
    }
  }, [score, isAnimating]);

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;
  
  const getScoreColor = () => {
    if (displayScore >= 70) return "text-success stroke-success";
    if (displayScore >= 40) return "text-accent stroke-accent";
    return "text-destructive stroke-destructive";
  };

  const getScoreLabel = () => {
    if (displayScore >= 70) return "High Trust";
    if (displayScore >= 40) return "Moderate";
    return "Low Trust";
  };

  const getScoreBg = () => {
    if (displayScore >= 70) return "bg-success/10";
    if (displayScore >= 40) return "bg-accent/10";
    return "bg-destructive/10";
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn("relative", isSmall ? "w-20 h-20" : "w-32 h-32")}>
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="8"
            className="stroke-muted/30"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className={`transition-all duration-300 ${getScoreColor()}`}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: strokeDashoffset,
            }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-display font-bold", getScoreColor(), isSmall ? "text-xl" : "text-3xl")}>
            {displayScore}
          </span>
          <span className={cn("text-muted-foreground", isSmall ? "text-[10px]" : "text-xs")}>/ 100</span>
        </div>
      </div>
      
      <div className={`px-4 py-1.5 rounded-full ${getScoreBg()}`}>
        <span className={`text-sm font-medium ${getScoreColor()}`}>
          {getScoreLabel()}
        </span>
      </div>
    </div>
  );
};

export default TrustScoreMeter;
